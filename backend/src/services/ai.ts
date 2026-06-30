import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface GeneratorParams {
  seeker: {
    name: string;
    skills: string[];
    availability: string[];
    experienceLevel: string;
    locality: string;
    languages: string[];
  };
  job: {
    title: string;
    companyName: string;
    category: string;
    shiftTiming: string;
    requiredSkills: string[];
    payInfo: string;
  };
  pitchLanguage?: string;
}

export async function generateAIResume({ seeker, job, pitchLanguage = 'English' }: GeneratorParams): Promise<string> {
  const prompt = `You are an AI assistant creating a short, tailored introduction pitch in bullet points for a part-time job applicant. The application is for local, entry-level, or part-time work (not professional corporate roles).
  
Applicant Details:
- Name: ${seeker.name}
- Skills: ${seeker.skills.join(', ')}
- Availability: ${seeker.availability.join(', ')}
- Experience Level: ${seeker.experienceLevel}
- Location/Locality: ${seeker.locality}
- Languages: ${seeker.languages.join(', ')}

Job Details:
- Title: ${job.title}
- Company Name: ${job.companyName}
- Category: ${job.category}
- Shift Timing: ${job.shiftTiming}
- Required Skills: ${job.requiredSkills.join(', ')}
- Pay: ${job.payInfo}

Requested Pitch Language: ${pitchLanguage}

Instructions:
Write a short, tailored summary pitch for the company owner/manager in 3 to 4 bullet points (each starting with a bullet '• ').
Highlight why their availability, locality, and specific skills make them a great fit for this job. Keep it friendly, practical, and direct. Do not use generic corporate jargon.

CRITICAL LANGUAGE REQUIREMENT:
- Write the ENTIRE pitch in the requested language: "${pitchLanguage}".
- If "Hinglish" is requested, write in conversational, natural Latin-script Hinglish (a blend of Hindi and English written using the English alphabet, e.g., "Mera naam Rohan hai aur main Koramangala mein rehta hoon...").
- If a regional language is requested (like Hindi, Kannada, Tamil, Telugu, Bengali), output the bullets in the native script of that language (e.g. Hindi in Devanagari script, Kannada in Kannada script, etc.).
- Output ONLY the bullet points. Do not include any titles, introductions, or conversational preambles.`;

  if (!genAI) {
    console.log('[AI RESUME SERVICE] GEMINI_API_KEY is not configured. Falling back to local mock generator.');
    return generateMockResume(seeker, job, pitchLanguage);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (error) {
    console.error('Gemini API error, falling back to mock:', error);
    return generateMockResume(seeker, job, pitchLanguage);
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const prompt = `You are a professional translator. Translate the following text into "${targetLanguage}".
- Keep the structure, bullet points, tone, and formatting exactly the same.
- If translating into a regional Indian language (like Hindi, Kannada, Tamil, Telugu, Bengali), use the native script of that language.
- If translating to Hinglish, use Latin alphabet script and keep it highly conversational and natural.
- Output ONLY the translated text. No explanations, no introductory notes, no markdown block wrappers.

Text to translate:
"""
${text}
"""`;

  if (!genAI) {
    console.log('[AI TRANSLATION SERVICE] GEMINI_API_KEY is not configured. Falling back to local mock translator.');
    return generateMockTranslation(text, targetLanguage);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (error) {
    console.error('Gemini translation error, falling back to mock:', error);
    return generateMockTranslation(text, targetLanguage);
  }
}

export async function generateFitAnalysis(
  seeker: {
    skills: string[];
    availability: string[];
    experienceLevel: string;
    locality: string;
  },
  job: {
    title: string;
    requiredSkills: string[];
    shiftTiming: string;
  },
  distanceKm: number,
  companyLanguage: string = 'English'
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are an AI assistant analyzing a job candidate for a local small business/company posting.
  
Candidate details:
- Skills: ${seeker.skills.join(', ')}
- Availability: ${seeker.availability.join(', ')}
- Experience Level: ${seeker.experienceLevel}
- Commuting Area: ${seeker.locality}
- Proximity Distance: ${distanceKm} km (For local hiring: <3km is exceptional/perfect, 3-7km is good, >10km is far/less ideal)

Job details:
- Title: ${job.title}
- Required Skills: ${job.requiredSkills.join(', ')}
- Shift Schedule: ${job.shiftTiming}

Instructions:
Evaluate and return a suitability score between 0 and 100 based on proximity, skill match, and shift availability.
Also write a 1-sentence explanation of why they got this score, highlighting the distance/commute if they live close (e.g., "Lives only 1.2km away, matches cash management requirements, and is available for this shift").
Write the explanation in the requested language: "${companyLanguage}". If "Hinglish" is requested, write in conversational Latin script Hinglish.

Output ONLY a raw JSON object matching the format below. Do not include markdown formatting or block backticks:
{
  "score": 90,
  "explanation": "..."
}`;

  if (!genAI) {
    console.log('[AI FIT SERVICE] GEMINI_API_KEY is not configured. Falling back to local mock analyzer.');
    return generateMockFitAnalysis(seeker, job, distanceKm, companyLanguage);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();
    const cleanText = text.replace(/```json/i, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return {
      score: Number(parsed.score || 70),
      explanation: parsed.explanation || 'Good fit candidate based on qualifications.'
    };
  } catch (error) {
    console.error('Gemini fit analysis error, falling back to mock:', error);
    return generateMockFitAnalysis(seeker, job, distanceKm, companyLanguage);
  }
}

function generateMockTranslation(text: string, targetLanguage: string): string {
  if (targetLanguage.toLowerCase() === 'english') {
    return text.replace(/[•\s]+[^\n]+/g, (match) => {
      if (match.includes('ಉದ್ಯೋಗಿ') || match.includes('ಅಭ್ಯರ್ಥಿ') || match.includes('उम्मीदवार') || match.includes('விண்ணப்பதாரர்')) {
        return '\n• Candidate: Hardworking applicant available to join immediately.';
      }
      return match;
    });
  }
  return `• [Translated to ${targetLanguage}]:\n${text}`;
}

function generateMockFitAnalysis(seeker: any, job: any, distanceKm: number, companyLanguage: string): { score: number; explanation: string } {
  let score = 90;
  if (distanceKm > 10) score -= 25;
  else if (distanceKm > 5) score -= 15;
  else if (distanceKm > 3) score -= 5;

  const matchedSkillsCount = seeker.skills.filter((s: string) => job.requiredSkills.includes(s)).length;
  if (matchedSkillsCount === 0 && job.requiredSkills.length > 0) score -= 15;
  else score += matchedSkillsCount * 3;

  score = Math.max(45, Math.min(98, score));

  let explanation = `Lives only ${distanceKm}km away in ${seeker.locality}, matches job profile and available for shifts.`;

  if (companyLanguage === 'Hinglish') {
    explanation = `Sirf ${distanceKm}km door ${seeker.locality} mein rehte hain, required skills match karte hain aur shifts ke liye ready hain.`;
  } else if (companyLanguage === 'Hindi') {
    explanation = `${seeker.locality} में केवल ${distanceKm} किमी दूर रहते हैं, आवश्यक कौशल मेल खाते हैं और शिफ्ट के लिए उपलब्ध हैं।`;
  } else if (companyLanguage === 'Kannada') {
    explanation = `${seeker.locality} ನಲ್ಲಿ ಕೇವಲ ${distanceKm} ಕಿಮೀ ದೂರದಲ್ಲಿದ್ದಾರೆ, ಕೌಶಲ್ಯಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ ಮತ್ತು ಶಿಫ್ಟ್‌ಗೆ ಲಭ್ಯವಿದ್ದಾರೆ.`;
  } else if (companyLanguage === 'Tamil') {
    explanation = `${seeker.locality} இல் வெறும் ${distanceKm} கிமீ దూరத்தில் வசிக்கிறார், திறன்கள் பொருந்துகின்றன, ஷிப்டுக்கு தயாராக உள்ளார்.`;
  } else if (companyLanguage === 'Telugu') {
    explanation = `${seeker.locality} లో కేవలం ${distanceKm} కిమీ దూరంలో నివసిస్తున్నారు, నైపుణ్యాలు సరిపోతాయి మరియు షిఫ్ట్‌కి అందుబాటులో ఉన్నారు.`;
  } else if (companyLanguage === 'Bengali') {
    explanation = `${seeker.locality} এ মাত্র ${distanceKm} কিমি দূরে থাকেন, দক্ষতা মিলে গেছে এবং শিফটের জন্য উপলব্ধ আছেন।`;
  }

  return { score, explanation };
}

function generateMockResume(
  seeker: GeneratorParams['seeker'],
  job: GeneratorParams['job'],
  pitchLanguage: string
): string {
  const skillsStr = seeker.skills.slice(0, 3).join(' and ');
  const langStr = seeker.languages.join(', ');

  if (pitchLanguage === 'Hinglish') {
    return `• Candidate: ${seeker.name} commutes locally from ${seeker.locality}, jo daily time par aane ke liye sahi hai.
• Skills & Languages: ${skillsStr || 'kaam karne'} ka experience hai aur ${langStr} mein baat kar sakte hain.
• Shift Fit: ${seeker.availability.join(', ')} ke liye available hain, jo aapki shift: "${job.shiftTiming}" se match karta hai.
• Experience Level: "${seeker.experienceLevel}" level hai aur mehnat se kaam karne ke liye excited hain.`;
  }

  if (pitchLanguage === 'Hindi') {
    return `• उम्मीदवार: ${seeker.name} ${seeker.locality} से आसानी से काम पर आ सकते हैं, जिससे समय की बचत होगी।
• कौशल और भाषाएं: ${skillsStr || 'सामान्य कार्यों'} में अनुभवी हैं और ${langStr} भाषा बोलते हैं।
• शिफ्ट अनुकूलता: ${seeker.availability.join(', ')} के दौरान काम करने के लिए उपलब्ध हैं, जो आपकी शिफ्ट "${job.shiftTiming}" से मेल खाता है।
• अनुभव स्तर: "${seeker.experienceLevel}" अनुभव है और कड़ी मेहनत करने के लिए तैयार हैं।`;
  }

  if (pitchLanguage === 'Kannada') {
    return `• ಅಭ್ಯರ್ಥಿ: ${seeker.name} ಅವರು ${seeker.locality} ಯಿಂದ ಸುಲಭವಾಗಿ ಪ್ರಯಾಣಿಸಬಲ್ಲರು, ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಕೆಲಸಕ್ಕೆ ಹಾಜರಾಗುತ್ತಾರೆ.
• ಕೌಶಲ್ಯಗಳು: ${skillsStr || 'ಕೆಲಸಗಳಲ್ಲಿ'} ಅನುಭವ ಹೊಂದಿದ್ದಾರೆ ಮತ್ತು ${langStr} ಭาಷೆಗಳನ್ನು ಮಾತನಾಡುತ್ತಾರೆ.
• ಶಿಫ್ಟ್ ಹೊಂದಾಣಿಕೆ: ${seeker.availability.join(', ')} ಸಮಯದಲ್ಲಿ ಲಭ್ಯವಿದ್ದು, ನಿಮ್ಮ ಶಿಫ್ಟ್ "${job.shiftTiming}" ಸಮಯಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ.
• ಅನುಭವ ಮಟ್ಟ: "${seeker.experienceLevel}" ಅನುಭವವಿದ್ದು, ಶ್ರದ್ಧೆಯಿಂದ ಕೆಲಸ ಮಾಡಲು ಸಿದ್ಧರಿದ್ದಾರೆ.`;
  }

  if (pitchLanguage === 'Tamil') {
    return `• விண்ணப்பதாரர்: ${seeker.name} அவர்கள் ${seeker.locality} பகுதியிலிருந்து எளிதாகப் பணிக்கு வர முடியும், இது தினசரி வருகையை உறுதி செய்கிறது.
• திறன்கள் மற்றும் மொழிகள்: ${skillsStr || 'பணிகளில்'} அனுபவம் வாய்ந்தவர் மற்றும் ${langStr} பேசக்கூடியவர்.
• ஷிப்ட் பொருத்தம்: ${seeker.availability.join(', ')} நேரங்களில் பணிபுரியக் கிடைக்கிறார், இது உங்கள் ஷிப்ட் நேரத்துடன் ("${job.shiftTiming}") ஒத்துப்போகிறது.
• அனுபவம்: "${seeker.experienceLevel}" அனுபவம் கொண்டவர், கடின உழைப்புடன் பணியாற்றத் தயாராக உள்ளார்.`;
  }

  if (pitchLanguage === 'Telugu') {
    return `• అభ్యర్థి: ${seeker.name} ${seeker.locality} నుండి సులభంగా ప్రయాణించగలరు, రోజువారీ సమయపాలనను పాటిస్తారు.
• నైపుణ్యాలు & భాషలు: ${skillsStr || 'పనులలో'} అనుభవం ఉంది మరియు ${langStr} మాట్లాడగలరు.
• షిఫ్ట్ కుదురుబాటు: ${seeker.availability.join(', ')} సమయాలలో అందుబాటులో ఉంటారు, ఇది మీ షిఫ్ట్ టైమింగ్స్ "${job.shiftTiming}" కి సరిపోతుంది.
• అనుభవం స్థాయి: "${seeker.experienceLevel}" అనుభవం ఉంది మరియు కష్టపడి పనిచేయడానికి సిద్ధంగా ఉన్నారు.`;
  }

  if (pitchLanguage === 'Bengali') {
    return `• প্রার্থী: ${seeker.name} ${seeker.locality} থেকে যাতায়াত করবেন, যা দৈনিক কাজের জন্য অত্যন্ত সুবিধাজনক।
• দক্ষতা ও ভাষা: ${skillsStr || 'সাধারণ কাজে'} অভিজ্ঞ এবং ${langStr} ভাষায় কথা বলতে পারেন।
• শিফট ফিট: ${seeker.availability.join(', ')} সময়ে কাজ করতে উপলব্ধ, যা আপনার শিফট "${job.shiftTiming}" এর সাথে পুরোপুরি মিলে যায়।
• কাজের মানসিকতা: "${seeker.experienceLevel}" অভিজ্ঞতা রয়েছে এবং কঠোর পরিশ্রম করতে আগ্রহী।`;
  }

  return `• Candidate: ${seeker.name} commutes locally from ${seeker.locality}, ensuring a reliable daily arrival.
• Skills & Languages: Experienced in ${skillsStr || 'handling general tasks'} and communicates fluently in ${langStr}.
• Shift Fit: Fully available during ${seeker.availability.join(', ')}, aligning perfectly with your shift: "${job.shiftTiming}".
• Experience Level: Rated as "${seeker.experienceLevel}" and eager to bring a helpful, hardworking attitude.`;
}
