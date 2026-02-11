"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Clock, AlertTriangle, Tag } from "lucide-react";
import Link from "next/link";

interface Issue {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  url: string;
  repository: string;
  ageHours: number;
  labels: string[];
}

interface AnalyticsData {
  issueMetrics: {
    issuesPendingTriage: Issue[];
  };
}

export function PendingTriageList() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch issues pending triage');
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

  const formatAge = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h ago`;
    } else if (hours < 24 * 7) {
      return `${Math.round(hours / 24)}d ago`;
    } else {
      return `${Math.round(hours / 24 / 7)}w ago`;
    }
  };

  const getAgeColor = (hours: number) => {
    if (hours < 24) return "text-green-600 dark:text-green-400";
    if (hours < 24 * 7) return "text-yellow-600 dark:text-yellow-400";
    if (hours < 24 * 30) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading issues pending triage: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading pending triage: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.issueMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Issues Pending Triage
          </CardTitle>
          <CardDescription>
            Issues that need proper labeling and categorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Analytics data is being generated. Please refresh in a moment.
          </div>
        </CardContent>
      </Card>
    );
  }

  const issuesPendingTriage = data.issueMetrics.issuesPendingTriage || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Issues Pending Triage ({issuesPendingTriage.length})
        </CardTitle>
        <CardDescription>
          Issues that need proper labeling and categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issuesPendingTriage.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            🎉 All issues have been triaged!
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {issuesPendingTriage.map((issue) => (
              <div key={`${issue.repository}-${issue.number}`} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={issue.authorAvatar} alt={issue.author || 'Unknown'} />
                  <AvatarFallback>{(issue.author || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {issue.repository}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      #{issue.number}
                    </Badge>
                    {issue.labels.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {issue.labels.slice(0, 2).map((label, idx) => (
                          <Badge key={`${label}-${idx}`} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                        {issue.labels.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{issue.labels.length - 2} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        No labels
                      </Badge>
                    )}
                  </div>
                  <Link 
                    href={issue.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline flex items-center gap-1"
                  >
                    {issue.title}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>by {issue.author}</span>
                    <span className={`flex items-center gap-1 ${getAgeColor(issue.ageHours)}`}>
                      <Clock className="h-3 w-3" />
                      {formatAge(issue.ageHours)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}