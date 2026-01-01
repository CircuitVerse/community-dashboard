"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityTrendChart from "./ActivityTrendChart";
import "./LeaderboardCard.css";

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

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-500" aria-label="1st place" />;
    if (rank === 2)
      return <Trophy className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="2nd place" />;
    if (rank === 3)
      return <Trophy className="h-4 w-4 text-amber-700 dark:text-amber-600" aria-label="3rd place" />;
    return null;
  };


  // Get rotating border class for top 3
  const getRotatingBorderClass = (rank: number) => {
    if (rank === 1) return "rotating-border-gold";
    if (rank === 2) return "rotating-border-silver";
    if (rank === 3) return "rotating-border-bronze";
    return "";
  };

  // Premium rank styles for top 3
  const getRankStyles = (rank: number) => {
    const styles = {
      1: {
        bg: "bg-gradient-to-br from-yellow-500 via-yellow-500/20 to-transparent dark:from-yellow-500/90 dark:via-yellow-500/20 dark:to-transparent",
        pulse: "234, 179, 8",
        iconBg: "bg-white",
        border: "border-yellow-500/50"
      },
      2: {
        bg: "bg-gradient-to-br from-slate-500 via-gray-500/20 to-transparent dark:from-slate-500/90 dark:via-slate-500/20 dark:to-transparent",
        pulse: "148, 163, 184",
        iconBg: "bg-white",
        border: "border-slate-400/50"
      },
      3: {
        bg: "bg-gradient-to-br from-orange-500 via-orange-500/20 to-transparent dark:from-orange-700/90 dark:via-orange-700/20 dark:to-transparent",
        pulse: "194, 65, 12",
        iconBg: "bg-white",
        border: "border-orange-500/50"
      }
    };
    return styles[rank as keyof typeof styles] || {
      bg: "bg-green-200/30 dark:bg-green-900/30",
      pulse: "66, 184, 131",
      iconBg: "bg-[#42B883]/10",
      border: "border-gray-200 dark:border-gray-800"
    };
  };

  const standardActivities = [
    { key: "PR merged", label: "PRs Merged", data: entry.activity_breakdown["PR merged"] || { count: 0, points: 0 } },
    { key: "PR opened", label: "PRs Opened", data: entry.activity_breakdown["PR opened"] || { count: 0, points: 0 } },
    { key: "Issue opened", label: "Issues Opened", data: entry.activity_breakdown["Issue opened"] || { count: 0, points: 0 } }
  ];

  const styles = getRankStyles(rank);

  if (variant === "list") {
    return (
      <div className={cn(
        "relative group",
        isTopThree && getRotatingBorderClass(rank)
      )}
      style={{ "--pulse-color": styles.pulse } as React.CSSProperties}>
        <Card
          className={cn(
            "relative z-10 overflow-hidden transition-all duration-500 cursor-pointer border-2",
            styles.bg,
            isTopThree ? "animate-pulse-rank" : styles.border,
            "hover:shadow-2xl hover:-translate-y-1"
          )}
        onClick={() => window.open(`https://github.com/${entry.username}`, '_blank', 'noopener,noreferrer')}
        >
          {/* Glossy Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          {/* Rank Badge - Top Left Corner */}
          <div className="absolute top-3 left-3 z-20">
            {getRankIcon(rank) || (
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shadow-md transition-transform group-hover:scale-110",
                styles.iconBg,
                isTopThree ? "text-white" : "text-[#42B883]"
              )}>
                {rank}
              </div>
            )}
          </div>

          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex flex-row items-center gap-2 sm:gap-8">
              {/* Left Section - Avatar, Name, Username */}
              <div className="flex flex-col items-center text-center w-16 sm:w-32 flex-shrink-0">
                <Avatar className="w-12 h-12 sm:w-16 sm:h-16 ring-2 ring-[#42B883]/20 group-hover:ring-[#42B883]/40 transition-all mb-1 sm:mb-3">
                  <AvatarImage
                    src={entry.avatar_url || undefined}
                    alt={entry.name || entry.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883] font-semibold text-xs sm:text-lg">
                    {(entry.name || entry.username)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="font-semibold text-xs sm:text-base leading-tight truncate max-w-full">{entry.name || entry.username}</h3>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">@{entry.username}</p>
                  {entry.role && (
                    <Badge variant="secondary" className="text-[8px] sm:text-xs bg-[#42B883]/10 text-[#42B883] hover:bg-[#42B883]/20 mt-0.5 sm:mt-1 px-1 py-0 sm:px-2 sm:py-1">
                      {entry.role}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Middle Section - Activity Stats */}
              <div className="flex-1 flex flex-row justify-center items-center gap-1 sm:gap-6 lg:gap-8 overflow-hidden">
                {standardActivities.map(({ key, label, data }) => (
                  <div key={key} className="flex flex-col items-center bg-[#42B883]/5 hover:bg-[#42B883]/10 px-2 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-5 rounded-lg transition-colors min-w-0 flex-1">
                    <div className="text-sm sm:text-xl lg:text-2xl font-bold text-[#42B883] leading-none">{data.count}</div>
                    <div className="text-[8px] sm:text-sm lg:text-base text-muted-foreground text-center leading-tight mt-0.5 sm:mt-2 truncate">
                      {key === "PR merged" ? "PRs" : key === "PR opened" ? "Opened" : "Issues"}
                    </div>
                    <div className="text-[8px] sm:text-sm lg:text-base text-[#42B883] font-semibold mt-0.5 sm:mt-1">+{data.points}</div>
                  </div>
                ))}
              </div>

              {/* Right Section - Total Points */}
              <div className="flex flex-col items-center text-center w-16 sm:w-28 lg:w-32 flex-shrink-0">
                <div className="text-xl sm:text-3xl lg:text-4xl font-bold text-[#42B883] leading-none">
                  {entry.total_points}
                </div>
                <div className="text-[8px] sm:text-xs lg:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  points
                </div>
                
                {/* Activity Trend Chart - Hidden on mobile, shown on desktop */}
                <div className="hidden lg:block mt-3">
                  {entry.daily_activity && entry.daily_activity.length > 0 && (
                    <ActivityTrendChart
                      dailyActivity={entry.daily_activity}
                      startDate={startDate}
                      endDate={endDate}
                      mode="points"
                    />
                  )}
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
      isTopThree && getRotatingBorderClass(rank)
    )}
    style={{ "--pulse-color": styles.pulse } as React.CSSProperties}>
      <Card 
        className={cn(
          "relative z-10 overflow-hidden transition-all duration-500 cursor-pointer border-2 h-full",
          styles.bg,
          isTopThree ? "animate-pulse-rank" : styles.border,
          "hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1"
        )}
        onClick={() => window.open(`https://github.com/${entry.username}`, '_blank', 'noopener,noreferrer')}
      >
      {/* Glossy Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <CardContent className="p-4 relative z-10 h-full flex flex-col">
        <div className="flex flex-col items-center gap-3 h-full">
          {/* Rank Badge */}
          <div className="relative flex-shrink-0">
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
            
            {/* Rank overlay */}
            <div className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-md border transition-transform group-hover:scale-110",
              isTopThree 
                ? cn("text-white", styles.iconBg)
                : "bg-[#42B883] text-white border-white dark:border-gray-900"
            )}>
              {rank <= 3 ? getRankIcon(rank) || rank : rank}
            </div>
          </div>
          
          {/* User Info */}
          <div className="text-center min-w-0 w-full flex-shrink-0">
            <h3 className="font-semibold text-sm truncate mb-1">{entry.name || entry.username}</h3>
            <p className="text-xs text-muted-foreground truncate mb-1">@{entry.username}</p>
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
              {standardActivities.map(({ key, label, data }) => (
                <div key={key} className="flex items-center justify-center gap-2 text-xs bg-[#42B883]/5 px-3 py-2 rounded-full">
                  <span className="font-medium truncate">{label}:</span>
                  <span className="font-semibold">{data.count}</span>
                  <span className="text-[#42B883] font-bold">+{data.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}