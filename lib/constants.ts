// Color scheme
export const COLORS = {
  primary: "#614051", // Eggplant
  background: "#F2EBE2", // White Beige
} as const;

// Session configuration
export const SESSION = {
  cookieName: "alt_session",
  durationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  durationSeconds: 7 * 24 * 60 * 60, // 7 days in seconds
} as const;

// OTP configuration
export const OTP = {
  length: 6,
  expiryMs: 10 * 60 * 1000, // 10 minutes
} as const;

// Claim token configuration
export const CLAIM_TOKEN = {
  expiryMs: 5 * 60 * 1000, // 5 minutes
} as const;

// Branch options
export const BRANCHES = [
  "CSD",
  "CND",
  "CHD",
  "CGD",
  "CSE",
  "ECE",
  "EEE",
  "ME",
  "CE",
] as const;

// Batch options (can be extended)
export const BATCHES = [
  "2020",
  "2021",
  "2022",
  "2023",
  "2024",
  "2025",
  "2026",
  "2027",
] as const;

// Email validation
export const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@(iiit\.ac\.in|students\.iiit\.ac\.in|research\.iiit\.ac\.in)$/;

// Auth callback path that external sites should implement
export const AUTH_CALLBACK_PATH = "/auth-callback";
