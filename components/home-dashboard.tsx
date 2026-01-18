"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  GitPullRequest,
  CircleDot,
  Star,
  LayoutGrid,
  GitFork,
  GitMerge,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

import { ActivityTypes } from "@/components/Leaderboard/stats-card/activity-types";
import { ActivityLineCard } from "@/components/Leaderboard/stats-card/activity-line-card";
import ActiveContributors from "@/components/Leaderboard/stats-card/active-contributors";
import { PaginatedActivitySection } from "@/components/PaginatedActivitySection";
import { ActivityGroup, MonthBuckets } from "@/lib/db";
import { Config } from "@/types/config";
import { RepoStats } from "@/scripts/generateLeaderboard";

// --- Types ---
type ViewState = "overview" | "repositories";

type MetricVariant = "neutral" | "active" | "success";

type MetricFlowItemProps = {
  icon: React.ReactNode;
  count: number;
  label: string;
  variant: MetricVariant;
};

type OverviewData = {
  totalMonth: number;
  week: ActivityGroup[];
  month: ActivityGroup[];
  previousMonthCount: number;
  bucketData: MonthBuckets;
  config: Config;
  reposData: {
    reposOverview: RepoStats[];
  };
};

type SummaryCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  decoration?: "bar" | "graph" | "wave";
};

export default function HomeDashboard({
  overviewData,
}: {
  overviewData: OverviewData;
}) {
  const [activeTab, setActiveTab] = useState<ViewState>("overview");
  const {
    config,
    week,
    month,
    previousMonthCount,
    bucketData,
    totalMonth,
    reposData,
  } = overviewData;

  const repos = reposData.reposOverview;

  // --- Logic to find most active repo ---
  function getActiveRepoStats() {
    if (!repos || repos.length === 0) {
      return {
        name: "N/A",
        growth: 0,
        totalContributions: 0,
      };
    }

    const topRepo = [...repos].sort(
      (a, b) =>
        b.current.currentTotalContribution -
        a.current.currentTotalContribution
    )[0];

    return {
      name: topRepo?.name,
      growth: topRepo?.growth?.pr_merged ?? 0,
      totalContributions: topRepo?.current.currentTotalContribution,
    };
  }
  const activeRepo = getActiveRepoStats();

  const sortedRepos = [...repos].sort(
    (a, b) =>
      b.current.currentTotalContribution -
      a.current.currentTotalContribution
  );

  return (
    <div className="min-h-screen transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* --- 1. Header --- */}
        <section className="text-center space-y-6">
          <div className="space-y-4">
            {/* Responsive Text Size */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-[#50B78B] via-[#60C79B] to-[#70D7AB] px-2">
              {config.org.name}
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400 px-4">
              {config.org.description}
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative w-full sm:w-auto max-w-xs sm:max-w-none">
              {/* Buttons are flex-1 to ensure equal width on mobile */}
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex-1 sm:flex-none px-6 sm:px-8 py-2 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                  activeTab === "overview"
                    ? "bg-[#50B78B] text-white shadow-md"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("repositories")}
                className={cn(
                  "flex-1 sm:flex-none px-6 sm:px-8 py-2 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                  activeTab === "repositories"
                    ? "bg-[#50B78B] text-white shadow-md"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Repositories
              </button>
            </div>
          </div>
        </section>

        {/* --- 2. Content Area --- */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "overview" && (
            <div className="space-y-10 sm:space-y-14">
              {/* Stats Grid - 1 Col Mobile, 2 Col Tablet, 3 Col Desktop */}
              <section className="grid gap-6 select-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <ActivityLineCard
                  totalActivitiesLabel={totalMonth}
                  prev_month={previousMonthCount}
                  week1={bucketData.w1}
                  week2={bucketData.w2}
                  week3={bucketData.w3}
                  week4={bucketData.w4}
                />
                <ActiveContributors data={month} />
                <ActivityTypes
                  entries={month}
                  totalActivities={totalMonth}
                />
              </section>

              <section className="space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#50B78B]">
                    Recent Activities
                  </h2>
                  <Link
                    href="/leaderboard"
                    className="flex items-center gap-2 text-sm font-medium text-[#50B78B] hover:underline"
                  >
                    View Leaderboard{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {week.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center text-zinc-500">
                    No activity in this period
                  </div>
                ) : (
                  <div className="space-y-8">
                    {week.map((group: ActivityGroup) => (
                      <PaginatedActivitySection
                        key={group.activity_definition}
                        group={group}
                        itemsPerPage={10}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* REPOSITORIES TAB */}
          {activeTab === "repositories" && (
            <div className="space-y-8 sm:space-y-10">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <SummaryCard
                  label="Total Repositories"
                  value={repos.length}
                  icon={<LayoutGrid className="h-6 w-6" />}
                  decoration="bar"
                />
                <SummaryCard
                  label="Top Repo Contributions"
                  value={activeRepo.totalContributions ?? ""}
                  sub="Last 30 Days"
                  icon={<GitFork className="h-6 w-6" />}
                  decoration="graph"
                />
                {/* Spans full width on tablet to look better */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <SummaryCard
                    label="Most Active Repo"
                    value={activeRepo.name ?? ""}
                    sub={`${activeRepo.growth >= 0 ? '+' : ''}${activeRepo.growth} Merged PRs`}
                    icon={<Trophy className="h-6 w-6" />}
                    highlight={true}
                    decoration="wave"
                  />
                </div>
              </div>

              {/* Repos Grid */}
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-2">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    Tracked Repositories
                  </h3>
                  <span className="self-start sm:self-auto text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                    Showing {repos.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {sortedRepos.map((repo: RepoStats) => (
                    <RepoCard key={repo.name} repo={repo} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Components =====

function SummaryCard({
  label,
  value,
  sub,
  icon,
  highlight,
  decoration,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl transition-all duration-500 group",
        // Light Mode: White Glass | Dark Mode: Dark Glass
        "bg-white/60 dark:bg-zinc-900/40",
        "border border-zinc-200 dark:border-zinc-800/60",
        "backdrop-blur-md shadow-sm",
        // Hover
        "hover:border-[#50B78B]/30 hover:shadow-[0_0_30px_-10px_rgba(80,183,139,0.15)]",
        // Highlight logic
        highlight &&
          "bg-linear-to-br from-zinc-50/80 to-white/40 dark:from-zinc-900/80 dark:to-zinc-900/40 border-[#50B78B]/20"
      )}
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-[#50B78B]/10 dark:bg-[#50B78B]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#50B78B]/20 dark:group-hover:bg-[#50B78B]/10 transition-colors" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors mt-1">
          {label}
        </p>

        {/* Icon Box */}
        <div
          className={cn(
            "shrink-0 p-3 rounded-2xl flex items-center justify-center transition-all duration-500",
            "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-400",
            "ring-1 ring-zinc-200 dark:ring-white/5",
            "group-hover:bg-[#50B78B]/10 group-hover:text-[#50B78B] group-hover:scale-110 group-hover:rotate-3"
          )}
        >
          {icon}
        </div>
      </div>

      {/* Main Value Area */}
      <div className="mt-6 relative z-10 space-y-1">
        <p
          className={cn(
            "font-bold text-zinc-800 dark:text-zinc-100 tracking-tight leading-none break-all",
            String(value).length > 15
              ? "text-xl sm:text-2xl"
              : "text-3xl sm:text-4xl lg:text-5xl"
          )}
        >
          {value}
        </p>

        {sub && (
          <div className="flex items-center">
            <p className="text-xs font-medium text-[#50B78B] uppercase tracking-wide opacity-90 truncate">
              {sub}
            </p>
          </div>
        )}
      </div>

      {decoration === "wave" && (
        <svg
          className="absolute bottom-0 left-0 w-full h-24 text-[#50B78B]/5 pointer-events-none"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0 30 Q 25 0 50 15 T 100 5 V 30 Z"
          />
        </svg>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: RepoStats }) {
  return (
    <div className="group flex flex-col h-full bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-[#50B78B]/50 transition-all duration-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg dark:hover:shadow-[#50B78B]/5">
      {/* Top Section */}
      <div className="p-5 sm:p-6 grow space-y-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Avatar and Name Wrapper */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="shrink-0 group-hover:border-[#50B78B]/30 group-hover:text-[#50B78B] transition-colors rounded-md overflow-hidden border border-zinc-100 dark:border-zinc-800">
              <Image
                src={repo.avatar_url}
                alt={repo.name ?? "Image"}
                width={40}
                height={40}
              />
            </div>
            {/* Added min-w-0 to allow truncation inside flex */}
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 hover:text-[#50B78B] dark:hover:text-[#50B78B] transition-colors truncate">
                <Link
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                            >
                      {repo.name}
                </Link>
              </div>
              {repo.language && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mt-1">
                  {repo.language}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <GitFork className="h-3.5 w-3.5 text-[#7C3AED]" />
              {repo.forks}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {repo.stars}
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {repo.description ?? "No description"}
        </p>
      </div>

      {/* Metrics Section */}
      <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-2 border border-zinc-100 dark:border-zinc-800/60">
          <Link
            href={`${repo.html_url}/issues`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MetricFlowItem
              icon={<CircleDot className="h-4 w-4 sm:h-5 sm:w-5" />}
              count={repo.current.issue_created}
              label="Issues"
              variant="neutral"
            />
          </Link>
          <Link
            href={`${repo.html_url}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MetricFlowItem
              icon={<GitPullRequest className="h-4 w-4 sm:h-5 sm:w-5" />}
              count={repo.current.pr_opened}
              label="Open"
              variant="active"
            />
          </Link>
          <Link
            href={`${repo.html_url}/pulls?q=is%3Apr+is%3Amerged`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MetricFlowItem
              icon={<GitMerge className="h-4 w-4 sm:h-5 sm:w-5" />}
              count={repo.current.pr_merged}
              label="Merged"
              variant="success"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricFlowItem({
  icon,
  count,
  label,
  variant,
}: MetricFlowItemProps) {
  const variantStyles = {
    neutral: {
      icon: "text-zinc-400",
      count: "text-zinc-700 dark:text-zinc-300",
      bg: "hover:bg-zinc-100 dark:hover:bg-zinc-700/50",
    },
    active: {
      icon: "text-blue-500/70 dark:text-blue-400/70",
      count: "text-zinc-800 dark:text-zinc-200",
      bg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    },
    success: {
      icon: "text-[#50B78B]",
      count: "text-[#50B78B] font-bold",
      bg: "hover:bg-[#50B78B]/10",
    },
  };
  const styles = variantStyles[variant as keyof typeof variantStyles];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg transition-colors cursor-pointer",
        styles.bg
      )}
    >
      <div
        className={cn(
          "mb-1.5 sm:mb-2 transform transition-transform group-hover:scale-110",
          styles.icon
        )}
      >
        {icon}
      </div>
      <span
        className={cn("text-lg sm:text-xl leading-none", styles.count)}
      >
        {count}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mt-1">
        {label}
      </span>
    </div>
  );
}