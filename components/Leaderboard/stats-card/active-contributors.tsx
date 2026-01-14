import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Users } from "lucide-react";
import { ActivityGroup } from "@/lib/db";

interface ActiveContributorsProps {
  data: ActivityGroup[];
}

const ActiveContributors = ({
  data,
}: ActiveContributorsProps) => {
  const activityGroups = data;

  const contributors = Array.from(
    new Map(
      activityGroups.flatMap((group) =>
        group.activities.map((a) => [
          a.contributor,
          {
            username: a.contributor,
            avatar: a.contributor_avatar_url,
          },
        ])
      )
    ).values()
  );

  const count = contributors.length;
  const displayCount = 30;
  const extraCount =
    count > displayCount ? count - displayCount : 0;

  return (
    <Card className="flex flex-col gap-0 rounded-[20px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-linear-to-b dark:from-zinc-900 dark:via-zinc-900 dark:to-black shadow-xl shadow-[#edfff7] dark:shadow-black/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6">
        <CardTitle className="text-xs uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400">
          Contributors
        </CardTitle>
        <Users className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4 p-6 pt-4">
        {/* Count */}
        <div>
          <div className="text-5xl font-bold text-[#50B78B] dark:text-white tracking-tight">
            {count}
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Active in last month
          </p>
        </div>

        {/* Avatar stack */}
        <div className="flex flex-wrap items-center px-2">
          {contributors
            .slice(0, displayCount)
            .map((name, i) => (
              <div
                key={name.username}
                className="-ml-3 first:ml-0 h-10 w-10 overflow-hidden rounded-full border-[3px] border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 relative"
                style={{ zIndex: displayCount - i }}
              >
                <Image
                  src={`${name.avatar}`}
                  alt={name.username}
                  width={55}
                  height={55}
                />
              </div>
            ))}

          {extraCount > 0 && (
            <div className="-ml-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-300 relative z-0">
              +{extraCount}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-auto">
          <Link
            href="/people#contributors"
            className="block w-full rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-center text-sm font-medium text-zinc-900 dark:text-white transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            View Contributors
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveContributors;
