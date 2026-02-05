import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";
import { notFound } from "next/navigation";

// Static JSON imports (Netlify-safe)
import weekData from "@/public/leaderboard/week.json";
import monthData from "@/public/leaderboard/month.json";
import yearData from "@/public/leaderboard/year.json";

type LeaderboardJSON = {
  period: "week" | "month" | "year";
  updatedAt: number;
  startDate: string;
  endDate: string;
  entries: LeaderboardEntry[];
  topByActivity: Record<string, any>;
  hiddenRoles: string[];
};

const DATA_MAP: Record<"week" | "month" | "year", LeaderboardJSON> = {
  week: weekData,
  month: monthData,
  year: yearData,
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

  const data = DATA_MAP[period];

  if (!data) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Leaderboard unavailable</h2>
        <p className="text-muted-foreground">
          Leaderboard data is temporarily unavailable. Please try again later.
        </p>
      </div>
    );
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
