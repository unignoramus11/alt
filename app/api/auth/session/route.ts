import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { SESSION } from "@/lib/constants";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION.cookieName)?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({
    _id: new ObjectId(decoded.userId),
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      rollNumber: user.rollNumber,
      batch: user.batch,
      branch: user.branch,
      hasPasswordAuth: user.hasPasswordAuth,
      profileCompleted: user.profileCompleted,
    },
  });
}
