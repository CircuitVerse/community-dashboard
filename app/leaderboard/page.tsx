"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
function LeaderboardIndexPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGridView = searchParams?.get("v") === "grid";

  useEffect(() => {
    const params = searchParams?.toString();
    const target = `/leaderboard/month${params ? `?${params}` : ""}`;
    router.replace(target);
  }, [router, searchParams]);

  return <LeaderboardSkeleton count={10} variant={isGridView ? "grid" : "list"} />;
}

export default function LeaderboardIndexPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton count={10} variant="list" />}>
      <LeaderboardIndexPageContent />
    </Suspense>
  );
}
