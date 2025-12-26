import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import RelativeTime from "@/components/RelativeTime";
import { ActivityTypes } from "@/components/Leaderboard/stats-card/activity-types";
import { ActivityLineCard } from "@/components/Leaderboard/stats-card/activity-line-card";
import ActiveContributors from "@/components/Leaderboard/stats-card/active-contributors";

import {
  ActivityGroup,
  getRecentActivitiesGroupedByType,
} from "@/lib/db";

import Link from "next/link";
import { getConfig } from "@/lib/config";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors">
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
                <div key={group.activity_definition} className="space-y-3 select-none">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#50B78B]" />
                      <h3 className="text-xs uppercase tracking-wider text-zinc-500">
                        {group.activity_name}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {group.activities.length} / WEEK
                    </span>
                  </div>

                  <div className="rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="divide-y">
                      {group.activities.slice(0, 10).map((activity) => (
                        <div
                          key={activity.slug}
                          className="group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#50B78B] opacity-0 group-hover:opacity-100 transition" />

                          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                            <AvatarImage
                              src={activity.contributor_avatar_url ?? undefined}
                            />
                            <AvatarFallback>
                              {(activity.contributor_name ??
                                activity.contributor)
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">
                                {activity.title ?? "Untitled Activity"}
                              </p>

                              <Link
                                href={activity.link ?? "#"}
                                target="_blank"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#50B78B] p-1"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                              <span>
                                by{" "}
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  {activity.contributor_name ??
                                    activity.contributor}
                                </span>
                              </span>
                              <span>•</span>
                              <RelativeTime
                                date={new Date(
                                  activity.occured_at ??
                                    activity.closed_at
                                )}
                              />
                            </div>
                          </div>

                          {(activity.points ?? 0) > 0 && (
                            <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800">
                              <Sparkles className="h-3 w-3 text-[#50B78B]" />
                              {activity.points}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-zinc-50 dark:bg-white/5 px-4 py-2 text-[10px] text-center text-zinc-400 uppercase tracking-widest">
                      Activity Stream
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
