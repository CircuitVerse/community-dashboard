import { ActivityTypes } from "@/components/Leaderboard/stats-card/activity-types";
import { ActivityLineCard } from "@/components/Leaderboard/stats-card/activity-line-card";
import ActiveContributors from "@/components/Leaderboard/stats-card/active-contributors";
import { PaginatedActivitySection } from "@/components/PaginatedActivitySection";

import {
  ActivityGroup,
  getRecentActivitiesGroupedByType,
} from "@/lib/db";

import Link from "next/link";
import { getConfig } from "@/lib/config";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const config = getConfig();

  const totalCount = (groups: ActivityGroup[]) =>
    groups.reduce((sum, g) => sum + g.activities.length, 0);

  const week = await getRecentActivitiesGroupedByType("week");
  const week2 = await getRecentActivitiesGroupedByType("2week");
  const week3 = await getRecentActivitiesGroupedByType("3week");
  const month = await getRecentActivitiesGroupedByType("month");
  const month2 = await getRecentActivitiesGroupedByType("2month");

  const w1 = totalCount(week);
  const w2 = totalCount(week2) - w1;
  const w3 = totalCount(week3) - totalCount(week2);
  const w4 = totalCount(month) - totalCount(week3);

  return (
    <div className="min-h-screen transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-14">
        <section className="text-center space-y-4">
          <h1 className="text-5xl sm:text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-[#50B78B] via-[#60C79B] to-[#70D7AB]
">
            {config.org.name}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            {config.org.description}
          </p>
        </section>

        <section className="grid gap-6 select-none sm:grid-cols-2 lg:grid-cols-3">
          <ActivityLineCard
            totalActivitiesLabel={totalCount(month)}
            prev_month={totalCount(month2)}
            week1={w1}
            week2={w2}
            week3={w3}
            week4={w4}
          />
          <ActiveContributors data={month} />
          <ActivityTypes
            entries={month}
            totalActivities={totalCount(month)}
          />
        </section>

        <section className="space-y-6 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[#50B78B]">
              Recent Activities
            </h2>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 text-sm font-medium text-[#50B78B]"
            >
              View Leaderboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {week.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center text-zinc-500">
              No activity in this period
            </div>
          ) : (
            <div className="space-y-8">
              {week.map((group) => (
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
    </div>
  );
}
