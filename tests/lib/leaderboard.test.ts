import { describe, it, expect } from "vitest";
import { isRoleFilterActive } from "@/lib/leaderboard";

describe("isRoleFilterActive", () => {
  const visibleRoles = ["contributor", "maintainer"];

  it("is inactive when the roles param is absent", () => {
    expect(isRoleFilterActive(null, visibleRoles)).toBe(false);
  });

  it("is inactive when the roles param is empty", () => {
    expect(isRoleFilterActive("", visibleRoles)).toBe(false);
    expect(isRoleFilterActive(",", visibleRoles)).toBe(false);
  });

  it("is inactive when every visible role is selected", () => {
    expect(isRoleFilterActive("contributor,maintainer", visibleRoles)).toBe(false);
    expect(isRoleFilterActive("maintainer,contributor", visibleRoles)).toBe(false);
  });

  it("is active when a visible role is left out", () => {
    expect(isRoleFilterActive("contributor", visibleRoles)).toBe(true);
    expect(isRoleFilterActive("maintainer", visibleRoles)).toBe(true);
  });

  it("is active when the selection matches no visible role", () => {
    expect(isRoleFilterActive("bot", visibleRoles)).toBe(true);
  });

  it("ignores extra roles that are not visible", () => {
    expect(isRoleFilterActive("contributor,maintainer,bot", visibleRoles)).toBe(false);
  });

  it("accepts any iterable of visible roles", () => {
    expect(isRoleFilterActive("contributor", new Set(visibleRoles))).toBe(true);
    expect(isRoleFilterActive("contributor", new Set(["contributor"]))).toBe(false);
  });
});
