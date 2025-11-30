import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { ALT_AUTH_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const request_id = searchParams.get("request_id");
  const claim = searchParams.get("claim");

  // Get stored state from cookie
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("alt_auth_state");

  if (!stateCookie?.value || !request_id || !claim) {
    redirect("/?error=invalid_callback");
  }

  let state;
  try {
    state = JSON.parse(stateCookie.value);
  } catch {
    redirect("/?error=invalid_state");
  }

  if (!state.nonce) {
    redirect("/?error=missing_nonce");
  }

  // Verify claim with Alt Auth server
  const origin = request.nextUrl.origin;
  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    redirect("/?error=auth_failed");
  }

  // Store user data in cookie (in production, use a proper session)
  cookieStore.set("user_session", JSON.stringify(data.profile), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: data.sessionDurationMs / 1000,
  });

  // Clear auth state cookie
  cookieStore.delete("alt_auth_state");

  // Redirect to dashboard
  redirect(state.redirectUrl || "/dashboard");
}
