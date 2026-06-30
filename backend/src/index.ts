import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { connectToDatabase } from './db.js';
import { SeekerProfile, CompanyProfile, JobPost, Application, User } from './models.js';
import { generateAIResume, translateText, generateFitAnalysis } from './services/ai.js';
import { geocodeAddress } from './services/geocoding.js';

dotenv.config();
// Load parent directory environment files as fallbacks
dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Helper to get authenticated email from request headers
function getAuthEmail(req: express.Request): string | null {
  return req.headers['x-user-email'] as string || null;
}

// ----------------------------------------
// Auth Endpoints
// ----------------------------------------

// Get current session user
app.get('/api/auth/me', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    const googleConfigured = !!process.env.GEMINI_API_KEY;

    if (!email) {
      return res.json({ authenticated: false, googleConfigured });
    }

    await connectToDatabase();
    
    // Fetch seeker profile
    const seeker = await SeekerProfile.findOne({ email });
    
    // Fetch company profiles
    const companies = await CompanyProfile.find({ ownerEmail: email });

    return res.json({
      authenticated: true,
      googleConfigured,
      email,
      name: seeker?.name || email.split('@')[0],
      image: seeker?.photo || '',
      hasSeekerProfile: !!seeker,
      seekerProfile: seeker,
      hasCompanyProfile: companies.length > 0,
      companyProfiles: companies
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return res.status(500).json({ authenticated: false, error: error.message });
  }
});

// Password hashing helper using SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// User Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({
      email,
      passwordHash: hashPassword(password)
    });
    await newUser.save();

    return res.json({ success: true, message: 'User registered successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await connectToDatabase();
    
    let user = await User.findOne({ email });
    const isDemoUser = email === 'seeker@local.com' || email === 'owner@local.com';

    if (!user && isDemoUser) {
      // Auto-create demo users for convenient developer testing
      user = new User({
        email,
        passwordHash: hashPassword('password')
      });
      await user.save();
    } else if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!isDemoUser) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      const matched = user.passwordHash === hashPassword(password);
      if (!matched) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Try to find seeker profile to verify user exists
    const seeker = await SeekerProfile.findOne({ email });
    const companies = await CompanyProfile.find({ ownerEmail: email });

    return res.json({
      success: true,
      email,
      name: seeker?.name || email.split('@')[0],
      image: seeker?.photo || '',
      hasSeekerProfile: !!seeker,
      seekerProfile: seeker,
      hasCompanyProfile: companies.length > 0,
      companyProfiles: companies
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete session (logout)
app.delete('/api/auth/me', (req, res) => {
  return res.json({ success: true });
});


// ----------------------------------------
// Seeker Profile Endpoints
// ----------------------------------------

app.get('/api/seeker/profile', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectToDatabase();
    const profile = await SeekerProfile.findOne({ email });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/seeker/profile', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, phone, skills, availability, experienceLevel, locality, languages, preferredLanguage, photo } = req.body;

    if (!name || !locality || !experienceLevel) {
      return res.status(400).json({ error: 'Name, Locality, and Experience Level are required' });
    }

    await connectToDatabase();

    // Geocode locality
    const geocodeResult = await geocodeAddress(locality);
    if (!geocodeResult) {
      return res.status(400).json({
        error: `Could not locate "${locality}" on the map. Please simplify the locality or check spelling (e.g. "BTM Layout, Bangalore").`
      });
    }
    const coordinates = [geocodeResult.lng, geocodeResult.lat];

    const updatedProfile = await SeekerProfile.findOneAndUpdate(
      { email },
      {
        name,
        phone: phone || '',
        skills: skills || [],
        availability: availability || [],
        experienceLevel,
        locality,
        location: {
          type: 'Point',
          coordinates
        },
        languages: languages || [],
        preferredLanguage: preferredLanguage || 'English',
        photo: photo || '',
      },
      { new: true, upsert: true }
    );

    return res.json(updatedProfile);
  } catch (error: any) {
    console.error('Error saving seeker profile:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------
// Company Profile Endpoints
// ----------------------------------------

app.get('/api/company/profile', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectToDatabase();
    const companies = await CompanyProfile.find({ ownerEmail: email });
    return res.json(companies);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/company/profile', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { companyId, companyName, category, address, ownerPhone, preferredLanguage } = req.body;

    if (!companyName || !category || !address || !ownerPhone) {
      return res.status(400).json({ error: 'Company Name, Category, Address, and Owner Phone are required' });
    }

    await connectToDatabase();

    // Geocode address
    const geocodeResult = await geocodeAddress(address);
    if (!geocodeResult) {
      return res.status(400).json({
        error: `Could not locate "${address}" on the map. Please simplify the address or check spelling (e.g. "Whitefield, Bangalore").`
      });
    }
    const coordinates = [geocodeResult.lng, geocodeResult.lat];

    if (companyId) {
      const updatedCompany = await CompanyProfile.findOneAndUpdate(
        { _id: companyId, ownerEmail: email },
        {
          companyName,
          category,
          address,
          location: {
            type: 'Point',
            coordinates
          },
          ownerPhone,
          preferredLanguage: preferredLanguage || 'English'
        },
        { new: true }
      );
      if (!updatedCompany) {
        return res.status(404).json({ error: 'Company not found or unauthorized' });
      }
      return res.json(updatedCompany);
    } else {
      const newCompany = await CompanyProfile.create({
        companyName,
        category,
        address,
        location: {
          type: 'Point',
          coordinates
        },
        ownerPhone,
        ownerEmail: email,
        preferredLanguage: preferredLanguage || 'English',
        isVerified: false
      });
      return res.status(201).json(newCompany);
    }
  } catch (error: any) {
    console.error('Error saving company profile:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------
// Jobs Endpoints
// ----------------------------------------

app.get('/api/jobs', async (req, res) => {
  try {
    const { companyId, seekerEmail, lat, lng, distance = '5' } = req.query;

    await connectToDatabase();

    // Case 1: Return jobs for specific company
    if (companyId) {
      const jobs = await JobPost.find({ companyId }).sort({ postedAt: -1 });
      return res.json(jobs);
    }

    // Case 2: Nearby jobs filtering
    let searchCoordinates: [number, number] | null = null;

    if (lat && lng) {
      searchCoordinates = [parseFloat(lng as string), parseFloat(lat as string)];
    } else {
      const email = seekerEmail as string || getAuthEmail(req);
      if (email) {
        const seeker = await SeekerProfile.findOne({ email });
        if (seeker && seeker.location?.coordinates) {
          searchCoordinates = seeker.location.coordinates;
        }
      }
    }

    if (searchCoordinates) {
      const distanceInMeters = parseFloat(distance as string) * 1000;
      
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
      
      const jobs = await JobPost.find({
        companyId: { $in: companyIds },
        status: 'open'
      }).populate('companyId').sort({ postedAt: -1 });

      return res.json(jobs);
    }

    // Case 3: Return all open jobs
    const allOpenJobs = await JobPost.find({ status: 'open' }).populate('companyId').sort({ postedAt: -1 });
    return res.json(allOpenJobs);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { companyId, title, category, payType, payMin, payMax, shiftTiming, requiredSkills } = req.body;

    if (!companyId || !title || !category || !payType || !payMin || !shiftTiming) {
      return res.status(400).json({ error: 'Required job post fields are missing' });
    }

    await connectToDatabase();

    const company = await CompanyProfile.findOne({ _id: companyId, ownerEmail: email });
    if (!company) {
      return res.status(403).json({ error: 'Unauthorized or company not found' });
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

    return res.status(201).json(newJob);
  } catch (error: any) {
    console.error('Error posting job:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/jobs', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId, title, category, payType, payMin, payMax, shiftTiming, requiredSkills, status } = req.body;

    if (!jobId || !title || !category || !payType || !payMin || !shiftTiming) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    await connectToDatabase();

    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const company = job.companyId as any;
    if (!company || company.ownerEmail !== email) {
      return res.status(403).json({ error: 'Unauthorized' });
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
    return res.json(job);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jobs', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const jobId = req.query.jobId as string;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    await connectToDatabase();

    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const company = job.companyId as any;
    if (!company || company.ownerEmail !== email) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Application.deleteMany({ jobId });
    await JobPost.findByIdAndDelete(jobId);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Translation Endpoint
app.post('/api/jobs/translate', async (req, res) => {
  try {
    const { jobs, targetLanguage } = req.body;
    if (!jobs || !Array.isArray(jobs) || !targetLanguage) {
      return res.status(400).json({ error: 'Jobs and targetLanguage are required' });
    }

    if (targetLanguage.toLowerCase() === 'english') {
      return res.json(jobs);
    }

    const translatedJobs = await Promise.all(jobs.map(async (job: any) => {
      try {
        const transTitle = await translateText(job.title, targetLanguage);
        const transCategory = await translateText(job.category, targetLanguage);
        const transShift = await translateText(job.shiftTiming, targetLanguage);
        
        const transSkills = job.requiredSkills && job.requiredSkills.length > 0
          ? await Promise.all(job.requiredSkills.map((s: string) => translateText(s, targetLanguage)))
          : [];

        return {
          ...job,
          title: transTitle,
          category: transCategory,
          shiftTiming: transShift,
          requiredSkills: transSkills,
          isTranslated: true
        };
      } catch (err) {
        console.error(`Error translating job ${job._id}:`, err);
        return job;
      }
    }));

    return res.json(translatedJobs);
  } catch (error: any) {
    console.error('Translation route error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------
// Applications Endpoints
// ----------------------------------------

function getDistanceInKm(coord1: [number, number], coord2: [number, number]): number {
  if (!coord1 || !coord2) return 0;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

app.get('/api/applications', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.query.role as string;

    await connectToDatabase();

    if (role === 'employer') {
      const companies = await CompanyProfile.find({ ownerEmail: email });
      const companyIds = companies.map(c => c._id);
      const jobs = await JobPost.find({ companyId: { $in: companyIds } });
      const jobIds = jobs.map(j => j._id);

      const applications = await Application.find({ jobId: { $in: jobIds } })
        .populate('jobId')
        .sort({ createdAt: -1 });

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

      return res.json(appsWithSeekers);
    } else {
      const applications = await Application.find({ seekerEmail: email })
        .populate({
          path: 'jobId',
          populate: { path: 'companyId' }
        })
        .sort({ createdAt: -1 });

      return res.json(applications);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    await connectToDatabase();

    const seeker = await SeekerProfile.findOne({ email });
    if (!seeker) {
      return res.status(400).json({ error: 'Please create a seeker profile first' });
    }

    const existingApp = await Application.findOne({ seekerEmail: email, jobId });
    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    const job = await JobPost.findById(jobId).populate('companyId');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const company = job.companyId as any;
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

    let translatedResumeText = resumeText;
    if (seekerLang.toLowerCase() !== companyLang.toLowerCase()) {
      try {
        translatedResumeText = await translateText(resumeText, companyLang);
      } catch (err) {
        console.error('Failed to translate pitch:', err);
      }
    }

    let distanceKm = 0;
    if (seeker.location?.coordinates && company.location?.coordinates) {
      distanceKm = getDistanceInKm(seeker.location.coordinates, company.location.coordinates);
    }

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

    return res.status(201).json(application);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/applications', async (req, res) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { applicationId, status } = req.body;
    if (!applicationId || !status) {
      return res.status(400).json({ error: 'Application ID and status are required' });
    }

    await connectToDatabase();

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const job = application.jobId as any;
    const company = await CompanyProfile.findById(job.companyId);
    if (!company || company.ownerEmail !== email) {
      return res.status(403).json({ error: 'Unauthorized to update this application' });
    }

    application.status = status;
    await application.save();

    return res.json(application);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------
// AI Chat Endpoint
// ----------------------------------------

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages array' });
    }

    await connectToDatabase();
    const email = getAuthEmail(req);

    let seeker = null;
    let companies: any[] = [];
    let isEmployer = false;

    if (email) {
      seeker = await SeekerProfile.findOne({ email });
      companies = await CompanyProfile.find({ ownerEmail: email });
      isEmployer = companies.length > 0;
    }

    const openJobs = await JobPost.find({ status: 'open' }).populate('companyId');
    const jobsSummary = openJobs.map(job => {
      const company = job.companyId as any;
      return {
        id: job._id.toString(),
        title: job.title,
        category: job.category,
        companyName: company?.companyName || 'Unknown Company',
        locality: company?.address || 'Local area',
        pay: `${job.payType === 'monthly' ? '₹' : ''}${job.payMin}${job.payMax ? ' - ₹' : ''}${job.payMax || ''} ${job.payType}`,
        shift: job.shiftTiming,
        skillsRequired: job.requiredSkills.join(', '),
      };
    });

    const systemPrompt = `You are "JobHunt AI", a friendly, helpful, and professional AI chatbot assistant integrated into a local job portal. 
Your goal is to help both job seekers and employers navigate the portal, find work, and manage their recruitment.

Current User Type: ${isEmployer ? 'Employer/Company Owner' : 'Job Seeker'}
${seeker ? `Seeker Profile Details:
- Name: ${seeker.name}
- Skills: ${seeker.skills.join(', ')}
- Locality: ${seeker.locality}
- Experience: ${seeker.experienceLevel}
- Preferred Language: ${seeker.preferredLanguage}` : 'User is not signed in or hasn\'t created a seeker profile yet.'}

${isEmployer ? `Employer Company Profiles: ${companies.map(c => c.companyName).join(', ')}` : ''}

Available Job Listings in Database:
${JSON.stringify(jobsSummary, null, 2)}

Instructions:
1. **Extremely Simple & Short**: Keep your responses extremely short (maximum 2-3 sentences). Use very simple, everyday words. Avoid long paragraphs, formatting fluff, or complex sentences.
2. **Friendly & Multilingual Tone**: Maintain a supportive and direct tone. Communicate in simple English or Hinglish if the user asks.
3. **Help Job Seekers**: Recommend matching jobs from the "Available Job Listings" above. Give only the key details (role, company, locality, pay) in 1-2 lines.
4. **Help Employers**: Give very brief tips on how to post a job or view applications.
5. **No fluff**: Answer immediately without long greetings or preambles.`;

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return res.json({
        response: "Hello! JobHunt AI is currently in offline helper mode. Please make sure your GEMINI_API_KEY is configured in the backend environment to access all features. For now, please feel free to browse the open jobs on the dashboard!"
      });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const chatHistory = messages.slice(0, messages.length - 1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
      chatHistory.shift();
    }

    const latestUserMessage = messages[messages.length - 1].content;
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 800 }
    });

    const result = await chat.sendMessage(latestUserMessage);
    const text = result.response.text();

    return res.json({ response: text });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export default app;
