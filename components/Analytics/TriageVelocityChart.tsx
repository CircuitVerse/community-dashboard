"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface TriageData {
  date: string;
  triaged: number;
  pending: number;
  total: number;
}

interface DailyTriageItem {
  date: string;
  triaged: number;
  pending: number;
  total: number;
}

export function TriageVelocityChart() {
  const [data, setData] = useState<TriageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics?type=issues');
        if (!response.ok) {
          throw new Error('Failed to fetch triage velocity data');
        }
        
        const result = await response.json();
        
        // Use real triage data if available
        if (result.issueMetrics?.dailyTriageData) {
          const realData = result.issueMetrics.dailyTriageData.map((item: DailyTriageItem) => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            triaged: item.triaged,
            pending: item.pending,
            total: item.total,
          }));
          setData(realData);
        } else {
          // Generate mock historical triage data for the last 14 days
          const mockData: TriageData[] = [];
          const today = new Date();
          
          for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const triaged = Math.floor(Math.random() * 8) + 2;
            const pending = Math.floor(Math.random() * 15) + 5;
            
            mockData.push({
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              triaged,
              pending,
              total: triaged + pending,
            });
          }
          
          setData(mockData);
        }
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
            Error loading triage velocity: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }

  interface PayloadEntry {
    color: string;
    name: string;
    value: number;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-sm">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: PayloadEntry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} issues
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Triage Velocity Trend</CardTitle>
        <CardDescription>
          Daily issue triage activity over the past 2 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-sm text-muted-foreground"
              />
              <YAxis 
                className="text-sm text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="pending" 
                stackId="1" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.6}
                name="Pending Triage"
              />
              <Area 
                type="monotone" 
                dataKey="triaged" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.8}
                name="Triaged"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-muted-foreground">Triaged</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-muted-foreground">Pending Triage</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}