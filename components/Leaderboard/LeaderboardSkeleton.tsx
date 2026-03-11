"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeaderboardSkeletonProps {
  count?: number;
  variant?: "grid" | "list";
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // Use a more visible skeleton color in both themes
        "animate-pulse rounded-md",
        "bg-zinc-200 dark:bg-zinc-700",
        className
      )}
    />
  );
}

function LeaderboardCardSkeleton({ variant = "list" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <Card className="overflow-hidden border">
        <CardContent className="p-4 lg:p-6">
          {/* Mobile/Tablet Layout - match grid card structure */}
          <div className="lg:hidden flex flex-col items-center text-center gap-3 h-full">
            <div className="relative flex-shrink-0">
              <SkeletonPulse className="size-16 rounded-full" />
              <SkeletonPulse className="absolute -top-1 -right-1 size-6 rounded-full" />
            </div>

            <div className="text-center w-full space-y-2">
              <SkeletonPulse className="h-4 w-24 mx-auto" />
              <SkeletonPulse className="h-3 w-20 mx-auto" />
              <SkeletonPulse className="h-5 w-16 mx-auto rounded-full" />
              <SkeletonPulse className="h-5 w-14 mx-auto" />
            </div>

            <div className="w-full space-y-2 flex-1">
              <SkeletonPulse className="h-8 w-full rounded" />
              <SkeletonPulse className="h-8 w-full rounded" />
              <SkeletonPulse className="h-8 w-full rounded" />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center gap-6">
            {/* Rank */}
            <SkeletonPulse className="size-10 rounded-full shrink-0" />

            {/* Avatar */}
            <SkeletonPulse className="size-14 rounded-full shrink-0" />

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonPulse className="h-5 w-28" />
                <SkeletonPulse className="h-5 w-16 rounded-full" />
              </div>
              <SkeletonPulse className="h-4 w-20" />
              <div className="flex flex-wrap gap-2">
                <SkeletonPulse className="h-7 w-28 rounded" />
                <SkeletonPulse className="h-7 w-24 rounded" />
                <SkeletonPulse className="h-7 w-32 rounded" />
              </div>
            </div>

            {/* Points */}
            <div className="shrink-0 text-right space-y-1">
              <SkeletonPulse className="h-8 w-14 ml-auto" />
              <SkeletonPulse className="h-3 w-10 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid variant
  return (
    <Card className="overflow-hidden border h-full">
      <CardContent className="p-4 h-full">
        {/* Mobile Layout */}
        <div className="flex gap-3 sm:hidden">
          <div className="w-[5%] pt-1">
            <SkeletonPulse className="size-5 rounded-full" />
          </div>

          <div className="flex flex-col items-center gap-2 w-[35%]">
            <SkeletonPulse className="size-12 rounded-full" />
            <div className="w-full space-y-1">
              <SkeletonPulse className="h-3.5 w-full" />
              <SkeletonPulse className="h-3 w-3/4 mx-auto" />
            </div>
          </div>

          <div className="flex flex-col gap-2 w-[60%]">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-5 w-14 rounded-full" />
              <SkeletonPulse className="h-5 w-12" />
            </div>
            <div className="space-y-1.5 flex-1">
              <SkeletonPulse className="h-6 w-full rounded" />
              <SkeletonPulse className="h-6 w-full rounded" />
              <SkeletonPulse className="h-6 w-3/4 rounded" />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex flex-col items-center gap-3 h-full">
          <div className="relative">
            <SkeletonPulse className="size-16 rounded-full" />
            <SkeletonPulse className="absolute -top-1 -right-1 size-6 rounded-full" />
          </div>

          <div className="text-center w-full space-y-2">
            <SkeletonPulse className="h-4 w-20 mx-auto" />
            <SkeletonPulse className="h-3 w-16 mx-auto" />
            <SkeletonPulse className="h-5 w-14 mx-auto rounded-full" />
            <SkeletonPulse className="h-5 w-12 mx-auto" />
          </div>

          <div className="w-full space-y-2 flex-1">
            <SkeletonPulse className="h-8 w-full rounded" />
            <SkeletonPulse className="h-8 w-full rounded" />
            <SkeletonPulse className="h-8 w-full rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderboardCardsSkeleton({ count = 10, variant = "list" }: LeaderboardSkeletonProps) {
  return (
    <div className={cn(
      variant === "grid"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 lg:space-y-4 lg:block"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
};

export function LeaderboardSkeleton({ count = 10, variant = "list" }: LeaderboardSkeletonProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
              <div className="min-w-0 space-y-2">
                <SkeletonPulse className="h-9 w-52 sm:w-72" />
                <SkeletonPulse className="h-5 w-36" />
              </div>

              <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center gap-2">
                <SkeletonPulse className="h-9 w-full md:w-64 rounded-md" />
                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                  <SkeletonPulse className="h-9 w-[72px] rounded-lg" />
                  <SkeletonPulse className="h-9 w-20 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Period Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b pb-0">
            <div className="flex">
              <SkeletonPulse className="h-10 w-[72px] rounded-none" />
              <SkeletonPulse className="h-10 w-[84px] rounded-none" />
              <SkeletonPulse className="h-10 w-[68px] rounded-none" />
            </div>
            <div className="hidden sm:flex items-center gap-2 pb-2">
              <SkeletonPulse className="h-4 w-10" />
              <SkeletonPulse className="h-9 w-20 rounded-md" />
            </div>
          </div>

          {/* Cards */}
          <LeaderboardCardsSkeleton count={count} variant={variant} />
        </div>
      </div>
    </div>
  );
}

export default LeaderboardSkeleton;
