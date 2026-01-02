// lib/db.ts — temporary stub (no DB)

import { UserEntry } from "@/scripts/generateLeaderboard";
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
  points: number | null;
};

export type ActivityGroup = {
  activity_definition: string;
  activity_name: string;
  activity_description?: string | null;
  activities: ActivityItem[];
};

type RecentActivitiesJSON = {
  updatedAt: number;
  entries: UserEntry[];
  groups: ActivityGroup[];
};

export type MonthBuckets = {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
};

// Used by app/page.tsx
// export async function getRecentActivitiesGroupedByType(valid: "week" | "month" | "year"): Promise<ActivityGroup[]> {
//   const filePath = path.join(
//     process.cwd(),
//     "public",
//     "leaderboard",
//     `${valid}.json`
//   );

//   let activityGroups: ActivityGroup[] = [];

//   if (fs.existsSync(filePath)) {
//     const file = fs.readFileSync(filePath, "utf-8");
//     const data: RecentActivitiesJSON = JSON.parse(file);
    
//     const groupsFromEntries: ActivityGroup[] =
//       Object.entries(
//         data.entries.reduce((acc, user) => {
//           for (const [type, meta] of Object.entries(
//             user.activity_breakdown
//           )) {
//             if (!acc[type]) {
//               acc[type] = {
//                 activity_definition: type,
//                 activity_name: type,
//                 activities: [],
//               };
//             }

//             acc[type].activities.push({
//               slug: `${user.username}-${type}`,
//               contributor: user.username,
//               contributor_name: user.name,
//               contributor_avatar_url: user.avatar_url,
//               occured_at: data.updatedAt,
//               points: meta.points,
//             });
//           }
//           return acc;
//         }, {} as Record<string, ActivityGroup>)
//       ).map(([, group]) => group);

//     activityGroups = groupsFromEntries;
//   }
  
//   return activityGroups;
// }

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
  if (!user.activities) continue;

  for (const act of user.activities) {
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
      contributor_role: user.role ?? null,
      occured_at: act.occured_at,
      title: act.title ?? null,     // ✅ REAL title
      link: act.link ?? null,       // ✅ REAL GitHub link
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

export async function getUpdatedTime() {
  const filePath = path.join(process.cwd(), "public", "leaderboard", "week.json");
  if (!fs.existsSync(filePath)) return null;
  const file = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(file);
  return data.updatedAt ? new Date(data.updatedAt) : null;
}

export async function getLeaderboard(): Promise<UserEntry[]> {
  const filePath = path.join(process.cwd(), "public", "leaderboard", "year.json");
  if (!fs.existsSync(filePath)) return [];

  const file = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(file);
  
  if (!data?.entries) return [];

  return data.entries.sort((a: any, b: any) => b.total_points - a.total_points);
}

export async function getAllContributorsWithAvatars() {
  const leaderboard = await getLeaderboard();
  return leaderboard.map(entry => ({
    username: entry.username,
    avatar_url: entry.avatar_url,
    name: entry.name
  }));
}

export async function getAllContributorUsernames() {
  const leaderboard = await getLeaderboard();
  return leaderboard.map(entry => entry.username);
}

export async function getContributor(username: string) {
  const leaderboard = await getLeaderboard();
  return leaderboard.find(entry => entry.username.toLowerCase() === username.toLowerCase()) || null;
}

import { calculateStreaks, DailyActivity } from "./streak-utils";

/**
 * Calculates contributor profile and stats
 */
export async function getContributorProfile(username: string) {
  const filePath = path.join(process.cwd(), "public", "leaderboard", "year.json");
  const defaultReturn = { 
    contributor: null, 
    activities: [], 
    totalPoints: 0, 
    activityByDate: {}, 
    dailyActivity: [], 
    stats: { currentStreak: 0, longestStreak: 0 } 
  };

  if (!fs.existsSync(filePath)) return defaultReturn;

  const file = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(file);

  if (!data?.entries || !Array.isArray(data.entries)) {
    return defaultReturn;
  }

  const contributor = data.entries.find((entry: any) => entry.username.toLowerCase() === username.toLowerCase());

  if (!contributor) return defaultReturn;

  const activities = (contributor.activities || []).map((a: any) => ({
    ...a,
    occured_at: new Date(a.occured_at),
  }));

  const dailyActivityMap = new Map();
  activities.forEach((activity: any) => {
    const date = new Date(activity.occured_at).toISOString().split("T")[0];
    if (!dailyActivityMap.has(date)) {
      dailyActivityMap.set(date, { count: 0, points: 0 });
    }
    const dayData = dailyActivityMap.get(date);
    dayData.count += 1;
    dayData.points += (activity.points || 0);
  });

  const dailyActivity: DailyActivity[] = Array.from(dailyActivityMap.entries()).map(([date, stats]: [string, any]) => ({
    date,
    ...stats
  }));

  const streaks = calculateStreaks(dailyActivity);

  // Calculate PR Turn-around Time
  const prOpenedMap = new Map<string, Date>();
  const turnAroundTimes: number[] = [];

  // Sort activities chronologically to match opened before merged
  const sortedActivities = [...activities].sort((a, b) => a.occured_at.getTime() - b.occured_at.getTime());

  sortedActivities.forEach(activity => {
    if (activity.type === "PR opened") {
      prOpenedMap.set(activity.link, activity.occured_at);
    } else if (activity.type === "PR merged") {
      const openedAt = prOpenedMap.get(activity.link);
      if (openedAt) {
        const diff = activity.occured_at.getTime() - openedAt.getTime();
        turnAroundTimes.push(diff);
      }
    }
  });

  const avgTurnAroundMs = turnAroundTimes.length > 0 
    ? turnAroundTimes.reduce((a, b) => a + b, 0) / turnAroundTimes.length 
    : 0;

  return {
    contributor,
    activities,
    totalPoints: contributor.total_points,
    activityByDate: dailyActivityMap,
    dailyActivity,
    stats: {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      avgTurnAroundMs
    }
  };
}

export async function getMonthlyActivityBuckets(): Promise<MonthBuckets> {
  const month = await getRecentActivitiesGroupedByType("month");
  const activities = month.flatMap(g => g.activities);
  const now = new Date();
  
  const buckets: MonthBuckets = { w1: 0, w2: 0, w3: 0, w4: 0 };
  
  for (const activity of activities) {
    const activityDate = new Date(activity.occured_at);
    const daysAgo = differenceInDays(now, activityDate);
    
    if (daysAgo < 7) buckets.w1++;
    else if (daysAgo < 14) buckets.w2++;
    else if (daysAgo < 21) buckets.w3++;
    else if (daysAgo < 28) buckets.w4++;
  }
  
  return buckets;
}

export async function getPreviousMonthActivityCount(): Promise<number> {
  const filePath = path.join(process.cwd(), "public", "leaderboard", "month.json");
  if (!fs.existsSync(filePath)) return 0;

  const file = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(file);
  
  if (!data?.entries?.length) return 0;
  
  const activities = data.entries.flatMap((entry: any) => entry.activities || []);
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
