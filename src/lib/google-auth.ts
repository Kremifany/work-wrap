"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

/** True when the page is opened via a raw LAN/IP host (hotspot / Wi‑Fi testing). */
export function isLanIpHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6 literal
  if (hostname.includes(":")) return true;
  return false;
}

function prefersRedirectSignIn(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = window.matchMedia?.("(max-width: 768px)")?.matches;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return Boolean(coarse || narrow || mobileUa);
}

export function googleSignInErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Google sign-in popup was blocked. Allow popups, or use email sign-in.";
    case "auth/unauthorized-domain":
      return "Google sign-in only works on the published site (or localhost). On this phone network address, use email and password instead.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled yet. Use email sign-in, or enable Google in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Network error during Google sign-in. Check your connection and try again.";
    default:
      return "Google sign-in failed. Please try again, or use email and password.";
  }
}

/**
 * Start Google sign-in. Uses redirect on phones (popups are unreliable).
 * On LAN IP hosts, throws a clear unauthorized-domain style error up front.
 */
export async function startGoogleSignIn(): Promise<UserCredential | "redirecting"> {
  if (isLanIpHost()) {
    const err = new Error(googleSignInErrorMessage({ code: "auth/unauthorized-domain" }));
    (err as { code?: string }).code = "auth/unauthorized-domain";
    throw err;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (prefersRedirectSignIn()) {
    await signInWithRedirect(auth, provider);
    return "redirecting";
  }

  return signInWithPopup(auth, provider);
}

/** Complete a redirect-based Google sign-in after returning to the page. */
export async function completeGoogleRedirectIfPresent(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}
