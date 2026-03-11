import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col auth-page-bg">
      {/* Simple header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-sm justify-center">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-brand-800">Job Tracker</span>
            <span className="text-xl font-bold text-accent-700">Pro</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p className="font-medium">&copy; {new Date().getFullYear()} Job Tracker Pro &mdash; a{" "}<a href="https://cliplogicpro.com" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Clip Logic LLC</a> product</p>
        <div className="mt-2 flex items-center justify-center gap-5">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
          <Link href="/contact" className="hover:text-slate-700">Support</Link>
        </div>
      </footer>
    </div>
  );
}
