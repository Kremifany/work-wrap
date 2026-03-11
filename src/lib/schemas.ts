import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const nonEmptyString = (max: number) => z.string().trim().min(1).max(max);
const optionalString = (max: number) => z.string().trim().max(max).optional();

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
  customerId:    z.string().trim().max(128).nullable(),
  customerName:  nonEmptyString(200),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().max(30),
  jobType:       z.enum(["Garage Door", "HVAC", "General"]),
  jobAddress:    z.string().trim().max(500),
  checklist:     z.array(checklistItemSchema).max(100),
  notes:         z.string().trim().max(5000),
  photos:        z.array(jobPhotoSchema).max(30),
});

export const completeJobUpdatesSchema = z.object({
  checklist: z.array(checklistItemSchema).max(100).optional(),
  notes:     z.string().trim().max(5000).optional(),
  photos:    z.array(jobPhotoSchema).max(30).optional(),
});

// ─── Customer schema ──────────────────────────────────────────────────────────

export const customerInputSchema = z.object({
  name:    nonEmptyString(200),
  email:   z.string().trim().email().max(254),
  phone:   z.string().trim().max(30),
  address: z.string().trim().max(500),
  notes:   optionalString(2000),
});

export const updateCustomerSchema = customerInputSchema.partial();

// ─── Business schema ──────────────────────────────────────────────────────────

export const upsertBusinessSchema = z.object({
  name:      nonEmptyString(200),
  ownerName: nonEmptyString(100),
  email:     z.string().trim().email().max(254),
  phone:     z.string().trim().max(30),
  address:   z.string().trim().max(500),
  logoUrl:   z.string().trim().url().max(2000).optional().or(z.literal("")),
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
});
