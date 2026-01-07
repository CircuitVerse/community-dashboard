import fs from "fs";
import path from "path";
import { Suspense } from "react";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";
import { type LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";

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

export default async function Page({
  params,
}: {
  params: Promise<{ period: "week" | "month" | "year" }>;
}) {
  const { period } = await params;

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
    <Suspense fallback={<LeaderboardSkeleton count={10} variant="list" />}>
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
