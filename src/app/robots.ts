import type { MetadataRoute } from "next";

function origin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = origin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private and authenticated areas out of search results.
      disallow: [
        "/admin",
        "/dashboard",
        "/account",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
