import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://workwrapapp.com";
const APP_NAME = "Work Wrap";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a8a" },
    { media: "(prefers-color-scheme: dark)", color: "#1e3a8a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: "Work Wrap – Job Completion Reports for Service Businesses",
    template: "%s | Work Wrap",
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
    "work wrap app for service businesses",
    "free field service app",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png?v=w3", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=w3", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png?v=w3", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type:        "website",
    siteName:    "Work Wrap",
    title:       "Work Wrap – Job Completion Reports for Service Businesses",
    description: "Auto-generate branded PDF reports and email them to customers the moment the job is done. Free for small teams.",
    url:         APP_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Work Wrap by ClipLogic" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Work Wrap – Instant Job Reports for Service Businesses",
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
    name:       "Work Wrap",
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
      name:    "Work Wrap",
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
    name:       "Work Wrap",
    url:        APP_URL,
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([softwareSchema, orgSchema, websiteSchema]) }}
        />
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})})}" +
                "if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}",
            }}
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

