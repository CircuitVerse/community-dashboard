"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  GitPullRequest,
  GitMerge,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { ContributorListingEntry } from "@/types/people";

interface ContributorCardProps {
  contributor: ContributorListingEntry;
  variant?: "grid" | "list";
  showStats?: boolean;
}

const ACTIVITY_ORDER = ["PR merged", "PR opened", "Issue opened"];

const getActivityIcon = (activity: string) => {
  const type = activity.toLowerCase();
  if (type.includes("merged")) {
    return <GitMerge className="w-3 h-3 text-purple-500" />;
  }
  if (type.includes("pr opened")) {
    return <GitPullRequest className="w-3 h-3 text-blue-600" />;
  }
  if (type.includes("issue")) {
    return <AlertCircle className="w-3 h-3 text-orange-600" />;
  }
  return null;
};

export function ContributorCard({
  contributor,
  variant = "grid",
  showStats = true,
}: ContributorCardProps) {
  const topActivities: [string, { count: number; points: number }][] = [];

  ACTIVITY_ORDER.forEach((activityType) => {
    const activityData = contributor.activity_breakdown?.[activityType];
    if (activityData && activityData.count > 0) {
      topActivities.push([activityType, activityData]);
    }
  });

  const activeDays = contributor.activeDays;
  const avgPerDay =
    activeDays > 0 ? Math.round(contributor.total_points / activeDays) : 0;

  return (
    <Link
      href={`/people/${encodeURIComponent(contributor.username)}/`}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl h-full"
    >
      <Card
        className={`hover:shadow-lg transition-all h-full ${
          variant === "list" ? "flex items-center" : ""
        }`}
      >
        <CardContent className="p-4 text-center">
          <Avatar className="w-20 h-20 mx-auto mb-3">
            <AvatarImage
              src={contributor.avatar_url}
              alt={contributor.name || contributor.username}
            />
            <AvatarFallback>
              {(contributor.name || contributor.username)
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="font-semibold truncate">
            {contributor.name || contributor.username}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            @{contributor.username}
          </p>

          <Badge variant="secondary">{contributor.role}</Badge>

          {showStats && (
            <>
              <div className="flex justify-center gap-2 text-xs mt-3">
                <Trophy className="w-3 h-3 text-yellow-600" />
                <span className="font-bold">{contributor.total_points}</span>
                <span className="text-muted-foreground">pts</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2 space-x-[-8px]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{activeDays}d</span>
                </div>

                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{avgPerDay}/day</span>
                </div>
              </div>
              {topActivities.length > 0 && (
                <div className="flex justify-center gap-2 mt-3">
                  {topActivities.map(([activity, data]) => (
                    <div
                      key={activity}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
                    >
                      {getActivityIcon(activity)}
                      <span className="font-medium">{data.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
