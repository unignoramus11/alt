import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import { BRANCHES, BATCHES } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId, username, rollNumber, batch, branch, password } =
    await request.json();

  if (!userId || !username) {
    return NextResponse.json(
      { error: "User ID and username are required" },
      { status: 400 }
    );
  }

  // Validate branch if provided
  if (branch && !BRANCHES.includes(branch)) {
    return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
  }

  // Validate batch if provided
  if (batch && !BATCHES.includes(batch)) {
    return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  }

  const { db } = await connectToDatabase();

  // Check if username is already taken
  const existingUser = await db.collection("users").findOne({
    username,
    _id: { $ne: new ObjectId(userId) },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Username is already taken" },
      { status: 400 }
    );
  }

  // Update user profile
  const updateData: Record<string, unknown> = {
    username,
    rollNumber: rollNumber || undefined,
    batch: batch || undefined,
    branch: branch || undefined,
    profileCompleted: true,
    updatedAt: new Date(),
  };

  // If password provided, hash and store it
  if (password && password.length >= 6) {
    updateData.passwordHash = hashPassword(password);
    updateData.hasPasswordAuth = true;
  }

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });

  return NextResponse.json({ success: true });
}
