// lib/db.ts — temporary stub (no DB)

import { RepoStats, UserEntry } from "@/scripts/types";
import fs from "fs";
import path from "path";
import { differenceInDays } from "date-fns";

type ActivityItem = {
  slug: string;
  contributor: string;
  contributor_name: string | null;
  contributor_avatar_url: string | null;
  contributor_role: string | null;
  occured_at: string;
  title?: string | null;
  text?: string | null;
  link?: string | null;
  repo?: string | null;
  points: number | null;
};

export type ActivityGroup = {
  activity_definition: string;
  activity_name: string;
  activity_description?: string | null;
  activities: ActivityItem[];
};


export type MonthBuckets = {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
};

// Helper function to extract repository name from GitHub URL
function extractRepoFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const match = url.match(/github\.com\/[^/]+\/([^/]+)/);
  return match && match[1] !== undefined ? match[1] : null;
}


export async function getRecentActivitiesGroupedByType(
  valid: "week" | "month" | "2month" | "year"
): Promise<ActivityGroup[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    `${valid}.json`
  );

  if (!fs.existsSync(filePath)) return [];

  const file = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(file);

  if (!data?.entries?.length) return [];

  const groups = new Map<string, ActivityGroup>();

  for (const user of data.entries) {
    const activities = user.activities || user.raw_activities;
    if (!activities) continue;

    for (const act of activities) {
      const type = act.type;

      if (!groups.has(type)) {
        groups.set(type, {
          activity_definition: type,
          activity_name: type,
          activity_description: null,
          activities: [],
        });
      }

      groups.get(type)!.activities.push({
        slug: `${user.username}-${type}-${act.occured_at}-${groups.get(type)!.activities.length}`,
        contributor: user.username,
        contributor_name: user.name,
        contributor_avatar_url: user.avatar_url,
        contributor_role: user.role,
        occured_at: act.occured_at,
        title: act.title ?? null,
        link: act.link ?? null,
        repo: extractRepoFromUrl(act.link ?? null),
        points: act.points ?? 0,
      });
    }
  }


  // newest first
  for (const group of groups.values()) {
    group.activities.sort(
      (a, b) =>
        new Date(b.occured_at).getTime() -
        new Date(a.occured_at).getTime()
    );
  }

  return [...groups.values()];
}



// (Optional) stubs for other imports; add as you see “module not found” errors:

export async function getUpdatedTime() {
  const publicPath = path.join(process.cwd(), "public", "leaderboard");
  if (!fs.existsSync(publicPath)) return null;
  const files = fs.readdirSync(publicPath).filter(
    (file) => file.endsWith(".json") && file !== "recent-activities.json"
  );

  let latestUpdatedAt = 0;
  for (const file of files) {
    try {
      const filePath = path.join(publicPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.updatedAt && data.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = data.updatedAt;
      }
    } catch (error) {
      // Skip files that can't be parsed
      continue;
    }
  }
  return latestUpdatedAt > 0 ? new Date(latestUpdatedAt) : null;
}

export async function getMonthlyActivityBuckets(): Promise<MonthBuckets> {
  const month = await getRecentActivitiesGroupedByType("month");
  const activities = month.flatMap(g => g.activities);
  const now = new Date();

  const buckets: MonthBuckets = {
    w1: 0,
    w2: 0,
    w3: 0,
    w4: 0,
  };

  for (const activity of activities) {
    const activityDate = new Date(activity.occured_at);
    const daysAgo = differenceInDays(now, activityDate);

    if (daysAgo < 0) continue;

    if (daysAgo < 7) {
      buckets.w1++;
    } else if (daysAgo < 14) {
      buckets.w2++;
    } else if (daysAgo < 21) {
      buckets.w3++;
    } else if (daysAgo < 30) {
      buckets.w4++;
    }
  }

  return buckets;
}

export async function getPreviousMonthActivityCount(): Promise<number> {
  const month = await getRecentActivitiesGroupedByType("2month");
  const activities = month.flatMap(g => g.activities);
  const now = new Date();

  let count = 0;
  for (const activity of activities) {
    const activityDate = new Date(activity.occured_at);
    const daysAgo = differenceInDays(now, activityDate);

    if (daysAgo >= 30 && daysAgo < 60) {
      count++;
    }
  }

  return count;
}

export async function getReposOverview(): Promise<RepoStats[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    `overview.json`
  );

  if (!fs.existsSync(filePath)) return [];

  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(file);
    if (!data?.repos?.length) return [];
    return data.repos;
  } catch (error) {
    console.error("Failed to parse overview.json:", error);
    return [];
  }
}

export async function getTopContributorsByActivity() {
  return {};
}

export async function getAllContributorsWithAvatars() {
  return [];
}

export async function getAllContributorUsernames() {
  return [];
}

export async function getContributor(_username: string) {
  return null;
}

export async function getContributorProfile(_username: string) {
  return { contributor: null, activities: [], totalPoints: 0, activityByDate: {} };
}
