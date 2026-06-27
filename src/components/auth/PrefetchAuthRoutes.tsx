"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Warm auth routes in the background so first navigation feels faster in dev. */
export default function PrefetchAuthRoutes() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/register");
    router.prefetch("/login");
  }, [router]);

  return null;
}
