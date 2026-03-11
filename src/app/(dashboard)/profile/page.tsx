import { requireSession } from "@/lib/auth-session";
import ProfilePageClient from "./ProfilePageClient";

export const metadata = { title: "Business Profile | Job Tracker Pro" };

export default async function ProfilePage() {
  const session = await requireSession();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Business Profile</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          This information appears on your job reports.
        </p>
      </div>
      <ProfilePageClient session={session} />
    </div>
  );
}
