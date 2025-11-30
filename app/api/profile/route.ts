import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifySessionToken, hashPassword } from "@/lib/auth";
import { SESSION, BRANCHES, BATCHES } from "@/lib/constants";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION.cookieName)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({
    _id: new ObjectId(decoded.userId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    rollNumber: user.rollNumber,
    batch: user.batch,
    branch: user.branch,
    hasPasswordAuth: user.hasPasswordAuth,
  });
}

export async function PUT(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION.cookieName)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { username, rollNumber, batch, branch, newPassword } =
    await request.json();

  if (!username || username.trim().length === 0) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  if (branch && !BRANCHES.includes(branch)) {
    return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
  }

  if (batch && !BATCHES.includes(batch)) {
    return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  }

  const { db } = await connectToDatabase();

  // Check if username is taken by another user
  const existingUser = await db.collection("users").findOne({
    username: username.trim(),
    _id: { $ne: new ObjectId(decoded.userId) },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Username is already taken" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    username: username.trim(),
    rollNumber: rollNumber?.trim() || undefined,
    batch: batch || undefined,
    branch: branch || undefined,
    updatedAt: new Date(),
  };

  // If new password provided, hash and store it
  if (newPassword && newPassword.length >= 6) {
    updateData.passwordHash = hashPassword(newPassword);
    updateData.hasPasswordAuth = true;
  }

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(decoded.userId) }, { $set: updateData });

  return NextResponse.json({ success: true });
}
