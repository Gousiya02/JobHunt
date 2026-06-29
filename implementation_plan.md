# Implementation Plan - Local Job Finder & AI Resume Generator

We will build a responsive Web App using Next.js (App Router, TypeScript), Tailwind CSS (since it's default for Next.js, or we can use Vanilla CSS modules - wait, standard Next.js comes with CSS modules, but we'll use CSS modules / Vanilla CSS to adhere to the guidelines), MongoDB, and Anthropic's API.

---

## User Review Required

> [!IMPORTANT]
> **Authentication Method**: We will implement a custom, session-based OTP system with MongoDB (saving OTPs with expiration times). We will provide a **mock console output** for local testing (so you can see the OTP in terminal logs) and configure Twilio Verify or custom SMS gateway integrations through environment variables. This avoids requiring a Supabase or Twilio setup immediately.
> Please confirm if this approach is acceptable or if you'd prefer to start with a configured Supabase / Twilio connection first.

> [!NOTE]
> **AI Model Configuration**: We will target the `claude-3-5-haiku-20241022` (or the user-specified `claude-haiku-4-5-20251001` as configured in `.env`) for generating short (~120–180 word) pitches. If the `ANTHROPIC_API_KEY` is missing in development, we will use a rule-based mock generator so the app remains fully functional without keys.

---

## Proposed Changes

### Project Initialization

We will bootstrap the Next.js app in the root directory:
`npx -y create-next-app@latest ./ --ts --app --src-dir --eslint --disable-git --use-npm --yes`

### Styling
- We will use Vanilla CSS / CSS Modules to construct a premium, dark-mode themed, modern UI with rich animations and transitions.

### Database (MongoDB) & Schema Setup

We will create a helper utility to connect to MongoDB using `mongoose` or `mongodb` native driver. We will define 4 Mongoose Schemas:

1. **`SeekerProfile`**:
   - `phone`: String (unique index, primary identifier)
   - `name`: String
   - `skills`: Array of Strings (selected from a fixed pool: `"cashier"`, `"delivery"`, `"kitchen help"`, `"data entry"`, `"retail assistant"`, `"cleaning"`, `"security"`, etc.)
   - `availability`: Array of Strings (e.g., `["weekday_morning"`, `"weekend_evening"`])
   - `experienceLevel`: String (`"none"`, `"1-6 months"`, `"6-12 months"`, `"1+ years"`)
   - `locality`: String (e.g., `"Indiranagar"`, `"Koramangala"`)
   - `location`: `{ type: "Point", coordinates: [lng, lat] }` with a 2dsphere index for geo-queries
   - `languages`: Array of Strings
   - `photo`: String (optional base64 or URL)

2. **`ShopProfile`**:
   - `shopName`: String
   - `category`: String (e.g., `"Grocery"`, `"Restaurant"`, `"Clothing"`, `"Pharmacy"`)
   - `address`: String
   - `location`: `{ type: "Point", coordinates: [lng, lat] }` with a 2dsphere index
   - `ownerPhone`: String
   - `ownerEmail`: String
   - `isVerified`: Boolean (default `false`)

3. **`JobPost`**:
   - `shopId`: ObjectId (references `ShopProfile`)
   - `title`: String
   - `category`: String
   - `payFixed`: Number
   - `payRangeMin`: Number
   - `payRangeMax`: Number
   - `payType`: String (`"fixed"` | `"hourly"` | `"monthly"`)
   - `shiftTiming`: String
   - `requiredSkills`: Array of Strings
   - `status`: String (`"open"` | `"filled"` | `"expired"`)
   - `postedAt`: Date (default `Date.now`)

4. **`Application`**:
   - `seekerPhone`: String (references `SeekerProfile.phone`)
   - `jobId`: ObjectId (references `JobPost`)
   - `resumeText`: String (AI-generated short pitch)
   - `status`: String (`"applied"` | `"viewed"` | `"shortlisted"` | `"hired"` | `"rejected"`)
   - `createdAt`: Date (default `Date.now`)

---

## Geocoding Integration
We will use the **OpenStreetMap Nominatim API** to convert address text into `[longitude, latitude]` points during shop/seeker onboarding.

---

## AI Pitch Generator
When a seeker clicks "Apply":
1. The app queries the Seeker's Profile and the Job details.
2. Sends a structured prompt to the Anthropic API:
   - Seeker's structured details (name, skills, availability, locality, languages, experience)
   - Job requirements (title, category, pay, shift, required skills)
   - Request to generate a 120-180 word tailored pitch.
3. Saves the pitch in the `Application` record.
4. Simulates notifying the owner (e.g., UI display, optional console simulation for WhatsApp/Email).

---

## Verification Plan

### Automated/Manual Testing
- Run Next.js in development mode (`npm run dev`).
- Test Phone OTP flow using terminal console output.
- Onboard seekers and shops. Check coordinates generated using OpenStreetMap Nominatim.
- Post jobs from the Shop Dashboard.
- Search nearby jobs from Seeker Dashboard, filtering by distance (using MongoDB geospatial query).
- Apply to a job, verify AI resume generation, and check it inside the Employer Dashboard.
