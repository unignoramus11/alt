import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ALT_AUTH_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const request_id = searchParams.get("request_id");
  const claim = searchParams.get("claim");
  const baseUrl = request.nextUrl.origin;

  // Get stored state from cookie
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("alt_auth_state");

  if (!stateCookie?.value || !request_id || !claim) {
    return NextResponse.redirect(new URL("/?error=invalid_callback", baseUrl));
  }

  let state;
  try {
    state = JSON.parse(stateCookie.value);
  } catch {
    return NextResponse.redirect(new URL("/?error=invalid_state", baseUrl));
  }

  if (!state.nonce) {
    return NextResponse.redirect(new URL("/?error=missing_nonce", baseUrl));
  }

  // Verify claim with Alt Auth server
  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin: baseUrl,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return NextResponse.redirect(new URL("/?error=auth_failed", baseUrl));
  }

  // Create redirect response
  const redirectUrl = new URL(state.redirectUrl || "/dashboard", baseUrl);
  const res = NextResponse.redirect(redirectUrl);

  // Store user data in cookie
  res.cookies.set("user_session", JSON.stringify(data.profile), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: data.sessionDurationMs / 1000,
    path: "/",
  });

  // Clear auth state cookie
  res.cookies.set("alt_auth_state", "", {
    maxAge: 0,
    path: "/",
  });

  return res;
}
