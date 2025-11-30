import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import {
  generateClaimToken,
  getClaimTokenExpiry,
  generateSessionToken,
} from "@/lib/auth";
import { AUTH_CALLBACK_PATH, SESSION } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { requestId, userId } = await request.json();

  if (!requestId || !userId) {
    return NextResponse.json(
      { error: "Request ID and User ID are required" },
      { status: 400 }
    );
  }

  const { db } = await connectToDatabase();

  // Get auth request
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

  // Get user
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate claim token
  const claimToken = generateClaimToken();

  // Update auth request with claim token
  await db.collection("auth_requests").updateOne(
    { requestId },
    {
      $set: {
        status: "authenticated",
        userId,
        claimToken,
        claimTokenExpiresAt: getClaimTokenExpiry(),
      },
    }
  );

  // Build redirect URL using frozen origin
  const redirectUrl = `${authRequest.frozenOrigin}${AUTH_CALLBACK_PATH}?request_id=${requestId}&claim=${claimToken}`;

  // Generate session token for the Alt Auth domain
  const sessionToken = generateSessionToken(userId, user.email);

  // Create response with session cookie
  const response = NextResponse.json({
    success: true,
    redirectUrl,
  });

  // Set session cookie on Alt Auth domain
  response.cookies.set(SESSION.cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION.durationSeconds,
    path: "/",
  });

  return response;
}
