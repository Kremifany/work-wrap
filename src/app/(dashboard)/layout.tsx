import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  // Admins have their own layout at /admin
  if (session.role === "admin") {
    redirect("/admin");
  }

  const businessName = session.business?.name ?? "Setup Required";
  const userName =
    session.role === "owner"
      ? (session.business?.ownerName ?? "")
      : (session.tech?.name ?? "");
  const userEmail = session.user.email;
  const plan = session.business?.plan ?? "free";
  const role = session.role;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        plan={plan}
        role={role}
      />
      {/* Page content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-14 shrink-0" />
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
