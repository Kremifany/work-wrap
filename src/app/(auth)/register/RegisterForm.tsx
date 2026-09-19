"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAdditionalUserInfo,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { createSessionAction, registerBusinessAction } from "@/actions/auth";
import { clientEnv } from "@/lib/env.client";
import {
  completeGoogleRedirectIfPresent,
  googleSignInErrorMessage,
  isLanIpHost,
  startGoogleSignIn,
} from "@/lib/google-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function RegisterFormInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const planParam    = searchParams.get("plan") ?? "free";

  const [ownerName,     setOwnerName]     = useState("");
  const [businessName,  setBusinessName]  = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [accessCode,    setAccessCode]    = useState("");
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [lanHost,       setLanHost]       = useState(false);

  useEffect(() => {
    setLanHost(isLanIpHost());

    let cancelled = false;
    (async () => {
      try {
        const result = await completeGoogleRedirectIfPresent();
        if (cancelled || !result) return;
        setLoading(true);
        const extraInfo = getAdditionalUserInfo(result);
        const token = await result.user.getIdToken();
        const sessionRes = await createSessionAction(token);
        if (!sessionRes.success) throw new Error(sessionRes.error);

        if (extraInfo?.isNewUser) {
          const displayName = result.user.displayName ?? "";
          const profileRes = await registerBusinessAction(
            result.user.uid,
            displayName,
            displayName,
            result.user.email ?? "",
            accessCode || undefined,
          );
          if (!profileRes.success) throw new Error(profileRes.error);
        }

        if (planParam !== "free") {
          router.push(`/billing?upgrade=${planParam}`);
        } else {
          router.push("/dashboard?onboarding=1");
        }
      } catch (err) {
        if (cancelled) return;
        const msg = googleSignInErrorMessage(err);
        if (msg) setError(msg);
        else if (err instanceof Error && err.message) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // accessCode intentionally omitted — redirect completion uses current field value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, planParam]);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    try {
      const result = await startGoogleSignIn();
      if (result === "redirecting") return;

      const extraInfo = getAdditionalUserInfo(result);
      const token = await result.user.getIdToken();

      const sessionRes = await createSessionAction(token);
      if (!sessionRes.success) throw new Error(sessionRes.error);

      if (extraInfo?.isNewUser) {
        const displayName = result.user.displayName ?? "";
        const profileRes = await registerBusinessAction(
          result.user.uid,
          displayName,
          displayName,
          result.user.email ?? "",
          accessCode || undefined,
        );
        if (!profileRes.success) throw new Error(profileRes.error);
      }

      if (planParam !== "free") {
        router.push(`/billing?upgrade=${planParam}`);
      } else {
        router.push("/dashboard?onboarding=1");
      }
    } catch (err: unknown) {
      const msg = googleSignInErrorMessage(err);
      if (msg) setError(msg);
      else if (err instanceof Error && err.message) setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    let newAuthUser: User | null = null;
    try {
      let uid: string;
      let token: string;

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        newAuthUser = cred.user;
        uid = cred.user.uid;
        token = await cred.user.getIdToken();
      } catch (createErr: unknown) {
        const createCode = (createErr as { code?: string }).code ?? "";
        if (createCode !== "auth/email-already-in-use") throw createErr;

        // Auth user exists but business profile may be missing from a failed signup.
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        token = await cred.user.getIdToken();
      }

      const sessionRes = await createSessionAction(token);
      if (!sessionRes.success) throw new Error(sessionRes.error);

      const profileRes = await registerBusinessAction(uid, ownerName, businessName, email, accessCode || undefined);
      if (!profileRes.success) throw new Error(profileRes.error);

      newAuthUser = null;

      if (planParam !== "free") {
        router.push(`/billing?upgrade=${planParam}`);
      } else {
        router.push("/dashboard?onboarding=1");
      }
    } catch (err: unknown) {
      if (newAuthUser) {
        try {
          await newAuthUser.delete();
        } catch {
          // Best-effort rollback if profile setup failed after auth user creation.
        }
      }

      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use" || code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError(
          "An account with that email already exists in sign-in, but your business profile may not be set up yet. " +
            "Try signing in with the same password, use Continue with Google if you registered that way, or reset your password on the login page."
        );
      } else if (code === "auth/weak-password") {
        setError("Please choose a stronger password (8+ characters).");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email sign-up is not enabled for this app yet. Ask the admin to enable Email/Password in Firebase Authentication.");
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
        {clientEnv.NEXT_PUBLIC_BETA_ACCESS_REQUIRED
          ? "Enter your beta access code to join Job Tracker Pro."
          : "Get started with Job Tracker Pro — free during beta, no credit card needed."}
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
      {lanHost && !error && (
        <Alert variant="info" className="mt-4">
          You&apos;re on a local network address. Google sign-in won&apos;t work here — use email sign-up, or open the live site.
        </Alert>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || lanHost}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            or sign up with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {clientEnv.NEXT_PUBLIC_BETA_ACCESS_REQUIRED && (
          <Input
            label="Beta Access Code"
            type="text"
            placeholder="ABCD1234"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            required
            autoComplete="off"
          />
        )}
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
          placeholder="Acme HVAC Pros"
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

export default function RegisterForm() {
  return (
    <Suspense fallback={<div className="card-padded animate-pulse h-96 rounded-lg bg-slate-50" />}>
      <RegisterFormInner />
    </Suspense>
  );
}
