"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("./models");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/job_hunt';
async function connectToDatabase() {
    if (mongoose_1.default.connection.readyState >= 1) {
        return mongoose_1.default.connection;
    }
    try {
        await mongoose_1.default.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('Connected to MongoDB successfully');
        // Ensure geo indexes are built
        await models_1.SeekerProfile.createIndexes();
        await models_1.CompanyProfile.createIndexes();
        console.log('Database indexes synchronized successfully');
        return mongoose_1.default.connection;
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}
