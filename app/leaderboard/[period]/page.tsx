import fs from "fs";
import path from "path";
import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";
import { notFound } from "next/navigation";

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
  return {
    period,
    updatedAt: Date.now(),
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
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
function isValidLeaderboardData(data: any): data is LeaderboardJSON {
  return (
    data &&
    typeof data === "object" &&
    Array.isArray(data.entries) &&
    typeof data.topByActivity === "object" &&
    Array.isArray(data.hiddenRoles) &&
    typeof data.period === "string" &&
    VALID_PERIODS.includes(data.period)
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
    if (error instanceof Error) {
      console.error(`Failed to parse leaderboard data for ${period}:`, {
        message: error.message,
        period,
        filePath,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`Unknown error parsing leaderboard data for ${period}:`, error);
    }
    
    // fallback for corrupted or invalid JSON files
    return renderLeaderboard(createFallbackData(period), isGridView);
  }

  return renderLeaderboard(data, isGridView);
}
