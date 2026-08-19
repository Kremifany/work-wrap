import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera=(self) so techs can capture job photos from the installed PWA
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow phone/LAN testing: open http://<this-pc-ip>:3000 from another device.
  // Without this, Server Actions (login session) are blocked as cross-origin.
  allowedDevOrigins: [
    "10.113.229.230",
    "10.66.202.230",
    "192.168.12.164",
    ...(process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ],
  experimental: {
    optimizePackageImports: ["firebase", "firebase/auth", "lucide-react"],
  },
  turbopack: {
    root: rootDir,
  },
  webpack: (config) => {
    // Follow junctions to real paths (needed when node_modules lives on another drive)
    config.resolve ??= {};
    config.resolve.symlinks = false;
    return config;
  },
  async headers() {
    // HSTS only in production — never on plain HTTP LAN IPs used for phone testing
    const headers =
      process.env.NODE_ENV === "production"
        ? securityHeaders
        : securityHeaders.filter((h) => h.key !== "Strict-Transport-Security");

    return [
      {
        source: "/(.*)",
        headers,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
