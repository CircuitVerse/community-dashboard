import { describe, it, expect } from "vitest";
import {
  aggregateLeaderboardData,
  getPeopleData,
  getContributorByUsername,
  getAllContributorUsernames,
} from "@/lib/people";
import type { ContributorEntry, LeaderboardDataset } from "@/types/people";

function makeContributor(overrides: Partial<ContributorEntry> = {}): ContributorEntry {
  return {
    username: "sampleuser",
    name: "Sample User",
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    role: "Contributor",
    total_points: 100,
    activity_breakdown: {},
    daily_activity: [],
    activities: [],
    ...overrides,
  };
}

describe("lib/people - aggregateLeaderboardData (unit)", () => {
  it("A & I: filters out bots according to rules without removing legitimate users", () => {
    const dataset: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({ username: "dependabot" }),
        makeContributor({ username: "renovate" }),
        makeContributor({ username: "github-actions" }),
        makeContributor({ username: "renovate[bot]" }),
        makeContributor({ username: "dependabot[bot]" }),
        makeContributor({ username: "my-app[bot]" }),
        makeContributor({ username: "release-bot" }),
        makeContributor({ username: "ci_bot" }),
        // Legitimate users containing "bot"
        makeContributor({ username: "robotics-fan", total_points: 50 }),
        makeContributor({ username: "abbot", total_points: 60 }),
        makeContributor({ username: "botanist", total_points: 70 }),
        makeContributor({ username: "bottom-line", total_points: 80 }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    const usernames = people.map((p) => p.username);

    expect(usernames).not.toContain("dependabot");
    expect(usernames).not.toContain("renovate");
    expect(usernames).not.toContain("github-actions");
    expect(usernames).not.toContain("renovate[bot]");
    expect(usernames).not.toContain("dependabot[bot]");
    expect(usernames).not.toContain("my-app[bot]");
    expect(usernames).not.toContain("release-bot");
    expect(usernames).not.toContain("ci_bot");

    expect(usernames).toContain("robotics-fan");
    expect(usernames).toContain("abbot");
    expect(usernames).toContain("botanist");
    expect(usernames).toContain("bottom-line");
    expect(people).toHaveLength(4);
  });

  it("D: sorts contributors by total_points descending", () => {
    const dataset: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({ username: "user-low", total_points: 30 }),
        makeContributor({ username: "user-high", total_points: 500 }),
        makeContributor({ username: "user-mid", total_points: 150 }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);

    expect(people.map((p) => p.username)).toEqual([
      "user-high",
      "user-mid",
      "user-low",
    ]);
  });

  it("E: aggregates the same contributor appearing across multiple datasets and tracks latest updatedAt", () => {
    const dataset1: LeaderboardDataset = {
      updatedAt: 1000,
      entries: [
        makeContributor({
          username: "alice",
          total_points: 50,
          activities: [
            {
              type: "PR opened",
              title: "Fix bug",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/1",
              points: 10,
            },
          ],
        }),
      ],
    };

    const dataset2: LeaderboardDataset = {
      updatedAt: 2500,
      entries: [
        makeContributor({
          username: "alice",
          total_points: 120,
          activities: [
            {
              type: "PR merged",
              title: "Feature add",
              occured_at: "2026-01-05T00:00:00Z",
              link: "https://github.com/pr/2",
              points: 20,
            },
          ],
        }),
      ],
    };

    const { latestUpdatedAt, people } = aggregateLeaderboardData([
      dataset1,
      dataset2,
    ]);

    expect(latestUpdatedAt).toBe(2500);
    expect(people).toHaveLength(1);
    const alice = people[0];
    expect(alice).toBeDefined();
    if (!alice) return;

    expect(alice.username).toBe("alice");
    expect(alice.total_points).toBe(120);
    expect(alice.activities).toHaveLength(2);
  });

  it("F: deduplicates activities by type+link and fallback type+title+occured_at", () => {
    const dataset1: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "bob",
          activities: [
            {
              type: "PR opened",
              title: "Initial PR",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/100",
              points: 10,
            },
            {
              type: "commit",
              title: "docs update",
              occured_at: "2026-01-02T12:00:00Z",
              link: "",
              points: 5,
            },
          ],
        }),
      ],
    };

    const dataset2: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "bob",
          activities: [
            // Duplicate of PR by type + link
            {
              type: "PR opened",
              title: "Updated Title for PR 100",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/100",
              points: 10,
            },
            // Duplicate of commit by fallback type + title + occured_at
            {
              type: "commit",
              title: "docs update",
              occured_at: "2026-01-02T12:00:00Z",
              link: "",
              points: 5,
            },
            // Distinct new activity
            {
              type: "Issue opened",
              title: "Bug found",
              occured_at: "2026-01-03T00:00:00Z",
              link: "https://github.com/issues/50",
              points: 5,
            },
          ],
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset1, dataset2]);
    const bob = people[0];
    expect(bob).toBeDefined();
    if (!bob) return;

    expect(bob.activities).toHaveLength(3);
  });

  it("G: orders activities newest-first", () => {
    const dataset1: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "charlie",
          activities: [
            {
              type: "PR opened",
              title: "Oldest",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/1",
              points: 5,
            },
          ],
        }),
      ],
    };

    const dataset2: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "charlie",
          activities: [
            {
              type: "PR merged",
              title: "Newest",
              occured_at: "2026-03-01T00:00:00Z",
              link: "https://github.com/pr/3",
              points: 15,
            },
            {
              type: "Issue opened",
              title: "Middle",
              occured_at: "2026-02-01T00:00:00Z",
              link: "https://github.com/pr/2",
              points: 10,
            },
          ],
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset1, dataset2]);
    const charlie = people[0];
    expect(charlie).toBeDefined();
    if (!charlie || !charlie.activities) return;

    expect(charlie.activities.map((a) => a.title)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  it("H: caps retained activities at 15 when aggregating across datasets", () => {
    const activities1 = Array.from({ length: 10 }, (_, i) => ({
      type: "PR opened",
      title: `PR file 1 - ${i + 1}`,
      occured_at: new Date(2026, 0, i + 1).toISOString(),
      link: `https://github.com/pr/1-${i + 1}`,
      points: 10,
    }));

    const activities2 = Array.from({ length: 15 }, (_, i) => ({
      type: "PR opened",
      title: `PR file 2 - ${i + 1}`,
      occured_at: new Date(2026, 1, i + 1).toISOString(),
      link: `https://github.com/pr/2-${i + 1}`,
      points: 10,
    }));

    const dataset1: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "dave",
          activities: activities1,
        }),
      ],
    };

    const dataset2: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "dave",
          activities: activities2,
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset1, dataset2]);
    const dave = people[0];
    expect(dave).toBeDefined();
    if (!dave) return;

    expect(dave.activities).toHaveLength(15);
  });

  it("generates placeholder activities when combined count across datasets is less than breakdown count", () => {
    const dataset1: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "eve",
          activities: [
            {
              type: "PR opened",
              title: "PR 1",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/1",
              points: 10,
            },
          ],
        }),
      ],
    };

    const dataset2: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "eve",
          activity_breakdown: {
            "PR opened": { count: 3, points: 30 },
          },
          activities: [],
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset1, dataset2]);
    const eve = people[0];
    expect(eve).toBeDefined();
    if (!eve || !eve.activities) return;

    expect(eve.activities).toHaveLength(3);
    const placeholders = eve.activities.filter(
      (a) => a.title === "PR opened contribution"
    );
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0]?.points).toBe(10);
  });
});

describe("lib/people - filesystem integration smoke tests", () => {
  it("loads people data with contributors, coreTeam, and alumni", async () => {
    const data = await getPeopleData();

    expect(data).toBeDefined();
    expect(Array.isArray(data.people)).toBe(true);
    expect(data.people.length).toBeGreaterThan(0);
    expect(Array.isArray(data.coreTeam)).toBe(true);
    expect(data.coreTeam.length).toBeGreaterThan(0);
    expect(Array.isArray(data.alumni)).toBe(true);
    expect(typeof data.updatedAt).toBe("number");
  });

  it("B: finds a contributor case-insensitively", async () => {
    const usernames = await getAllContributorUsernames();
    expect(usernames.length).toBeGreaterThan(0);

    const targetUsername = usernames[0];
    expect(targetUsername).toBeDefined();
    if (!targetUsername) return;

    const contributorExact = await getContributorByUsername(targetUsername);
    const contributorLower = await getContributorByUsername(
      targetUsername.toLowerCase()
    );
    const contributorUpper = await getContributorByUsername(
      targetUsername.toUpperCase()
    );

    expect(contributorExact).not.toBeNull();
    expect(contributorLower).not.toBeNull();
    expect(contributorUpper).not.toBeNull();
    expect(contributorLower?.username).toBe(contributorExact?.username);
    expect(contributorUpper?.username).toBe(contributorExact?.username);
  });

  it("C: returns null for nonexistent or empty username", async () => {
    const nonExistent = await getContributorByUsername(
      "non-existent-user-xyz-12345"
    );
    expect(nonExistent).toBeNull();

    const empty = await getContributorByUsername("");
    expect(empty).toBeNull();
  });
});
