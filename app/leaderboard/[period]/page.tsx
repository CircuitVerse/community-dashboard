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

function isValidPeriod(period: string): period is (typeof VALID_PERIODS)[number] {
  return VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number]);
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

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("Missing leaderboard JSON");
    }

    const file = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(file) as Partial<LeaderboardJSON>;

    // minimal schema validation
    if (
      !data ||
      !data.entries ||
      !data.startDate ||
      !data.endDate ||
      !data.topByActivity ||
      !data.hiddenRoles
    ) {
      throw new Error("Invalid leaderboard JSON shape");
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
  } catch (err) {
    console.error("Leaderboard load error:", err);

    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Leaderboard unavailable</h2>
        <p className="text-muted-foreground">
          Leaderboard data is temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }
}
