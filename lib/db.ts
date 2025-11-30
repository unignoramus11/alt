import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db("alt_auth");

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// User types
export interface User {
  _id?: string;
  email: string;
  username?: string;
  rollNumber?: string;
  batch?: string;
  branch?: string;
  passwordHash?: string;
  hasPasswordAuth: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Auth request types
export interface AuthRequest {
  _id?: string;
  requestId: string;
  frozenOrigin: string;
  status: "waiting" | "authenticated" | "claimed";
  userId?: string;
  claimToken?: string;
  createdAt: Date;
  expiresAt: Date;
}

// OTP types
export interface OTPRecord {
  _id?: string;
  email: string;
  otp: string;
  type: "login" | "password_reset";
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}
