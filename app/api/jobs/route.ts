import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { JobPost, CompanyProfile, SeekerProfile, Application } from '@/lib/models';

async function getAuthEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const seekerEmailParam = searchParams.get('seekerEmail');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const distanceParam = searchParams.get('distance') || '5'; // default 5km

    await connectToDatabase();

    // Case 1: Return jobs for a specific company
    if (companyId) {
      const jobs = await JobPost.find({ companyId }).sort({ postedAt: -1 });
      return NextResponse.json(jobs);
    }

    // Case 2: Nearby jobs filtering
    let searchCoordinates: [number, number] | null = null;

    if (latParam && lngParam) {
      searchCoordinates = [parseFloat(lngParam), parseFloat(latParam)];
    } else {
      // Try to get authenticated seeker's email to use their coordinates
      const seekerEmail = seekerEmailParam || (await getAuthEmail());
      if (seekerEmail) {
        const seeker = await SeekerProfile.findOne({ email: seekerEmail });
        if (seeker && seeker.location?.coordinates) {
          searchCoordinates = seeker.location.coordinates;
        }
      }
    }

    if (searchCoordinates) {
      const distanceInMeters = parseFloat(distanceParam) * 1000;
      
      // Find nearby companies first
      const nearbyCompanies = await CompanyProfile.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: searchCoordinates
            },
            $maxDistance: distanceInMeters
          }
        }
      });

      const companyIds = nearbyCompanies.map(company => company._id);
      
      // Find jobs belonging to these companies
      const jobs = await JobPost.find({
        companyId: { $in: companyIds },
        status: 'open'
      }).populate('companyId').sort({ postedAt: -1 });

      return NextResponse.json(jobs);
    }

    // Case 3: Return all open jobs if no coordinates/companyId specified
    const allOpenJobs = await JobPost.find({ status: 'open' }).populate('companyId').sort({ postedAt: -1 });
    return NextResponse.json(allOpenJobs);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, title, category, payType, payMin, payMax, shiftTiming, requiredSkills } = body;

    if (!companyId || !title || !category || !payType || !payMin || !shiftTiming) {
      return NextResponse.json({ error: 'Required job post fields are missing' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify company ownership using email instead of phone
    const company = await CompanyProfile.findOne({ _id: companyId, ownerEmail: email });
    if (!company) {
      return NextResponse.json({ error: 'Unauthorized or company not found' }, { status: 403 });
    }

    const newJob = await JobPost.create({
      companyId,
      title,
      category,
      payType,
      payMin,
      payMax: payMax || undefined,
      shiftTiming,
      requiredSkills: requiredSkills || [],
      status: 'open',
      postedAt: new Date()
    });

    return NextResponse.json(newJob, { status: 201 });
  } catch (error: any) {
    console.error('Error posting job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, title, category, payType, payMin, payMax, shiftTiming, requiredSkills, status } = body;

    if (!jobId || !title || !category || !payType || !payMin || !shiftTiming) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    await connectToDatabase();

    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify company owner
    const company = job.companyId as any;
    if (!company || company.ownerEmail !== email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    job.title = title;
    job.category = category;
    job.payType = payType;
    job.payMin = payMin;
    job.payMax = payMax || undefined;
    job.shiftTiming = shiftTiming;
    job.requiredSkills = requiredSkills || [];
    if (status) {
      job.status = status;
    }

    await job.save();
    return NextResponse.json(job);
  } catch (error: any) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify company owner
    const company = job.companyId as any;
    if (!company || company.ownerEmail !== email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Cascade delete applications for this job
    await Application.deleteMany({ jobId });
    
    // Delete the job post
    await JobPost.findByIdAndDelete(jobId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
