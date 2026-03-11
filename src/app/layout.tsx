import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobtrackerproapp.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Job Tracker Pro – Job Completion Reports for Tampa Bay Service Businesses",
    template: "%s | Job Tracker Pro",
  },
  description:
    "Auto-generate branded PDF job completion reports and email them to customers instantly. Built for HVAC, garage door, plumbing, and electrical teams across Tampa, St. Petersburg, and the greater Tampa Bay area.",
  keywords: [
    "job completion report software Tampa",
    "HVAC job report app St Petersburg FL",
    "garage door service report Tampa Bay",
    "field service report software Florida",
    "digital job forms plumbing Tampa",
    "work order completion app Clearwater",
    "technician report software Hillsborough County",
    "Pinellas County HVAC service reports",
  ],
  openGraph: {
    type:        "website",
    siteName:    "Job Tracker Pro",
    title:       "Job Tracker Pro – Job Completion Reports for Tampa Bay Service Businesses",
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
  // SoftwareApplication schema — price range (no hardcoded single price per SEO best practice)
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
    areaServed: [
      { "@type": "City", name: "Tampa",          addressRegion: "FL", addressCountry: "US" },
      { "@type": "City", name: "St. Petersburg", addressRegion: "FL", addressCountry: "US" },
      { "@type": "City", name: "Clearwater",     addressRegion: "FL", addressCountry: "US" },
      { "@type": "City", name: "Bradenton",      addressRegion: "FL", addressCountry: "US" },
      { "@type": "City", name: "Sarasota",       addressRegion: "FL", addressCountry: "US" },
      { "@type": "City", name: "Wesley Chapel",  addressRegion: "FL", addressCountry: "US" },
    ],
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

