import type { MetadataRoute } from "next";
import { getAllContributorUsernames, getPeopleData } from "@/lib/people";
import { getConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getConfig();
  const baseUrl = config.meta.site_url.replace(/\/$/, "");
  const { updatedAt } = getPeopleData();
  const lastModified = updatedAt > 0 ? new Date(updatedAt) : new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/people/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard/week/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard/month/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard/year/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/analytics/`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/releases/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const usernames = getAllContributorUsernames();
  const contributorRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${baseUrl}/people/${encodeURIComponent(username)}/`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...contributorRoutes];
}
