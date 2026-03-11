import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID:    z.string().min(1),
  FIREBASE_CLIENT_EMAIL:  z.string().min(1),
  FIREBASE_PRIVATE_KEY:   z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  RESEND_API_KEY:         z.string().min(1),
  NEXT_PUBLIC_APP_URL:    z.string().url().optional().default("http://localhost:3000"),
  STRIPE_SECRET_KEY:      z.string().min(1),
  STRIPE_WEBHOOK_SECRET:  z.string().default(""),
  STRIPE_PRO_PRICE_ID:    z.string().min(1),
  STRIPE_TEAM_PRICE_ID:   z.string().min(1),
  // Comma-separated admin gmail addresses
  ADMIN_EMAILS:           z.string().default("cliplogicllc@gmail.com,benochi82@gmail.com"),
});

export const serverEnv = serverEnvSchema.parse(process.env);
