"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitPullRequest, Clock, TrendingUp, Users, Divide } from "lucide-react";

interface ReviewMetrics {
  totalReviews: number;
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  averageReviewTimeHours: number;
  reviewVelocity: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface AnalyticsData {
  reviewMetrics: ReviewMetrics;
  lastUpdated: string;
}

export function ReviewMetricsCard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch review metrics');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse w-full min-h-30">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading review metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const metrics = data.reviewMetrics;
  const changePercent = metrics.reviewsLast30Days > 0
    ? Math.round((metrics.reviewsLast7Days * 4 - metrics.reviewsLast30Days) / metrics.reviewsLast30Days * 100)
    : 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <GitPullRequest className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalReviews}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.reviewsLast7Days} this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.averageReviewTimeHours < 24
              ? `${metrics.averageReviewTimeHours}h`
              : `${Math.round(metrics.averageReviewTimeHours / 24)}d`
            }
          </div>
          <p className="text-xs text-muted-foreground">
            Time to first review
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Review Velocity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(metrics.reviewVelocity.daily * 10) / 10}</div>
          <p className="text-xs text-muted-foreground">
            Reviews per day
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.reviewsLast7Days}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {changePercent !== 0 && (
              <Badge
                variant={changePercent > 0 ? "default" : "secondary"}
                className={`mr-1 ${changePercent > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
              >
                {changePercent > 0 ? '+' : ''}{changePercent}%
              </Badge>
            )}
            vs last 30 days (projected)
          </div>
        </CardContent>
      </Card>
    </>
  );
}