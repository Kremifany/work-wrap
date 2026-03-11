"use client";

import { useState, useTransition } from "react";
import { Alert, Badge, Spinner } from "@/components/ui";
import { Check, CreditCard, ExternalLink } from "lucide-react";
import type { Business, PlanType } from "@/types";

interface BillingPageClientProps {
  business: Business;
  jobsThisMonth: number;
  checkoutSuccess: boolean;
  checkoutCanceled: boolean;
}

interface PlanConfig {
  key: PlanType;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: PlanConfig[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "5 jobs per month",
      "PDF reports emailed to customers",
      "1 team member (owner only)",
      "Customer CRM",
      "SMS notifications — coming soon",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "per month",
    highlight: true,
    features: [
      "Unlimited jobs",
      "PDF reports emailed to customers",
      "Up to 3 technicians",
      "Customer CRM",
      "Priority email support",
      "SMS notifications — coming soon",
    ],
  },
  {
    key: "team",
    name: "Team",
    price: "$99",
    period: "per month",
    features: [
      "Unlimited jobs",
      "PDF reports emailed to customers",
      "Unlimited technicians",
      "Customer CRM",
      "Priority email support",
      "SMS notifications — coming soon",
    ],
  },
];

export default function BillingPageClient({
  business,
  jobsThisMonth,
  checkoutSuccess,
  checkoutCanceled,
}: BillingPageClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [redirecting, startRedirect] = useTransition();
  const [portalLoading, startPortal] = useTransition();

  const handleUpgrade = (planKey: PlanType) => {
    setError(null);
    startRedirect(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to start checkout.");
          return;
        }
        const { url } = await res.json();
        window.location.href = url;
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  const handlePortal = () => {
    startPortal(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to open billing portal.");
          return;
        }
        const { url } = await res.json();
        window.location.href = url;
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  const freeLimit = 5;
  const usagePct = business.plan === "free"
    ? Math.min(100, Math.round((jobsThisMonth / freeLimit) * 100))
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Billing</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Manage your plan and payment method.
        </p>
      </div>

      {checkoutSuccess && (
        <Alert variant="success">
          Your plan has been upgraded! Thank you — it may take a moment to reflect.
        </Alert>
      )}
      {checkoutCanceled && (
        <Alert variant="info">Checkout canceled. Your plan has not changed.</Alert>
      )}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current plan */}
      <div className="card card-padded">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-neutral-500 font-medium mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-neutral-900 capitalize">
                {business.plan}
              </span>
              <Badge
                variant={
                  business.plan === "free"
                    ? "default"
                    : business.plan === "pro"
                    ? "info"
                    : "success"
                }
              >
                {business.plan.charAt(0).toUpperCase() + business.plan.slice(1)}
              </Badge>
            </div>
          </div>
          {business.stripeSubscriptionId && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              {portalLoading ? (
                <Spinner size="sm" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Manage Subscription
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {business.plan === "free" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-neutral-600">Jobs this month</p>
              <span className="text-sm font-medium text-neutral-700">
                {jobsThisMonth} / {freeLimit}
              </span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 80 ? "bg-error-500" : "bg-brand-500"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = business.plan === plan.key;
          const isDowngrade =
            (business.plan === "team" && plan.key !== "team") ||
            (business.plan === "pro" && plan.key === "free");

          return (
            <div
              key={plan.key}
              className={`pricing-card${plan.highlight ? " featured" : ""}${
                isCurrent ? " ring-2 ring-success-500" : ""
              }`}
            >
              {plan.highlight && (
                <div className="text-xs font-semibold text-accent-700 bg-accent-100 px-2 py-0.5 rounded-full mb-3 inline-block">
                  Most Popular
                </div>
              )}
              {isCurrent && (
                <div className="text-xs font-semibold text-success-700 bg-success-100 px-2 py-0.5 rounded-full mb-3 inline-block">
                  Current Plan
                </div>
              )}
              <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-extrabold text-neutral-900">
                  {plan.price}
                </span>
                <span className="text-neutral-500 text-sm ml-1">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                    <Check className="w-4 h-4 text-success-600 shrink-0 mt-0.5" />
                    {f.includes("coming soon") ? (
                      <span>
                        {f.replace(" — coming soon", "")}{" "}
                        <span className="text-xs text-neutral-400 italic">
                          — coming soon
                        </span>
                      </span>
                    ) : (
                      f
                    )}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="btn w-full bg-neutral-100 text-neutral-400 cursor-not-allowed">
                  Current Plan
                </button>
              ) : isDowngrade ? (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="btn btn-outline w-full"
                >
                  Downgrade via Portal
                </button>
              ) : plan.key === "free" ? null : (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={redirecting}
                  className={`btn w-full flex items-center justify-center gap-2 ${
                    plan.highlight ? "btn-primary" : "btn-outline"
                  }`}
                >
                  {redirecting && <Spinner size="sm" />}
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="card card-padded">
        <h2 className="font-semibold text-neutral-900 mb-4">Billing FAQ</h2>
        <div className="space-y-3 text-sm text-neutral-600">
          <details className="group">
            <summary className="cursor-pointer font-medium text-neutral-800 group-open:text-brand-700">
              Can I cancel anytime?
            </summary>
            <p className="mt-2 ml-4">
              Yes. Cancel any time from the billing portal. You&apos;ll retain Pro/Team
              access through the end of the current billing period.
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-medium text-neutral-800 group-open:text-brand-700">
              What payment methods do you accept?
            </summary>
            <p className="mt-2 ml-4">
              All major credit and debit cards via Stripe. Your payment info is
              never stored on our servers.
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-medium text-neutral-800 group-open:text-brand-700">
              Do free-plan job reports expire?
            </summary>
            <p className="mt-2 ml-4">
              No. All PDF reports are stored permanently in Firebase Storage.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
