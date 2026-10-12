import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://workwrapapp.com";

export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Get help with your Work Wrap account. Contact our support team for account, billing, or technical questions. Built for service businesses everywhere.",
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title:       "Contact Work Wrap Support",
    description: "We personally read every message and respond within one business day.",
    url:         `${APP_URL}/contact`,
    type:        "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
