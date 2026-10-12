import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID:     z.string().min(1),
  FIREBASE_CLIENT_EMAIL:   z.string().min(1),
  FIREBASE_PRIVATE_KEY:    z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  RESEND_API_KEY:          z.string().min(1),
  /** Verified sender in Resend. Use onboarding@resend.dev until your domain is verified. */
  RESEND_FROM:             z.string().min(1).default("Work Wrap <reports@workwrapapp.com>"),
  NEXT_PUBLIC_APP_URL:     z.string().url(),
  STRIPE_SECRET_KEY:       z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET:   z.string().default(""),
  STRIPE_PRO_PRICE_ID:     z.string().optional().default(""),
  STRIPE_TEAM_PRICE_ID:    z.string().optional().default(""),
  /** Alternative to price ID — checkout uses the product's default price. */
  STRIPE_PRO_PRODUCT_ID:   z.string().optional().default(""),
  STRIPE_TEAM_PRODUCT_ID:  z.string().optional().default(""),
  ADMIN_EMAILS:            z.string().default("cliplogicllc@gmail.com,benochi82@gmail.com"),
  BETA_ACCESS_REQUIRED:    z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});

export const serverEnv = serverEnvSchema.parse(process.env);

export const stripeEnabled = Boolean(serverEnv.STRIPE_SECRET_KEY);
