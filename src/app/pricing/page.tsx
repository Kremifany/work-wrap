import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, X, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Pricing – Plans for Tampa Bay Service Businesses | Job Tracker Pro",
  description:
    "Job Tracker Pro plans start free and scale to $99/month. Unlimited jobs, team technicians, and fully branded PDF reports for HVAC, garage door, plumbing, and electrical businesses across Tampa Bay, FL.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://jobtrackerproapp.com"}/pricing`,
  },
  openGraph: {
    title:       "Job Tracker Pro Pricing – Free to $99/month for Tampa Bay Service Businesses",
    description: "Start free. Upgrade when you grow. Simple, honest pricing for HVAC, garage door, plumbing, and electrical teams across Tampa, St. Pete, and Clearwater.",
    url:         `${process.env.NEXT_PUBLIC_APP_URL ?? "https://jobtrackerproapp.com"}/pricing`,
    type:        "website",
  },
};

const plans = [
  {
    id:          "free" as const,
    name:        "Free",
    price:       0,
    period:      "forever",
    description: "Perfect for solo technicians getting started.",
    cta:         "Start Free",
    ctaHref:     "/register",
    featured:    false,
    features: [
      { text: "5 jobs per month",                   included: true },
      { text: "1 technician",                        included: true },
      { text: "PDF job reports",                     included: true },
      { text: "Email reports to customers",          included: true },
      { text: "Checklist templates",                 included: true },
      { text: "Photo upload (2 per job)",            included: true },
      { text: "Business branding on reports",        included: false },
      { text: "Customer database",                   included: false },
      { text: "SMS reports (coming soon)",           included: false },
      { text: "Priority support",                    included: false },
    ],
  },
  {
    id:          "pro" as const,
    name:        "Pro",
    price:       49,
    period:      "per month",
    description: "For established businesses ready to scale.",
    cta:         "Start Pro",
    ctaHref:     "/register?plan=pro",
    featured:    true,
    badge:       "Most Popular",
    features: [
      { text: "Unlimited jobs",                      included: true },
      { text: "Up to 3 technicians",                 included: true },
      { text: "PDF job reports",                     included: true },
      { text: "Email reports to customers",          included: true },
      { text: "All checklist templates",             included: true },
      { text: "Unlimited photo uploads",             included: true },
      { text: "Custom business branding",            included: true },
      { text: "Customer database",                   included: true },
      { text: "SMS reports (coming soon)",           included: false },
      { text: "Priority support",                    included: false },
    ],
  },
  {
    id:          "team" as const,
    name:        "Team",
    price:       99,
    period:      "per month",
    description: "For growing companies with large crews.",
    cta:         "Start Team",
    ctaHref:     "/register?plan=team",
    featured:    false,
    features: [
      { text: "Unlimited jobs",                      included: true },
      { text: "Unlimited technicians",               included: true },
      { text: "PDF job reports",                     included: true },
      { text: "Email reports to customers",          included: true },
      { text: "All checklist templates",             included: true },
      { text: "Unlimited photo uploads",             included: true },
      { text: "Custom business branding",            included: true },
      { text: "Full customer database",              included: true },
      { text: "SMS reports (coming soon)",           included: true },
      { text: "Priority support",                    included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-brand-800">Field</span>
            <span className="text-xl font-bold text-accent-700">Proof</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Start Free</Button></Link>
          </div>
        </div>
      </header>

      {/* Header */}
      <section className="px-4 py-16 text-center">
        <h1 className="page-title text-4xl">
          Simple, Honest Pricing for Tampa Bay Service Businesses
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
          Start free. Upgrade when your business grows. No surprise fees.
          Cancel anytime.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-100 px-4 py-1.5 text-sm font-medium text-success-700">
          <Zap className="h-4 w-4" />
          Free plan available — no credit card required
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 pb-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card flex flex-col${plan.featured ? " featured" : ""}`}
            >
              {plan.featured && (
                <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-brand-800 px-3 py-1 text-xs font-semibold text-white">
                  <Zap className="h-3 w-3" />
                  {plan.badge}
                </div>
              )}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

              <div className="mt-6">
                <span className="pricing-price">${plan.price}</span>
                <span className="pricing-period ml-1">/{plan.period}</span>
              </div>

              <Link href={plan.ctaHref} className="mt-6">
                <Button
                  fullWidth
                  variant={plan.featured ? "primary" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>

              <ul className="check-list mt-8 border-t border-slate-100 pt-6">
                {plan.features.map((f) => (
                  <li key={f.text} className={f.included ? "text-slate-700" : "text-slate-400"}>
                    {f.included ? (
                      <CheckCircle className="h-4 w-4 text-success-700" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300" />
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <p className="mt-10 text-center text-sm text-slate-500">
          All plans include secure PDF storage, Firestore database, and email delivery via Resend.
          Prices are competitive with national tools like Jobber and Housecall Pro — but{" "}
          <strong className="text-slate-700">built specifically for Tampa Bay market budgets</strong>.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="page-title text-center text-2xl">Pricing FAQ</h2>
          <div className="mt-8 space-y-4">
            {[
              { q: "Can I cancel anytime?",            a: "Yes. Cancel anytime from your billing page. No penalties, no questions." },
              { q: "What happens when I hit 5 jobs on Free?", a: "You'll see a prompt to upgrade. Your data is safe and existing reports remain accessible." },
              { q: "Is there an annual discount?",     a: "Not yet, but coming soon. Use the contact form on our site to ask about early-bird pricing." },
              { q: "What payment methods do you accept?", a: "All major credit/debit cards via Stripe. Your payment info is never stored on our servers." },
            ].map((f) => (
              <details key={f.q} className="card-padded group cursor-pointer">
                <summary className="flex list-none items-center justify-between font-semibold text-slate-900">
                  {f.q}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-slate-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
        <div className="mx-auto flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <Link href="/"        className="hover:text-slate-700">← Home</Link>
          <Link href="/contact" className="hover:text-slate-700">Contact &amp; Support</Link>
          <Link href="/login"   className="hover:text-slate-700">Sign In</Link>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Job Tracker Pro — a <a href="https://cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Clip Logic LLC</a> product.
        </p>
      </footer>
    </div>
  );
}
