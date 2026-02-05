import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";
import { notFound } from "next/navigation";

// ---- Types ----
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

// ---- Page ----
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

// ---- Data Loader (NO fs, only fetch) ----
async function LeaderboardData({
  period,
}: {
  period: "week" | "month" | "year";
}) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/leaderboard/${period}.json`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("JSON not found");

    const data: LeaderboardJSON = await res.json();

    // basic validation
    if (!data?.entries || !data?.startDate || !data?.endDate) {
      throw new Error("Invalid JSON shape");
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
