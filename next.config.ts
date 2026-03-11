import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options",            value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",     value: "nosniff" },
  // Control referrer information
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
  // Disable browser features not needed
  { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
  // Legacy XSS filter for older browsers
  { key: "X-XSS-Protection",           value: "1; mode=block" },
  // HSTS — applied at runtime; Vercel/host should also enforce this
  { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: rootDir,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
