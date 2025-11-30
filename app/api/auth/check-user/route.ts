import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { EMAIL_REGEX } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const { db } = await connectToDatabase();

  // Check if user exists
  const user = await db.collection("users").findOne({ email });
  const isNewUser = !user;
  const hasPasswordAuth = user?.hasPasswordAuth || false;
  const profileCompleted = user?.profileCompleted || false;

  return NextResponse.json({
    isNewUser,
    hasPasswordAuth,
    profileCompleted,
  });
}

export async function PUT(request: NextRequest) {
  const { email, password, requestId } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
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

  // Get user
  const user = await db.collection("users").findOne({ email });

  if (!user || !user.hasPasswordAuth || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    userId: user._id.toString(),
    profileCompleted: user.profileCompleted,
  });
}
