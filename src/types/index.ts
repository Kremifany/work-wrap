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
  plan: PlanType;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  jobsThisMonth: number;
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
export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  jobCount: number;
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

export interface Job {
  id: string;
  businessId: string;
  techId: string;
  techName: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  jobType: JobType;
  jobAddress: string;
  checklist: ChecklistItem[];
  notes: string;
  photos: JobPhoto[];
  pdfUrl: string | null;
  status: JobStatus;
  reportSentAt: string | null;
  createdAt: string;
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
  totalJobs: number;
  completedJobs: number;
  draftJobs: number;
  totalCustomers: number;
  jobsThisMonth: number;
  recentJobs: Job[];
}
