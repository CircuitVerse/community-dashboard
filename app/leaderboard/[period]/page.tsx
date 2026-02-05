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
  topByActivity: Record<string, any>;
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
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;

  if (!isValidPeriod(period)) {
    notFound();
  }

  return (
    <Suspense fallback={<LeaderboardSkeleton count={10} variant="list" />}>
      <LeaderboardData period={period} />
    </Suspense>
  );
}

async function LeaderboardData({
  period,
}: {
  period: "week" | "month" | "year";
}) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/leaderboard/${period}.json`, {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Missing JSON");

    const data: LeaderboardJSON = await res.json();

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
  } catch {
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
