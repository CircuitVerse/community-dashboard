"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Clock, CheckCircle, GitMerge } from "lucide-react";
import Link from "next/link";

interface PullRequest {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  url: string;
  repository: string;
  approvals: number;
  ageHours: number;
}

interface AnalyticsData {
  reviewMetrics: {
    prsReadyToMerge: PullRequest[];
  };
}

export function ReadyToMergeList() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch PRs ready to merge');
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
            Error loading PRs ready to merge: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const prsReadyToMerge = data?.reviewMetrics?.prsReadyToMerge || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitMerge className="h-5 w-5" />
          PRs Ready to Merge ({prsReadyToMerge.length})
        </CardTitle>
        <CardDescription>
          Pull requests that have been approved and are ready for merging
        </CardDescription>
      </CardHeader>
      <CardContent>
        {prsReadyToMerge.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No PRs ready to merge at the moment
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {prsReadyToMerge.map((pr) => (
              <div key={`${pr.repository}-${pr.number}`} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={pr.authorAvatar} alt={pr.author || 'Unknown'} />
                  <AvatarFallback>{(pr.author || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {pr.repository}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      #{pr.number}
                    </Badge>
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                      <CheckCircle className="h-2 w-2" />
                      {pr.approvals} approval{pr.approvals !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Link 
                    href={pr.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline flex items-center gap-1"
                  >
                    {pr.title}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>by {pr.author}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatAge(pr.ageHours)}
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