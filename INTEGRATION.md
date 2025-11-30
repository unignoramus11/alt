# Alt Auth Integration Guide

Complete guide for integrating Alt Auth into your website.

## Overview

Alt Auth provides authentication for any website without requiring:

- Pre-registration or onboarding
- API keys or shared secrets
- Backend configuration on Alt Auth's side

Security is based on browser same-origin guarantees and server-to-server verification.

## Quick Start (Next.js App Router)

### Step 1: Create Login Button

```tsx
// app/page.tsx (or wherever you want the login button)
"use client";

const ALT_AUTH_URL = "https://your-alt-auth-domain.com";

export default function Home() {
  const handleLogin = () => {
    // Generate a random nonce for security
    const nonce = crypto.randomUUID();

    // Where to redirect after login
    const redirectUrl = "/dashboard";

    // Store state in a same-site cookie (only your origin can read this)
    document.cookie = `alt_auth_state=${JSON.stringify({
      nonce,
      redirectUrl,
    })}; path=/; SameSite=Strict; Secure`;

    // Redirect to Alt Auth
    window.location.href = `${ALT_AUTH_URL}/login`;
  };

  return <button onClick={handleLogin}>Login with Alt Auth</button>;
}
```

### Step 2: Create Callback Route Handler

```typescript
// app/auth-callback/route.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

const ALT_AUTH_URL = "https://your-alt-auth-domain.com";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const request_id = searchParams.get("request_id");
  const claim = searchParams.get("claim");

  // Get your stored state
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("alt_auth_state");

  if (!stateCookie?.value || !request_id || !claim) {
    redirect("/?error=invalid_callback");
  }

  // Parse the state
  let state;
  try {
    state = JSON.parse(stateCookie.value);
  } catch {
    redirect("/?error=invalid_state");
  }

  if (!state.nonce) {
    redirect("/?error=missing_nonce");
  }

  // Verify the claim with Alt Auth (server-to-server)
  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin: "https://your-site.com", // Your site's origin
    }),
  });

  const data = await response.json();

  if (!data.success) {
    redirect("/?error=auth_failed");
  }

  // data.profile contains the user info:
  // {
  //   id: "user-id",
  //   email: "user@example.com",
  //   username: "johndoe",
  //   rollNumber: "12345",
  //   batch: "2024",
  //   branch: "CSD",
  //   profileCompleted: true
  // }

  // Store session however you prefer (cookie, database, etc.)
  cookieStore.set("user_session", JSON.stringify(data.profile), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: data.sessionDurationMs / 1000,
  });

  // Clear the auth state cookie
  cookieStore.delete("alt_auth_state");

  // Redirect to the original destination
  redirect(state.redirectUrl || "/dashboard");
}
```

### Step 3: Create Logout Route

```typescript
// app/api/logout/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("user_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
```

### Step 4: Use Session in Pages

```typescript
// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  if (!sessionCookie?.value) {
    redirect("/");
  }

  const user = JSON.parse(sessionCookie.value);

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <p>Email: {user.email}</p>
      {user.rollNumber && <p>Roll Number: {user.rollNumber}</p>}
      {user.batch && <p>Batch: {user.batch}</p>}
      {user.branch && <p>Branch: {user.branch}</p>}
    </div>
  );
}
```

## Authentication Flow Diagram

```
Your Site                          Alt Auth                         User
   │                                  │                               │
   │  1. User clicks "Login"          │                               │
   │  ───────────────────────────────>│                               │
   │  (Set state cookie, redirect)    │                               │
   │                                  │                               │
   │                                  │  2. Show login page           │
   │                                  │<──────────────────────────────│
   │                                  │                               │
   │                                  │  3. Enter email               │
   │                                  │<──────────────────────────────│
   │                                  │                               │
   │                                  │  4. Send OTP email            │
   │                                  │──────────────────────────────>│
   │                                  │                               │
   │                                  │  5. Enter OTP                 │
   │                                  │<──────────────────────────────│
   │                                  │                               │
   │                                  │  6. Complete profile          │
   │                                  │  (if new user)                │
   │                                  │<──────────────────────────────│
   │                                  │                               │
   │  7. Redirect to /auth-callback   │                               │
   │<─────────────────────────────────│                               │
   │  (with request_id & claim)       │                               │
   │                                  │                               │
   │  8. Verify claim (server-side)   │                               │
   │─────────────────────────────────>│                               │
   │                                  │                               │
   │  9. Return user profile          │                               │
   │<─────────────────────────────────│                               │
   │                                  │                               │
   │  10. Set session, redirect       │                               │
   │──────────────────────────────────────────────────────────────────>│
   │                                  │                               │
```

## API Reference

### POST /api/auth/verify-claim

Verify a claim token and retrieve user profile. This should be called server-side only.

**Request:**

```json
{
  "requestId": "abc123...",
  "claimToken": "def456...",
  "nonce": "your-stored-nonce",
  "origin": "https://your-site.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "profile": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "rollNumber": "12345",
    "batch": "2024",
    "branch": "CSD",
    "profileCompleted": true
  },
  "sessionToken": "eyJhbGciOiJIUzI1NiIs...",
  "sessionCookieName": "alt_session",
  "sessionDurationMs": 604800000
}
```

**Error Response (400/403):**

```json
{
  "error": "Invalid or expired claim"
}
```

## User Profile Fields

| Field              | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| `id`               | string  | Unique user ID (MongoDB ObjectId)        |
| `email`            | string  | User's verified email address            |
| `username`         | string  | User's chosen display name               |
| `rollNumber`       | string? | Optional roll/student number             |
| `batch`            | string? | Optional batch year (2020-2027)          |
| `branch`           | string? | Optional branch (CSD, CSE, ECE, etc.)    |
| `profileCompleted` | boolean | Whether user has completed their profile |

## Security Considerations

### Why This Is Secure

1. **Origin Binding**: When the user is redirected to Alt Auth, the browser sends a `Referer` header. Alt Auth captures this and stores it with the auth request. The claim can only be verified if the origin matches.

2. **Same-Site Cookies**: Your `alt_auth_state` cookie uses `SameSite=Strict`, meaning only your origin can read the nonce. An attacker can't read this value.

3. **One-Time Claims**: Claim tokens are deleted after use. They cannot be replayed.

4. **Server-to-Server Verification**: The claim is verified server-side. Client-side JavaScript cannot forge this.

5. **Short Expiry**: Claim tokens expire in 5 minutes. Auth requests expire in 30 minutes.

### Best Practices

- Always use HTTPS in production
- Store the session securely (httpOnly cookies recommended)
- Validate the origin in your callback matches your site
- Don't expose the claim token in client-side code

## Session Management

Alt Auth returns a suggested session duration (7 days by default). You can:

1. **Use the suggested duration**: Set your cookie `maxAge` to `sessionDurationMs / 1000`
2. **Use your own duration**: Ignore `sessionDurationMs` and set your own expiry
3. **Use the session token**: Alt Auth provides a JWT token you can use directly

### Re-authentication

If a user has logged in to Alt Auth recently (within 7 days), they will be automatically redirected back without re-entering credentials. This provides a seamless experience for returning users.

## Express.js Example

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());
app.use(express.json());

const ALT_AUTH_URL = "https://your-alt-auth-domain.com";

// Login page
app.get("/", (req, res) => {
  res.send(`
    <button onclick="login()">Login with Alt Auth</button>
    <script>
      function login() {
        const nonce = crypto.randomUUID();
        document.cookie = 'alt_auth_state=' + JSON.stringify({
          nonce,
          redirectUrl: '/dashboard'
        }) + '; path=/; SameSite=Strict';
        window.location.href = '${ALT_AUTH_URL}/login';
      }
    </script>
  `);
});

// Callback handler
app.get("/auth-callback", async (req, res) => {
  const { request_id, claim } = req.query;
  const state = JSON.parse(req.cookies.alt_auth_state || "{}");

  if (!state.nonce || !request_id || !claim) {
    return res.redirect("/?error=invalid");
  }

  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin: "http://localhost:3001",
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return res.redirect("/?error=auth_failed");
  }

  // Set session cookie
  res.cookie("user_session", JSON.stringify(data.profile), {
    httpOnly: true,
    maxAge: data.sessionDurationMs,
  });

  // Clear auth state
  res.clearCookie("alt_auth_state");

  res.redirect(state.redirectUrl || "/dashboard");
});

// Protected route
app.get("/dashboard", (req, res) => {
  const session = req.cookies.user_session;
  if (!session) return res.redirect("/");

  const user = JSON.parse(session);
  res.send(`Welcome, ${user.username}!`);
});
```

## Troubleshooting

### "Invalid callback" error

- Make sure you're setting the `alt_auth_state` cookie before redirecting
- Check that cookies are enabled in the browser
- Verify the cookie path is set to `/`

### "Auth failed" error

- Check that your origin matches what Alt Auth captured
- Ensure you're calling verify-claim from the server, not client
- Verify the claim hasn't expired (5 minute window)

### OTP not received

- Check spam/junk folder
- Verify SMTP settings on Alt Auth are correct
- Ensure the email address is valid

### Session not persisting

- For httpOnly cookies, you need a server-side logout endpoint
- Check that cookie `sameSite` and `secure` settings are appropriate for your environment

## Example Implementation

A complete working example is available in the Alt Auth repository under `example-site/`. To run it:

```bash
# Clone the repo
git clone https://github.com/unignoramus11/alt.git
cd alt

# Install and run Alt Auth
npm install
npm run dev

# In another terminal, run the example site
cd example-site
npm install
npm run dev
```

- Alt Auth: http://localhost:3000
- Example Site: http://localhost:3001
