import { describe, it, expect } from "vitest";
import {
  aggregateLeaderboardData,
  toListingContributor,
  getPeriodWeight,
  compareDatasetPrecedence,
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
  it("filters bot accounts without excluding legitimate usernames", () => {
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

  it("safely skips malformed entries with missing or non-string username and processes valid entries", () => {
    const dataset: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        null as unknown as ContributorEntry,
        undefined as unknown as ContributorEntry,
        {} as unknown as ContributorEntry,
        { username: "" } as unknown as ContributorEntry,
        { username: "   " } as unknown as ContributorEntry,
        { username: 12345 } as unknown as ContributorEntry,
        { username: null } as unknown as ContributorEntry,
        makeContributor({ username: "valid-user", total_points: 150 }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    expect(people).toHaveLength(1);
    expect(people[0]?.username).toBe("valid-user");
    expect(people[0]?.total_points).toBe(150);
  });

  it("safely handles datasets with missing or non-array entries", () => {
    const datasetWithoutEntries: LeaderboardDataset = {
      updatedAt: 500,
    };
    const datasetWithNullEntries: LeaderboardDataset = {
      updatedAt: 600,
      entries: null as unknown as ContributorEntry[],
    };
    const validDataset: LeaderboardDataset = {
      updatedAt: 700,
      entries: [makeContributor({ username: "valid-contributor", total_points: 200 })],
    };

    const { latestUpdatedAt, people } = aggregateLeaderboardData([
      datasetWithoutEntries,
      datasetWithNullEntries,
      validDataset,
    ]);

    expect(latestUpdatedAt).toBe(700);
    expect(people).toHaveLength(1);
    expect(people[0]?.username).toBe("valid-contributor");
  });

  it("sorts contributors by total_points descending with deterministic username tie-breaker", () => {
    const dataset: LeaderboardDataset = {
      updatedAt: 100,
      entries: [
        makeContributor({ username: "user-low", total_points: 30 }),
        makeContributor({ username: "user-high", total_points: 500 }),
        makeContributor({ username: "user-mid-b", total_points: 150 }),
        makeContributor({ username: "user-mid-a", total_points: 150 }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);

    expect(people.map((p) => p.username)).toEqual([
      "user-high",
      "user-mid-a",
      "user-mid-b",
      "user-low",
    ]);
  });

  it("aggregates the same contributor appearing across multiple datasets and tracks latest updatedAt", () => {
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

  it("deduplicates activities across datasets by type+link and fallback type+title+occured_at", () => {
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

  it("resolves duplicate activity metadata in favor of the higher-precedence dataset regardless of input order", () => {
    // Dataset A has older/lower-precedence activity details
    const datasetLower: LeaderboardDataset = {
      period: "week",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "carol",
          activities: [
            {
              type: "PR opened",
              title: "Draft PR Title",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/CircuitVerse/CircuitVerse/pull/999",
              points: 2,
            },
          ],
        }),
      ],
    };

    // Dataset B has higher-precedence (e.g. year / newer) updated activity details
    const datasetHigher: LeaderboardDataset = {
      period: "year",
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "carol",
          activities: [
            {
              type: "PR opened",
              title: "Final Merged PR Title",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/CircuitVerse/CircuitVerse/pull/999",
              points: 5,
            },
          ],
        }),
      ],
    };

    const resForward = aggregateLeaderboardData([datasetLower, datasetHigher]);
    const resReversed = aggregateLeaderboardData([datasetHigher, datasetLower]);

    expect(resForward).toEqual(resReversed);

    const carol = resForward.people[0];
    expect(carol?.activities).toHaveLength(1);
    expect(carol?.activities?.[0]?.title).toBe("Final Merged PR Title");
    expect(carol?.activities?.[0]?.points).toBe(5);
  });

  it("orders activities newest-first chronologically", () => {
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

  it("caps retained activities at 15 items", () => {
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

  it("generates placeholder activities consistently whether contributor appears in one or multiple datasets", () => {
    // Contributor appearing in a single dataset with breakdown > genuine activities
    const singleDataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "single-entry-user",
          activity_breakdown: {
            "PR opened": { count: 3, points: 30 },
          },
          activities: [
            {
              type: "PR opened",
              title: "Real PR",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/real",
              points: 10,
            },
          ],
        }),
      ],
    };

    const { people: singleRes } = aggregateLeaderboardData([singleDataset]);
    const singleUser = singleRes[0];
    expect(singleUser?.activities).toHaveLength(3);
    expect(singleUser?.activities?.[0]?.title).toBe("Real PR");
    expect(singleUser?.activities?.[1]?.title).toBe("PR opened contribution");
    expect(singleUser?.activities?.[2]?.title).toBe("PR opened contribution");

    // Contributor appearing in multiple datasets
    const multiDataset1: LeaderboardDataset = {
      period: "month",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "multi-entry-user",
          activity_breakdown: { "PR opened": { count: 1, points: 10 } },
          activities: [
            {
              type: "PR opened",
              title: "Real PR",
              occured_at: "2026-01-01T00:00:00Z",
              link: "https://github.com/pr/real",
              points: 10,
            },
          ],
        }),
      ],
    };

    const multiDataset2: LeaderboardDataset = {
      period: "year",
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "multi-entry-user",
          activity_breakdown: { "PR opened": { count: 3, points: 30 } },
          activities: [],
        }),
      ],
    };

    const { people: multiRes } = aggregateLeaderboardData([multiDataset1, multiDataset2]);
    const multiUser = multiRes[0];
    expect(multiUser?.activities).toHaveLength(3);
    expect(multiUser?.activities?.[0]?.title).toBe("Real PR");
    expect(multiUser?.activities?.[1]?.title).toBe("PR opened contribution");
    expect(multiUser?.activities?.[2]?.title).toBe("PR opened contribution");
  });

  it("prevents placeholder activities from collapsing during multiple dataset merges", () => {
    // 3 datasets with the same contributor
    const ds1: LeaderboardDataset = {
      period: "week",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "three-ds-user",
          activities: [],
          activity_breakdown: { "PR opened": { count: 4, points: 40 } },
        }),
      ],
    };
    const ds2: LeaderboardDataset = {
      period: "month",
      updatedAt: 200,
      entries: [
        makeContributor({
          username: "three-ds-user",
          activities: [],
          activity_breakdown: { "PR opened": { count: 4, points: 40 } },
        }),
      ],
    };
    const ds3: LeaderboardDataset = {
      period: "year",
      updatedAt: 300,
      entries: [
        makeContributor({
          username: "three-ds-user",
          activities: [],
          activity_breakdown: { "PR opened": { count: 4, points: 40 } },
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([ds1, ds2, ds3]);
    const user = people[0];
    expect(user?.activities).toHaveLength(4);
    for (const act of user?.activities ?? []) {
      expect(act.title).toBe("PR opened contribution");
    }
  });

  it("ensures placeholders do not push out genuine activities and respect the 15-activity cap", () => {
    // 12 genuine activities and breakdown count of 20
    const genuineActivities = Array.from({ length: 12 }, (_, i) => ({
      type: "PR opened",
      title: `Genuine PR ${i + 1}`,
      occured_at: new Date(2026, 0, i + 1).toISOString(),
      link: `https://github.com/pr/${i + 1}`,
      points: 10,
    }));

    const dataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "cap-user",
          activity_breakdown: { "PR opened": { count: 20, points: 200 } },
          activities: genuineActivities,
        }),
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    const user = people[0];
    expect(user?.activities).toHaveLength(15);

    // All 12 genuine activities must be preserved
    const genuineInResult = user?.activities?.filter((a) => a.title.startsWith("Genuine PR"));
    expect(genuineInResult).toHaveLength(12);

    // Exactly 3 placeholders added to fill up to 15
    const placeholdersInResult = user?.activities?.filter((a) => a.title === "PR opened contribution");
    expect(placeholdersInResult).toHaveLength(3);
  });

  it("merges datasets deterministically regardless of input ordering with newer updatedAt taking precedence", () => {
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

    expect(result1).toEqual(result2);

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

    expect(alice.activities).toHaveLength(2);
    expect(alice.activities?.[0]?.title).toBe("New PR");
    expect(alice.activities?.[1]?.title).toBe("Old PR");

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
      updatedAt: 190,
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

  it("handles unknown periods deterministically and prioritizes verified cumulative periods", () => {
    const unknownPeriodDataset: LeaderboardDataset = {
      period: "custom-period",
      updatedAt: 300,
      entries: [
        makeContributor({
          username: "frank",
          total_points: 15,
        }),
      ],
    };

    const yearDataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        makeContributor({
          username: "frank",
          total_points: 500,
        }),
      ],
    };

    // Known cumulative period (year) must take precedence over unknown period
    const res1 = aggregateLeaderboardData([unknownPeriodDataset, yearDataset]);
    const res2 = aggregateLeaderboardData([yearDataset, unknownPeriodDataset]);

    expect(res1).toEqual(res2);
    expect(res1.people[0]?.total_points).toBe(500);
    expect(res1.latestUpdatedAt).toBe(300);
  });

  it("strips activities array in toListingContributor for listing payload optimization", () => {
    const full = makeContributor({
      activities: [
        {
          type: "PR opened",
          title: "PR 1",
          occured_at: "2026-01-01T00:00:00Z",
          link: "https://github.com/pr/1",
          points: 10,
        },
      ],
    });

    const listing = toListingContributor(full);
    expect("activities" in listing).toBe(false);
    expect(listing.username).toBe(full.username);
    expect(listing.total_points).toBe(full.total_points);
  });
});

describe("lib/people - validation and normalization", () => {
  it("strictly validates and normalizes activity_breakdown", () => {
    const raw = {
      "PR merged": { count: 5, points: 50 },
      "PR opened": null,
      "Issue opened": { count: "invalid", points: 10 },
      commit: { count: 2, points: NaN },
      invalidEntry: "string-value",
    };

    const dataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        {
          username: "alice",
          activity_breakdown: raw,
        },
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    expect(people).toHaveLength(1);
    const alice = people[0]!;

    expect(alice.activity_breakdown["PR merged"]).toEqual({ count: 5, points: 50 });
    expect(alice.activity_breakdown["PR opened"]).toBeUndefined();
    expect(alice.activity_breakdown["Issue opened"]).toEqual({ count: 0, points: 10 });
    expect(alice.activity_breakdown["commit"]).toEqual({ count: 2, points: 0 });
    expect(alice.activity_breakdown["invalidEntry"]).toBeUndefined();
  });

  it("strictly validates and normalizes daily_activity", () => {
    const rawDaily = [
      { date: "2026-03-01", count: 2, points: 20 },
      null,
      { count: 1, points: 10 }, // missing date
      { date: "", count: 1, points: 10 }, // empty date
      { date: "2026-03-02", count: "nan", points: NaN },
      "not-an-object",
    ];

    const dataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        {
          username: "bob",
          daily_activity: rawDaily,
        },
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    expect(people).toHaveLength(1);
    const bob = people[0]!;

    expect(bob.daily_activity).toEqual([
      { date: "2026-03-01", count: 2, points: 20 },
      { date: "2026-03-02", count: 0, points: 0 },
    ]);
  });
});

describe("lib/people - cap before sort on single dataset", () => {
  it("sorts activities newest-first before capping at 15 for single dataset contributors", () => {
    // Generate 20 raw activities in chronological (oldest-first) order
    const rawActivities = Array.from({ length: 20 }, (_, i) => ({
      type: "commit",
      title: `Commit #${i + 1}`,
      occured_at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      link: `https://github.com/c/${i + 1}`,
      points: 1,
    }));

    const singleDataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        {
          username: "single_dataset_user",
          total_points: 20,
          activity_breakdown: { commit: { count: 20, points: 20 } },
          raw_activities: rawActivities,
        },
      ],
    };

    const { people } = aggregateLeaderboardData([singleDataset]);
    expect(people).toHaveLength(1);
    const user = people[0]!;
    expect(user.activities).toHaveLength(15);

    // The newest activity (Commit #20, Jan 20) must be first
    expect(user.activities![0]?.title).toBe("Commit #20");
    // The 15th activity should be Commit #6 (Jan 6)
    expect(user.activities![14]?.title).toBe("Commit #6");

    // All activities should be strictly ordered newest-first
    for (let i = 0; i < user.activities!.length - 1; i++) {
      const tA = new Date(user.activities![i]!.occured_at).getTime();
      const tB = new Date(user.activities![i + 1]!.occured_at).getTime();
      expect(tA).toBeGreaterThanOrEqual(tB);
    }
  });

  it("ensures real activities precede epoch-placeholder entries and caps at 15", () => {
    const dataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        {
          username: "placeholder_user",
          total_points: 50,
          activity_breakdown: {
            "PR merged": { count: 10, points: 50 },
          },
          raw_activities: [
            {
              type: "PR merged",
              title: "Real PR",
              occured_at: "2026-03-01T00:00:00Z",
              link: "https://github.com/pr/1",
              points: 5,
            },
          ],
        },
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    const user = people[0]!;
    expect(user.activities).toHaveLength(10);
    // Real activity must be first
    expect(user.activities![0]?.title).toBe("Real PR");
    expect(user.activities![0]?.occured_at).toBe("2026-03-01T00:00:00Z");

    // Placeholders follow
    expect(user.activities![1]?.occured_at).toBe(new Date(0).toISOString());
  });
});

describe("lib/people - getPeriodWeight", () => {
  it("returns correct weights for known periods", () => {
    expect(getPeriodWeight("week")).toBe(7);
    expect(getPeriodWeight("2week")).toBe(14);
    expect(getPeriodWeight("3week")).toBe(21);
    expect(getPeriodWeight("month")).toBe(30);
    expect(getPeriodWeight("2month")).toBe(60);
    expect(getPeriodWeight("year")).toBe(365);
  });

  it("returns null for unknown, empty, or undefined periods", () => {
    expect(getPeriodWeight(undefined)).toBeNull();
    expect(getPeriodWeight("")).toBeNull();
    expect(getPeriodWeight("biweekly")).toBeNull();
    expect(getPeriodWeight("all-time")).toBeNull();
  });
});

describe("lib/people - compareDatasetPrecedence tie-breakers", () => {
  it("orders known periods by weight regardless of timestamp", () => {
    const weekDataset: LeaderboardDataset = { period: "week", updatedAt: 999999 };
    const yearDataset: LeaderboardDataset = { period: "year", updatedAt: 100 };
    expect(compareDatasetPrecedence(weekDataset, yearDataset)).toBeLessThan(0);
    expect(compareDatasetPrecedence(yearDataset, weekDataset)).toBeGreaterThan(0);
  });

  it("prioritizes known period over unknown period", () => {
    const known: LeaderboardDataset = { period: "week", updatedAt: 100 };
    const unknown: LeaderboardDataset = { period: "random-period", updatedAt: 999999 };
    expect(compareDatasetPrecedence(known, unknown)).toBe(1);
    expect(compareDatasetPrecedence(unknown, known)).toBe(-1);
  });

  it("breaks ties between same period by timestamp", () => {
    const older: LeaderboardDataset = { period: "week", updatedAt: 100 };
    const newer: LeaderboardDataset = { period: "week", updatedAt: 200 };
    expect(compareDatasetPrecedence(older, newer)).toBeLessThan(0);
    expect(compareDatasetPrecedence(newer, older)).toBeGreaterThan(0);
  });

  it("breaks ties between matching period and timestamp by period name", () => {
    const a: LeaderboardDataset = { period: "custom-a", updatedAt: 100 };
    const b: LeaderboardDataset = { period: "custom-b", updatedAt: 100 };
    expect(compareDatasetPrecedence(a, b)).toBeLessThan(0);
  });

  it("breaks ties between matching period name and timestamp by entries length", () => {
    const a: LeaderboardDataset = {
      period: "custom",
      updatedAt: 100,
      entries: [makeContributor({ username: "user1" })],
    };
    const b: LeaderboardDataset = {
      period: "custom",
      updatedAt: 100,
      entries: [
        makeContributor({ username: "user1" }),
        makeContributor({ username: "user2" }),
      ],
    };
    expect(compareDatasetPrecedence(a, b)).toBeLessThan(0);
  });

  it("breaks ties between matching entries length by first entry username", () => {
    const a: LeaderboardDataset = {
      period: "custom",
      updatedAt: 100,
      entries: [makeContributor({ username: "alice" })],
    };
    const b: LeaderboardDataset = {
      period: "custom",
      updatedAt: 100,
      entries: [makeContributor({ username: "bob" })],
    };
    expect(compareDatasetPrecedence(a, b)).toBeLessThan(0);
  });
});

describe("lib/people - sanitizer defaults and non-clobbering merge", () => {
  it("does not overwrite valid name, avatar_url, or role with defaults when higher-precedence dataset omits them", () => {
    const lowerDataset: LeaderboardDataset = {
      period: "week",
      updatedAt: 100,
      entries: [
        {
          username: "alice",
          name: "Alice Real Name",
          avatar_url: "https://example.com/alice.png",
          role: "Core Team",
          total_points: 50,
          custom_metadata_flag: "keep-me",
        },
      ],
    };

    const higherDataset: LeaderboardDataset = {
      period: "year",
      updatedAt: 200,
      entries: [
        {
          username: "alice",
          name: null,
          avatar_url: "",
          total_points: 150,
        },
      ],
    };

    const { people } = aggregateLeaderboardData([lowerDataset, higherDataset]);
    expect(people).toHaveLength(1);
    const alice = people[0]!;
    expect(alice.name).toBe("Alice Real Name");
    expect(alice.avatar_url).toBe("https://example.com/alice.png");
    expect(alice.role).toBe("Core Team");
    expect(alice.total_points).toBe(150);
    expect((alice as unknown as Record<string, unknown>).custom_metadata_flag).toBe("keep-me");
  });

  it("applies fallback defaults when fields are absent across all datasets", () => {
    const dataset: LeaderboardDataset = {
      period: "month",
      updatedAt: 100,
      entries: [
        {
          username: "blank-user",
        },
      ],
    };

    const { people } = aggregateLeaderboardData([dataset]);
    expect(people).toHaveLength(1);
    const user = people[0]!;
    expect(user.name).toBeNull();
    expect(user.avatar_url).toBe("https://avatars.githubusercontent.com/blank-user");
    expect(user.role).toBe("Contributor");
    expect(user.total_points).toBe(0);
  });
});

describe("lib/people - raw_activities support (year.json)", () => {
  it("extracts and merges activities from raw_activities field as in year.json", () => {
    const datasetWithRaw: LeaderboardDataset = {
      period: "year",
      updatedAt: 100,
      entries: [
        {
          username: "naman",
          total_points: 100,
          raw_activities: [
            {
              type: "Review submitted",
              title: "Review on PR #7909",
              occured_at: "2026-09-24T17:53:14Z",
              link: "https://github.com/CircuitVerse/CircuitVerse/pull/7909",
              points: 4,
            },
            {
              type: "Issue closed",
              title: "Closed issue #7861",
              occured_at: "2026-09-24T11:13:15Z",
              link: "https://github.com/CircuitVerse/CircuitVerse/issues/7861",
              points: 1,
            },
          ],
        },
      ],
    };

    const { people } = aggregateLeaderboardData([datasetWithRaw]);
    expect(people).toHaveLength(1);
    const naman = people[0]!;
    expect(naman.activities).toHaveLength(2);
    expect(naman.activities![0]?.title).toBe("Review on PR #7909");
    expect(naman.activities![1]?.title).toBe("Closed issue #7861");
    expect("raw_activities" in naman).toBe(false);
  });
});
