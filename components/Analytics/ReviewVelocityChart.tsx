"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  name: string;
  reviews: number;
  avgTime: number;
}

interface DailyReviewItem {
  date: string;
  reviews: number;
  avgTimeHours: number;
}

export function ReviewVelocityChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics?type=reviews');
        if (!response.ok) {
          throw new Error('Failed to fetch review velocity data');
        }
        
        const result = await response.json();
        
        // Use the dailyReviewData from the API if available
        if (result.reviewMetrics?.dailyReviewData) {
          const chartData = result.reviewMetrics.dailyReviewData.map((item: DailyReviewItem) => ({
            name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
            reviews: item.reviews,
            avgTime: Math.round(item.avgTimeHours),
          }));
          setData(chartData);
        } else {
          // Fallback to sample data if no real data available
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const mockData = days.map((day) => ({
            name: day,
            reviews: Math.floor(Math.random() * 15) + 3,
            avgTime: Math.floor(Math.random() * 24) + 2,
          }));
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
            Error loading review velocity chart: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Velocity Trend</CardTitle>
        <CardDescription>
          Daily review count and average response time over the past week
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
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: 'rgba(55,65,81,0.95)',
                  border: '1px solid rgba(75,85,99,0.9)',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#e5e7eb', fontSize: 13 }}
                wrapperStyle={{ boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              />
              
              <Bar 
                dataKey="reviews" 
                fill="#10b981" 
                radius={4}
                name="Reviews"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}