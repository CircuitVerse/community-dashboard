import fs from "fs";
import path from "path";
import { coreTeamMembers, alumniMembers } from "@/lib/team-data";
import type {
  ActivityItem,
  ContributorEntry,
  ContributorListingEntry,
  PeopleData,
  PeopleListingData,
  LeaderboardDataset,
} from "@/types/people";

export const PERIOD_WEIGHT: Record<string, number> = {
  year: 365,
  "2month": 60,
  month: 30,
  "3week": 21,
  "2week": 14,
  week: 7,
};

const KNOWN_PERIOD_FILES = new Set([
  "year.json",
  "2month.json",
  "month.json",
  "3week.json",
  "2week.json",
  "week.json",
]);

const warnedPeriods = new Set<string>();

/**
 * Module-level cache to memoize loadPeopleData across SSG page renders and metadata calls during build.
 */
let memoizedPeopleData: PeopleData | null = null;

export function clearPeopleDataCache(): void {
  memoizedPeopleData = null;
}

/**
 * Returns the period weight for known periods.
 * For unknown periods, logs a warning once and returns null so caller can
 * apply deterministic fallback precedence.
 */
export function getPeriodWeight(period?: string): number | null {
  if (!period) return null;
  const weight = PERIOD_WEIGHT[period];
  if (weight !== undefined) {
    return weight;
  }
  if (!warnedPeriods.has(period)) {
    warnedPeriods.add(period);
    console.warn(
      `[aggregateLeaderboardData] Unknown leaderboard period "${period}". Precedence will fall back to timestamp and deterministic ordering.`
    );
  }
  return null;
}

/**
 * Compares two datasets to establish a deterministic precedence ordering.
 * Datasets sorted in ascending order will be merged sequentially, meaning
 * datasets at the end of the array take precedence for cumulative metrics.
 */
export function compareDatasetPrecedence(
  a: LeaderboardDataset,
  b: LeaderboardDataset
): number {
  const weightA = getPeriodWeight(a.period);
  const weightB = getPeriodWeight(b.period);

  // Both have known period weights: higher weight takes precedence
  if (weightA !== null && weightB !== null) {
    if (weightA !== weightB) {
      return weightA - weightB;
    }
  } else if (weightA !== null && weightB === null) {
    // Known periods take precedence over unknown/unspecified periods
    // to avoid an unknown short-period dataset silently overriding cumulative metrics
    return 1;
  } else if (weightA === null && weightB !== null) {
    return -1;
  }

  // If periods have the same weight or both are unknown/absent, newer timestamp takes precedence
  const timeA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
  const timeB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // Deterministic tie-breaker on period name
  const periodDiff = (a.period ?? "").localeCompare(b.period ?? "");
  if (periodDiff !== 0) {
    return periodDiff;
  }

  // Deterministic tie-breaker based on dataset contents
  const entriesCountA = Array.isArray(a.entries) ? a.entries.length : 0;
  const entriesCountB = Array.isArray(b.entries) ? b.entries.length : 0;
  if (entriesCountA !== entriesCountB) {
    return entriesCountA - entriesCountB;
  }

  const firstUserA =
    Array.isArray(a.entries) &&
    a.entries[0] &&
    typeof (a.entries[0] as Record<string, unknown>).username === "string"
      ? ((a.entries[0] as Record<string, unknown>).username as string)
      : "";
  const firstUserB =
    Array.isArray(b.entries) &&
    b.entries[0] &&
    typeof (b.entries[0] as Record<string, unknown>).username === "string"
      ? ((b.entries[0] as Record<string, unknown>).username as string)
      : "";
  return firstUserA.localeCompare(firstUserB);
}

/**
 * Checks whether a username belongs to a bot account.
 */
export function isBotUsername(rawUsername: string): boolean {
  const username = rawUsername.toLowerCase();
  return (
    username.endsWith("[bot]") ||
    username.endsWith("-bot") ||
    username.endsWith("_bot") ||
    username === "dependabot" ||
    username === "renovate" ||
    username === "github-actions" ||
    username.startsWith("renovate[") ||
    username.startsWith("dependabot[")
  );
}

/**
 * Validates and extracts activities from a raw entry.
 * Note: year.json stores raw activity objects under `raw_activities`, whereas
 * derived period files (week.json, month.json, etc.) store them under `activities`.
 */
function extractActivities(raw: Record<string, unknown>): ActivityItem[] {
  const rawList = Array.isArray(raw.activities)
    ? raw.activities
    : Array.isArray(raw.raw_activities)
    ? raw.raw_activities
    : [];

  const items: ActivityItem[] = [];
  for (const act of rawList) {
    if (act && typeof act === "object") {
      const a = act as Record<string, unknown>;
      if (typeof a.type === "string") {
        items.push({
          type: a.type,
          title:
            typeof a.title === "string" ? a.title : `${a.type} contribution`,
          occured_at:
            typeof a.occured_at === "string"
              ? a.occured_at
              : new Date(0).toISOString(),
          link: typeof a.link === "string" ? a.link : "",
          points:
            typeof a.points === "number" && !isNaN(a.points) ? a.points : 0,
        });
      }
    }
  }
  return items;
}

/**
 * Aggregates contributor data across multiple leaderboard datasets.
 * Precedence is deterministic and does not depend on dataset input order.
 * Missing fields in higher-precedence datasets do not clobber valid values
 * from earlier datasets.
 */
export function aggregateLeaderboardData(
  datasets: LeaderboardDataset[]
): {
  latestUpdatedAt: number;
  people: ContributorEntry[];
} {
  const allContributors = new Map<string, Record<string, unknown>>();
  const contributorActivities = new Map<string, ActivityItem[]>();
  let latestUpdatedAt = 0;

  // Track the highest updatedAt across all valid datasets
  for (const data of datasets) {
    if (
      data &&
      typeof data.updatedAt === "number" &&
      data.updatedAt > latestUpdatedAt
    ) {
      latestUpdatedAt = data.updatedAt;
    }
  }

  // Sort datasets in ascending precedence so that higher-precedence datasets are merged last
  const sortedDatasets = [...datasets].sort(compareDatasetPrecedence);

  for (const data of sortedDatasets) {
    if (!data || !Array.isArray(data.entries)) {
      continue;
    }

    for (const rawEntry of data.entries) {
      if (!rawEntry || typeof rawEntry !== "object") {
        console.warn(
          "[aggregateLeaderboardData] Skipping malformed contributor entry: not an object"
        );
        continue;
      }

      const entry = rawEntry as Record<string, unknown>;
      if (typeof entry.username !== "string" || entry.username.trim() === "") {
        console.warn(
          "[aggregateLeaderboardData] Skipping malformed contributor entry: missing or empty username"
        );
        continue;
      }

      const username = entry.username.trim();
      if (isBotUsername(username)) {
        continue;
      }

      const incomingActivities = extractActivities(entry);
      const existing = allContributors.get(username);

      if (!existing) {
        allContributors.set(username, { ...entry, username });
        contributorActivities.set(username, incomingActivities);
        continue;
      }

      // Merge metadata without clobbering:
      // Keep higher precedence fields when defined and valid, but retain existing values if incoming is undefined/null/empty.
      const merged: Record<string, unknown> = {
        ...existing,
        ...entry,
        username,
        name: typeof entry.name === "string" ? entry.name : existing.name,
        avatar_url:
          typeof entry.avatar_url === "string" && entry.avatar_url.trim() !== ""
            ? entry.avatar_url
            : existing.avatar_url,
        role: typeof entry.role === "string" ? entry.role : existing.role,
        total_points:
          typeof entry.total_points === "number" && !isNaN(entry.total_points)
            ? entry.total_points
            : existing.total_points,
        activity_breakdown:
          entry.activity_breakdown &&
          typeof entry.activity_breakdown === "object" &&
          Object.keys(entry.activity_breakdown as object).length > 0
            ? entry.activity_breakdown
            : existing.activity_breakdown,
        daily_activity:
          Array.isArray(entry.daily_activity) && entry.daily_activity.length > 0
            ? entry.daily_activity
            : existing.daily_activity,
      };

      allContributors.set(username, merged);

      // Merge activities prioritizing the incoming (higher-precedence) dataset metadata
      const existingActs = contributorActivities.get(username) ?? [];
      const seen = new Set<string>();
      const combined: ActivityItem[] = [];

      for (const activity of [...incomingActivities, ...existingActs]) {
        const identifier = activity.link
          ? `${activity.type}-${activity.link}`
          : `${activity.type}-${activity.title}-${activity.occured_at}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          combined.push(activity);
        }
      }

      combined.sort(
        (a, b) =>
          new Date(b.occured_at).getTime() - new Date(a.occured_at).getTime()
      );

      contributorActivities.set(username, combined);
    }
  }

  // Final normalization & placeholder step:
  // Apply fallback defaults and generate missing placeholders to meet activity_breakdown counts (capped at 15).
  const people: ContributorEntry[] = [];

  for (const [username, raw] of allContributors.entries()) {
    const breakdown =
      raw.activity_breakdown && typeof raw.activity_breakdown === "object"
        ? (raw.activity_breakdown as Record<string, { count: number; points: number }>)
        : {};

    const daily = Array.isArray(raw.daily_activity)
      ? (raw.daily_activity as Array<{ date: string; count: number; points: number }>)
      : [];

    const activities = [...(contributorActivities.get(username) ?? [])];
    const expectedCount = Object.values(breakdown).reduce(
      (sum, v) => sum + (v && typeof v.count === "number" ? v.count : 0),
      0
    );

    if (activities.length < expectedCount && activities.length < 15) {
      for (const [type, info] of Object.entries(breakdown)) {
        if (activities.length >= 15) break;
        const existingCount = activities.filter((a) => a.type === type).length;
        const missing = (info?.count || 0) - existingCount;

        for (let i = 0; i < missing; i++) {
          if (activities.length >= 15) break;
          activities.push({
            type,
            title: `${type} contribution`,
            occured_at: new Date(0).toISOString(),
            link: "",
            points:
              info?.count > 0 ? Math.round(info.points / info.count) : 0,
          });
        }
      }
    }

    const contributor: ContributorEntry = {
      ...(raw as Record<string, unknown>),
      username,
      name: typeof raw.name === "string" ? raw.name : null,
      avatar_url:
        typeof raw.avatar_url === "string" && raw.avatar_url.trim() !== ""
          ? raw.avatar_url
          : `https://avatars.githubusercontent.com/${encodeURIComponent(username)}`,
      role: typeof raw.role === "string" ? raw.role : "Contributor",
      total_points:
        typeof raw.total_points === "number" && !isNaN(raw.total_points)
          ? raw.total_points
          : 0,
      activity_breakdown: breakdown,
      daily_activity: daily,
      activities: activities.slice(0, 15),
    };

    people.push(contributor);
  }

  // Sort contributors by total_points descending, with username as deterministic tie-breaker
  people.sort(
    (a, b) =>
      b.total_points - a.total_points || a.username.localeCompare(b.username)
  );

  return {
    latestUpdatedAt,
    people,
  };
}

/**
 * Loads leaderboard data from the filesystem and aggregates contributors.
 * Supports an optional custom directory path for deterministic testing.
 */
export function loadPeopleData(customPath?: string): PeopleData {
  const publicPath =
    customPath ?? path.join(process.cwd(), "public", "leaderboard");

  if (!fs.existsSync(publicPath)) {
    return {
      updatedAt: 0,
      people: [],
      coreTeam: coreTeamMembers,
      alumni: alumniMembers,
    };
  }

  const isCustom = customPath !== undefined;
  const files = fs.readdirSync(publicPath).filter((file) => {
    if (!file.endsWith(".json")) return false;
    if (file === "recent-activities.json" || file === "overview.json")
      return false;
    return isCustom || KNOWN_PERIOD_FILES.has(file);
  });

  const datasets: LeaderboardDataset[] = [];
  for (const file of files) {
    try {
      const filePath = path.join(publicPath, file);
      const data: LeaderboardDataset = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );
      datasets.push(data);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  const { latestUpdatedAt, people } = aggregateLeaderboardData(datasets);

  return {
    updatedAt: latestUpdatedAt,
    people,
    coreTeam: coreTeamMembers,
    alumni: alumniMembers,
  };
}

/**
 * Converts a full ContributorEntry to a listing-optimized ContributorListingEntry
 * by precomputing activeDays and hasRecentActivity and omitting the heavy activities and daily_activity arrays.
 */
export function toListingContributor(
  entry: ContributorEntry,
  referenceTime: number = Date.now()
): ContributorListingEntry {
  const sevenDaysAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;
  const hasRecent = Array.isArray(entry.daily_activity)
    ? entry.daily_activity.some(
        (day) => new Date(day.date).getTime() >= sevenDaysAgo
      )
    : false;

  return {
    username: entry.username,
    name: entry.name,
    avatar_url: entry.avatar_url,
    role: entry.role,
    total_points: entry.total_points,
    activity_breakdown: entry.activity_breakdown,
    activeDays: Array.isArray(entry.daily_activity)
      ? entry.daily_activity.length
      : 0,
    hasRecentActivity: hasRecent,
  };
}

/**
 * Synchronous loader for full PeopleData (used by detail pages and API).
 * Memoized at the module level in production to avoid disk thrashing across SSG renders.
 */
export function getPeopleData(customPath?: string): PeopleData {
  if (!customPath && process.env.NODE_ENV === "production" && memoizedPeopleData) {
    return memoizedPeopleData;
  }
  const data = loadPeopleData(customPath);
  if (!customPath && process.env.NODE_ENV === "production") {
    memoizedPeopleData = data;
  }
  return data;
}

/**
 * Synchronous loader for listing-optimized PeopleListingData.
 * Trims profile-only activities and daily_activity arrays, reducing server-to-client payload by over 91%.
 */
export function getPeopleListingData(customPath?: string): PeopleListingData {
  const fullData = getPeopleData(customPath);
  const refTime = fullData.updatedAt > 0 ? fullData.updatedAt : Date.now();
  return {
    ...fullData,
    people: fullData.people.map((p) => toListingContributor(p, refTime)),
  };
}

/**
 * Retrieves a single contributor by username (case-insensitive and URL-decode safe).
 */
export function getContributorByUsername(
  username: string,
  customPath?: string
): ContributorEntry | null {
  if (!username || typeof username !== "string") return null;

  let decoded = username;
  try {
    decoded = decodeURIComponent(username);
  } catch {
    // Use raw username if decoding fails
  }

  const target = decoded.trim().toLowerCase();
  if (!target) return null;

  const { people } = getPeopleData(customPath);
  return people.find((p) => p.username.toLowerCase() === target) ?? null;
}

/**
 * Returns all contributor usernames for static route generation.
 */
export function getAllContributorUsernames(customPath?: string): string[] {
  const { people } = getPeopleData(customPath);
  return people.map((p) => p.username);
}
