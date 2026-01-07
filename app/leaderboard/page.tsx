"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";

export default function LeaderboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/leaderboard/month");
  }, [router]);

  // Show skeleton while redirecting to prevent blank screen
  return <LeaderboardSkeleton count={10} variant="list" />;
}
