"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface ActivityChartProps {
  data: Record<string, { count: number; points: number }>;
}

const COLORS = [
  "#8b5cf6", // Purple (PR merged)
  "#3b82f6", // Blue (PR opened)
  "#f97316", // Orange (Issue opened)
  "#22c55e", // Green (Commit)
  "#eab308", // Yellow (Star)
  "#6b7280", // Gray (Others)
];

const activityKeyMap: Record<string, string> = {
  "PR merged": "PR Merged",
  "PR opened": "PR Opened",
  "Issue opened": "Issue Opened",
  "commit": "Commits",
  "star": "Stars",
};

export function ActivityChart({ data }: ActivityChartProps) {
  // Transform data for Recharts
  const chartData = Object.entries(data)
    .map(([key, value]) => ({
      name: activityKeyMap[key] || key,
      value: value.points,
      count: value.count,
      originalKey: key
    }))
    .sort((a, b) => b.value - a.value);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg ring-1 ring-black/5">
          <p className="font-bold text-sm mb-1">{data.name}</p>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {data.value} points
            </span>
            <span>
              {data.count} contribution{data.count !== 1 ? 's' : ''}
            </span>
            <span>
              ({Math.round(data.value / data.count)} pts/action)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4" />
          Points Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-xs font-medium text-muted-foreground ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
