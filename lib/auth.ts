import { randomBytes, createHash } from "crypto";
import jwt from "jsonwebtoken";
import { SESSION, OTP, CLAIM_TOKEN } from "./constants";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export function generateRequestId(): string {
  return randomBytes(32).toString("hex");
}

export function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < OTP.length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export function generateClaimToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateSessionToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: SESSION.durationSeconds,
  });
}

export function verifySessionToken(
  token: string
): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

export function extractOriginFromReferrer(
  referrer: string | null
): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.origin;
  } catch {
    return null;
  }
}

export function getOTPExpiry(): Date {
  return new Date(Date.now() + OTP.expiryMs);
}

export function getClaimTokenExpiry(): Date {
  return new Date(Date.now() + CLAIM_TOKEN.expiryMs);
}

export function getAuthRequestExpiry(): Date {
  // Auth requests expire after 30 minutes if not completed
  return new Date(Date.now() + 30 * 60 * 1000);
}
