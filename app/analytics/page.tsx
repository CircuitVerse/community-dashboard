import { Suspense } from "react";
import { ReviewMetricsCard } from "@/components/Analytics/ReviewMetricsCard";
import { IssueTriageCard } from "@/components/Analytics/IssueTriageCard";
import { ReviewVelocityChart } from "@/components/Analytics/ReviewVelocityChart";
import { ActiveReviewersCard } from "@/components/Analytics/ActiveReviewersCard";
import { ReviewDistributionChart } from "@/components/Analytics/ReviewDistributionChart";
import { IssueAgeDistribution } from "@/components/Analytics/IssueAgeDistribution";
import { TriageVelocityChart } from "@/components/Analytics/TriageVelocityChart";
import { PendingReviewsList } from "@/components/Analytics/PendingReviewsList";
import { ReadyToMergeList } from "@/components/Analytics/ReadyToMergeList";
import { PendingTriageList } from "@/components/Analytics/PendingTriageList";
import { getConfig } from "@/lib/config";

export default async function AnalyticsPage() {
  const config = getConfig();

  return (
    <div className="min-h-screen transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
        <section className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-[#50B78B] via-[#60C79B] to-[#70D7AB]">
            Analytics
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Comprehensive review and issue management metrics for {config.org.name}
          </p>
        </section>

        {/* Review Metrics Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
            Review Dashboard
          </h2>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Suspense fallback={<ReviewMetricsSkeleton />}>
              <ReviewMetricsCard />
            </Suspense>
            <div className="col-span-full lg:col-span-2">
              <Suspense fallback={<ActiveReviewersSkeleton />}>
                <ActiveReviewersCard />
              </Suspense>
            </div>
            <div className="col-span-full lg:col-span-2">
              <Suspense fallback={<ChartSkeleton />}>
                <ReviewDistributionChart />
              </Suspense>
            </div>
          </div>

          <div className="grid gap-6">
            <Suspense fallback={<ChartSkeleton />}>
              <ReviewVelocityChart />
            </Suspense>
          </div>
        </section>

        {/* Issue Triage Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
            Issue Triage Dashboard
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<IssueTriageSkeleton />}>
              <IssueTriageCard />
            </Suspense>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<ChartSkeleton />}>
              <IssueAgeDistribution />
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              <TriageVelocityChart />
            </Suspense>
          </div>
        </section>

        {/* Action Items Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
            Action Items
          </h2>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <Suspense fallback={<ListSkeleton />}>
              <PendingReviewsList />
            </Suspense>
            <Suspense fallback={<ListSkeleton />}>
              <ReadyToMergeList />
            </Suspense>
            <Suspense fallback={<ListSkeleton />}>
              <PendingTriageList />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}

// Loading skeletons
function ReviewMetricsSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function ActiveReviewersSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueTriageSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}