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
function isValidPeriod(period: string): period is "week" | "month" | "year" {
  return VALID_PERIODS.includes(period as "week" | "month" | "year");
}

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
    const fallbackData: LeaderboardJSON = {
      period,
      updatedAt: Date.now(),
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      entries: [],
      topByActivity: {},
      hiddenRoles: []
    };

    return (
      <Suspense fallback={<LeaderboardSkeleton count={10} variant={isGridView ? "grid" : "list"} />}>
        <LeaderboardView
          entries={fallbackData.entries}
          period={period}
          startDate={new Date(fallbackData.startDate)}
          endDate={new Date(fallbackData.endDate)}
          topByActivity={fallbackData.topByActivity}
          hiddenRoles={fallbackData.hiddenRoles}
        />
      </Suspense>
    );
  }

  let data: LeaderboardJSON;
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(file);
  } catch (error) {
    console.error(`Failed to parse leaderboard data for ${period}:`, error);
    
    // fallback for corrupted JSON files
    const fallbackData: LeaderboardJSON = {
      period,
      updatedAt: Date.now(),
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      entries: [],
      topByActivity: {},
      hiddenRoles: []
    };

    return (
      <Suspense fallback={<LeaderboardSkeleton count={10} variant={isGridView ? "grid" : "list"} />}>
        <LeaderboardView
          entries={fallbackData.entries}
          period={period}
          startDate={new Date(fallbackData.startDate)}
          endDate={new Date(fallbackData.endDate)}
          topByActivity={fallbackData.topByActivity}
          hiddenRoles={fallbackData.hiddenRoles}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LeaderboardSkeleton count={10} variant={isGridView ? "grid" : "list"} />}>
      <LeaderboardView
        entries={data.entries}
        period={period}
        startDate={new Date(data.startDate)}
        endDate={new Date(data.endDate)}
        topByActivity={data.topByActivity}
        hiddenRoles={data.hiddenRoles}
      />
    </Suspense>
  );
}
