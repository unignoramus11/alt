import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { generateRequestId, getAuthRequestExpiry } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { referrerOrigin } = await request.json();

  if (!referrerOrigin) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 400 }
    );
  }

  const requestId = generateRequestId();

  const { db } = await connectToDatabase();
  await db.collection("auth_requests").insertOne({
    requestId,
    frozenOrigin: referrerOrigin,
    status: "waiting",
    createdAt: new Date(),
    expiresAt: getAuthRequestExpiry(),
  });

  return NextResponse.json({ requestId, frozenOrigin: referrerOrigin });
}
