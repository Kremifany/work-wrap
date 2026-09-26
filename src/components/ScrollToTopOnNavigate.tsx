"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reset scroll on soft navigations (window or dashboard content column). */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    // Lock document scroll while dashboard shell owns scrolling
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const scroller = document.getElementById("dashboard-scroll");
    if (scroller) {
      scroller.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
