"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { createSessionAction, registerBusinessAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const planParam    = searchParams.get("plan") ?? "free";

  const [ownerName,     setOwnerName]     = useState("");
  const [businessName,  setBusinessName]  = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const cred  = await createUserWithEmailAndPassword(auth, email, password);
      const uid   = cred.user.uid;
      const token = await cred.user.getIdToken();

      // 2. Create session cookie
      const sessionRes = await createSessionAction(token);
      if (!sessionRes.success) throw new Error(sessionRes.error);

      // 3. Create business profile + owner tech record
      const profileRes = await registerBusinessAction(uid, ownerName, businessName, email);
      if (!profileRes.success) throw new Error(profileRes.error);

      // 4. Redirect based on plan selection
      if (planParam !== "free") {
        router.push(`/billing?upgrade=${planParam}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with that email already exists. Try signing in.");
      } else if (code === "auth/weak-password") {
        setError("Please choose a stronger password (8+ characters).");
      } else {
        const msg = err instanceof Error ? err.message : "Registration failed.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-padded">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Get started with Job Tracker Pro — free forever, no credit card needed.
      </p>

      {planParam !== "free" && (
        <div className="mt-3 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 border border-brand-200">
          You&apos;re signing up for the <span className="capitalize font-bold">{planParam}</span> plan.
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-4" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Your Name"
          type="text"
          placeholder="Jane Smith"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          autoComplete="name"
        />
        <Input
          label="Business Name"
          type="text"
          placeholder="Tampa Bay HVAC Pros"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          autoComplete="organization"
        />
        <Input
          label="Work Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />

        <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
          Create Account
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-400">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
      <p className="mt-3 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
