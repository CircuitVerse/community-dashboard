import fs from "fs";
import path from "path";
import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";
import { notFound } from "next/navigation";
import { logger } from "@/lib/logger";

export function generateStaticParams() {
  return [
    { period: "week" },
    { period: "month" },
    { period: "year" },
  ];
}

type LeaderboardJSON = {
  period: "week" | "month" | "year";
  updatedAt: number;
  startDate: string;
  endDate: string;
  entries: LeaderboardEntry[];
  topByActivity: Record<
    string,
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }>
  >;
  hiddenRoles: string[];
};

const VALID_PERIODS = ["week", "month", "year"] as const;

/**
 * Type guard to validate if a period string is one of the allowed values
 * @param period - The period string to validate
 * @returns True if period is valid, false otherwise
 */
function isValidPeriod(period: string): period is "week" | "month" | "year" {
  return VALID_PERIODS.includes(period as "week" | "month" | "year");
}

/**
 * Creates fallback data structure for when leaderboard data is missing or corrupted
 * @param period - The time period for the fallback data
 * @returns Empty leaderboard data structure
 */
function createFallbackData(period: "week" | "month" | "year"): LeaderboardJSON {
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);
  
  // Set meaningful date ranges based on period
  if (period === "week") {
    startDate.setDate(now.getDate() - 7);
  } else if (period === "month") {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === "year") {
    startDate.setFullYear(now.getFullYear() - 1);
  }
  
  return {
    period,
    updatedAt: Date.now(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    entries: [],
    topByActivity: {},
    hiddenRoles: [],
  };
}

/**
 * Renders the leaderboard component with proper Suspense wrapper
 * @param data - The leaderboard data to display
 * @param isGridView - Whether to show grid or list view
 * @returns JSX element with leaderboard view
 */
function renderLeaderboard(
  data: LeaderboardJSON,
  isGridView: boolean
) {
  return (
    <Suspense fallback={<LeaderboardSkeleton count={10} variant={isGridView ? "grid" : "list"} />}>
      <LeaderboardView
        entries={data.entries}
        period={data.period}
        startDate={new Date(data.startDate)}
        endDate={new Date(data.endDate)}
        topByActivity={data.topByActivity}
        hiddenRoles={data.hiddenRoles}
      />
    </Suspense>
  );
}

/**
 * Validates that parsed JSON has the expected leaderboard structure
 * @param data - The parsed JSON data to validate
 * @returns True if data structure is valid, false otherwise
 */
function isValidLeaderboardData(data: unknown): data is LeaderboardJSON {
  if (!data || typeof data !== "object") {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  return (
    Array.isArray(obj.entries) &&
    typeof obj.topByActivity === "object" &&
    obj.topByActivity !== null &&
    Array.isArray(obj.hiddenRoles) &&
    typeof obj.period === "string" &&
    VALID_PERIODS.includes(obj.period as "week" | "month" | "year") &&
    typeof obj.startDate === "string" &&
    typeof obj.endDate === "string" &&
    typeof obj.updatedAt === "number"
  );
}

/**
 * Leaderboard page component for displaying weekly, monthly, or yearly contributor data
 * Handles missing or corrupted JSON files gracefully with fallback empty states
 * @param params - Route parameters containing the period (week/month/year)
 * @param searchParams - URL search parameters for view customization
 * @returns JSX element with leaderboard view or fallback state
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ period: "week" | "month" | "year" }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { period } = await params;
  const query = await searchParams;
  const isGridView = query.v === "grid";
  
  // navigate to not found page, if time periods are other than week/month/year
  if (!isValidPeriod(period)) {
    notFound();
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    `${period}.json`
  );

  // graceful fallback for missing data files
  if (!fs.existsSync(filePath)) {
    return renderLeaderboard(createFallbackData(period), isGridView);
  }

  let data: LeaderboardJSON;
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const parsedData = JSON.parse(file);
    
    // Validate the parsed data structure
    if (!isValidLeaderboardData(parsedData)) {
      throw new Error(`Invalid leaderboard data structure for ${period}`);
    }
    
    data = parsedData;
  } catch (error) {
    // Use structured logging for better debugging
    logger.error(
      `Failed to parse leaderboard data for ${period}`,
      error,
      {
        period,
        filePath,
        operation: "leaderboard_data_parsing"
      }
    );
    
    // fallback for corrupted or invalid JSON files
    return renderLeaderboard(createFallbackData(period), isGridView);
  }

  return renderLeaderboard(data, isGridView);
}
