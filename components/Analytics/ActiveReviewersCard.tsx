"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TopReviewer {
  username: string;
  reviewCount: number;
  avatarUrl: string;
}

interface AnalyticsData {
  reviewMetrics: {
    topReviewers: TopReviewer[];
  };
}

export function ActiveReviewersCard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch reviewer data');
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
      <Card className="col-span-2">
        <CardHeader>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading active reviewers: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.reviewMetrics?.topReviewers) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Reviewers
          </CardTitle>
          <CardDescription>
            Top contributors by review count in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No reviewers found
          </div>
        </CardContent>
      </Card>
    );
  }

  const topReviewers = data.reviewMetrics.topReviewers.slice(0, 6);

  return (
    <Card className="col-span-2 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Most Active Reviewers
        </CardTitle>
        <CardDescription>
          Top contributors by review count in the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topReviewers.map((reviewer, index) => {
            const fallback = (reviewer.username ?? '').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={reviewer.username ?? `reviewer-${index}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={reviewer.avatarUrl} alt={reviewer.username || 'Unknown'} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{reviewer.username || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">
                      {reviewer.reviewCount} review{reviewer.reviewCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">
                  {reviewer.reviewCount}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}