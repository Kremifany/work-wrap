"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, MessageSquare, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";

const SUBJECTS = [
  "Account / Login Help",
  "Billing Question",
  "Feature Request",
  "Bug Report",
  "Team / Technician Setup",
  "PDF / Email Report Issue",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", subject: SUBJECTS[0], message: "",
  });
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Submission failed.");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-brand-800">Job Tracker</span>
            <span className="text-xl font-bold text-accent-700">Pro</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <Link href="/pricing"      className="hover:text-brand-800">Pricing</Link>
            <Link href="/#features"    className="hover:text-brand-800">Features</Link>
            <Link href="/contact"      className="font-semibold text-brand-800">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Start Free</Button></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left — intro */}
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How can we help?
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-500">
              We&apos;re a small team and we personally read every message. Whether you
              have a billing question, ran into a bug, or just want to share feedback —
              fill out the form and we&apos;ll get back to you within one business day.
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">Email Support</p>
                  <p className="text-sm text-slate-500">Replies within 1 business day</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">Tampa Bay–Based Team</p>
                  <p className="text-sm text-slate-500">We understand your local market</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">Priority Support</p>
                  <p className="text-sm text-slate-500">Pro and Team plan customers get faster responses</p>
                </div>
              </li>
            </ul>

            <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-700">Job Tracker Pro is a product of</p>
              <a
                href="https://cliplogicpro.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Clip Logic LLC
                <ChevronRight className="h-3 w-3" />
              </a>
              <a
                href="https://agency.cliplogicpro.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              >
                Digital Agency Services
                <ChevronRight className="h-3 w-3" />
              </a>
              <p className="mt-1 text-xs text-slate-400">Tampa Bay, Florida</p>
            </div>
          </div>

          {/* Right — form */}
          <div>
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-success-200 bg-success-50 px-8 py-16 text-center">
                <CheckCircle className="h-12 w-12 text-success-600" />
                <h2 className="mt-4 text-xl font-bold text-slate-900">Message Sent!</h2>
                <p className="mt-2 text-slate-500">
                  We got your message and will respond within one business day.
                </p>
                <Button className="mt-6" onClick={() => setStatus("idle")}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                {status === "error" && (
                  <Alert variant="error" onClose={() => setStatus("idle")}>{errorMsg}</Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Your Name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Phone (optional)</label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(813) 555-0100"
                    />
                  </div>
                  <div>
                    <label className="form-label">Subject *</label>
                    <select
                      className="fp-input"
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      required
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Message *</label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Describe your question or issue in as much detail as possible..."
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Sending…" : "Send Message"}
                </Button>

                <p className="text-center text-xs text-slate-400">
                  Your message is delivered directly to our support team. We never share your info.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 px-4 py-8 text-center text-sm text-slate-400">
        <div className="mx-auto flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <Link href="/"        className="hover:text-white">Home</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/login"   className="hover:text-white">Sign In</Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Job Tracker Pro — a <a href="https://cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">Clip Logic LLC</a> product. Tampa Bay, FL.
        </p>
      </footer>
    </div>
  );
}
