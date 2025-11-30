import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import { generateSessionToken } from "@/lib/auth";
import { SESSION } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { requestId, claimToken, nonce, origin } = await request.json();

  if (!requestId || !claimToken) {
    return NextResponse.json(
      { error: "Request ID and claim token are required" },
      { status: 400 }
    );
  }

  const { db } = await connectToDatabase();

  // Get auth request
  const authRequest = await db.collection("auth_requests").findOne({
    requestId,
    claimToken,
    status: "authenticated",
  });

  if (!authRequest) {
    return NextResponse.json(
      { error: "Invalid or expired claim" },
      { status: 400 }
    );
  }

  // Verify the frozen origin matches
  if (origin && authRequest.frozenOrigin !== origin) {
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  }

  // Check claim token expiry
  if (authRequest.claimTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Claim token expired" }, { status: 400 });
  }

  // Get user profile
  const user = await db.collection("users").findOne({
    _id: new ObjectId(authRequest.userId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Delete auth request after successful claim
  await db.collection("auth_requests").deleteOne({ requestId });

  // Clean up expired auth requests
  await db
    .collection("auth_requests")
    .deleteMany({ expiresAt: { $lt: new Date() } });

  // Generate session token
  const sessionToken = generateSessionToken(user._id.toString(), user.email);

  // Return user profile (excluding password)
  const profile = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    rollNumber: user.rollNumber,
    batch: user.batch,
    branch: user.branch,
    profileCompleted: user.profileCompleted,
  };

  return NextResponse.json({
    success: true,
    profile,
    sessionToken,
    sessionCookieName: SESSION.cookieName,
    sessionDurationMs: SESSION.durationMs,
  });
}
