# Alt Auth Integration Guide

Complete guide for integrating Alt Auth into your website.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start-nextjs-app-router)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Framework Examples](#framework-examples)
- [Troubleshooting](#troubleshooting)

## Overview

Alt Auth provides authentication for any website without requiring:

- Pre-registration or onboarding
- API keys or shared secrets
- Backend configuration on Alt Auth's side

### How It Works

1. Your site stores a nonce in a cookie and redirects to Alt Auth
2. User authenticates on Alt Auth (email → OTP → profile)
3. Alt Auth redirects back to your `/auth-callback` with a one-time claim token
4. Your server verifies the claim and receives the user profile

### Key Concepts

| Term         | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| **Nonce**    | Random string you generate and store in a cookie before redirect      |
| **Claim**    | One-time token Alt Auth gives you after successful authentication     |
| **Origin**   | Your site's URL (e.g., `https://example.com`), captured from referrer |
| **Callback** | Your `/auth-callback` route that handles the redirect from Alt Auth   |

---

## Quick Start (Next.js App Router)

### Prerequisites

- Next.js 14+ with App Router
- Environment variable for Alt Auth URL

### Files to Create

```
your-app/
├── app/
│   ├── page.tsx              # Login button
│   ├── auth-callback/
│   │   └── route.ts          # Callback handler (Route Handler)
│   ├── dashboard/
│   │   ├── page.tsx          # Protected page
│   │   └── LogoutButton.tsx  # Logout component
│   └── api/
│       └── logout/
│           └── route.ts      # Logout API
└── lib/
    └── config.ts             # Alt Auth URL config
```

---

## Step-by-Step Implementation

### Step 1: Configuration

Create a config file for the Alt Auth URL:

```typescript
// lib/config.ts
export const ALT_AUTH_URL =
  process.env.NEXT_PUBLIC_ALT_AUTH_URL || "http://localhost:3000";
```

Add to your `.env.local`:

```bash
NEXT_PUBLIC_ALT_AUTH_URL=https://alt-osdg.vercel.app
```

---

### Step 2: Login Button

Create a login button that stores state and redirects to Alt Auth:

```tsx
// app/page.tsx
"use client";

import { ALT_AUTH_URL } from "@/lib/config";

export default function Home() {
  const handleLogin = () => {
    // Generate a random nonce for security
    const nonce = crypto.randomUUID();

    // Where to redirect after successful login
    const redirectUrl = "/dashboard";

    // Store state in a cookie (SameSite=Lax allows cross-site redirects)
    document.cookie = `alt_auth_state=${JSON.stringify({
      nonce,
      redirectUrl,
    })}; path=/; SameSite=Lax`;

    // Redirect to Alt Auth
    window.location.href = `${ALT_AUTH_URL}/login`;
  };

  return (
    <div>
      <h1>Welcome</h1>
      <button onClick={handleLogin}>Login with Alt Auth</button>
    </div>
  );
}
```

**Important:** Use `SameSite=Lax`, not `SameSite=Strict`. Strict cookies are not sent on cross-site redirects, which would break the callback.

---

### Step 3: Callback Route Handler

Create a Route Handler (not a page) to handle the callback. This is critical because:

1. Route Handlers can modify cookies on the response
2. They run server-side, keeping the verification secure

```typescript
// app/auth-callback/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ALT_AUTH_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  // Get query parameters from Alt Auth redirect
  const searchParams = request.nextUrl.searchParams;
  const request_id = searchParams.get("request_id");
  const claim = searchParams.get("claim");

  // Get our origin for redirects and verification
  const baseUrl = request.nextUrl.origin;

  // Read the state cookie we set before redirecting
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("alt_auth_state");

  // Validate we have all required data
  if (!stateCookie?.value || !request_id || !claim) {
    return NextResponse.redirect(new URL("/?error=invalid_callback", baseUrl));
  }

  // Parse the stored state
  let state;
  try {
    state = JSON.parse(stateCookie.value);
  } catch {
    return NextResponse.redirect(new URL("/?error=invalid_state", baseUrl));
  }

  if (!state.nonce) {
    return NextResponse.redirect(new URL("/?error=missing_nonce", baseUrl));
  }

  // Verify the claim with Alt Auth (server-to-server)
  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin: baseUrl, // Must match the origin Alt Auth captured
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return NextResponse.redirect(new URL("/?error=auth_failed", baseUrl));
  }

  // SUCCESS! Create redirect response to the user's destination
  const redirectUrl = new URL(state.redirectUrl || "/dashboard", baseUrl);
  const res = NextResponse.redirect(redirectUrl);

  // Store the user profile in a session cookie
  res.cookies.set("user_session", JSON.stringify(data.profile), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: data.sessionDurationMs / 1000, // Convert ms to seconds
    path: "/",
  });

  // Clear the auth state cookie (no longer needed)
  res.cookies.set("alt_auth_state", "", {
    maxAge: 0,
    path: "/",
  });

  return res;
}
```

**Why Route Handler instead of Page Component?**

Using `redirect()` from `next/navigation` in a page component with cookie modifications can cause issues where cookies are set but redirect doesn't happen. `NextResponse.redirect()` in a Route Handler works reliably.

---

### Step 4: Protected Dashboard Page

```tsx
// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  rollNumber?: string;
  batch?: string;
  branch?: string;
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  // Redirect to home if not logged in
  if (!sessionCookie?.value) {
    redirect("/");
  }

  let user: UserProfile;
  try {
    user = JSON.parse(sessionCookie.value);
  } catch {
    redirect("/");
  }

  return (
    <div>
      <h1>Welcome, {user.username || user.email}!</h1>

      <div>
        <p>Email: {user.email}</p>
        {user.rollNumber && <p>Roll Number: {user.rollNumber}</p>}
        {user.batch && <p>Batch: {user.batch}</p>}
        {user.branch && <p>Branch: {user.branch}</p>}
      </div>

      <LogoutButton />
    </div>
  );
}
```

---

### Step 5: Logout Button Component

```tsx
// app/dashboard/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // Call the logout API to clear the httpOnly cookie
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

**Important:** You cannot delete httpOnly cookies from client-side JavaScript. You must use a server-side API route.

---

### Step 6: Logout API Route

```typescript
// app/api/logout/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Clear the session cookie
  cookieStore.set("user_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
```

---

## Configuration

### Environment Variables

| Variable                   | Description         | Example                       |
| -------------------------- | ------------------- | ----------------------------- |
| `NEXT_PUBLIC_ALT_AUTH_URL` | Alt Auth server URL | `https://alt-osdg.vercel.app` |

### Cookie Configuration

| Cookie           | Purpose                        | Attributes               |
| ---------------- | ------------------------------ | ------------------------ |
| `alt_auth_state` | Stores nonce before redirect   | `path=/; SameSite=Lax`   |
| `user_session`   | Stores user profile after auth | `httpOnly; SameSite=Lax` |

---

## API Reference

### POST /api/auth/verify-claim

Verify a claim token and retrieve the user profile. **Call this server-side only.**

#### Request

```json
{
  "requestId": "abc123...",
  "claimToken": "def456...",
  "nonce": "your-stored-nonce",
  "origin": "https://your-site.com"
}
```

#### Success Response (200)

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

#### Error Response (400)

```json
{
  "error": "Invalid or expired claim"
}
```

### User Profile Fields

| Field              | Type      | Required | Description                       |
| ------------------ | --------- | -------- | --------------------------------- |
| `id`               | `string`  | Yes      | Unique user ID (MongoDB ObjectId) |
| `email`            | `string`  | Yes      | Verified email address            |
| `username`         | `string`  | Yes      | Display name                      |
| `rollNumber`       | `string`  | No       | Student/roll number               |
| `batch`            | `string`  | No       | Batch year (2020-2027)            |
| `branch`           | `string`  | No       | Branch (CSD, CSE, ECE, etc.)      |
| `profileCompleted` | `boolean` | Yes      | Whether profile setup is complete |

---

## Security Model

### Why This Is Secure

1. **Origin Binding**

   - Alt Auth captures `document.referrer` when the user arrives
   - This origin is stored with the auth request
   - Claim verification fails if the origin doesn't match

2. **Same-Site Cookies**

   - Your `alt_auth_state` cookie uses `SameSite=Lax`
   - Only your origin can read the nonce
   - Attackers cannot steal or forge your nonce

3. **One-Time Claims**

   - Claim tokens are deleted after use
   - Cannot be replayed
   - Expire after 5 minutes if unused

4. **Server-to-Server Verification**

   - Claims are verified via server-side API call
   - Client-side JavaScript cannot forge verification

5. **No Shared Secrets**
   - No API keys to leak
   - Security relies on browser origin guarantees

### Session Persistence

If a user has an active session on Alt Auth (within 7 days), they will be automatically redirected back to your site without re-authenticating. This provides seamless SSO-like behavior.

---

## Framework Examples

### Express.js

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());
app.use(express.json());

const ALT_AUTH_URL = "https://alt-osdg.vercel.app";
const YOUR_ORIGIN = "http://localhost:3001";

// Home page with login
app.get("/", (req, res) => {
  res.send(`
    <h1>Express Example</h1>
    <button onclick="login()">Login with Alt Auth</button>
    <script>
      function login() {
        const nonce = crypto.randomUUID();
        document.cookie = 'alt_auth_state=' + JSON.stringify({
          nonce,
          redirectUrl: '/dashboard'
        }) + '; path=/; SameSite=Lax';
        window.location.href = '${ALT_AUTH_URL}/login';
      }
    </script>
  `);
});

// Callback handler
app.get("/auth-callback", async (req, res) => {
  const { request_id, claim } = req.query;
  const stateCookie = req.cookies.alt_auth_state;

  if (!stateCookie || !request_id || !claim) {
    return res.redirect("/?error=invalid_callback");
  }

  let state;
  try {
    state = JSON.parse(stateCookie);
  } catch {
    return res.redirect("/?error=invalid_state");
  }

  // Verify with Alt Auth
  const response = await fetch(`${ALT_AUTH_URL}/api/auth/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: request_id,
      claimToken: claim,
      nonce: state.nonce,
      origin: YOUR_ORIGIN,
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
    sameSite: "lax",
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
  res.send(`<h1>Welcome, ${user.username}!</h1>`);
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("user_session");
  res.json({ success: true });
});

app.listen(3001);
```

### Vanilla JavaScript (Static Site)

For static sites, you'll need a small backend for the callback. Here's the client-side part:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <button id="login">Login with Alt Auth</button>

    <script>
      const ALT_AUTH_URL = "https://alt-osdg.vercel.app";

      document.getElementById("login").onclick = () => {
        const nonce = crypto.randomUUID();
        document.cookie = `alt_auth_state=${JSON.stringify({
          nonce,
          redirectUrl: "/dashboard.html",
        })}; path=/; SameSite=Lax`;

        window.location.href = `${ALT_AUTH_URL}/login`;
      };
    </script>
  </body>
</html>
```

---

## Troubleshooting

### "invalid_callback" Error

**Cause:** The `alt_auth_state` cookie is missing when Alt Auth redirects back.

**Solutions:**

- Ensure you set `SameSite=Lax` (not `Strict`)
- Check that cookies are enabled in the browser
- Verify the cookie `path` is set to `/`
- Make sure you're not in incognito mode with cookies blocked

### "auth_failed" Error

**Cause:** The claim verification failed.

**Solutions:**

- Ensure the `origin` in your verify-claim request matches your actual origin
- Check that you're calling verify-claim from the server, not client
- Verify the claim hasn't expired (5-minute window)
- Check Alt Auth server logs for more details

### Redirect Not Working

**Cause:** Using `redirect()` with cookie modifications in a page component.

**Solution:** Use a Route Handler (`route.ts`) with `NextResponse.redirect()` instead of a page component with `redirect()`.

### Session Cookie Not Being Set

**Cause:** The cookie might be set but not persisting.

**Solutions:**

- Use `sameSite: "lax"` for the session cookie
- In production, ensure `secure: true` and you're using HTTPS
- Check that `path: "/"` is set

### Logout Not Working

**Cause:** Trying to delete an httpOnly cookie from client-side JavaScript.

**Solution:** Create a server-side logout API route that clears the cookie.

### OTP Not Received

**Solutions:**

- Check spam/junk folder
- Verify the email address is correct
- Wait a minute and try again (rate limiting)
- Contact Alt Auth administrator to check SMTP settings

---

## Live Demo

Alt Auth is deployed at: **https://alt-osdg.vercel.app**

A complete working example is available in the Alt Auth repository:

```bash
git clone https://github.com/unignoramus11/alt.git
cd alt

# Run Alt Auth locally
npm install
npm run dev

# In another terminal, run the example site
cd example-site
npm install
npm run dev
```

- Alt Auth: http://localhost:3000
- Example Site: http://localhost:3001

Or test with the deployed version by setting:

```bash
# example-site/.env.local
NEXT_PUBLIC_ALT_AUTH_URL=https://alt-osdg.vercel.app
```
