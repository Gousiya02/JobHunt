import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { Application, JobPost, SeekerProfile, CompanyProfile } from '@/lib/models';
import { generateAIResume, translateText, generateFitAnalysis } from '@/lib/ai';

async function getAuthEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}

// Haversine distance calculator
function getDistanceInKm(coord1: [number, number], coord2: [number, number]): number {
  if (!coord1 || !coord2) return 0;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

export async function GET(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // 'seeker' or 'employer'

    await connectToDatabase();

    if (role === 'employer') {
      // Find all companies owned by this email
      const companies = await CompanyProfile.find({ ownerEmail: email });
      const companyIds = companies.map(c => c._id);

      // Find all jobs posted by these companies
      const jobs = await JobPost.find({ companyId: { $in: companyIds } });
      const jobIds = jobs.map(j => j._id);

      // Find applications for these jobs
      const applications = await Application.find({ jobId: { $in: jobIds } })
        .populate('jobId')
        .sort({ createdAt: -1 });

      // For each application, attach the seeker's details
      const appsWithSeekers = await Promise.all(
        applications.map(async (app) => {
          const seeker = await SeekerProfile.findOne({ email: app.seekerEmail });
          const job = app.jobId as any;
          const company = job && job.companyId ? companies.find(c => c._id.toString() === job.companyId.toString()) : null;
          
          return {
            ...app.toObject(),
            seeker: seeker || { name: 'Unknown Seeker', email: app.seekerEmail, skills: [], locality: 'Unknown' },
            companyName: company ? company.companyName : 'Unknown Company'
          };
        })
      );

      return NextResponse.json(appsWithSeekers);
    } else {
      // Default: seeker applications matching Google sign-in email
      const applications = await Application.find({ seekerEmail: email })
        .populate({
          path: 'jobId',
          populate: { path: 'companyId' }
        })
        .sort({ createdAt: -1 });

      return NextResponse.json(applications);
    }
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Check if seeker profile exists
    const seeker = await SeekerProfile.findOne({ email });
    if (!seeker) {
      return NextResponse.json({ error: 'Please create a seeker profile first' }, { status: 400 });
    }

    // 2. Check if already applied
    const existingApp = await Application.findOne({ seekerEmail: email, jobId });
    if (existingApp) {
      return NextResponse.json({ error: 'You have already applied to this job' }, { status: 400 });
    }

    // 3. Get Job and Company info
    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const company = job.companyId as any;

    // 4. Generate AI tailored pitch in Seeker's preferred language
    const payInfo = job.payType === 'fixed' 
      ? `₹${job.payMin} (Fixed)` 
      : `₹${job.payMin}${job.payMax ? ' - ₹' + job.payMax : ''} per ${job.payType}`;

    const seekerLang = seeker.preferredLanguage || 'English';
    const companyLang = company.preferredLanguage || 'English';

    const resumeText = await generateAIResume({
      seeker: {
        name: seeker.name,
        skills: seeker.skills,
        availability: seeker.availability,
        experienceLevel: seeker.experienceLevel,
        locality: seeker.locality,
        languages: seeker.languages
      },
      job: {
        title: job.title,
        companyName: company.companyName,
        category: job.category,
        shiftTiming: job.shiftTiming,
        requiredSkills: job.requiredSkills,
        payInfo
      },
      pitchLanguage: seekerLang
    });

    // 5. Translate pitch if Seeker and Company owner languages are different
    let translatedResumeText = resumeText;
    if (seekerLang.toLowerCase() !== companyLang.toLowerCase()) {
      try {
        translatedResumeText = await translateText(resumeText, companyLang);
      } catch (err) {
        console.error('Failed to translate pitch:', err);
      }
    }

    // 6. Calculate proximity distance (in km)
    let distanceKm = 0;
    if (seeker.location?.coordinates && company.location?.coordinates) {
      distanceKm = getDistanceInKm(seeker.location.coordinates, company.location.coordinates);
    }

    // 7. Generate Fit Score and AI analysis
    let fitScore = 75;
    let fitExplanation = 'Good match based on proximity and skills.';
    try {
      const fitAnalysis = await generateFitAnalysis(
        {
          skills: seeker.skills || [],
          availability: seeker.availability || [],
          experienceLevel: seeker.experienceLevel || 'none',
          locality: seeker.locality || ''
        },
        {
          title: job.title || '',
          requiredSkills: job.requiredSkills || [],
          shiftTiming: job.shiftTiming || ''
        },
        distanceKm,
        companyLang
      );
      fitScore = fitAnalysis.score;
      fitExplanation = fitAnalysis.explanation;
    } catch (fitErr) {
      console.error('Failed to generate fit analysis:', fitErr);
    }

    // 8. Create Application
    const application = await Application.create({
      seekerEmail: email,
      jobId,
      resumeText,
      translatedResumeText,
      fitScore,
      fitExplanation,
      status: 'applied',
      createdAt: new Date()
    });

    // Log the application for WhatsApp/Email notification simulation
    console.log(`\n====================================`);
    console.log(`[NOTIFICATION SERVICE] New job application submitted!`);
    console.log(`To Company Owner (${company.companyName} - Email: ${company.ownerEmail}):`);
    console.log(`Applicant: ${seeker.name} (${email})`);
    console.log(`Commute Proximity: ${distanceKm} km`);
    console.log(`Fit Score: ${fitScore}%`);
    console.log(`Fit Explanation: "${fitExplanation}"`);
    console.log(`AI Pitch (Seeker Lang: ${seekerLang}): "${resumeText}"`);
    console.log(`AI Pitch (Translated to Company Lang: ${companyLang}): "${translatedResumeText}"`);
    console.log(`====================================\n`);

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    console.error('Error applying for job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, status } = await request.json();
    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify ownership: the job's company owner must match current user's email
    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const job = application.jobId as any;
    const company = await CompanyProfile.findById(job.companyId);
    if (!company || company.ownerEmail !== email) {
      return NextResponse.json({ error: 'Unauthorized to update this application' }, { status: 403 });
    }

    application.status = status;
    await application.save();

    return NextResponse.json(application);
  } catch (error: any) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
