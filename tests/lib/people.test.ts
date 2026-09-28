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

  it("merges datasets deterministically regardless of input ordering (newer updatedAt takes precedence)", () => {
    const olderDataset: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "alice",
          name: "Alice Old",
          avatar_url: "https://example.com/alice-old.png",
          role: "Contributor",
          total_points: 50,
          activity_breakdown: { "PR opened": { count: 1, points: 10 } },
          activities: [
            {
              type: "PR opened",
              title: "Old PR",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/1",
              points: 10,
            },
          ],
        }),
      ],
    };

    const newerDataset: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "alice",
          name: "Alice New",
          avatar_url: "https://example.com/alice-new.png",
          role: "Top Contributor",
          total_points: 150,
          activity_breakdown: {
            "PR opened": { count: 1, points: 10 },
            "PR merged": { count: 1, points: 20 },
          },
          activities: [
            {
              type: "PR merged",
              title: "New PR",
              occured_at: "2026-01-05T00:00:00Z",
              link: "https://github.com/pr/2",
              points: 20,
            },
          ],
        }),
      ],
    };

    const result1 = aggregateLeaderboardData([olderDataset, newerDataset]);
    const result2 = aggregateLeaderboardData([newerDataset, olderDataset]);

    // Both ordering variations must yield identical results
    expect(result1).toEqual(result2);

    // Contributor-level data must be from the newer dataset
    const alice = result1.people[0];
    expect(alice).toBeDefined();
    if (!alice) return;

    expect(alice.name).toBe("Alice New");
    expect(alice.avatar_url).toBe("https://example.com/alice-new.png");
    expect(alice.role).toBe("Top Contributor");
    expect(alice.total_points).toBe(150);
    expect(alice.activity_breakdown).toEqual({
      "PR opened": { count: 1, points: 10 },
      "PR merged": { count: 1, points: 20 },
    });

    // Activities from both are merged, deduplicated, and sorted newest-first
    expect(alice.activities).toHaveLength(2);
    expect(alice.activities?.[0]?.title).toBe("New PR");
    expect(alice.activities?.[1]?.title).toBe("Old PR");

    // latestUpdatedAt must reflect the newest timestamp
    expect(result1.latestUpdatedAt).toBe(200);
    expect(result2.latestUpdatedAt).toBe(200);
  });

  it("preserves cumulative period data (year over shorter periods) deterministically regardless of input ordering", () => {
    const weekDataset: LeaderboardDataset = {
      period: "week",
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "bob",
          total_points: 5,
          activities: [
            {
              type: "Issue opened",
              title: "Issue this week",
              occured_at: "2026-01-10T00:00:00Z",
              link: "https://github.com/issues/10",
              points: 5,
            },
          ],
        }),
      ],
    };

    const yearDataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 190, // generated slightly earlier in the same workflow run
      entries: [
        makeContributor({
          username: "bob",
          total_points: 1092,
          activities: [],
        }),
      ],
    };

    const r1 = aggregateLeaderboardData([weekDataset, yearDataset]);
    const r2 = aggregateLeaderboardData([yearDataset, weekDataset]);

    expect(r1).toEqual(r2);
    expect(r1.people[0]?.total_points).toBe(1092);
    expect(r2.people[0]?.total_points).toBe(1092);
    expect(r1.latestUpdatedAt).toBe(200);
    expect(r2.latestUpdatedAt).toBe(200);
    expect(r1.people[0]?.activities).toHaveLength(1);
    expect(r1.people[0]?.activities?.[0]?.title).toBe("Issue this week");
  });

  it("deduplicates activities and enforces 15-activity cap identically regardless of dataset ordering", () => {
    const makeActivities = (prefix: string, count: number, startDay: number) =>
      Array.from({ length: count }, (_, i) => ({
        type: "PR opened",
        title: `${prefix} PR ${i + 1}`,
        occured_at: new Date(2026, 0, startDay + i).toISOString(),
        link: `https://github.com/pr/${prefix}-${i + 1}`,
        points: 10,
      }));

    const datasetA: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "dave",
          activities: makeActivities("A", 10, 1),
        }),
      ],
    };

    const datasetB: LeaderboardDataset = {
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "dave",
          activities: [
            // Duplicate of one from datasetA
            {
              type: "PR opened",
              title: "A PR 10 updated",
              occured_at: new Date(2026, 0, 10).toISOString(),
              link: "https://github.com/pr/A-10",
              points: 10,
            },
            ...makeActivities("B", 10, 11),
          ],
        }),
      ],
    };

    const r1 = aggregateLeaderboardData([datasetA, datasetB]);
    const r2 = aggregateLeaderboardData([datasetB, datasetA]);

    expect(r1).toEqual(r2);
    expect(r1.people[0]?.activities).toHaveLength(15);
    expect(r2.people[0]?.activities).toHaveLength(15);
    expect(r1.people[0]?.activities?.[0]?.title).toBe("B PR 10");
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
