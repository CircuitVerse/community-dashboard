import fs from "fs";
import path from "path";
import { cache } from "react";
import { coreTeamMembers, alumniMembers } from "@/lib/team-data";
import type {
  ContributorEntry,
  PeopleData,
  LeaderboardDataset,
} from "@/types/people";

export function aggregateLeaderboardData(
  datasets: LeaderboardDataset[]
): {
  latestUpdatedAt: number;
  people: ContributorEntry[];
} {
  const allContributors = new Map<string, ContributorEntry>();
  let latestUpdatedAt = 0;

  for (const data of datasets) {
    if (data.updatedAt && data.updatedAt > latestUpdatedAt) {
      latestUpdatedAt = data.updatedAt;
    }

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
