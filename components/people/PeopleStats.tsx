"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Trophy, 
  Activity, 
  TrendingUp, 
  Star,
  GitCommit,
  Target,
  GitPullRequest
} from "lucide-react";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
}

interface PeopleStatsProps {
  contributors: ContributorEntry[];
  onContributorClick?: (contributor: ContributorEntry) => void;
}

export function PeopleStats({ contributors, onContributorClick }: PeopleStatsProps) {
  // Calculate stats
  const totalContributors = contributors.length;
  const totalPoints = contributors.reduce((sum, c) => sum + (c.total_points || 0), 0);
  const averagePoints = totalContributors > 0 ? Math.round(totalPoints / totalContributors) : 0;
  

  // Activity stats
  const totalActivities = contributors.reduce((sum, c) => {
    return sum + Object.values(c.activity_breakdown || {}).reduce((actSum, act) => actSum + act.count, 0);
  }, 0);

  // Most active contributors (last 7 days)
  const topContributors = contributors
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .slice(0, 5);

  // Active days stats
  const activeDaysData = contributors.map(c => c.daily_activity?.length || 0);
  const totalActiveDays = activeDaysData.reduce((sum, days) => sum + days, 0);
  const averageActiveDays = totalContributors > 0 ? Math.round(totalActiveDays / totalContributors) : 0;

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentlyActive = contributors.filter(contributor => {
    const lastActivity = contributor.daily_activity?.find(day => 
      new Date(day.date) >= sevenDaysAgo
    );
    return !!lastActivity;
  }).length;

  // Calculate activity type distribution
  const activityTypes = contributors.reduce((acc, contributor) => {
    Object.entries(contributor.activity_breakdown || {}).forEach(([type, data]) => {
      if (!acc[type]) acc[type] = { count: 0, points: 0 };
      acc[type].count += data.count;
      acc[type].points += data.points;
    });
    return acc;
  }, {} as Record<string, { count: number; points: number }>);

  const topActivityTypes = Object.entries(activityTypes)
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-700 border-green-300 dark:border-emerald-600 shadow-lg hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 dark:bg-white/10 rounded-xl shadow-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-md text-white/80">Total Contributors</p>
                <p className="text-2xl font-bold text-white">{totalContributors}</p>
                <p className="text-sm text-white/70">Active community</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600 to-orange-600 dark:from-amber-500 dark:to-orange-700 border-amber-300 dark:border-orange-600 shadow-lg hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 dark:bg-white/10 rounded-xl shadow-sm">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-md text-white/80">Total Points</p>
                <p className="text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
                <p className="text-sm text-white/70">Community effort</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-700 border-blue-300 dark:border-cyan-600 shadow-lg hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 dark:bg-white/10 rounded-xl shadow-sm">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-md text-white/80">Avg Points</p>
                <p className="text-2xl font-bold text-white">{averagePoints}</p>
                <p className="text-sm text-white/70">Per contributor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-700 border-purple-300 dark:border-pink-600 shadow-lg hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 dark:bg-white/10 rounded-xl shadow-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-md text-white/80">Active This Year</p>
                <p className="text-2xl font-bold text-white">{recentlyActive}</p>
                <p className="text-sm text-white/70">{totalContributors > 0 ? Math.round((recentlyActive/totalContributors)*100) : 0}% of community</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Top Contributors of the year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topContributors.map((contributor, index) => (
                <div 
                  key={contributor.username} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onContributorClick?.(contributor)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${{
                    0: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md',
                    1: 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md',
                    2: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md'
                  }[index] || 'bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold'}`}>
                    {index + 1}
                  </div>
                  <img 
                    src={contributor.avatar_url} 
                    alt={contributor.name || contributor.username}
                    className="w-10 h-10 rounded-full ring-2 ring-primary/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {contributor.name || contributor.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{contributor.username} • {contributor.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-bold">
                      {contributor.total_points || 0} pts
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {contributor.daily_activity?.length || 0} active days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalActivities.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Activities</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{averageActiveDays}</div>
                <div className="text-sm text-muted-foreground">Avg Active Days</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(totalActivities / totalContributors)}</div>
                <div className="text-sm text-muted-foreground">Avg Activities</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round((recentlyActive / totalContributors) * 100)}%</div>
                <div className="text-sm text-muted-foreground">Weekly Active Rate</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topActivityTypes.map(([type, data]) => {
                const getActivityIcon = (activityType: string) => {
                  const typeStr = activityType.toLowerCase();
                  if (typeStr.includes('commit')) return <GitCommit className="w-4 h-4" />;
                  if (typeStr.includes('pr') || typeStr.includes('pull')) return <GitPullRequest className="w-4 h-4" />;
                  if (typeStr.includes('issue')) return <Activity className="w-4 h-4" />;
                  return <Activity className="w-4 h-4" />;
                };

                return (
                  <div key={type} className="p-3 border rounded-lg bg-gradient-to-br from-background to-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      {getActivityIcon(type)}
                      <span className="font-medium text-sm truncate">{type}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">{data.count}</div>
                      <div className="text-xs text-muted-foreground">{data.points} total points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}