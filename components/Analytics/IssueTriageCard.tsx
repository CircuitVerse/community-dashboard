"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, TrendingUp, GitBranch } from "lucide-react";

interface IssueMetrics {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  pendingTriage: number;
  recentlyTriaged: number;
  triageVelocity: {
    daily: number;
    weekly: number;
  };
  ageDistribution: {
    lessThan24h: number;
    oneToSevenDays: number;
    sevenToThirtyDays: number;
    moreThanThirtyDays: number;
  };
}

interface AnalyticsData {
  issueMetrics: IssueMetrics;
  lastUpdated: string;
}

export function IssueTriageCard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics?type=issues');
        if (!response.ok) {
          throw new Error('Failed to fetch issue metrics');
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading issue metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.issueMetrics) return null;

  const metrics = data.issueMetrics;
  const triageRate = (metrics.openIssues ?? 0) > 0 
    ? Math.round((1 - (metrics.pendingTriage ?? 0) / (metrics.openIssues ?? 1)) * 100)
    : 100;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Triage</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {metrics.pendingTriage ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Awaiting labels or categorization
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Triage Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {triageRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            Issues with proper labels
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Triage Velocity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round((metrics.triageVelocity?.daily ?? 0) * 10) / 10}
          </div>
          <p className="text-xs text-muted-foreground">
            Issues triaged per day
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.openIssues ?? 0}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge 
              variant="outline" 
              className="mr-1 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700"
            >
              {metrics.closedIssues ?? 0} closed
            </Badge>
            in last 6 months
          </div>
        </CardContent>
      </Card>
    </>
  );
}