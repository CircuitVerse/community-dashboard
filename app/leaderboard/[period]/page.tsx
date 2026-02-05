import fs from "fs";
import path from "path";
import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";
import { notFound } from "next/navigation";

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
  return VALID_PERIODS.includes(period as any);
}

export function generateStaticParams() {
  return VALID_PERIODS.map((period) => ({ period }));
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ period: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { period } = await params;
  const query = await searchParams;
  const isGridView = query.v === "grid";

  if (!isValidPeriod(period)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <LeaderboardSkeleton
            count={10}
            variant={isGridView ? "grid" : "list"}
          />
        }
      >
        <LeaderboardData period={period} />
      </Suspense>
    </div>
  );
}

async function LeaderboardData({
  period,
}: {
  period: "week" | "month" | "year";
}) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    `${period}.json`
  );

  let data: LeaderboardJSON | null = null;

  try {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(file) as LeaderboardJSON;
    }
  } catch (err) {
    console.error("Leaderboard JSON error:", err);
  }

  
  if (!data) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Leaderboard unavailable
        </h2>
        <p className="text-muted-foreground">
          Leaderboard data is temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }

  
  return (
    <LeaderboardView
      entries={data.entries}
      period={period}
      startDate={new Date(data.startDate)}
      endDate={new Date(data.endDate)}
      topByActivity={data.topByActivity}
      hiddenRoles={data.hiddenRoles}
    />
  );
}
