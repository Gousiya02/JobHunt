import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { JobPost, SeekerProfile, CompanyProfile } from '@/lib/models';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function getAuthEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    await connectToDatabase();
    const email = await getAuthEmail();

    let seeker = null;
    let companies: any[] = [];
    let isEmployer = false;

    if (email) {
      // Find seeker profile if exists
      seeker = await SeekerProfile.findOne({ email });
      // Find employer profile(s) if exists
      companies = await CompanyProfile.find({ ownerEmail: email });
      isEmployer = companies.length > 0;
    }

    // Retrieve open jobs to provide recommendations
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
1. **Friendly & Multilingual Tone**: Maintain a friendly, supportive, and conversational tone. If the user prefers, communicate in Hinglish (a mixture of Hindi and English written in Latin script) or English.
2. **Help Job Seekers**:
   - Recommend matching jobs from the "Available Job Listings" above. Give role, company name, location, salary range, shift timings, and mention they can find these jobs in the dashboard.
   - Guide them on how to improve their skills and resumes. Provide tips based on their profile skills.
   - Suggest courses or ways to build employability.
   - Explain how to register, apply, and prepare for interviews.
3. **Help Employers**:
   - Provide guidance on how to post a job on the portal (clicking "Post a Job", entering title, shifts, pay, and skills).
   - Tell them how to find candidates in their "Applications" tab.
4. **Registration / Flow Guidance**:
   - Keep profile editing in the "My Profile" tab. If they want to edit their skills/details, tell them to go to the "My Profile" tab.
5. **Formatting**: Present recommendations as clean bullet points. When citing jobs, include the job ID/title clearly.
6. **Fallback**: If no jobs match, suggest related categories or tell them to check the distance filter on the homepage.
7. If no GEMINI_API_KEY is configured, act as a helpful helper.

Be conversational, concise, and structured.`;

    if (!genAI) {
      return NextResponse.json({
        response: "Hello! JobHunt AI is currently in offline helper mode. Please make sure your GEMINI_API_KEY is configured in .env.local to access all features. For now, please feel free to browse the open jobs on the dashboard!"
      });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    // Convert message history to Gemini format
    // Gemini chat API uses: history: [ { role: 'user' | 'model', parts: [ { text: string } ] } ]
    const chatHistory = messages.slice(0, messages.length - 1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Gemini requires the first message in the history to be from the 'user'.
    // Remove any leading messages that are from the 'model' (assistant).
    while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
      chatHistory.shift();
    }

    const latestUserMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 800,
      }
    });

    const result = await chat.sendMessage(latestUserMessage);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

