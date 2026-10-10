import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  loadPeopleData,
  getPeopleData,
  getPeopleListingData,
  getContributorByUsername,
  getAllContributorUsernames,
  KNOWN_PERIOD_FILES,
} from "@/lib/people";

describe("lib/people - filesystem integration tests (isolated fixtures)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns empty people list when directory does not exist and strict is false", () => {
    const nonExistentDir = path.join(tempDir, "does-not-exist");
    const data = loadPeopleData(nonExistentDir);

    expect(data.updatedAt).toBe(0);
    expect(data.people).toEqual([]);
    expect(data.coreTeam.length).toBeGreaterThan(0);
    expect(data.alumni.length).toBeGreaterThan(0);
  });

  it("throws an error when strict: true and directory does not exist", () => {
    const nonExistentDir = path.join(tempDir, "does-not-exist");
    expect(() => loadPeopleData(nonExistentDir, { strict: true })).toThrow(
      /Leaderboard directory does not exist/
    );
  });

  it("returns empty people list when directory contains no json files and strict is false", () => {
    const data = loadPeopleData(tempDir);
    expect(data.updatedAt).toBe(0);
    expect(data.people).toEqual([]);
  });

  it("throws an error when strict: true and directory yields zero contributors", () => {
    expect(() => loadPeopleData(tempDir, { strict: true })).toThrow(
      /yielded zero contributors/
    );
  });

  it("warns when year.json is missing from loaded directory", () => {
    // Write week.json with valid contributor
    const weekData = {
      period: "week",
      updatedAt: 100,
      entries: [
        {
          username: "sample_user",
          total_points: 10,
        },
      ],
    };
    fs.writeFileSync(path.join(tempDir, "week.json"), JSON.stringify(weekData));

    let warnedMessage = "";
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnedMessage = args.join(" ");
    };
    try {
      const data = loadPeopleData(tempDir);
      expect(data.people).toHaveLength(1);
      expect(warnedMessage).toContain('"year.json" was not found');
    } finally {
      console.warn = originalWarn;
    }
  });

  it("safely skips corrupted JSON files and non-leaderboard files like overview.json and recent-activities.json", () => {
    // Write corrupted JSON matching a known period name
    fs.writeFileSync(path.join(tempDir, "week.json"), "{ invalid json");

    // Write overview.json (must be excluded from people datasets)
    fs.writeFileSync(
      path.join(tempDir, "overview.json"),
      JSON.stringify({ updatedAt: 99999, period: "Last_30days", repos: [] })
    );

    // Write recent-activities.json (must be excluded)
    fs.writeFileSync(
      path.join(tempDir, "recent-activities.json"),
      JSON.stringify({ updatedAt: 88888, groups: [] })
    );

    // Write one valid leaderboard file
    const validLeaderboard = {
      period: "month",
      updatedAt: 12345,
      entries: [
        {
          username: "fixture-contributor",
          name: "Fixture Contributor",
          avatar_url: "https://example.com/avatar.png",
          role: "Contributor",
          total_points: 42,
          activity_breakdown: {},
          daily_activity: [],
          activities: [],
        },
      ],
    };
    fs.writeFileSync(path.join(tempDir, "month.json"), JSON.stringify(validLeaderboard));

    const data = loadPeopleData(tempDir);

    expect(data.updatedAt).toBe(12345);
    expect(data.people).toHaveLength(1);
    expect(data.people[0]?.username).toBe("fixture-contributor");
    expect(data.people[0]?.total_points).toBe(42);
  });

  it("filters files using injectable allowedFiles set", () => {
    fs.writeFileSync(
      path.join(tempDir, "custom-allowed.json"),
      JSON.stringify({
        period: "custom",
        updatedAt: 100,
        entries: [{ username: "allowed-user", total_points: 10 }],
      })
    );
    fs.writeFileSync(
      path.join(tempDir, "custom-ignored.json"),
      JSON.stringify({
        period: "custom",
        updatedAt: 100,
        entries: [{ username: "ignored-user", total_points: 20 }],
      })
    );

    const allowed = new Set(["custom-allowed.json"]);
    const data = loadPeopleData(tempDir, allowed);

    expect(data.people).toHaveLength(1);
    expect(data.people[0]?.username).toBe("allowed-user");
  });

  it("loads and aggregates valid leaderboard fixtures deterministically", () => {
    const weekData = {
      period: "week",
      updatedAt: 100,
      entries: [
        {
          username: "contributor-one",
          name: "Contributor One",
          avatar_url: "https://example.com/1.png",
          role: "Contributor",
          total_points: 10,
          activity_breakdown: { "PR opened": { count: 1, points: 10 } },
          daily_activity: [{ date: "2026-01-01", count: 1, points: 10 }],
          activities: [],
        },
      ],
    };

    const yearData = {
      period: "year",
      updatedAt: 200,
      entries: [
        {
          username: "contributor-one",
          name: "Contributor One Updated",
          avatar_url: "https://example.com/1-updated.png",
          role: "Top Contributor",
          total_points: 150,
          activity_breakdown: { "PR opened": { count: 5, points: 50 } },
          daily_activity: [{ date: "2026-01-01", count: 5, points: 50 }],
          activities: [],
        },
      ],
    };

    fs.writeFileSync(path.join(tempDir, "week.json"), JSON.stringify(weekData));
    fs.writeFileSync(path.join(tempDir, "year.json"), JSON.stringify(yearData));

    const data = loadPeopleData(tempDir);

    expect(data.updatedAt).toBe(200);
    expect(data.people).toHaveLength(1);
    expect(data.people[0]?.name).toBe("Contributor One Updated");
    expect(data.people[0]?.total_points).toBe(150);
  });
});

describe("lib/people - lookup and listing utilities (fixture-backed)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-lookup-test-"));
    const fixtureData = {
      period: "year",
      updatedAt: 1790563032868,
      entries: [
        {
          username: "alice_dev",
          name: "Alice Developer",
          avatar_url: "https://example.com/alice.png",
          role: "Contributor",
          total_points: 250,
          activity_breakdown: { "PR merged": { count: 5, points: 250 } },
          daily_activity: [{ date: "2026-09-24", count: 2, points: 50 }],
          activities: [
            {
              type: "PR merged",
              title: "Fix #1",
              occured_at: "2026-09-24T10:00:00Z",
              link: "https://github.com/pr/1",
              points: 50,
            },
          ],
        },
        {
          username: "bob_coder",
          name: "Bob Coder",
          avatar_url: "https://example.com/bob.png",
          role: "Contributor",
          total_points: 120,
          activity_breakdown: { commit: { count: 3, points: 120 } },
          daily_activity: [],
          activities: [],
        },
      ],
    };
    fs.writeFileSync(path.join(tempDir, "year.json"), JSON.stringify(fixtureData));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("finds all contributor usernames from fixture", () => {
    const usernames = getAllContributorUsernames(tempDir);
    expect(usernames).toEqual(["alice_dev", "bob_coder"]);
  });

  it("finds a contributor case-insensitively and handles URL encoding", () => {
    const exact = getContributorByUsername("alice_dev", tempDir);
    const lower = getContributorByUsername("alice_dev".toLowerCase(), tempDir);
    const upper = getContributorByUsername("ALICE_DEV", tempDir);
    const encoded = getContributorByUsername(encodeURIComponent("alice_dev"), tempDir);

    expect(exact).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    expect(encoded).not.toBeNull();
    expect(exact?.username).toBe("alice_dev");
    expect(lower?.username).toBe("alice_dev");
    expect(upper?.username).toBe("alice_dev");
    expect(encoded?.username).toBe("alice_dev");
  });

  it("returns null for nonexistent or empty username", () => {
    expect(getContributorByUsername("non-existent-user-xyz-12345", tempDir)).toBeNull();
    expect(getContributorByUsername("", tempDir)).toBeNull();
    expect(getContributorByUsername("   ", tempDir)).toBeNull();
    expect(getContributorByUsername(null as unknown as string, tempDir)).toBeNull();
    expect(getContributorByUsername(undefined as unknown as string, tempDir)).toBeNull();
  });

  it("provides getPeopleListingData with precomputed activeDays and without activities array", () => {
    const listingData = getPeopleListingData(tempDir);
    expect(listingData).toBeDefined();
    expect(listingData.people).toHaveLength(2);

    const alice = listingData.people.find((p) => p.username === "alice_dev")!;
    expect(alice).toBeDefined();
    expect("activities" in alice).toBe(false);
    expect("daily_activity" in alice).toBe(false);
    expect(alice.activeDays).toBe(1);
    expect(alice.hasRecentActivity).toBe(true);
    expect(alice.total_points).toBe(250);

    const bob = listingData.people.find((p) => p.username === "bob_coder")!;
    expect(bob).toBeDefined();
    expect("activities" in bob).toBe(false);
    expect(bob.activeDays).toBe(0);
    expect(bob.hasRecentActivity).toBe(false);
  });

  it("provides getPeopleData with full contributor details", () => {
    const fullData = getPeopleData(tempDir);
    expect(fullData).toBeDefined();
    expect(fullData.people).toHaveLength(2);
    const alice = fullData.people.find((p) => p.username === "alice_dev")!;
    expect(alice.activities).toBeDefined();
    expect(alice.daily_activity).toBeDefined();
  });
});

describe("lib/people - filesystem real directory validation", () => {
  it("exercises KNOWN_PERIOD_FILES against the real public/leaderboard directory without warnings", () => {
    const realDir = path.join(process.cwd(), "public", "leaderboard");
    if (!fs.existsSync(realDir)) return;

    // Verify all KNOWN_PERIOD_FILES exist in the real directory
    for (const filename of KNOWN_PERIOD_FILES) {
      expect(fs.existsSync(path.join(realDir, filename))).toBe(true);
    }

    const data = loadPeopleData(realDir, KNOWN_PERIOD_FILES);
    expect(data.people.length).toBeGreaterThan(0);
    expect(data.updatedAt).toBeGreaterThan(0);
  });
});

