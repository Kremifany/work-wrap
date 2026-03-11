import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobtrackerproapp.com";

export const metadata: Metadata = {
  title: "Contact Support \u2013 Job Tracker Pro",
  description:
    "Get help with your Job Tracker Pro account. Contact our support team for account, billing, or technical questions. Serving service businesses across Tampa Bay, FL.",
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title:       "Contact Job Tracker Pro Support",
    description: "We personally read every message and respond within one business day.",
    url:         `${APP_URL}/contact`,
    type:        "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
