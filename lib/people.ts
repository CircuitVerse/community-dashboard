import fs from "fs";
import path from "path";
import { cache } from "react";
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

const warnedPeriods = new Set<string>();

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

  const firstUserA = Array.isArray(a.entries) && a.entries[0] && typeof (a.entries[0] as Record<string, unknown>).username === "string"
    ? ((a.entries[0] as Record<string, unknown>).username as string)
    : "";
  const firstUserB = Array.isArray(b.entries) && b.entries[0] && typeof (b.entries[0] as Record<string, unknown>).username === "string"
    ? ((b.entries[0] as Record<string, unknown>).username as string)
    : "";
  return firstUserA.localeCompare(firstUserB);
}

/**
 * Validates and sanitizes a raw contributor entry from JSON data.
 * Skips entries without a valid, non-empty username string.
 */
function sanitizeContributorEntry(
  raw: unknown
): ContributorEntry | null {
  if (!raw || typeof raw !== "object") {
    console.warn(
      "[aggregateLeaderboardData] Skipping malformed contributor entry: not an object"
    );
    return null;
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.username !== "string" || obj.username.trim() === "") {
    console.warn(
      "[aggregateLeaderboardData] Skipping malformed contributor entry: missing or empty username"
    );
    return null;
  }

  const username = obj.username.trim();
  const name = typeof obj.name === "string" ? obj.name : null;
  const avatar_url =
    typeof obj.avatar_url === "string" && obj.avatar_url.trim() !== ""
      ? obj.avatar_url
      : `https://avatars.githubusercontent.com/${encodeURIComponent(username)}`;
  const role = typeof obj.role === "string" ? obj.role : "Contributor";
  const total_points =
    typeof obj.total_points === "number" && !isNaN(obj.total_points)
      ? obj.total_points
      : 0;

  const activity_breakdown: Record<string, { count: number; points: number }> =
    {};
  if (obj.activity_breakdown && typeof obj.activity_breakdown === "object") {
    for (const [k, v] of Object.entries(
      obj.activity_breakdown as Record<string, unknown>
    )) {
      if (v && typeof v === "object") {
        const item = v as Record<string, unknown>;
        activity_breakdown[k] = {
          count: typeof item.count === "number" && !isNaN(item.count) ? item.count : 0,
          points: typeof item.points === "number" && !isNaN(item.points) ? item.points : 0,
        };
      }
    }
  }

  const daily_activity: Array<{ date: string; count: number; points: number }> =
    [];
  if (Array.isArray(obj.daily_activity)) {
    for (const day of obj.daily_activity) {
      if (day && typeof day === "object") {
        const item = day as Record<string, unknown>;
        if (typeof item.date === "string") {
          daily_activity.push({
            date: item.date,
            count: typeof item.count === "number" && !isNaN(item.count) ? item.count : 0,
            points: typeof item.points === "number" && !isNaN(item.points) ? item.points : 0,
          });
        }
      }
    }
  }

  const rawActivities = Array.isArray(obj.activities)
    ? obj.activities
    : Array.isArray(obj.raw_activities)
    ? obj.raw_activities
    : [];

  const activities: ActivityItem[] = [];
  for (const act of rawActivities) {
    if (act && typeof act === "object") {
      const a = act as Record<string, unknown>;
      if (typeof a.type === "string") {
        activities.push({
          type: a.type,
          title: typeof a.title === "string" ? a.title : `${a.type} contribution`,
          occured_at:
            typeof a.occured_at === "string"
              ? a.occured_at
              : new Date(0).toISOString(),
          link: typeof a.link === "string" ? a.link : "",
          points: typeof a.points === "number" && !isNaN(a.points) ? a.points : 0,
        });
      }
    }
  }

  return {
    username,
    name,
    avatar_url,
    role,
    total_points,
    activity_breakdown,
    daily_activity,
    activities,
  };
}

/**
 * Checks whether a username belongs to a bot account.
 */
function isBotUsername(rawUsername: string): boolean {
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
 * Aggregates contributor data across multiple leaderboard datasets.
 * Precedence is deterministic and does not depend on dataset input order.
 */
export function aggregateLeaderboardData(
  datasets: LeaderboardDataset[]
): {
  latestUpdatedAt: number;
  people: ContributorEntry[];
} {
  const allContributors = new Map<string, ContributorEntry>();
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
      const entry = sanitizeContributorEntry(rawEntry);
      if (!entry) {
        continue;
      }

      if (isBotUsername(entry.username)) {
        continue;
      }

      const existing = allContributors.get(entry.username);
      if (!existing) {
        allContributors.set(entry.username, {
          ...entry,
          activities: [...(entry.activities ?? [])],
        });
        continue;
      }

      // Merge genuine activities across datasets.
      // Prioritize activities from the incoming (higher-precedence) dataset so updated
      // metadata (title, points, occurred_at) from higher-precedence datasets wins.
      const incomingActivities = entry.activities ?? [];
      const existingActivities = existing.activities ?? [];

      const seen = new Set<string>();
      const combined: ActivityItem[] = [];

      for (const activity of [...incomingActivities, ...existingActivities]) {
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

      // Overwrite base metadata with incoming (higher-precedence) dataset
      allContributors.set(entry.username, {
        ...existing,
        ...entry,
        activities: combined,
      });
    }
  }

  // Post-aggregation step: Generate placeholder activities for missing activity breakdown counts
  // and enforce the 15-activity cap. Doing this once here ensures consistent behavior regardless
  // of whether a contributor appeared in 1, 2, or 3+ datasets and prevents placeholders from
  // collapsing during intermediate deduplication passes.
  for (const contributor of allContributors.values()) {
    const expectedCount = Object.values(
      contributor.activity_breakdown || {}
    ).reduce((sum, v) => sum + (v.count || 0), 0);

    const activities = [...(contributor.activities ?? [])];

    if (activities.length < expectedCount && activities.length < 15) {
      for (const [type, info] of Object.entries(
        contributor.activity_breakdown || {}
      )) {
        if (activities.length >= 15) break;
        const existingCount = activities.filter((a) => a.type === type).length;
        const missing = (info.count || 0) - existingCount;

        for (let i = 0; i < missing; i++) {
          if (activities.length >= 15) break;
          activities.push({
            type,
            title: `${type} contribution`,
            occured_at: new Date(0).toISOString(),
            link: "",
            points:
              info.count > 0 ? Math.round(info.points / info.count) : 0,
          });
        }
      }
    }

    contributor.activities = activities.slice(0, 15);
  }

  // Sort contributors by total_points descending, with username as deterministic tie-breaker
  const people = Array.from(allContributors.values()).sort(
    (a, b) => b.total_points - a.total_points || a.username.localeCompare(b.username)
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

  const files = fs
    .readdirSync(publicPath)
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file !== "recent-activities.json" &&
        file !== "overview.json"
    );

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
 * by stripping profile-only activities array.
 */
export function toListingContributor(
  entry: ContributorEntry
): ContributorListingEntry {
  return {
    username: entry.username,
    name: entry.name,
    avatar_url: entry.avatar_url,
    role: entry.role,
    total_points: entry.total_points,
    activity_breakdown: entry.activity_breakdown,
    daily_activity: entry.daily_activity,
  };
}

/**
 * Cached synchronous loader for full PeopleData (used by detail pages and API).
 */
export const getPeopleData = cache((): PeopleData => {
  return loadPeopleData();
});

/**
 * Cached synchronous loader for listing-optimized PeopleListingData.
 * Trims ~85% of serialized payload from server-to-client props on /people.
 */
export const getPeopleListingData = cache((): PeopleListingData => {
  const fullData = getPeopleData();
  return {
    ...fullData,
    people: fullData.people.map(toListingContributor),
  };
});

/**
 * Retrieves a single contributor by username (case-insensitive and URL-decode safe).
 */
export const getContributorByUsername = cache(
  (username: string): ContributorEntry | null => {
    if (!username || typeof username !== "string") return null;

    let decoded = username;
    try {
      decoded = decodeURIComponent(username);
    } catch {
      // Use raw username if decoding fails
    }

    const target = decoded.trim().toLowerCase();
    if (!target) return null;

    const { people } = getPeopleData();
    return people.find((p) => p.username.toLowerCase() === target) ?? null;
  }
);

/**
 * Returns all contributor usernames for static route generation.
 */
export const getAllContributorUsernames = cache((): string[] => {
  const { people } = getPeopleData();
  return people.map((p) => p.username);
});
