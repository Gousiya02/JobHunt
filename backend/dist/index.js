"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("./db.js");
const models_js_1 = require("./models.js");
const ai_js_1 = require("./services/ai.js");
const geocoding_js_1 = require("./services/geocoding.js");
dotenv_1.default.config();
// Load parent directory environment files as fallbacks
dotenv_1.default.config({ path: '../.env.local' });
dotenv_1.default.config({ path: '../.env' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Helper to get authenticated email from request headers
function getAuthEmail(req) {
    return req.headers['x-user-email'] || null;
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
        await (0, db_js_1.connectToDatabase)();
        // Fetch seeker profile
        const seeker = await models_js_1.SeekerProfile.findOne({ email });
        // Fetch company profiles
        const companies = await models_js_1.CompanyProfile.find({ ownerEmail: email });
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
    }
    catch (error) {
        console.error('Auth check error:', error);
        return res.status(500).json({ authenticated: false, error: error.message });
    }
});
// Password hashing helper using SHA-256
function hashPassword(password) {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
}
// User Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        await (0, db_js_1.connectToDatabase)();
        const existingUser = await models_js_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const newUser = new models_js_1.User({
            email,
            passwordHash: hashPassword(password)
        });
        await newUser.save();
        return res.json({ success: true, message: 'User registered successfully' });
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        let user = await models_js_1.User.findOne({ email });
        const isDemoUser = email === 'seeker@local.com' || email === 'owner@local.com';
        if (!user && isDemoUser) {
            // Auto-create demo users for convenient developer testing
            user = new models_js_1.User({
                email,
                passwordHash: hashPassword('password')
            });
            await user.save();
        }
        else if (!user) {
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
        const seeker = await models_js_1.SeekerProfile.findOne({ email });
        const companies = await models_js_1.CompanyProfile.find({ ownerEmail: email });
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
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const profile = await models_js_1.SeekerProfile.findOne({ email });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        return res.json(profile);
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        // Geocode locality
        const geocodeResult = await (0, geocoding_js_1.geocodeAddress)(locality);
        if (!geocodeResult) {
            return res.status(400).json({
                error: `Could not locate "${locality}" on the map. Please simplify the locality or check spelling (e.g. "BTM Layout, Bangalore").`
            });
        }
        const coordinates = [geocodeResult.lng, geocodeResult.lat];
        const updatedProfile = await models_js_1.SeekerProfile.findOneAndUpdate({ email }, {
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
        }, { new: true, upsert: true });
        return res.json(updatedProfile);
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const companies = await models_js_1.CompanyProfile.find({ ownerEmail: email });
        return res.json(companies);
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        // Geocode address
        const geocodeResult = await (0, geocoding_js_1.geocodeAddress)(address);
        if (!geocodeResult) {
            return res.status(400).json({
                error: `Could not locate "${address}" on the map. Please simplify the address or check spelling (e.g. "Whitefield, Bangalore").`
            });
        }
        const coordinates = [geocodeResult.lng, geocodeResult.lat];
        if (companyId) {
            const updatedCompany = await models_js_1.CompanyProfile.findOneAndUpdate({ _id: companyId, ownerEmail: email }, {
                companyName,
                category,
                address,
                location: {
                    type: 'Point',
                    coordinates
                },
                ownerPhone,
                preferredLanguage: preferredLanguage || 'English'
            }, { new: true });
            if (!updatedCompany) {
                return res.status(404).json({ error: 'Company not found or unauthorized' });
            }
            return res.json(updatedCompany);
        }
        else {
            const newCompany = await models_js_1.CompanyProfile.create({
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
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        // Case 1: Return jobs for specific company
        if (companyId) {
            const jobs = await models_js_1.JobPost.find({ companyId }).sort({ postedAt: -1 });
            return res.json(jobs);
        }
        // Case 2: Nearby jobs filtering
        let searchCoordinates = null;
        if (lat && lng) {
            searchCoordinates = [parseFloat(lng), parseFloat(lat)];
        }
        else {
            const email = seekerEmail || getAuthEmail(req);
            if (email) {
                const seeker = await models_js_1.SeekerProfile.findOne({ email });
                if (seeker && seeker.location?.coordinates) {
                    searchCoordinates = seeker.location.coordinates;
                }
            }
        }
        if (searchCoordinates) {
            const distanceInMeters = parseFloat(distance) * 1000;
            // Find nearby companies first
            const nearbyCompanies = await models_js_1.CompanyProfile.find({
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
            const jobs = await models_js_1.JobPost.find({
                companyId: { $in: companyIds },
                status: 'open'
            }).populate('companyId').sort({ postedAt: -1 });
            return res.json(jobs);
        }
        // Case 3: Return all open jobs
        const allOpenJobs = await models_js_1.JobPost.find({ status: 'open' }).populate('companyId').sort({ postedAt: -1 });
        return res.json(allOpenJobs);
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const company = await models_js_1.CompanyProfile.findOne({ _id: companyId, ownerEmail: email });
        if (!company) {
            return res.status(403).json({ error: 'Unauthorized or company not found' });
        }
        const newJob = await models_js_1.JobPost.create({
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
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const job = await models_js_1.JobPost.findById(jobId).populate('companyId');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const company = job.companyId;
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.delete('/api/jobs', async (req, res) => {
    try {
        const email = getAuthEmail(req);
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const jobId = req.query.jobId;
        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required' });
        }
        await (0, db_js_1.connectToDatabase)();
        const job = await models_js_1.JobPost.findById(jobId).populate('companyId');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const company = job.companyId;
        if (!company || company.ownerEmail !== email) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await models_js_1.Application.deleteMany({ jobId });
        await models_js_1.JobPost.findByIdAndDelete(jobId);
        return res.json({ success: true });
    }
    catch (error) {
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
        const translatedJobs = await Promise.all(jobs.map(async (job) => {
            try {
                const transTitle = await (0, ai_js_1.translateText)(job.title, targetLanguage);
                const transCategory = await (0, ai_js_1.translateText)(job.category, targetLanguage);
                const transShift = await (0, ai_js_1.translateText)(job.shiftTiming, targetLanguage);
                const transSkills = job.requiredSkills && job.requiredSkills.length > 0
                    ? await Promise.all(job.requiredSkills.map((s) => (0, ai_js_1.translateText)(s, targetLanguage)))
                    : [];
                return {
                    ...job,
                    title: transTitle,
                    category: transCategory,
                    shiftTiming: transShift,
                    requiredSkills: transSkills,
                    isTranslated: true
                };
            }
            catch (err) {
                console.error(`Error translating job ${job._id}:`, err);
                return job;
            }
        }));
        return res.json(translatedJobs);
    }
    catch (error) {
        console.error('Translation route error:', error);
        return res.status(500).json({ error: error.message });
    }
});
// ----------------------------------------
// Applications Endpoints
// ----------------------------------------
function getDistanceInKm(coord1, coord2) {
    if (!coord1 || !coord2)
        return 0;
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
}
app.get('/api/applications', async (req, res) => {
    try {
        const email = getAuthEmail(req);
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const role = req.query.role;
        await (0, db_js_1.connectToDatabase)();
        if (role === 'employer') {
            const companies = await models_js_1.CompanyProfile.find({ ownerEmail: email });
            const companyIds = companies.map(c => c._id);
            const jobs = await models_js_1.JobPost.find({ companyId: { $in: companyIds } });
            const jobIds = jobs.map(j => j._id);
            const applications = await models_js_1.Application.find({ jobId: { $in: jobIds } })
                .populate('jobId')
                .sort({ createdAt: -1 });
            const appsWithSeekers = await Promise.all(applications.map(async (app) => {
                const seeker = await models_js_1.SeekerProfile.findOne({ email: app.seekerEmail });
                const job = app.jobId;
                const company = job && job.companyId ? companies.find(c => c._id.toString() === job.companyId.toString()) : null;
                return {
                    ...app.toObject(),
                    seeker: seeker || { name: 'Unknown Seeker', email: app.seekerEmail, skills: [], locality: 'Unknown' },
                    companyName: company ? company.companyName : 'Unknown Company'
                };
            }));
            return res.json(appsWithSeekers);
        }
        else {
            const applications = await models_js_1.Application.find({ seekerEmail: email })
                .populate({
                path: 'jobId',
                populate: { path: 'companyId' }
            })
                .sort({ createdAt: -1 });
            return res.json(applications);
        }
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const seeker = await models_js_1.SeekerProfile.findOne({ email });
        if (!seeker) {
            return res.status(400).json({ error: 'Please create a seeker profile first' });
        }
        const existingApp = await models_js_1.Application.findOne({ seekerEmail: email, jobId });
        if (existingApp) {
            return res.status(400).json({ error: 'You have already applied to this job' });
        }
        const job = await models_js_1.JobPost.findById(jobId).populate('companyId');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const company = job.companyId;
        const payInfo = job.payType === 'fixed'
            ? `₹${job.payMin} (Fixed)`
            : `₹${job.payMin}${job.payMax ? ' - ₹' + job.payMax : ''} per ${job.payType}`;
        const seekerLang = seeker.preferredLanguage || 'English';
        const companyLang = company.preferredLanguage || 'English';
        const resumeText = await (0, ai_js_1.generateAIResume)({
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
                translatedResumeText = await (0, ai_js_1.translateText)(resumeText, companyLang);
            }
            catch (err) {
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
            const fitAnalysis = await (0, ai_js_1.generateFitAnalysis)({
                skills: seeker.skills || [],
                availability: seeker.availability || [],
                experienceLevel: seeker.experienceLevel || 'none',
                locality: seeker.locality || ''
            }, {
                title: job.title || '',
                requiredSkills: job.requiredSkills || [],
                shiftTiming: job.shiftTiming || ''
            }, distanceKm, companyLang);
            fitScore = fitAnalysis.score;
            fitExplanation = fitAnalysis.explanation;
        }
        catch (fitErr) {
            console.error('Failed to generate fit analysis:', fitErr);
        }
        const application = await models_js_1.Application.create({
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
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const application = await models_js_1.Application.findById(applicationId).populate('jobId');
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const job = application.jobId;
        const company = await models_js_1.CompanyProfile.findById(job.companyId);
        if (!company || company.ownerEmail !== email) {
            return res.status(403).json({ error: 'Unauthorized to update this application' });
        }
        application.status = status;
        await application.save();
        return res.json(application);
    }
    catch (error) {
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
        await (0, db_js_1.connectToDatabase)();
        const email = getAuthEmail(req);
        let seeker = null;
        let companies = [];
        let isEmployer = false;
        if (email) {
            seeker = await models_js_1.SeekerProfile.findOne({ email });
            companies = await models_js_1.CompanyProfile.find({ ownerEmail: email });
            isEmployer = companies.length > 0;
        }
        const openJobs = await models_js_1.JobPost.find({ status: 'open' }).populate('companyId');
        const jobsSummary = openJobs.map(job => {
            const company = job.companyId;
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
        const chatHistory = messages.slice(0, messages.length - 1).map((msg) => ({
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
    }
    catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({ error: error.message });
    }
});
// Start Server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
