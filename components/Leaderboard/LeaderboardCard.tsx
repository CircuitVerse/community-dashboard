"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, GitMerge, GitPullRequest, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityTrendChart from "./ActivityTrendChart";
import "./LeaderboardCard.css";

const activityStyles: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  "PR merged": {
    icon: GitMerge,
    bgColor: "bg-purple-500/10 dark:bg-purple-500/15",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-l-purple-500"
  },
  "PR opened": {
    icon: GitPullRequest,
    bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-l-blue-500"
  },
  "Issue opened": {
    icon: AlertCircle,
    bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-l-orange-500"
  },
  "Review submitted": {
    icon: Eye,
    bgColor: "bg-green-500/10 dark:bg-green-500/15",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-l-green-500"
  }
};

const getActivityStyle = (activityName: string) => {
  return activityStyles[activityName] || {
    icon: () => null,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-l-gray-400"
  };
};

export type LeaderboardEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role?: string | null;
  total_points: number;
  activity_breakdown: Record<
    string,
    {
      count: number;
      points: number;
    }
  >;
  daily_activity?: Array<{
    date: string;
    points: number;
    count: number;
  }>;
};

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  rank: number;
  startDate: Date;
  endDate: Date;
  variant?: "grid" | "list";
}

export function LeaderboardCard({
  entry,
  rank,
  startDate,
  endDate,
  variant = "grid"
}: LeaderboardCardProps) {
  const isTopThree = rank <= 3;

  // Helper function to sort activities by priority then alphabetically
  const sortActivitiesByPriority = (entries: Array<[string, { count: number; points: number }]>) => {
    return entries.sort((a, b) => {
      const activityPriority: Record<string, number> = {
        "PR merged": 1,
        "PR opened": 2,
        "Issue opened": 3,
        "Review submitted": 4,
      };
      const priorityA = activityPriority[a[0]] ?? 99;
      const priorityB = activityPriority[b[0]] ?? 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a[0].localeCompare(b[0]);
    });
  };

  const openGitHubProfile = () => {
    if (entry.username && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(entry.username)) {
      window.open(`https://github.com/${encodeURIComponent(entry.username)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-500" aria-label="1st place" />;
    if (rank === 2)
      return <Trophy className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="2nd place" />;
    if (rank === 3)
      return <Trophy className="h-4 w-4 text-amber-700 dark:text-amber-600" aria-label="3rd place" />;
    return null;
  };

  const getRankStyles = (rank: number) => {
    if (rank <= 3) {
      return {
        border: "border-[#50B78B]/50",
        iconBg: "bg-[#42B883]/10"
      };
    }

    return {
      border: "",
      iconBg: "bg-[#42B883]"
    };
  };

  const getAnimatedBorderClass = (rank: number) => {
    if (rank === 1) return "rank-card-1";
    if (rank === 2) return "rank-card-2";
    if (rank === 3) return "rank-card-3";
    return "";
  };

  const styles = getRankStyles(rank);

  if (variant === "list") {
    return (
      <div className={cn(
        "relative group",
        isTopThree && getAnimatedBorderClass(rank)
      )}>
        <Card
          className={cn(
            "relative z-10 overflow-hidden transition-all duration-500 border-2",
            styles.border,
            "hover:shadow-2xl hover:-translate-y-1"
          )}
        >
          {/* Glossy Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          <CardContent className="p-4 sm:p-6 relative z-10">
            {/* Mobile View - Grid Card Structure */}
            <div className="sm:hidden flex flex-col items-center text-center gap-3 h-full">
              {/* Rank Badge - Top Right of Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  onClick={openGitHubProfile}
                  className="cursor-pointer"
                >
                  <Avatar className="w-16 h-16 ring-2 ring-[#42B883]/20 group-hover:ring-[#42B883]/40 transition-all">
                    <AvatarImage
                      src={entry.avatar_url || undefined}
                      alt={entry.name || entry.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883] font-semibold text-sm">
                      {(entry.name || entry.username)
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Rank overlay */}
                <div className={cn(
                  "absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-md border transition-transform group-hover:scale-110 text-white",
                  isTopThree
                    ? styles.iconBg
                    : "bg-[#42B883] text-white border-white dark:border-gray-900"
                )}>
                  {rank <= 3 ? getRankIcon(rank) || rank : rank}
                </div>
              </div>

              {/* User Info */}
              <div className="min-w-0 w-full flex-shrink-0">
                <h3 className="font-semibold text-sm truncate mb-1">{entry.name || entry.username}</h3>
                <p
                  onClick={openGitHubProfile}
                  className="text-xs text-muted-foreground truncate mb-1 cursor-pointer hover:text-[#50B78B] transition-colors"
                >
                  @{entry.username}
                </p>
                {entry.role && (
                  <Badge variant="secondary" className="text-xs mb-2 bg-[#42B883]/10 text-[#42B883]">
                    {entry.role}
                  </Badge>
                )}

                {/* Points */}
                <div className="mb-2">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    <span className="font-bold text-[#42B883]">{entry.total_points}</span>
                    <span className="text-muted-foreground text-xs">pts</span>
                  </div>
                </div>
              </div>

              {/* Top Activities */}
              <div className="flex-1 w-full">
                <div className="space-y-1.5">
                  {sortActivitiesByPriority(Object.entries(entry.activity_breakdown))
                    .filter(([activityName, data]) => data.count > 0)
                    .map(([activityName, data]) => {
                      const style = getActivityStyle(activityName);
                      const IconComponent = style.icon;

                      return (
                        <div
                          key={activityName}
                          className={cn(
                            "relative text-xs px-3 py-2 rounded-md border-l-2 transition-all hover:shadow-sm flex items-center justify-between gap-2",
                            style.bgColor,
                            style.borderColor
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {IconComponent && (
                              <IconComponent className={cn("w-3 h-3", style.textColor)} />
                            )}
                            <span className={cn("font-medium truncate", style.textColor)}>
                              {activityName}:
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{data.count}</span>
                            <span className={cn("font-bold", style.textColor)}>+{data.points}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">

              {/* Rank */}
              <div className="flex items-center justify-center size-12 shrink-0">
                {getRankIcon(rank) || (
                  <span className="text-2xl font-bold text-[#50B78B]">
                    {rank}
                  </span>
                )}
              </div>

              {/* Avatar - Clickable */}
              <div
                onClick={openGitHubProfile}
                className="shrink-0 cursor-pointer"
              >
                <Avatar className="size-14 hover:ring-2 hover:ring-[#50B78B] transition-all">
                  <AvatarImage
                    src={entry.avatar_url || undefined}
                    alt={entry.name || entry.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883] font-semibold">
                    {(entry.name || entry.username)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Contributor Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-lg font-semibold">
                    {entry.name || entry.username}
                  </h3>
                  {entry.role && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#50B78B]/10 text-[#50B78B]">
                      {entry.role}
                    </span>
                  )}
                </div>

                <span
                  onClick={openGitHubProfile}
                  className="text-sm text-muted-foreground hover:text-[#50B78B] transition-colors cursor-pointer"
                >
                  @{entry.username}
                </span>

                <div className="mb-3" />

                {/* Activity Breakdown */}
                <div className="flex flex-wrap gap-2">
                  {sortActivitiesByPriority(Object.entries(entry.activity_breakdown))
                    .filter(([activityName, data]) => data.count > 0)
                    .map(([activityName, data]) => {
                      const style = getActivityStyle(activityName);
                      const IconComponent = style.icon;

                      return (
                        <div
                          key={activityName}
                          className={cn(
                            "relative text-xs px-3 py-1.5 rounded-md border-l-2 transition-all hover:shadow-sm",
                            style.bgColor,
                            style.borderColor
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {IconComponent && (
                              <IconComponent className={cn("w-3.5 h-3.5", style.textColor)} />
                            )}
                            <span className={cn("font-semibold", style.textColor)}>
                              {activityName}:
                            </span>
                            <span className="text-muted-foreground font-medium">
                              {data.count}
                            </span>
                            {data.points > 0 && (
                              <span className={cn("ml-0.5 font-bold", style.textColor)}>
                                (+{data.points})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Total Points with Trend Chart */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:block">
                  {entry.daily_activity &&
                    entry.daily_activity.length > 0 && (
                      <ActivityTrendChart
                        dailyActivity={entry.daily_activity}
                        startDate={startDate}
                        endDate={endDate}
                        mode="points"
                      />
                    )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#50B78B]">
                    {entry.total_points}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    points
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grid variant (similar to people cards)
  return (
    <div className={cn(
      "relative group",
      isTopThree && getAnimatedBorderClass(rank)
    )}>
      <Card
        className={cn(
          "relative z-10 overflow-hidden transition-all duration-500 h-full border-2",
          styles.border,
          "hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1"
        )}
      >
        {/* Glossy Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <CardContent className="p-4 relative z-10 h-full flex flex-col">
          <div className="flex gap-3 sm:hidden h-full">
            <div className="flex items-start justify-center w-[5%] pt-1">
              {getRankIcon(rank) || (
                <span className="text-lg font-bold text-[#50B78B]">
                  {rank}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 w-[35%]">
              {/* Avatar */}
              <div
                onClick={openGitHubProfile}
                className="cursor-pointer"
              >
                <Avatar className="size-12 ring-2 ring-[#42B883]/20 group-hover:ring-[#42B883]/40 transition-all">
                  <AvatarImage
                    src={entry.avatar_url || undefined}
                    alt={entry.name || entry.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883] font-semibold text-sm">
                    {(entry.name || entry.username)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Contributor Info */}
              <div className="text-center">
                <h3 className="font-semibold text-sm truncate mb-1 leading-tight">{entry.name || entry.username}</h3>
                <p
                  onClick={openGitHubProfile}
                  className="text-xs text-muted-foreground truncate cursor-pointer hover:text-[#50B78B] transition-colors"
                >
                  @{entry.username}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-[60%]">
              <div className="flex items-center justify-between">
                {entry.role && (
                  <Badge variant="secondary" className="text-xs bg-[#42B883]/10 text-[#42B883]">
                    {entry.role}
                  </Badge>
                )}
                <div className="text-right">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    <span className="font-bold text-[#42B883]">{entry.total_points}</span>
                    <span className="text-muted-foreground text-xs">pts</span>
                  </div>
                </div>
              </div>

              {/* Activity Tags */}
              <div className="space-y-1 flex-1">
                {sortActivitiesByPriority(Object.entries(entry.activity_breakdown))
                  .filter(([activityName, data]) => data.count > 0)
                  .map(([activityName, data]) => {
                    const style = getActivityStyle(activityName);
                    const IconComponent = style.icon;

                    return (
                      <div
                        key={activityName}
                        className={cn(
                          "relative text-xs px-2 py-1.5 rounded-md border-l-2 transition-all hover:shadow-sm flex items-center justify-between gap-1",
                          style.bgColor,
                          style.borderColor
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {IconComponent && (
                            <IconComponent className={cn("w-3 h-3", style.textColor)} />
                          )}
                          <span className={cn("font-medium truncate text-xs", style.textColor)}>
                            {activityName === "PR merged" ? "PR" : activityName === "PR opened" ? "Opened" : activityName === "Issue opened" ? "Issues" : activityName === "Review submitted" ? "Reviews" : activityName}:
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-xs">{data.count}</span>
                          <span className={cn("font-bold text-xs", style.textColor)}>+{data.points}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex flex-col items-center gap-3 h-full">
            {/* Rank Badge */}
            <div className="relative flex-shrink-0">
              <div
                onClick={openGitHubProfile}
                className="cursor-pointer"
              >
                <Avatar className="w-16 h-16 ring-2 ring-[#42B883]/20 group-hover:ring-[#42B883]/40 transition-all">
                  <AvatarImage
                    src={entry.avatar_url || undefined}
                    alt={entry.name || entry.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883] font-semibold text-sm">
                    {(entry.name || entry.username)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Rank overlay */}
              <div className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-md border transition-transform group-hover:scale-110 text-white",
                isTopThree
                  ? styles.iconBg
                  : "bg-[#42B883] text-white border-white dark:border-gray-900"
              )}>
                {rank <= 3 ? getRankIcon(rank) || rank : rank}
              </div>
            </div>

            {/* User Info */}
            <div className="text-center min-w-0 w-full flex-shrink-0">
              <h3 className="font-semibold text-sm truncate mb-1">{entry.name || entry.username}</h3>
              <p
                onClick={openGitHubProfile}
                className="text-xs text-muted-foreground truncate mb-1 cursor-pointer hover:text-[#50B78B] transition-colors"
              >
                @{entry.username}
              </p>
              {entry.role && (
                <Badge variant="secondary" className="text-xs mb-2 bg-[#42B883]/10 text-[#42B883]">
                  {entry.role}
                </Badge>
              )}

              {/* Points */}
              <div className="mb-2">
                <div className="flex items-center justify-center gap-1 text-sm">
                  <Trophy className="w-3 h-3 text-yellow-500" />
                  <span className="font-bold text-[#42B883]">{entry.total_points}</span>
                  <span className="text-muted-foreground text-xs">pts</span>
                </div>
              </div>
            </div>

            {/* Top Activities */}
            <div className="flex-1 w-full">
              <div className="space-y-1.5">
                {sortActivitiesByPriority(Object.entries(entry.activity_breakdown))
                  .filter(([activityName, data]) => data.count > 0)
                  .map(([activityName, data]) => {
                    const style = getActivityStyle(activityName);
                    const IconComponent = style.icon;

                    return (
                      <div
                        key={activityName}
                        className={cn(
                          "relative text-xs px-3 py-2 rounded-md border-l-2 transition-all hover:shadow-sm flex items-center justify-between gap-2",
                          style.bgColor,
                          style.borderColor
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {IconComponent && (
                            <IconComponent className={cn("w-3 h-3", style.textColor)} />
                          )}
                          <span className={cn("font-medium truncate", style.textColor)}>
                            {activityName}:
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{data.count}</span>
                          <span className={cn("font-bold", style.textColor)}>+{data.points}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
