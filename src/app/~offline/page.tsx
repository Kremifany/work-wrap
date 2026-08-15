import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 bg-slate-50">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-900 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-white" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-brand-900">You’re offline</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Job Tracker Pro needs a connection for live jobs and reports. Reconnect
          and try again.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6 inline-flex">
          Retry
        </Link>
      </div>
    </main>
  );
}
