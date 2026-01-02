import { describe, it, expect } from "vitest";
import { calculateStreaks, DailyActivity } from "../../lib/streak-utils";

describe("calculateStreaks", () => {
  it("should return 0 for empty activity", () => {
    const activity: DailyActivity[] = [];
    const result = calculateStreaks(activity);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it("should calculate streaks correctly for consecutive days", () => {
    const activity: DailyActivity[] = [
      { date: "2023-01-01", count: 1, points: 10 },
      { date: "2023-01-02", count: 2, points: 20 },
      { date: "2023-01-03", count: 1, points: 10 },
    ];
    // We need to mock 'today' for certain streak calculations or handle it in the test.
    // However, the current calculateStreaks uses new Date() for the current streak.
    
    // For longest streak, it should be 3.
    const result = calculateStreaks(activity);
    expect(result.longest).toBe(3);
  });

  it("should handle gaps in longest streak", () => {
    const activity: DailyActivity[] = [
      { date: "2023-01-01", count: 1, points: 10 },
      { date: "2023-01-02", count: 2, points: 20 },
      { date: "2023-01-04", count: 1, points: 10 },
      { date: "2023-01-05", count: 1, points: 10 },
      { date: "2023-01-06", count: 1, points: 10 },
    ];
    const result = calculateStreaks(activity);
    expect(result.longest).toBe(3); // 2023-01-04 to 2023-01-06
  });

  it("should calculate current streak correctly if active today", () => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const activity: DailyActivity[] = [
      { date: yesterdayStr, count: 1, points: 10 },
      { date: todayStr, count: 1, points: 10 },
    ];
    const result = calculateStreaks(activity);
    expect(result.current).toBe(2);
  });

  it("should calculate current streak correctly if only active yesterday", () => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
    const dayBeforeYesterdayStr = formatDate(dayBeforeYesterday);

    const activity: DailyActivity[] = [
      { date: dayBeforeYesterdayStr, count: 1, points: 10 },
      { date: yesterdayStr, count: 1, points: 10 },
    ];
    const result = calculateStreaks(activity);
    expect(result.current).toBe(2);
  });

  it("should return 0 current streak if last activity was more than 1 day ago", () => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = formatDate(twoDaysAgo);

    const activity: DailyActivity[] = [
      { date: twoDaysAgoStr, count: 1, points: 10 },
    ];
    const result = calculateStreaks(activity);
    expect(result.current).toBe(0);
  });
});
