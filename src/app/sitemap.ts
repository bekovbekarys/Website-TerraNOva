import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

function origin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = origin();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/browse",
    "/about",
    "/guidelines",
    "/support",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  let preprintRoutes: MetadataRoute.Sitemap = [];
  try {
    const preprints = await prisma.preprint.findMany({
      where: { status: "PUBLISHED", isLatest: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    });
    preprintRoutes = preprints.map((p) => ({
      url: `${base}/preprint/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    }));
  } catch {
    // If the database is unavailable at build time, still emit static routes.
  }

  return [...staticRoutes, ...preprintRoutes];
}
