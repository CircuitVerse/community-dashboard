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

  if (!fs.existsSync(filePath)) {
    throw new Error(`Leaderboard data not found for ${period}`);
  }

  const file = fs.readFileSync(filePath, "utf-8");
  const data: LeaderboardJSON = JSON.parse(file);

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
