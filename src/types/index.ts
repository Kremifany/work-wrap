export type JobStatus = "draft" | "completed";

export type JobType = "Garage Door" | "HVAC" | "General";

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  logoUrl: string;
  phone: string;
  createdAt: string;
}

export interface Tech {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
}

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
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  jobType: JobType;
  jobAddress: string;
  checklist: ChecklistItem[];
  notes: string;
  photos: JobPhoto[];
  status: JobStatus;
  reportSentAt: string | null;
  createdAt: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}
