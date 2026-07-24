"use client";

import { Checkbox } from "@/components/ui";
import type { Tech } from "@/types";

interface JobTechMultiSelectProps {
  techs: Tech[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function JobTechMultiSelect({
  techs,
  selectedIds,
  onChange,
  disabled = false,
}: JobTechMultiSelectProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (techs.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No team members yet. Add people under My Team, or the current user will be
        recorded as the technician.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
      {techs.map((tech) => (
        <Checkbox
          key={tech.id}
          id={`job-tech-${tech.id}`}
          label={tech.name}
          description={tech.role === "owner" ? "Owner" : tech.email || undefined}
          checked={selectedIds.includes(tech.id)}
          disabled={disabled}
          onChange={() => toggle(tech.id)}
        />
      ))}
    </div>
  );
}
