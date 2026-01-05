"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GitHubHeatmap } from "@/components/people/GitHubHeatmap";
import { useState } from "react";
import {
  Activity,
  Calendar,
  GitCommit,
  Star,
  Trophy,
  TrendingUp,
  BarChart3,
  Clock,
  GitPullRequest,
  Bug,
  ArrowLeft,
  Target,
  Github,
  ExternalLink,
  GitMerge,
  AlertCircle
} from "lucide-react";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type ActivityUIConfig = {
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  bgColor: string;
  iconBg: string;
  textColor: string;
  accentColor: string;
};


type ActivityKey =
  | "PR merged"
  | "PR opened"
  | "Issue opened"
  | "commit"
  | "star";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
  activities?: Array<{
    type: string;
    title: string;
    occured_at: string;
    link: string;
    points: number;
  }>;
}

interface ContributorDetailProps {
  contributor: ContributorEntry;
  onBack: () => void;
}

// Activity type configuration with unique visual identity
const activityConfig: Record<ActivityKey, ActivityUIConfig> = {
  "PR merged": {
    icon: <GitMerge className="w-4 h-4" />,
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    borderColor: "border-purple-500/30 hover:border-purple-500/50",
    bgColor: "bg-purple-500/5",
    iconBg: "bg-purple-500/15 group-hover:bg-purple-500/25",
    textColor: "text-purple-600 dark:text-purple-400",
    accentColor: "bg-purple-500",
  },
  "PR opened": {
    icon: <GitPullRequest className="w-4 h-4" />,
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    borderColor: "border-blue-500/30 hover:border-blue-500/50",
    bgColor: "bg-blue-500/5",
    iconBg: "bg-blue-500/15 group-hover:bg-blue-500/25",
    textColor: "text-blue-600 dark:text-blue-400",
    accentColor: "bg-blue-500",
  },
  "Issue opened": {
    icon: <AlertCircle className="w-4 h-4" />,
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    borderColor: "border-orange-500/30 hover:border-orange-500/50",
    bgColor: "bg-orange-500/5",
    iconBg: "bg-orange-500/15 group-hover:bg-orange-500/25",
    textColor: "text-orange-600 dark:text-orange-400",
    accentColor: "bg-orange-500",
  },
  commit: {
    icon: <GitCommit className="w-4 h-4" />,
    gradient: "from-green-500/10 via-green-500/5 to-transparent",
    borderColor: "border-green-500/30 hover:border-green-500/50",
    bgColor: "bg-green-500/5",
    iconBg: "bg-green-500/15 group-hover:bg-green-500/25",
    textColor: "text-green-600 dark:text-green-400",
    accentColor: "bg-green-500",
  },
  star: {
    icon: <Star className="w-4 h-4" />,
    gradient: "from-yellow-500/10 via-yellow-500/5 to-transparent",
    borderColor: "border-yellow-500/30 hover:border-yellow-500/50",
    bgColor: "bg-yellow-500/5",
    iconBg: "bg-yellow-500/15 group-hover:bg-yellow-500/25",
    textColor: "text-yellow-600 dark:text-yellow-400",
    accentColor: "bg-yellow-500",
  },
};



const defaultConfig: ActivityUIConfig = {
  icon: <Activity className="w-4 h-4" />,
  gradient: "from-gray-500/10 via-gray-500/5 to-transparent",
  borderColor: "border-gray-500/30 hover:border-gray-500/50",
  bgColor: "bg-gray-500/5",
  iconBg: "bg-gray-500/15 group-hover:bg-gray-500/25",
  textColor: "text-gray-600 dark:text-gray-400",
  accentColor: "bg-gray-500",
};


export function ContributorDetail({ contributor, onBack }: ContributorDetailProps) {
  const [currentTime] = useState(() => Date.now());

  const getActivityConfig = (activityType: string): ActivityUIConfig => {
    const type = activityType.toLowerCase();

    if (activityType in activityConfig) {
      return activityConfig[activityType as ActivityKey];
    }

    if (type.includes("pr merged") || type.includes("merged")) {
      return activityConfig["PR merged"];
    }
    if (type.includes("pr opened") || type.includes("opened pr")) {
      return activityConfig["PR opened"];
    }
    if (type.includes("issue")) {
      return activityConfig["Issue opened"];
    }
    if (type.includes("commit")) {
      return activityConfig["commit"];
    }
    if (type.includes("star")) {
      return activityConfig["star"];
    }

    return defaultConfig;
  };




  const getActivityIcon = (activityType: string) => {
    return getActivityConfig(activityType).icon;
  };

  const sortedActivities = Object.entries(contributor.activity_breakdown || {})
    .sort(([, a], [, b]) => b.points - a.points);

  const recentActivity = contributor.daily_activity || [];
  const totalDaysActive = recentActivity.length;
  const averagePointsPerDay = totalDaysActive > 0
    ? Math.round((contributor.total_points || 0) / totalDaysActive)
    : 0;

  // Calculate streak
  const sortedDates = recentActivity
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDates = Array.from(new Set(sortedDates.map(d => d.date)));
  
  let expectedDaysDiff = 0; // Start expecting today (0 days ago)
  
  for (const dateStr of uniqueDates) {
    const activityDate = new Date(dateStr);
    activityDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (currentStreak === 0 && (daysDiff === 0 || daysDiff === 1)) {
      currentStreak++;
      expectedDaysDiff = daysDiff + 1;
      continue;
    }

    if (daysDiff === expectedDaysDiff) {
      currentStreak++;
      expectedDaysDiff++;
    } else {
      break;
    }
  }

  const uniqueContributions = contributor.activities
    ? (() => {
        const seen = new Set<string>();
        const unique: typeof contributor.activities = [];
        
        for (const activity of contributor.activities) {
          const identifier = activity.link 
            ? `${activity.type}-${activity.link}` 
            : `${activity.type}-${activity.title}-${activity.occured_at}`;
          
          if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.push(activity);
          }
        }
        return unique;
      })()
    : [];

  const recentContributions = uniqueContributions
    .sort((a, b) => new Date(b.occured_at).getTime() - new Date(a.occured_at).getTime())
    .slice(0, 15);

  const thisMonth = new Date();
  const monthlyActivity = recentActivity.filter(day => {
    const dayDate = new Date(day.date);
    return dayDate.getMonth() === thisMonth.getMonth() &&
      dayDate.getFullYear() === thisMonth.getFullYear();
  });

  const monthlyPoints = monthlyActivity.reduce((sum, day) => sum + day.points, 0);
  const monthlyDays = monthlyActivity.length;
  const maxPoints =
  sortedActivities.length > 0
    ? Math.max(...sortedActivities.map(([, d]) => d.points))
    : 0;

  const displayName = contributor.name || contributor.username;
  const displayUsername = `@${contributor.username}`;

  return (
    <div className="mx-auto px-4 py-8 max-w-7xl lg:max-w-[1300px]">
      <Button onClick={onBack} variant="outline" className="mb-6 hover:bg-primary/10 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to People
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card className="sticky top-4 bg-gradient-to-br from-background via-background to-muted/20 shadow-lg border-0 ring-1 ring-border">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Avatar className="w-36 h-36 ring-4 ring-primary/20 shadow-xl">
                    <AvatarImage
                      src={contributor.avatar_url}
                      alt={contributor.name || contributor.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-bold">
                      {(contributor.name || contributor.username)
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {currentStreak > 0 && (
                    <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                      {currentStreak}d streak
                    </div>
                  )}
                </div>

                 <div className="text-center w-full min-w-0 px-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h2 className="text-2xl font-bold mb-2 truncate max-w-full min-w-0" aria-label={displayName}>
                        {displayName}
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} side="top">
                      {displayName}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-muted-foreground mb-3 text-lg truncate max-w-full min-w-0" aria-label={displayUsername}>
                        {displayUsername}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} side="bottom">
                      {displayUsername}
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary font-semibold px-4 py-2">
                    {contributor.role}
                  </Badge>
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-yellow-50 via-yellow-50 to-yellow-100 dark:from-yellow-400 dark:to-yellow-300 border border-yellow-200 dark:border-yellow-800">
                    <Trophy className="w-6 h-6 text-yellow-600 mb-2" />
                    <span className="font-bold text-xl text-yellow-700">{contributor.total_points || 0}</span>
                    <span className="text-xs text-yellow-600 text-center font-medium">Total Points</span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-400 dark:to-blue-300 border border-blue-200 dark:border-blue-800">
                    <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="font-bold text-xl text-blue-700">{totalDaysActive}</span>
                    <span className="text-xs text-blue-600 text-center font-medium">Active Days</span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-green-400 dark:to-green-300 border border-green-200 dark:border-green-800">
                    <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
                    <span className="font-bold text-xl text-green-700">{currentStreak}</span>
                    <span className="text-xs text-green-600 text-center font-medium">Day Streak</span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 dark:from-purple-400 dark:to-purple-300 border border-purple-200 dark:border-purple-800">
                    <Target className="w-6 h-6 text-purple-600 mb-2" />
                    <span className="font-bold text-xl text-purple-700">{averagePointsPerDay}</span>
                    <span className="text-xs text-purple-600 text-center font-medium">Avg/Day</span>
                  </div>
                </div>

                <a
                  href={`https://github.com/${contributor.username}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex justify-center mt-4"
                >
                  <Button className="bg-gradient-to-r cursor-pointer from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                    <Github className="w-5 h-5" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                This Month&apos;s Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{monthlyPoints}</div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{monthlyDays}</div>
                  <div className="text-sm text-muted-foreground">Active Days</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{monthlyDays > 0 ? Math.round(monthlyPoints / monthlyDays) : 0}</div>
                  <div className="text-sm text-muted-foreground">Daily Average</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{sortedActivities.length}</div>
                  <div className="text-sm text-muted-foreground">Activity Types</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedActivities.map(([activity, data]) => {
                  const config = getActivityConfig(activity);

                  return (
                    <div
                      key={activity}
                      className={`group relative p-5 rounded-xl border ${config.borderColor} bg-gradient-to-br ${config.gradient} hover:shadow-lg transition-all duration-200 overflow-hidden`}
                    >
                      {/* Accent bar on the left */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accentColor}`} />

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-lg ${config.iconBg} transition-colors ${config.textColor}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold text-lg ${config.textColor}`}>{activity}</h4>
                          <p className="text-sm text-muted-foreground">{data.count} contributions</p>
                        </div>
                        <Badge className={`${config.bgColor} ${config.textColor} border-0 font-bold text-base px-3 py-1`}>
                          {data.points}
                        </Badge>
                      </div>

                      <div className="space-y-3 pl-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-muted-foreground">Average per contribution</span>
                          <span className={`font-bold ${config.textColor}`}>
                            {Math.round(data.points / data.count)} pts
                          </span>
                        </div>

                        {/* Visual progress bar */}
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.accentColor} transition-all duration-300`}
                            style={{
                              width: `${Math.min(
                                maxPoints > 0 ? (data.points / maxPoints) * 100 : 0,
                                100
                              )}%`,
                            }}

                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {recentContributions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Contributions
                  <Badge variant="secondary" className="ml-2">{recentContributions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {recentContributions.map((activity, index) => {
                    const date = new Date(activity.occured_at);
                    const isVeryRecent = index < 3;
                    const daysAgo = Math.floor((currentTime - date.getTime()) / (1000 * 60 * 60 * 24));
                    const config = getActivityConfig(activity.type);

                    return (
                      <div
                        key={`${activity.link}-${index}`}
                        className={`group flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${isVeryRecent
                            ? `${config.borderColor} bg-gradient-to-r ${config.gradient}`
                            : 'bg-muted/20 hover:bg-muted/40 hover:border-primary/20'
                          }`}
                      >
                        <div className={`mt-1 p-2 rounded-lg ${config.iconBg} ${config.textColor} transition-colors`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              {activity.link ? (
                                <a
                                  href={activity.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors cursor-pointer hover:underline"
                                >
                                  {activity.title}
                                </a>
                              ) : (
                                <h4 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                  {activity.title}
                                </h4>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className={`font-medium px-2 py-1 rounded-full ${config.bgColor} ${config.textColor}`}>
                                  {activity.type}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge
                                variant={isVeryRecent ? "default" : "secondary"}
                                className={`text-xs font-bold ${isVeryRecent ? `${config.bgColor} ${config.textColor} border-0` : ''}`}
                              >
                                +{activity.points} pts
                              </Badge>
                              {isVeryRecent && (
                                <div className={`w-2 h-2 ${config.accentColor} rounded-full animate-pulse`} />
                              )}
                            </div>
                          </div>
                          {activity.link && (
                            <a
                              href={activity.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 text-xs hover:underline font-medium ${config.textColor}`}
                            >
                              View Contribution
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <GitHubHeatmap
            dailyActivity={recentActivity}
            className="border-primary/20"
          />
        </div>
      </div>
    </div>
  );
}