"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from "recharts";

interface AgeDistributionData {
  name: string;
  count: number;
  color: string;
}

interface IssueMetrics {
  ageDistribution: {
    lessThan24h: number;
    oneToSevenDays: number;
    sevenToThirtyDays: number;
    moreThanThirtyDays: number;
  };
}

interface AnalyticsData {
  issueMetrics: IssueMetrics;
}

export function IssueAgeDistribution() {
  const [data, setData] = useState<AgeDistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics?type=issues');
        if (!response.ok) {
          throw new Error('Failed to fetch issue age distribution');
        }
        
        const result: AnalyticsData = await response.json();
        const ageData = result.issueMetrics.ageDistribution;
        
        const chartData: AgeDistributionData[] = [
          { 
            name: '< 24h', 
            count: ageData.lessThan24h, 
            color: '#10b981' // green - fresh
          },
          { 
            name: '1-7 days', 
            count: ageData.oneToSevenDays, 
            color: '#3b82f6' // blue - recent
          },
          { 
            name: '7-30 days', 
            count: ageData.sevenToThirtyDays, 
            color: '#f59e0b' // amber - aging
          },
          { 
            name: '> 30 days', 
            count: ageData.moreThanThirtyDays, 
            color: '#ef4444' // red - stale
          },
        ];
        
        setData(chartData);
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
      <Card>
        <CardHeader>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading issue age distribution: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0]?.value} issue{payload[0]?.value !== 1 ? 's' : ''} pending triage
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Age Distribution</CardTitle>
        <CardDescription>
          Age breakdown of issues pending triage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-sm text-muted-foreground"
              />
              <YAxis 
                className="text-sm text-muted-foreground"
              />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={4}
                name="Issues"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-sm font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}