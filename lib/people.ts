import fs from "fs";
import path from "path";
import { cache } from "react";
import { coreTeamMembers, alumniMembers } from "@/lib/team-data";
import type {
  ContributorEntry,
  PeopleData,
  LeaderboardDataset,
} from "@/types/people";

const PERIOD_WEIGHT: Record<string, number> = {
  year: 365,
  "2month": 60,
  month: 30,
  "3week": 21,
  "2week": 14,
  week: 7,
};

function compareDatasetPrecedence(
  a: LeaderboardDataset,
  b: LeaderboardDataset
): number {
  const weightA = a.period ? (PERIOD_WEIGHT[a.period] ?? 1) : 0;
  const weightB = b.period ? (PERIOD_WEIGHT[b.period] ?? 1) : 0;

  // Longer/more cumulative periods take precedence for cumulative metrics
  if (weightA !== weightB) {
    return weightA - weightB;
  }

  // If periods are identical (or both absent), newer dataset takes precedence
  const timeA = a.updatedAt ?? 0;
  const timeB = b.updatedAt ?? 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // Deterministic tie-breaker
  return (a.period ?? "").localeCompare(b.period ?? "");
}

export function aggregateLeaderboardData(
  datasets: LeaderboardDataset[]
): {
  latestUpdatedAt: number;
  people: ContributorEntry[];
} {
  const allContributors = new Map<string, ContributorEntry>();
  let latestUpdatedAt = 0;

  // Track the latest updatedAt across all datasets regardless of order
  for (const data of datasets) {
    if (data.updatedAt && data.updatedAt > latestUpdatedAt) {
      latestUpdatedAt = data.updatedAt;
    }
  }

  // Sort datasets in ascending precedence so that higher-precedence datasets are merged last
  const sortedDatasets = [...datasets].sort(compareDatasetPrecedence);

  for (const data of sortedDatasets) {

    for (const entry of data.entries || []) {
      // More precise bot filtering to avoid filtering legitimate users
      const username = entry.username.toLowerCase();
      const isBot =
        username.endsWith("[bot]") ||
        username.endsWith("-bot") ||
        username.endsWith("_bot") ||
        username === "dependabot" ||
        username === "renovate" ||
        username === "github-actions" ||
        username.startsWith("renovate[") ||
        username.startsWith("dependabot[");
      if (isBot) {
        continue;
      }

      const existing = allContributors.get(entry.username);
      if (!existing) {
        allContributors.set(entry.username, {
          ...entry,
          activities: entry.activities ?? [],
        });
        continue;
      }

      const existingActivities = existing.activities ?? [];
      const newActivities = entry.activities ?? [];

      const seen = new Set<string>();
      const combined: NonNullable<ContributorEntry["activities"]> = [];
      for (const activity of [...existingActivities, ...newActivities]) {
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

      const expectedCount = Object.values(
        entry.activity_breakdown || {}
      ).reduce((sum, v) => sum + v.count, 0);

      if (combined.length < expectedCount) {
        for (const [type, info] of Object.entries(
          entry.activity_breakdown || {}
        )) {
          const existingCount = combined.filter((a) => a.type === type).length;
          const missing = info.count - existingCount;

          for (let i = 0; i < missing; i++) {
            combined.push({
              type,
              title: `${type} contribution`,
              occured_at: new Date(0).toISOString(),
              link: "",
              points: info.count > 0 ? Math.round(info.points / info.count) : 0,
            });
          }
        }
      }

      allContributors.set(entry.username, {
        ...existing,
        ...entry,
        activities: combined.slice(0, 15),
      });
    }
  }

  const people = Array.from(allContributors.values()).sort(
    (a, b) => b.total_points - a.total_points
  );

  return {
    latestUpdatedAt,
    people,
  };
}

function loadPeopleData(): PeopleData {
  const publicPath = path.join(process.cwd(), "public", "leaderboard");
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
      (file) => file.endsWith(".json") && file !== "recent-activities.json"
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

export const getPeopleData = cache(async (): Promise<PeopleData> => {
  return loadPeopleData();
});

export const getContributorByUsername = cache(
  async (username: string): Promise<ContributorEntry | null> => {
    if (!username) return null;
    const { people } = await getPeopleData();
    const target = username.toLowerCase();
    return people.find((p) => p.username.toLowerCase() === target) || null;
  }
);

export const getAllContributorUsernames = cache(async (): Promise<string[]> => {
  const { people } = await getPeopleData();
  return people.map((p) => p.username);
});
