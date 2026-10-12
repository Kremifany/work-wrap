"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCheck,
  Settings,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { signOutAction } from "@/actions/auth";
import { Badge } from "@/components/ui";
import { initials } from "@/lib/utils";
import type { TechRole, PlanType } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

function BrandMark({ size }: { size: "sm" | "md" }) {
  const box =
    size === "sm"
      ? "w-6 h-6 rounded text-[11px]"
      : "w-8 h-8 rounded-lg text-sm shadow";
  return (
    <div
      className={`${box} bg-accent-500 flex items-center justify-center text-white font-bold shrink-0 leading-none`}
      aria-hidden="true"
    >
      W<sup className="text-[0.62em] ml-px">2</sup>
    </div>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Jobs",      href: "/jobs",      icon: ClipboardList },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "My Team",   href: "/team",      icon: UserCheck, ownerOnly: true },
  { label: "Profile",   href: "/profile",   icon: Settings },
  { label: "Billing",   href: "/billing",   icon: CreditCard, ownerOnly: true },
];

const PLAN_LABELS: Record<PlanType, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

interface SidebarProps {
  businessName: string;
  userEmail: string;
  userName: string;
  plan: PlanType;
  role: TechRole;
}

export default function Sidebar({
  businessName,
  userEmail,
  userName,
  plan,
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [, startClose] = useTransition();

  // Close drawer on navigation
  useEffect(() => {
    startClose(() => setOpen(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await signOutAction();
    router.push("/login");
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.ownerOnly || role === "owner"
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-900 text-white">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-brand-700/50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <BrandMark size="md" />
          <span className="font-semibold text-lg tracking-tight text-white group-hover:text-accent-200 transition-colors">
            Work Wrap
          </span>
        </Link>
      </div>

      {/* Business info */}
      <div className="px-4 py-4 border-b border-brand-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
            {initials(businessName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {businessName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant={plan === "free" ? "default" : plan === "pro" ? "info" : "success"}
                size="sm"
              >
                {PLAN_LABELS[plan]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-brand-700/50 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-brand-300 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="sidebar-link w-full text-left text-brand-300 hover:text-white"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-brand-900 text-white flex items-center gap-3 px-4 h-14 shadow-md">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md hover:bg-brand-700 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark size="sm" />
          <span className="font-semibold text-base text-white">Work Wrap</span>
        </Link>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 w-72 h-full transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation"
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md bg-brand-800 text-white hover:bg-brand-700 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — fixed so it never scrolls with content */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col overflow-hidden"
        aria-label="Navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
