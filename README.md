# JobHunt: Local Job Finder & AI Resume Builder

JobHunt is a premium full-stack web application designed to connect local part-time job seekers with employers and small businesses. It features location-based job matching, an interactive AI Career Guide, and automated AI resume/pitch generation.

---

## 🚀 Key Features

### 👤 Job Seeker Dashboard
* **Instant Sign Up & Login**: Secure email-password authentication with inline validation checks.
* **Locality Search**: Search for jobs near any specific neighborhood/city using geocoding.
* **Pill Chips for Skills**: View beautifully highlighted required skills tags on job cards.
* **Hired Contact Unlock**: Seeker automatically unlocks the employer's phone number once they are marked as hired.
* **Real-time Background Updates**: Background polling refreshes jobs, applications, and status updates silently every 10 seconds.

### 🏢 Employer Dashboard
* **Company Registration**: Fast company profiling with address coordinates.
* **Applications Management**: View applications received, shortlist candidates, reject, or mark them as hired.
* **Locked Hiring States**: Once a candidate is marked as "Hired", other action buttons (shortlist, reject) are disabled to prevent accidental status changes.
* **Candidate Phone Security**: Seeker phone numbers are hidden (`Hidden until hired`) until marked as "Hired".
* **Filtered Applications View**: Direct "Applications (N)" action button on job posts to filter the applications tab specifically for that job.

### 🤖 JobHunt AI Assistant
* **AI Chat Guide**: A sidebar chatbot powered by `gemini-2.5-flash` in the seeker view.
* **Ultra-Concise Tips**: Instructed to provide responses in simple words, avoiding fluff, capped at a maximum of 2-3 sentences.
* **Automatic Pitch Generation**: Generates an AI resume/pitch translated to the seeker's preferred language when applying to a job.

---

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, Vanilla CSS (with glassmorphism theme styling)
* **Backend**: Node.js, Express, Mongoose
* **Database**: MongoDB (with automated `2dsphere` geospatial index building on startup)
* **AI Model**: Google Gemini API (`gemini-2.5-flash`)

---

## 💻 Local Setup & Development

### 1. Install dependencies for all folders
Run the following script in the root directory to install packages for root, backend, and frontend:
```bash
npm run install-all
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend` folder:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/job_hunt
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 3. Launch Development Servers
Run the concurrent dev command in the root folder to start both Express and Vite frontend servers:
```bash
npm run dev
```
* Frontend will run on: `http://localhost:5173`
* Backend will run on: `http://localhost:3001`

---

## ☁️ Vercel Deployment

The project is fully configured for a **Vercel-only** deployment.

1. **Commit and Push** your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: project completed"
   git push -u origin main
   ```
2. Import the repository in **Vercel**.
3. Set the **Framework Preset** to **Other** (it will read `npm run build` from the root `package.json` to compile the backend and frontend).
4. Add environment variables:
   * `MONGODB_URI`: *Your cloud MongoDB Atlas URI.*
   * `GEMINI_API_KEY`: *Your Gemini API key.*
5. Deploy! Vercel's serverless configurations in `vercel.json` will route all api and asset traffic under a single domain.
