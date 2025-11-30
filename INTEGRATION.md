# Alt Auth Integration Guide

This document explains how external websites can integrate with Alt Auth for user authentication.

## Overview

Alt Auth uses a secure, no-registration-required authentication flow based on browser security guarantees. External sites don't need to pre-register or share secrets.

## Authentication Flow

### Step 1: Start Login (External Site)

Before redirecting to Alt Auth, set a cookie on your domain:

```javascript
// On your site (e.g., example.com)
const nonce = crypto.randomUUID();
const redirectUrl = "/dashboard"; // Where to go after login

document.cookie = `alt_auth_state=${JSON.stringify({
  nonce,
  redirectUrl,
})}; path=/; SameSite=Strict; Secure`;

// Navigate to Alt Auth
window.location.href = "https://your-alt-auth-domain.com/login";
```

### Step 2: User Authenticates

The user completes authentication on Alt Auth (email, OTP/password, profile).

### Step 3: Callback (Your Site)

Alt Auth redirects the user back to your site at `/auth-callback` with:

- `request_id` - The authentication request ID
- `claim` - A one-time claim token

Implement this endpoint on your site:

```javascript
// app/auth-callback/page.js (Next.js App Router example)
// or any route handler for /auth-callback

export default async function AuthCallback(req, res) {
  const { request_id, claim } = req.query;

  // Read your stored state
  const cookies = parseCookies(req);
  const state = JSON.parse(cookies.alt_auth_state || "{}");

  if (!state.nonce || !request_id || !claim) {
    return res.status(400).send("Invalid callback");
  }

  // Verify with Alt Auth server-to-server
  const response = await fetch(
    "https://your-alt-auth-domain.com/api/auth/verify-claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: request_id,
        claimToken: claim,
        nonce: state.nonce,
        origin: "https://your-site.com",
      }),
    }
  );

  const data = await response.json();

  if (!data.success) {
    return res.status(401).send("Authentication failed");
  }

  // data contains:
  // - profile: { id, email, username, rollNumber, batch, branch, profileCompleted }
  // - sessionToken: JWT token for session management
  // - sessionCookieName: recommended cookie name
  // - sessionDurationMs: session duration

  // Set session cookie
  res.setHeader(
    "Set-Cookie",
    `${data.sessionCookieName}=${
      data.sessionToken
    }; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${
      data.sessionDurationMs / 1000
    }`
  );

  // Clear auth state cookie
  res.setHeader("Set-Cookie", "alt_auth_state=; Path=/; Max-Age=0");

  // Redirect to original destination
  res.redirect(state.redirectUrl || "/");
}
```

## Security Model

1. **No pre-registration required** - Any site can use Alt Auth
2. **Origin binding** - The callback is bound to the referrer origin captured during login initiation
3. **One-time tokens** - Claim tokens can only be used once
4. **Same-site cookies** - Your auth state cookie is only readable by your origin
5. **Server-to-server verification** - Claim tokens are verified server-side

## API Reference

### GET /api/auth/init

Initialize an authentication request. Called automatically when accessing /login.

**Response:**

```json
{
  "requestId": "abc123...",
  "frozenOrigin": "https://example.com"
}
```

### POST /api/auth/verify-claim

Verify a claim token and get user profile.

**Request:**

```json
{
  "requestId": "abc123...",
  "claimToken": "def456...",
  "nonce": "your-nonce",
  "origin": "https://your-site.com"
}
```

**Response:**

```json
{
  "success": true,
  "profile": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "johndoe",
    "rollNumber": "12345",
    "batch": "2024",
    "branch": "CSD",
    "profileCompleted": true
  },
  "sessionToken": "jwt-token...",
  "sessionCookieName": "alt_session",
  "sessionDurationMs": 604800000
}
```

## Environment Variables

The Alt Auth service requires these environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017/alt_auth
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@alt-auth.com
NEXT_PUBLIC_BASE_URL=https://your-alt-auth-domain.com
```
