import mongoose, { Schema, Document, Model } from 'mongoose';

// Seeker Profile Schema
export interface ISeekerProfile extends Document {
  email: string;
  phone?: string;
  name: string;
  skills: string[];
  availability: string[];
  experienceLevel: string;
  locality: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  languages: string[];
  preferredLanguage: string;
  photo?: string;
  createdAt: Date;
}

const SeekerProfileSchema = new Schema<ISeekerProfile>({
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  name: { type: String, required: true },
  skills: [{ type: String }],
  availability: [{ type: String }],
  experienceLevel: { type: String, required: true },
  locality: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  languages: [{ type: String }],
  preferredLanguage: { type: String, default: 'English' },
  photo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

SeekerProfileSchema.index({ location: '2dsphere' });

export const SeekerProfile: Model<ISeekerProfile> = 
  mongoose.models.SeekerProfile || mongoose.model<ISeekerProfile>('SeekerProfile', SeekerProfileSchema);

// Company Profile Schema
export interface ICompanyProfile extends Document {
  companyName: string;
  category: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  ownerPhone: string;
  ownerEmail: string;
  preferredLanguage: string;
  isVerified: boolean;
  createdAt: Date;
}

const CompanyProfileSchema = new Schema<ICompanyProfile>({
  companyName: { type: String, required: true },
  category: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, required: true, index: true },
  preferredLanguage: { type: String, default: 'English' },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

CompanyProfileSchema.index({ location: '2dsphere' });

export const CompanyProfile: Model<ICompanyProfile> = 
  mongoose.models.CompanyProfile || mongoose.model<ICompanyProfile>('CompanyProfile', CompanyProfileSchema);

// Job Post Schema
export interface IJobPost extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  category: string;
  payType: 'fixed' | 'hourly' | 'monthly';
  payMin: number;
  payMax?: number;
  shiftTiming: string;
  requiredSkills: string[];
  status: 'open' | 'filled' | 'expired';
  postedAt: Date;
}

const JobPostSchema = new Schema<IJobPost>({
  companyId: { type: Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  payType: { type: String, enum: ['fixed', 'hourly', 'monthly'], required: true },
  payMin: { type: Number, required: true },
  payMax: { type: Number },
  shiftTiming: { type: String, required: true },
  requiredSkills: [{ type: String }],
  status: { type: String, enum: ['open', 'filled', 'expired'], default: 'open', index: true },
  postedAt: { type: Date, default: Date.now }
});

export const JobPost: Model<IJobPost> = 
  mongoose.models.JobPost || mongoose.model<IJobPost>('JobPost', JobPostSchema);

// Application Schema
export interface IApplication extends Document {
  seekerEmail: string;
  jobId: mongoose.Types.ObjectId;
  resumeText: string;
  translatedResumeText?: string;
  fitScore?: number;
  fitExplanation?: string;
  status: 'applied' | 'viewed' | 'shortlisted' | 'hired' | 'rejected';
  createdAt: Date;
}

const ApplicationSchema = new Schema<IApplication>({
  seekerEmail: { type: String, required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobPost', required: true, index: true },
  resumeText: { type: String, required: true },
  translatedResumeText: { type: String },
  fitScore: { type: Number },
  fitExplanation: { type: String },
  status: { type: String, enum: ['applied', 'viewed', 'shortlisted', 'hired', 'rejected'], default: 'applied' },
  createdAt: { type: Date, default: Date.now }
});

export const Application: Model<IApplication> = 
  mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

// User Auth Schema
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

