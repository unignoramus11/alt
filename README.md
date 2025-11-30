# Alt Auth

Universal authentication service that any website can use without pre-registration.

## Features

- Email + OTP authentication
- Optional password authentication for returning users
- Profile management (username, roll number, batch, branch)
- Secure handshake protocol using browser origin binding
- No allowlists, secrets, or onboarding required

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
npm run dev
```

## Environment Variables

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `MONGODB_URI`          | MongoDB connection string  |
| `JWT_SECRET`           | Secret key for JWT tokens  |
| `SMTP_HOST`            | SMTP server host           |
| `SMTP_PORT`            | SMTP server port           |
| `SMTP_SECURE`          | Use TLS (true/false)       |
| `SMTP_USER`            | SMTP username              |
| `SMTP_PASS`            | SMTP password              |
| `SMTP_FROM`            | From email address         |
| `NEXT_PUBLIC_BASE_URL` | Public URL of this service |

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for details on integrating with your website.

## Security Model

1. External site sets a same-site cookie with nonce and redirect URL
2. User navigates to Alt Auth `/login`
3. Alt Auth captures referrer origin and binds it to the request
4. After authentication, user is redirected to `/auth-callback` on the original domain
5. External site verifies claim token server-to-server
6. Alt Auth returns user profile and session token

No secrets are shared. Security relies on browser same-origin guarantees.
