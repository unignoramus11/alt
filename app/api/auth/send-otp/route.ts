import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { generateOTP, getOTPExpiry } from "@/lib/auth";
import { sendOTPEmail } from "@/lib/email";
import { EMAIL_REGEX } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { email, requestId, type = "login" } = await request.json();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const { db } = await connectToDatabase();

  // Verify auth request exists
  if (requestId) {
    const authRequest = await db.collection("auth_requests").findOne({
      requestId,
      status: "waiting",
      expiresAt: { $gt: new Date() },
    });

    if (!authRequest) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 400 }
      );
    }
  }

  // Check if user exists and has password auth
  const user = await db.collection("users").findOne({ email });
  const isNewUser = !user;
  const hasPasswordAuth = user?.hasPasswordAuth || false;

  // Generate and store OTP
  const otp = generateOTP();
  await db.collection("otps").insertOne({
    email,
    otp,
    type,
    createdAt: new Date(),
    expiresAt: getOTPExpiry(),
    used: false,
  });

  // Send OTP email
  const sent = await sendOTPEmail(email, otp);

  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    isNewUser,
    hasPasswordAuth,
  });
}
