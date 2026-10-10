import type { MetadataRoute } from "next";
import { getAllContributorUsernames, getPeopleData } from "@/lib/people";
import { getConfig } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getConfig();
  const rawUrl =
    typeof config?.meta?.site_url === "string" ? config.meta.site_url.trim() : "";
  let baseUrl = "https://circuitverse.org";
  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      baseUrl = (parsed.origin + parsed.pathname).replace(/\/$/, "");
    }
  } catch {
    baseUrl = rawUrl.replace(/\/$/, "") || "https://circuitverse.org";
  }

  const isProd = process.env.NODE_ENV === "production";
  const { updatedAt } = getPeopleData(undefined, { strict: isProd });
  const lastModified = updatedAt > 0 ? new Date(updatedAt) : new Date();

  const peopleListingRoute: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/people/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const usernames = getAllContributorUsernames(undefined, { strict: isProd });
  const contributorRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${baseUrl}/people/${encodeURIComponent(username)}/`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...peopleListingRoute, ...contributorRoutes];
}
