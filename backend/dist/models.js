"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Application = exports.JobPost = exports.CompanyProfile = exports.SeekerProfile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SeekerProfileSchema = new mongoose_1.Schema({
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
exports.SeekerProfile = mongoose_1.default.models.SeekerProfile || mongoose_1.default.model('SeekerProfile', SeekerProfileSchema);
const CompanyProfileSchema = new mongoose_1.Schema({
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
exports.CompanyProfile = mongoose_1.default.models.CompanyProfile || mongoose_1.default.model('CompanyProfile', CompanyProfileSchema);
const JobPostSchema = new mongoose_1.Schema({
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
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
exports.JobPost = mongoose_1.default.models.JobPost || mongoose_1.default.model('JobPost', JobPostSchema);
const ApplicationSchema = new mongoose_1.Schema({
    seekerEmail: { type: String, required: true, index: true },
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'JobPost', required: true, index: true },
    resumeText: { type: String, required: true },
    translatedResumeText: { type: String },
    fitScore: { type: Number },
    fitExplanation: { type: String },
    status: { type: String, enum: ['applied', 'viewed', 'shortlisted', 'hired', 'rejected'], default: 'applied' },
    createdAt: { type: Date, default: Date.now }
});
exports.Application = mongoose_1.default.models.Application || mongoose_1.default.model('Application', ApplicationSchema);
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
