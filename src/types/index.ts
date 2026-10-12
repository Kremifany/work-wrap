// ─── Enums / Unions ────────────────────────────────────────────────────────
export type JobStatus  = "draft" | "completed";
export type JobType    = "Garage Door" | "HVAC" | "General";
export type PlanType   = "free" | "pro" | "team";
export type TechRole   = "owner" | "tech" | "admin";

// ─── Business ──────────────────────────────────────────────────────────────
export interface Business {
  id: string;
  ownerId: string;            // Firebase Auth UID
  name: string;
  ownerName: string;
  email: string;
  logoUrl: string;
  phone: string;
  address: string;
  brandColor: string;         // PDF accent color, default #1E5AA8
  googleReviewUrl: string;    // optional sign-off / email CTA
  plan: PlanType;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  jobsThisMonth: number;
  accessCodeUsed: string | null;
  dashboardOnboardingSeenAt?: string | null;
  createdAt: string;
}

// ─── Tech / Employee ────────────────────────────────────────────────────────
export interface Tech {
  id: string;
  businessId: string;
  uid: string | null;         // Firebase Auth UID (null if no login yet)
  name: string;
  email: string;
  phone: string;
  role: TechRole;
}

// ─── Customer ───────────────────────────────────────────────────────────────
/** One service location linked to a customer (CRM subtable row). */
export interface CustomerServiceAddress {
  id: string;
  /** Optional label, e.g. "Home", "Office", "Rental". */
  label: string;
  /** Full street address line. */
  line1: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  /**
   * Denormalized primary service address for list views / legacy reads.
   * Source of truth is `serviceAddresses` (primary row).
   */
  address: string;
  /** Multiple service locations for this customer. */
  serviceAddresses: CustomerServiceAddress[];
  notes: string;
  jobCount: number;
  createdAt: string;
}

// ─── Customer interactions (CRM timeline) ───────────────────────────────────
export type InteractionType =
  | "email_report_sent"
  | "sms_logged"
  | "job_created"
  | "job_completed"
  | "note"
  | "call";

export type InteractionChannel = "email" | "sms" | "phone" | "system";

export interface Interaction {
  id: string;
  businessId: string;
  customerId: string;
  jobId: string | null;
  type: InteractionType;
  channel: InteractionChannel;
  title: string;
  body: string;
  /** Recipient email or phone when relevant. */
  to: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
}

// ─── Job ─────────────────────────────────────────────────────────────────────
export interface ChecklistItem {
  item: string;
  checked: boolean;
}

export interface JobPhoto {
  url: string;
  caption: string;
}

/** Tech assigned to a job (multi-select). */
export interface JobAssignedTech {
  id: string;
  name: string;
}

export interface Job {
  id: string;
  businessId: string;
  /** Primary / first assigned tech — kept for legacy list views. */
  techId: string;
  techName: string;
  /** All technicians who worked this job. */
  techs: JobAssignedTech[];
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;              // v1 job title, e.g. "Kitchen repipe"
  jobType: JobType;           // legacy category — kept for templates
  jobAddress: string;
  checklist: ChecklistItem[];
  notes: string;
  beforePhotos: JobPhoto[];
  afterPhotos: JobPhoto[];
  photos: JobPhoto[];         // legacy combined array
  pdfUrl: string | null;
  status: JobStatus;
  completedAt: string | null;
  reportSentAt: string | null;
  createdAt: string;
  /** Client id used as the Firestore document id so a repeated save cannot insert a second job. */
  draftKey?: string;
}

// ─── Beta access ─────────────────────────────────────────────────────────────
export interface BetaAccessCode {
  id: string;
  code: string;
  label: string;
  maxUses: number;
  useCount: number;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

// ─── Server Action result ─────────────────────────────────────────────────
export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ─── Session ─────────────────────────────────────────────────────────────
export interface SessionUser {
  uid: string;
  email: string;
}

export interface SessionContext {
  user: SessionUser;
  business: Business | null;
  tech: Tech | null;
  role: TechRole;
}

// ─── Dashboard stats ─────────────────────────────────────────────────────
export interface DashboardStats {
  draftJobs: number;
  totalCustomers: number;
  jobsThisMonth: number;
  recentJobs: Job[];
}
