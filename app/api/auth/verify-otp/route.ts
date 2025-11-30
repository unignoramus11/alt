import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, otp, type = "login" } = await request.json();

  if (!email || !otp) {
    return NextResponse.json(
      { error: "Email and OTP are required" },
      { status: 400 }
    );
  }

  const { db } = await connectToDatabase();

  // Find valid OTP
  const otpRecord = await db.collection("otps").findOne({
    email,
    otp,
    type,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 400 }
    );
  }

  // Delete OTP after use
  await db.collection("otps").deleteOne({ _id: otpRecord._id });

  // Clean up expired OTPs
  await db.collection("otps").deleteMany({ expiresAt: { $lt: new Date() } });

  // Find or create user
  let user = await db.collection("users").findOne({ email });
  const isNewUser = !user;

  if (!user) {
    const result = await db.collection("users").insertOne({
      email,
      hasPasswordAuth: false,
      profileCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    user = { _id: result.insertedId, email, profileCompleted: false };
  }

  return NextResponse.json({
    success: true,
    userId: user._id.toString(),
    isNewUser,
    profileCompleted: user.profileCompleted,
  });
}
