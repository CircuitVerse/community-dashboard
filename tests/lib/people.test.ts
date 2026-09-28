import { describe, it, expect } from "vitest";
import {
  getPeopleData,
  getContributorByUsername,
  getAllContributorUsernames,
} from "@/lib/people";

describe("lib/people", () => {
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

  it("filters out bots from contributors list", async () => {
    const data = await getPeopleData();
    const usernames = data.people.map((p) => p.username.toLowerCase());

    expect(usernames).not.toContain("dependabot");
    expect(usernames).not.toContain("github-actions");
    expect(usernames.some((u) => u.endsWith("[bot]"))).toBe(false);
  });

  it("sorts contributors by total_points descending", async () => {
    const data = await getPeopleData();

    for (let i = 0; i < data.people.length - 1; i++) {
      const current = data.people[i];
      const next = data.people[i + 1];
      expect(current).toBeDefined();
      expect(next).toBeDefined();
      if (current && next) {
        expect(current.total_points).toBeGreaterThanOrEqual(next.total_points);
      }
    }
  });

  it("finds a contributor by exact username", async () => {
    const usernames = await getAllContributorUsernames();
    expect(usernames.length).toBeGreaterThan(0);

    const targetUsername = usernames[0];
    expect(targetUsername).toBeDefined();
    if (!targetUsername) return;

    const contributor = await getContributorByUsername(targetUsername);

    expect(contributor).not.toBeNull();
    expect(contributor?.username.toLowerCase()).toBe(targetUsername.toLowerCase());
  });

  it("finds a contributor case-insensitively", async () => {
    const usernames = await getAllContributorUsernames();
    expect(usernames.length).toBeGreaterThan(0);

    const targetUsername = usernames[0];
    expect(targetUsername).toBeDefined();
    if (!targetUsername) return;

    const contributorLower = await getContributorByUsername(
      targetUsername.toLowerCase()
    );
    const contributorUpper = await getContributorByUsername(
      targetUsername.toUpperCase()
    );

    expect(contributorLower).not.toBeNull();
    expect(contributorUpper).not.toBeNull();
    expect(contributorLower?.username).toBe(contributorUpper?.username);
  });

  it("returns null for nonexistent or empty username", async () => {
    const nonExistent = await getContributorByUsername(
      "non-existent-user-xyz-12345"
    );
    expect(nonExistent).toBeNull();

    const empty = await getContributorByUsername("");
    expect(empty).toBeNull();
  });
});
