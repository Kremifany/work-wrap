import type { ChecklistItem, JobType } from "@/types";

const TEMPLATES: Record<JobType, string[]> = {
  "Garage Door": [
    "Inspected springs",
    "Lubricated tracks",
    "Tested safety sensors",
    "Tested auto-reverse",
    "Checked cables",
    "Tested wall button",
    "Tested remotes",
    "Customer demonstrated operation",
  ],
  HVAC: [
    "Replaced filter",
    "Checked refrigerant",
    "Cleaned coils",
    "Tested thermostat",
    "Checked drain line",
    "Measured supply/return temps",
    "Checked electrical connections",
    "System running at completion",
  ],
  General: [
    "Work area cleaned",
    "Materials removed",
    "Work explained to customer",
    "Customer questions answered",
    "Customer satisfied",
  ],
};

export function getChecklistTemplate(jobType: JobType): ChecklistItem[] {
  return (TEMPLATES[jobType] ?? TEMPLATES.General).map((item) => ({
    item,
    checked: false,
  }));
}

export const JOB_TYPES: JobType[] = ["Garage Door", "HVAC", "General"];
