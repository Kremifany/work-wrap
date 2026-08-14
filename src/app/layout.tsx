import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobtrackerproapp.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Job Tracker Pro – Job Completion Reports for Service Businesses",
    template: "%s | Job Tracker Pro",
  },
  description:
    "Auto-generate branded PDF job completion reports and email them to customers instantly. Built for HVAC, garage door, plumbing, electrical, and general service teams everywhere.",
  keywords: [
    "job completion report software",
    "HVAC job report app",
    "garage door service report",
    "field service report software",
    "digital job forms plumbing",
    "work order completion app",
    "technician report software",
    "field service management app",
    "service technician app",
    "work order software small business",
    "contractor job tracking app",
    "digital service report app HVAC",
    "garage door technician report app",
    "plumber job report software",
    "electrical contractor report app",
    "job tracker app for service businesses",
    "free field service app",
  ],
  openGraph: {
    type:        "website",
    siteName:    "Job Tracker Pro",
    title:       "Job Tracker Pro – Job Completion Reports for Service Businesses",
    description: "Auto-generate branded PDF reports and email them to customers the moment the job is done. Free for small teams.",
    url:         APP_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Job Tracker Pro by ClipLogic" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Job Tracker Pro – Instant Job Reports for Service Businesses",
    description: "Replace paper forms. Email branded PDF reports to customers right after every job.",
    images:      ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: APP_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Software product schema — national / worldwide service businesses
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type":    "SoftwareApplication",
    name:       "Job Tracker Pro",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type":       "AggregateOffer",
      lowPrice:      "0",
      highPrice:     "99",
      priceCurrency: "USD",
      offerCount:    "3",
    },
    description: metadata.description,
    url:         APP_URL,
    areaServed: {
      "@type": "Country",
      name:    "United States",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Service businesses, contractors, and field technicians",
    },
    publisher: {
      "@type": "Organization",
      name:    "Clip Logic LLC",
      url:     "https://cliplogicpro.com",
    },
  };

  // Organization schema for Clip Logic LLC (parent brand)
  const orgSchema = {
    "@context": "https://schema.org",
    "@type":    "Organization",
    name:       "Clip Logic LLC",
    url:        "https://cliplogicpro.com",
    brand: {
      "@type": "Brand",
      name:    "Job Tracker Pro",
      url:     APP_URL,
    },
    address: {
      "@type":           "PostalAddress",
      addressLocality:   "Tampa",
      addressRegion:     "FL",
      addressCountry:    "US",
    },
    contactPoint: {
      "@type":       "ContactPoint",
      contactType:   "customer support",
      url:           `${APP_URL}/contact`,
    },
  };

  // WebSite schema for sitelinks searchbox eligibility
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:       "Job Tracker Pro",
    url:        APP_URL,
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([softwareSchema, orgSchema, websiteSchema]) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

