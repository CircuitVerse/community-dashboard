import type { MetadataRoute } from "next";
import { getAllContributorUsernames, getPeopleData } from "@/lib/people";
import { getConfig } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getConfig();
  const baseUrl = config.meta.site_url.replace(/\/$/, "");
  const { updatedAt } = getPeopleData();
  const lastModified = updatedAt > 0 ? new Date(updatedAt) : new Date();

  const peopleListingRoute: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/people/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const usernames = getAllContributorUsernames();
  const contributorRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${baseUrl}/people/${encodeURIComponent(username)}/`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...peopleListingRoute, ...contributorRoutes];
}
