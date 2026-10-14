import type { MetadataRoute } from "next";
import { getAllContributorUsernames, getPeopleData } from "@/lib/people";
import { getConfig } from "@/lib/config";
import nextConfig from "../next.config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getConfig();
  const configuredUrl =
    typeof config?.meta?.site_url === "string" ? config.meta.site_url.trim() : "";
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const rawUrl = envUrl || configuredUrl;

  if (!rawUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[sitemap] Missing site_url in config.yaml and NEXT_PUBLIC_SITE_URL. Cannot generate sitemap without a valid base URL in production."
      );
    }
  }

  let baseUrl: string;
  try {
    const parsed = new URL(rawUrl || "http://localhost:3000");
    baseUrl = (parsed.origin + parsed.pathname).replace(/\/$/, "");
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `[sitemap] Invalid site_url "${rawUrl}" in config.yaml / NEXT_PUBLIC_SITE_URL. A valid URL is required in production.`
      );
    }
    baseUrl = "http://localhost:3000";
  }

  const basePath = (nextConfig.basePath ?? "").replace(/\/$/, "");
  const trailingSlash = nextConfig.trailingSlash ?? false;
  const slash = trailingSlash ? "/" : "";

  const { updatedAt } = getPeopleData();
  const lastModified = updatedAt > 0 ? new Date(updatedAt) : new Date();

  const peopleListingRoute: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}${basePath}/people${slash}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const usernames = getAllContributorUsernames();
  const contributorRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${baseUrl}${basePath}/people/${encodeURIComponent(username)}${slash}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...peopleListingRoute, ...contributorRoutes];
}
