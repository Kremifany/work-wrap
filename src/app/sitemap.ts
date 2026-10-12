import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://workwrapapp.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             APP_URL,
      lastModified:    new Date(),
      changeFrequency: "weekly",
      priority:        1.0,
    },
    {
      url:             `${APP_URL}/pricing`,
      lastModified:    new Date(),
      changeFrequency: "monthly",
      priority:        0.9,
    },
    {
      url:             `${APP_URL}/contact`,
      lastModified:    new Date(),
      changeFrequency: "yearly",
      priority:        0.6,
    },
  ];
}
