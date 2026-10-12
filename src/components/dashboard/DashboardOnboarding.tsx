"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ClipboardList,
  Mail,
  UserCircle,
  ChevronRight,
  X,
} from "lucide-react";
import { completeDashboardOnboardingAction } from "@/actions/businesses";
import { Button } from "@/components/ui/Button";

interface DashboardOnboardingProps {
  firstName: string;
  businessName: string;
}

const STEPS = [
  {
    icon: UserCircle,
    title: "You're all set!",
    body: (first: string, business: string) =>
      `Hi ${first} — welcome to Work Wrap. This dashboard is your home base for ${business}. Here's how to get your first report out the door.`,
  },
  {
    icon: Users,
    title: "Add customers",
    body: () =>
      "Use Customers in the sidebar to save names, emails, and addresses. Pick them when you create a job so you never re-type the same info.",
  },
  {
    icon: ClipboardList,
    title: "Create a job",
    body: () =>
      "Tap New Job, choose the customer, add before/after photos, and check off what you did. Your work saves automatically.",
  },
  {
    icon: Mail,
    title: "Send the report",
    body: () =>
      "When the work is done, hit Complete & Send Report. We build a branded PDF and email it to your customer automatically.",
  },
] as const;

export default function DashboardOnboarding({
  firstName,
  businessName,
}: DashboardOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, startFinish] = useTransition();

  const finish = () => {
    startFinish(async () => {
      await completeDashboardOnboardingAction();
      router.replace("/dashboard");
      router.refresh();
    });
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Quick tour · Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-lg font-bold text-brand-900">{current.title}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="text-neutral-400 hover:text-neutral-600"
          aria-label="Skip tour"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-600">
        {current.body(firstName, businessName)}
      </p>

      <div className="mt-4 flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-brand-500" : "bg-brand-100"
            }`}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isLast ? (
          <Button onClick={finish} loading={finishing} className="flex items-center gap-2">
            Get started
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} className="flex items-center gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="text-sm text-neutral-500 hover:text-neutral-700 ml-auto"
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
