"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  approved: '#10b981', // green
  changesRequested: '#ef4444', // red
  pending: '#f59e0b', // amber
  commented: '#6366f1', // indigo
};

export function ReviewDistributionChart() {
  const [data, setData] = useState<DistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics?type=reviews');
        if (!response.ok) {
          throw new Error('Failed to fetch review distribution data');
        }
        
        const result = await response.json();
        
        // Use real distribution data if available
        if (result.reviewMetrics?.reviewStateDistribution) {
          const distribution = result.reviewMetrics.reviewStateDistribution;
          const total = distribution.approved + distribution.changesRequested + distribution.commented + distribution.pending;
          
          if (total > 0) {
            const realData: DistributionData[] = [
              { 
                name: 'Approved', 
                value: Math.round((distribution.approved / total) * 100), 
                color: COLORS.approved 
              },
              { 
                name: 'Changes Requested', 
                value: Math.round((distribution.changesRequested / total) * 100), 
                color: COLORS.changesRequested 
              },
              { 
                name: 'Pending Review', 
                value: Math.round((distribution.pending / total) * 100), 
                color: COLORS.pending 
              },
              { 
                name: 'Commented', 
                value: Math.round((distribution.commented / total) * 100), 
                color: COLORS.commented 
              },
            ].filter(item => item.value > 0); // Only show categories with data
            
            setData(realData);
          } else {
            // No data available, use empty state data
            const emptyData: DistributionData[] = [
              { name: 'No Data', value: 100, color: '#e5e7eb' },
            ];
            setData(emptyData);
          }
        } else {
          // Missing reviewStateDistribution, provide empty state
          const emptyData: DistributionData[] = [
            { name: 'No Data', value: 100, color: '#e5e7eb' },
          ];
          setData(emptyData);
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
            Error loading review distribution: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value}% of reviews
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Review State Distribution</CardTitle>
        <CardDescription className="text-sm">
          Breakdown of review outcomes in the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="h-40 sm:h-48 md:h-56 lg:h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => {
                  // Show abbreviated labels on mobile, full labels on desktop
                  return isMobile ? `${value}%` : `${name}: ${value}%`;
                }}
                outerRadius="65%"
                innerRadius="25%"
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center space-x-2 text-xs sm:text-sm">
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="text-foreground font-medium ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}