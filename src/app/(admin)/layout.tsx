import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { LayoutDashboard, Building2, Briefcase, KeyRound, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Admin top bar */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">Job Tracker Pro Admin</span>
              <p className="text-xs text-slate-400">{session.user.email}</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Link>
            <Link
              href="/admin/businesses"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <Building2 className="h-4 w-4" /> Businesses
            </Link>
            <Link
              href="/admin/jobs"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <Briefcase className="h-4 w-4" /> Jobs
            </Link>
            <Link
              href="/admin/access-codes"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <KeyRound className="h-4 w-4" /> Access Codes
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-red-600 hover:text-red-800"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
