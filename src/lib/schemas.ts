import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const nonEmptyString = (max: number) => z.string().trim().min(1).max(max);
const optionalString = (max: number) => z.string().trim().max(max).optional();
/** Empty string or a valid email — CRM contacts often start phone-only. */
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Invalid email address",
  });

// ─── Job schemas ──────────────────────────────────────────────────────────────

export const checklistItemSchema = z.object({
  item:    z.string().trim().max(500),
  checked: z.boolean(),
});

export const jobPhotoSchema = z.object({
  url:     z.string().url().max(2000),
  caption: z.string().trim().max(200),
});

export const createJobSchema = z.object({
  techId:        nonEmptyString(128),
  techName:      nonEmptyString(100),
  techs: z
    .array(
      z.object({
        id:   nonEmptyString(128),
        name: nonEmptyString(100),
      })
    )
    .min(1, "Select at least one technician.")
    .max(25),
  customerId:    z.string().trim().max(128).nullable(),
  customerName:  nonEmptyString(200),
  customerEmail: optionalEmail,
  customerPhone: z.string().trim().max(30),
  title:         nonEmptyString(200),
  jobType:       z.enum(["Garage Door", "HVAC", "General"]).optional(),
  jobAddress:    z.string().trim().max(500),
  checklist:     z.array(checklistItemSchema).max(100).optional(),
  notes:         z.string().trim().max(5000),
  beforePhotos:  z.array(jobPhotoSchema).max(30),
  afterPhotos:   z.array(jobPhotoSchema).max(30),
  photos:        z.array(jobPhotoSchema).max(30).optional(),
});

export const completeJobUpdatesSchema = z.object({
  checklist:    z.array(checklistItemSchema).max(100).optional(),
  notes:        z.string().trim().max(5000).optional(),
  beforePhotos: z.array(jobPhotoSchema).max(30).optional(),
  afterPhotos:  z.array(jobPhotoSchema).max(30).optional(),
  photos:       z.array(jobPhotoSchema).max(30).optional(),
});

export const updateJobSchema = completeJobUpdatesSchema.extend({
  title:      nonEmptyString(200).optional(),
  jobAddress: z.string().trim().max(500).optional(),
  customerId: z.string().trim().max(128).nullable().optional(),
  customerName: nonEmptyString(200).optional(),
  customerEmail: optionalEmail.optional(),
  customerPhone: z.string().trim().max(30).optional(),
  techs: z
    .array(
      z.object({
        id:   nonEmptyString(128),
        name: nonEmptyString(100),
      })
    )
    .min(1)
    .max(25)
    .optional(),
});

// ─── Customer schema ──────────────────────────────────────────────────────────

export const customerServiceAddressSchema = z.object({
  id:        z.string().trim().max(128).optional(),
  label:     z.string().trim().max(80).optional().default(""),
  line1:     nonEmptyString(500),
  isPrimary: z.boolean().optional().default(false),
});

export const customerInputSchema = z.object({
  name:    nonEmptyString(200),
  email:   optionalEmail,
  phone:   z.string().trim().max(30),
  /** @deprecated Prefer serviceAddresses — kept for JobForm / legacy callers. */
  address: z.string().trim().max(500).optional().default(""),
  serviceAddresses: z.array(customerServiceAddressSchema).max(25).optional(),
  notes:   optionalString(2000),
});

export const updateCustomerSchema = customerInputSchema.partial();

export const customerAddressInputSchema = z.object({
  label:     z.string().trim().max(80).optional().default(""),
  line1:     nonEmptyString(500),
  isPrimary: z.boolean().optional().default(false),
});

export const addCustomerInteractionSchema = z.object({
  type: z.enum(["note", "call", "sms_logged"]),
  body: nonEmptyString(5000),
  to:   z.string().trim().max(254).optional().default(""),
  jobId: z.string().trim().max(128).nullable().optional(),
});

// ─── Business schema ──────────────────────────────────────────────────────────

export const upsertBusinessSchema = z.object({
  name:            nonEmptyString(200),
  ownerName:       nonEmptyString(100),
  email:           z.string().trim().email().max(254),
  phone:           z.string().trim().max(30),
  address:         z.string().trim().max(500),
  logoUrl:         z.string().trim().url().max(2000).optional().or(z.literal("")),
  brandColor:      z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  googleReviewUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
});

export const betaAccessCodeSchema = z.object({
  label:     nonEmptyString(100),
  maxUses:   z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

// ─── Team schema ──────────────────────────────────────────────────────────────

export const addTechSchema = z.object({
  name:  nonEmptyString(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30),
});

export const updateTechSchema = addTechSchema.partial();

// ─── Auth schema ──────────────────────────────────────────────────────────────

export const registerBusinessSchema = z.object({
  uid:          nonEmptyString(128),
  ownerName:    nonEmptyString(100),
  businessName: nonEmptyString(200),
  email:        z.string().trim().email().max(254),
  accessCode:   z.string().trim().max(32).optional(),
});
