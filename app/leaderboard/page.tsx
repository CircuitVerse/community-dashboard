"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeaderboardSkeleton } from "@/components/Leaderboard/LeaderboardSkeleton";

/**
 * Leaderboard index page - redirects to /leaderboard/month
 * 
 * NOTE: We intentionally use client-side redirect with skeleton instead of
 * server-side redirect() to prevent a blank screen during navigation.
 * Server-side redirect causes the route to resolve briefly at /leaderboard
 * before navigating to /leaderboard/month, resulting in a ~1 second blank screen.
 * By rendering the skeleton while redirecting, users see immediate visual feedback.
 */
export default function LeaderboardIndexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString();
    const target = `/leaderboard/month${params ? `?${params}` : ""}`;
    router.replace(target);
  }, [router, searchParams]);

  return <LeaderboardSkeleton count={10} variant="list" />;
}
