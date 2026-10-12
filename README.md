# Work Wrap — v1 Beta

Simple SaaS for tradespeople to document jobs and send professional **before/after inspection reports** to customers.

**Core loop:** Create job → Upload before/after photos → Add notes → Generate PDF → Email client

Built as a Next.js monolith on the existing Work Wrap stack (Firebase + pdf-lib + Resend). Phase 2+ items (client portal, Stripe Connect, scheduling, SMS, R2 migration) are intentionally deferred.

## v1 Scope (P0)

| Feature | Status |
|---------|--------|
| Contractor auth (email/password, Google) | ✅ |
| Beta access codes (admin-generated) | ✅ |
| Jobs (title, address, notes, status) | ✅ |
| Before / After photo upload | ✅ |
| Client table (customers) | ✅ |
| PDF inspection report (US Letter spec) | ✅ |
| Send report to client (Resend) | ✅ |
| Company logo + brand color | ✅ |
| PDF preview in browser | ✅ |

## Deferred (Phase 2+)

- Client login portal
- Stripe Connect invoicing (Stripe billing optional during beta)
- Scheduling / dispatch
- Twilio SMS
- Cloudflare R2 migration (uses Firebase Storage today)
- Mailgun (uses Resend today — same one-click send flow)

## Quick Start

```bash
cd job_tracker_pro
npm install
cp .env.example .env.local   # fill in Firebase + Resend keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

```env
# Firebase (Auth, Firestore, Storage)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Email (Resend — v1 report delivery)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Beta gate (optional — set both to require invite codes)
BETA_ACCESS_REQUIRED=false
NEXT_PUBLIC_BETA_ACCESS_REQUIRED=false

# Stripe (optional during beta)
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Admin emails (comma-separated)
ADMIN_EMAILS=you@company.com
```

### Beta access codes

1. Sign in as an admin (`ADMIN_EMAILS`).
2. Go to **Admin → Access Codes** and generate a code.
3. Set `BETA_ACCESS_REQUIRED=true` and `NEXT_PUBLIC_BETA_ACCESS_REQUIRED=true`.
4. Share codes with beta contractors — free during beta.

## PDF Inspection Report

Reports follow the v1 spec:

- **Page 1:** Cover + summary (job metadata, work notes)
- **Page 2:** BEFORE photos (2-column grid, captions)
- **Page 3:** AFTER photos (same layout)
- **Page 4:** Sign-off (optional, `includeSignoffPage: true` in code)

Filename: `{job-slug}-inspection-report-{YYYY-MM-DD}.pdf`

Configure branding under **Profile → Report accent color** and **Company logo**.

## Project Structure

```
src/
  actions/          # Server actions (jobs, auth, customers, access codes)
  app/              # Next.js App Router pages
  components/job/   # JobForm, PhotoUpload, JobDetailActions
  lib/
    generate-pdf.ts # Inspection report PDF (pdf-lib)
    send-report-email.ts
    job-utils.ts    # Title, photo normalization, filename helpers
```

## Deploy

- **Frontend:** Vercel (`npm run build`)
- **Backend:** Same Next.js app (server actions + API routes)
- **Data:** Firebase Firestore + Storage
- **Email:** Resend

Estimated beta cost: ~$25–40/mo (Firebase free tier + Vercel + Resend).

## Internal (Clip Logic)

Use Work Wrap on real client projects to dogfood the inspection report flow before wider beta launch.

---

By [Clip Logic LLC](https://cliplogicpro.com)
