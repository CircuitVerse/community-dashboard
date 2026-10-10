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

export const KNOWN_PERIOD_FILES = new Set([
  "year.json",
  "2month.json",
  "month.json",
  "3week.json",
  "2week.json",
  "week.json",
]);

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
let hasWarnedInvalidOccuredAt = false;

function extractActivities(raw: Record<string, unknown>): ActivityItem[] {
  const acts = Array.isArray(raw.activities) ? raw.activities : [];
  const rawActs = Array.isArray(raw.raw_activities) ? raw.raw_activities : [];
  // Ensure raw_activities is not shadowed if activities is an empty array
  const rawList =
    acts.length > 0 && rawActs.length > 0
      ? [...acts, ...rawActs]
      : acts.length > 0
      ? acts
      : rawActs;

  const items: ActivityItem[] = [];
  for (const act of rawList) {
    if (act && typeof act === "object") {
      const a = act as Record<string, unknown>;
      if (typeof a.type === "string") {
        if (
          typeof a.occured_at !== "string" ||
          isNaN(new Date(a.occured_at).getTime())
        ) {
          if (!hasWarnedInvalidOccuredAt) {
            hasWarnedInvalidOccuredAt = true;
            console.warn(
              `[extractActivities] Dropped activity with missing or unparseable occured_at: "${String(
                a.occured_at
              )}"`
            );
          }
          continue;
        }

        items.push({
          type: a.type,
          title:
            typeof a.title === "string" ? a.title : `${a.type} contribution`,
          occured_at: a.occured_at,
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
 * Strictly validates and normalizes the activity_breakdown map.
 * Ensures every value is an object with valid numeric count and points.
 */
export function validateActivityBreakdown(
  raw: unknown
): Record<string, { count: number; points: number }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, { count: number; points: number }> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const v = value as Record<string, unknown>;
      const count =
        typeof v.count === "number" && !isNaN(v.count) && v.count > 0
          ? v.count
          : 0;
      const points =
        typeof v.points === "number" && !isNaN(v.points) ? v.points : 0;
      result[key] = { count, points };
    }
  }
  return result;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strictly validates and normalizes daily_activity entries.
 * Drops null, non-object entries, or entries without a valid YYYY-MM-DD date string.
 */
export function validateDailyActivity(
  raw: unknown
): Array<{ date: string; count: number; points: number }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: Array<{ date: string; count: number; points: number }> = [];
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const i = item as Record<string, unknown>;
      if (typeof i.date === "string") {
        const trimmedDate = i.date.trim();
        if (ISO_DATE_REGEX.test(trimmedDate)) {
          const count =
            typeof i.count === "number" && !isNaN(i.count) && i.count >= 0
              ? i.count
              : 0;
          const points =
            typeof i.points === "number" && !isNaN(i.points) ? i.points : 0;
          result.push({
            date: trimmedDate,
            count,
            points,
          });
        }
      }
    }
  }
  return result;
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

      const userKey = username.toLowerCase();
      const incomingActivities = extractActivities(entry);
      const incomingBreakdown = validateActivityBreakdown(
        entry.activity_breakdown
      );
      const incomingDaily = validateDailyActivity(entry.daily_activity);

      const existing = allContributors.get(userKey);

      if (!existing) {
        const cleanEntry: Record<string, unknown> = {
          ...entry,
          username,
          activity_breakdown: incomingBreakdown,
          daily_activity: incomingDaily,
        };
        delete cleanEntry.raw_activities;
        delete cleanEntry.activities;
        allContributors.set(userKey, cleanEntry);
        contributorActivities.set(userKey, incomingActivities);
        continue;
      }

      // Merge metadata without clobbering:
      // Keep higher precedence fields when defined and valid, but retain existing values if incoming is undefined/null/empty.
      const existingBreakdown = existing.activity_breakdown as
        | Record<string, { count: number; points: number }>
        | undefined;
      const existingDaily = existing.daily_activity as
        | Array<{ date: string; count: number; points: number }>
        | undefined;

      const mergedBreakdown =
        Object.keys(incomingBreakdown).length > 0
          ? incomingBreakdown
          : existingBreakdown && Object.keys(existingBreakdown).length > 0
          ? existingBreakdown
          : incomingBreakdown;

      const mergedDaily =
        incomingDaily.length > 0
          ? incomingDaily
          : existingDaily && existingDaily.length > 0
          ? existingDaily
          : incomingDaily;

      const merged: Record<string, unknown> = {
        ...existing,
        ...entry,
        username,
        name:
          typeof entry.name === "string" && entry.name.trim() !== ""
            ? entry.name
            : existing.name,
        avatar_url:
          typeof entry.avatar_url === "string" && entry.avatar_url.trim() !== ""
            ? entry.avatar_url
            : existing.avatar_url,
        role:
          typeof entry.role === "string" && entry.role.trim() !== ""
            ? entry.role
            : existing.role,
        total_points:
          typeof entry.total_points === "number" && !isNaN(entry.total_points)
            ? entry.total_points
            : existing.total_points,
        activity_breakdown: mergedBreakdown,
        daily_activity: mergedDaily,
      };
      delete merged.raw_activities;
      delete merged.activities;

      allContributors.set(userKey, merged);

      // Merge activities prioritizing the incoming (higher-precedence) dataset metadata
      const existingActs = contributorActivities.get(userKey) ?? [];
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

      contributorActivities.set(userKey, combined);
    }
  }

  // Final normalization step:
  // Sort activities newest-first once before capping at 15.
  const people: ContributorEntry[] = [];

  for (const [userKey, raw] of allContributors.entries()) {
    const username =
      typeof raw.username === "string" && raw.username.trim() !== ""
        ? (raw.username as string).trim()
        : userKey;

    const breakdown = validateActivityBreakdown(raw.activity_breakdown);
    const daily = validateDailyActivity(raw.daily_activity);

    // Sort collected activities newest-first once before capping at 15
    const activities = [...(contributorActivities.get(userKey) ?? [])];
    activities.sort(
      (a, b) =>
        new Date(b.occured_at).getTime() - new Date(a.occured_at).getTime()
    );

    // Explicitly delete raw_activities and un-capped activities so large arrays from year.json
    // are not leaked into the normalized ContributorEntry, reducing RSC and API payload size.
    const cleanRaw: Record<string, unknown> = {
      ...(raw as Record<string, unknown>),
    };
    delete cleanRaw.raw_activities;
    delete cleanRaw.activities;

    const contributor: ContributorEntry = {
      ...cleanRaw,
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

export interface LoadPeopleDataOptions {
  allowedFiles?: Set<string>;
  strict?: boolean;
}

export const DEFAULT_LOAD_OPTIONS: LoadPeopleDataOptions = Object.freeze({
  strict: process.env.NODE_ENV === "production",
});

function parseLoadOptions(options?: LoadPeopleDataOptions | Set<string>): {
  allowedFiles: Set<string>;
  strict: boolean;
} {
  if (options instanceof Set) {
    return {
      allowedFiles: options,
      strict: false,
    };
  }
  return {
    allowedFiles: options?.allowedFiles ?? KNOWN_PERIOD_FILES,
    strict: options?.strict ?? (process.env.NODE_ENV === "production"),
  };
}

/**
 * Loads leaderboard data from the filesystem and aggregates contributors.
 * Supports an optional custom directory path and injectable options.
 */
export function loadPeopleData(
  customPath?: string,
  options: LoadPeopleDataOptions | Set<string> = DEFAULT_LOAD_OPTIONS
): PeopleData {
  const { allowedFiles, strict } = parseLoadOptions(options);
  const publicPath =
    customPath ?? path.join(process.cwd(), "public", "leaderboard");

  if (!fs.existsSync(publicPath)) {
    if (strict) {
      throw new Error(
        `[loadPeopleData] Leaderboard directory does not exist at "${publicPath}". Refusing to build or regenerate with empty data.`
      );
    }
    return {
      updatedAt: 0,
      people: [],
      coreTeam: coreTeamMembers,
      alumni: alumniMembers,
    };
  }

  const files = fs.readdirSync(publicPath).filter((file) => {
    if (!file.endsWith(".json")) return false;
    if (file === "recent-activities.json" || file === "overview.json")
      return false;
    return allowedFiles.has(file);
  });

  if (allowedFiles.has("year.json") && !files.includes("year.json")) {
    console.warn(
      `[loadPeopleData] "year.json" was not found in "${publicPath}". Full-year cumulative metrics may be incomplete.`
    );
  }

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

  if (strict && people.length === 0) {
    throw new Error(
      `[loadPeopleData] Leaderboard directory at "${publicPath}" yielded zero contributors. Refusing to build or regenerate with empty data.`
    );
  }

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
    ? entry.daily_activity.some((day) => {
        if (!day || typeof day.date !== "string") return false;
        const time = new Date(day.date).getTime();
        return !isNaN(time) && time >= sevenDaysAgo;
      })
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
 * Cached loader for full PeopleData (used by detail pages and API).
 * Wrapped in React cache to memoize across Server Component render passes
 * without leaking stale state across ISR cycles in a long-lived server process.
 */
export const getPeopleData = cache(
  (
    customPath?: string,
    options: LoadPeopleDataOptions | Set<string> = DEFAULT_LOAD_OPTIONS
  ): PeopleData => {
    return loadPeopleData(customPath, options);
  }
);

/**
 * Synchronous loader for listing-optimized PeopleListingData.
 * Trims profile-only activities and daily_activity arrays, significantly
 * reducing server-to-client payload for the listing view.
 */
export function getPeopleListingData(
  customPath?: string,
  options: LoadPeopleDataOptions | Set<string> = DEFAULT_LOAD_OPTIONS
): PeopleListingData {
  const fullData = getPeopleData(customPath, options);
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
  customPath?: string,
  options: LoadPeopleDataOptions | Set<string> = DEFAULT_LOAD_OPTIONS
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

  const { people } = getPeopleData(customPath, options);
  return people.find((p) => p.username.toLowerCase() === target) ?? null;
}

/**
 * Returns all contributor usernames for static route generation.
 */
export function getAllContributorUsernames(
  customPath?: string,
  options: LoadPeopleDataOptions | Set<string> = DEFAULT_LOAD_OPTIONS
): string[] {
  const { people } = getPeopleData(customPath, options);
  return people.map((p) => p.username);
}
