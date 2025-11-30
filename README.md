# Alt Auth

A universal authentication service that any website can use without pre-registration, API keys, or shared secrets.

## Features

- **Email + OTP Authentication** - 6-digit codes sent via email, valid for 10 minutes
- **Password Authentication** - Optional password for returning users (faster login)
- **Profile Management** - Username, roll number, batch, branch with validation
- **Session Persistence** - 7-day sessions with auto-login for returning users
- **Secure Handshake** - Origin binding via browser referrer, one-time claim tokens
- **Zero Configuration** - No allowlists, API keys, or onboarding required for integrating sites

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up MongoDB

Make sure you have MongoDB running locally or use a cloud instance.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings (see [Environment Variables](#environment-variables)).

### 4. Run development server

```bash
npm run dev
```

Alt Auth will be available at `http://localhost:3000`.

## Project Structure

```
alt/
├── app/
│   ├── api/auth/
│   │   ├── init/           # Initialize auth request with referrer
│   │   ├── check-user/     # Check if user exists, has password
│   │   ├── send-otp/       # Generate and send OTP email
│   │   ├── verify-otp/     # Verify OTP, create user if new
│   │   ├── complete-profile/ # Save profile (username, etc.)
│   │   ├── finalize/       # Generate claim token, redirect URL
│   │   ├── verify-claim/   # Server-to-server claim verification
│   │   ├── session/        # Check current session status
│   │   └── logout/         # Clear session cookie
│   ├── api/profile/        # GET/PUT profile for logged-in users
│   ├── login/              # Login UI with step-by-step flow
│   │   └── components/     # EmailStep, OTPStep, PasswordStep, ProfileStep
│   └── profile/            # Profile management page
├── lib/
│   ├── constants.ts        # Colors, session config, branches, batches
│   ├── auth.ts             # Token generation, password hashing, JWT
│   ├── db.ts               # MongoDB connection
│   └── email.ts            # SMTP email sending
└── example-site/           # Demo integration site (port 3001)
```

## Environment Variables

| Variable               | Description                          | Example                         |
| ---------------------- | ------------------------------------ | ------------------------------- |
| `MONGODB_URI`          | MongoDB connection string            | `mongodb://localhost:27017/alt` |
| `JWT_SECRET`           | Secret for signing JWT tokens        | Random 32+ char string          |
| `SMTP_HOST`            | SMTP server hostname                 | `smtp.gmail.com`                |
| `SMTP_PORT`            | SMTP server port                     | `587`                           |
| `SMTP_SECURE`          | Use TLS (true for port 465)          | `false`                         |
| `SMTP_USER`            | SMTP username/email                  | `your-email@gmail.com`          |
| `SMTP_PASS`            | SMTP password (use app password)     | Gmail app password              |
| `SMTP_FROM`            | From address for OTP emails          | `noreply@yourdomain.com`        |
| `NEXT_PUBLIC_BASE_URL` | Public URL of this Alt Auth instance | `https://auth.yourdomain.com`   |

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Create an app password for "Mail"
4. Use the 16-character password as `SMTP_PASS`

## Pages & Routes

| Route      | Description                                      |
| ---------- | ------------------------------------------------ |
| `/login`   | Main login flow - email → OTP/password → profile |
| `/profile` | Edit profile, change password, logout            |

## API Endpoints

| Endpoint                     | Method | Description                         |
| ---------------------------- | ------ | ----------------------------------- |
| `/api/auth/init`             | POST   | Create auth request with referrer   |
| `/api/auth/check-user`       | POST   | Check if email exists               |
| `/api/auth/check-user`       | PUT    | Verify password login               |
| `/api/auth/send-otp`         | POST   | Send OTP to email                   |
| `/api/auth/verify-otp`       | POST   | Verify OTP code                     |
| `/api/auth/complete-profile` | POST   | Save profile during signup          |
| `/api/auth/finalize`         | POST   | Generate claim token for redirect   |
| `/api/auth/verify-claim`     | POST   | Server-to-server claim verification |
| `/api/auth/session`          | GET    | Check if user has valid session     |
| `/api/auth/logout`           | POST   | Clear session cookie                |
| `/api/profile`               | GET    | Get current user's profile          |
| `/api/profile`               | PUT    | Update profile                      |

## Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  External Site  │     │    Alt Auth     │     │    MongoDB      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. Set state cookie   │                       │
         │ 2. Redirect to /login │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │ 3. Capture referrer   │
         │                       │ 4. Create auth_request│
         │                       │──────────────────────>│
         │                       │                       │
         │                       │ 5. User authenticates │
         │                       │    (email/OTP/profile)│
         │                       │                       │
         │                       │ 6. Generate claim     │
         │                       │──────────────────────>│
         │                       │                       │
         │ 7. Redirect to        │                       │
         │    /auth-callback     │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │ 8. Verify claim       │                       │
         │   (server-to-server)  │                       │
         │──────────────────────>│                       │
         │                       │ 9. Delete auth_request│
         │                       │──────────────────────>│
         │                       │                       │
         │ 10. Return profile    │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │ 11. Set session,      │                       │
         │     redirect user     │                       │
         └───────────────────────┴───────────────────────┘
```

## Security Model

1. **Origin Binding** - When user arrives at `/login`, the browser's `document.referrer` captures where they came from. This origin is "frozen" and stored with the auth request.

2. **One-Time Tokens** - Claim tokens can only be used once. After verification, the auth request is deleted from the database.

3. **Same-Site Cookies** - External sites store their nonce in a `SameSite=Lax` cookie, ensuring only that origin can read it while allowing cross-site redirects.

4. **Server-to-Server Verification** - The claim token is verified server-side, preventing client-side tampering.

5. **No Shared Secrets** - External sites don't need API keys. Security relies on browser same-origin guarantees.

6. **Session Persistence** - Logged-in users on Alt Auth are auto-redirected back without re-authenticating.

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for complete integration guide.

## Example Site

A demo integration is included in the `example-site/` folder:

```bash
# Terminal 1 - Alt Auth (port 3000)
npm run dev

# Terminal 2 - Example Site (port 3001)
cd example-site && npm run dev
```

Visit http://localhost:3001 to test the full flow.

## Database Collections

| Collection      | Purpose                                |
| --------------- | -------------------------------------- |
| `users`         | User accounts and profiles             |
| `auth_requests` | Pending auth flows (auto-cleaned)      |
| `otps`          | One-time passwords (deleted after use) |

## Configuration Constants

Defined in `lib/constants.ts`:

| Constant           | Value            | Description                     |
| ------------------ | ---------------- | ------------------------------- |
| `SESSION.duration` | 7 days           | How long sessions last          |
| `OTP.length`       | 6 digits         | OTP code length                 |
| `OTP.expiryMs`     | 10 minutes       | How long OTPs are valid         |
| `CLAIM_TOKEN`      | 5 minutes        | How long claim tokens are valid |
| `AUTH_CALLBACK`    | `/auth-callback` | Path external sites implement   |

## License

MIT
