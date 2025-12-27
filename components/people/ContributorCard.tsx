"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Calendar, GitCommit, Star, Trophy, GitPullRequest, Bug } from "lucide-react";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
}

interface ContributorCardProps {
  contributor: ContributorEntry;
  onClick?: (contributor: ContributorEntry) => void;
  showStats?: boolean;
  variant?: "grid" | "list";
}

export function ContributorCard({
  contributor,
  onClick,
  showStats = true,
  variant = "grid"
}: ContributorCardProps) {
  const handleClick = () => {
    onClick?.(contributor);
  };

  const getActivityIcon = (activityType: string) => {
    const type = activityType.toLowerCase();
    if (type.includes('commit')) return <GitCommit className="w-3 h-3" />;
    if (type.includes('pr merged') || type.includes('merged')) return <GitPullRequest className="w-3 h-3 text-green-600" />;
    if (type.includes('pr opened') || type.includes('opened')) return <GitPullRequest className="w-3 h-3 text-blue-600" />;
    if (type.includes('pr') || type.includes('pull')) return <GitPullRequest className="w-3 h-3" />;
    if (type.includes('issue')) return <Bug className="w-3 h-3" />;
    if (type.includes('star')) return <Star className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
  };

  const topActivities = Object.entries(contributor.activity_breakdown || {})
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, 3);

  const recentActivityDays = contributor.daily_activity?.length || 0;
  const averagePointsPerDay = recentActivityDays > 0 
    ? Math.round((contributor.total_points || 0) / recentActivityDays)
    : 0;

  if (variant === "list") {
    return (
      <Card 
        className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] border-l-4 border-l-primary/20 hover:border-l-primary/60" 
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
              <AvatarImage
                src={contributor.avatar_url}
                alt={contributor.name || contributor.username}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {(contributor.name || contributor.username)
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate text-lg">{contributor.name || contributor.username}</h3>
                <Badge variant="secondary" className="text-xs font-medium">
                  {contributor.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">@{contributor.username}</p>
              
              {showStats && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-600" />
                    <span className="font-medium">{contributor.total_points || 0}</span> pts
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span className="font-medium">{recentActivityDays}</span> active days
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-green-600" />
                    <span className="font-medium">{averagePointsPerDay}</span> avg/day
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {topActivities.map(([activity, data]) => (
                <div key={activity} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                  {getActivityIcon(activity)}
                  <span className="font-medium">{data.count}</span>
                  <span className="text-primary font-semibold">{data.points}p</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] overflow-hidden" 
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-20 h-20 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
              <AvatarImage
                src={contributor.avatar_url}
                alt={contributor.name || contributor.username}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                {(contributor.name || contributor.username)
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center min-w-0 w-full">
            <h3 className="font-semibold text-sm truncate mb-1">{contributor.name || contributor.username}</h3>
            <p className="text-xs text-muted-foreground truncate mb-2">@{contributor.username}</p>
            <Badge variant="secondary" className="text-xs mb-3">
              {contributor.role}
            </Badge>
            
            {showStats && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Trophy className="w-3 h-3 text-yellow-600" />
                  <span className="font-bold text-primary">{contributor.total_points || 0}</span>
                  <span className="text-muted-foreground">points</span>
                </div>
                
                <div className="flex justify-center gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{recentActivityDays}d</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>{averagePointsPerDay}/day</span>
                  </div>
                </div>
                
                {topActivities.length > 0 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {topActivities.slice(0, 2).map(([activity, data]) => (
                      <div key={activity} className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded-full">
                        {getActivityIcon(activity)}
                        <span className="font-medium">{data.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}