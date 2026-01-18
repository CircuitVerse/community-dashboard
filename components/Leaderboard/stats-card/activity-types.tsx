"use client"

import { useMemo } from "react"
import { PieChart as PieChartIcon } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ActivityGroup } from "@/lib/db"

interface ActivityTypesProps {
  entries: ActivityGroup[]
  totalActivities: number
}

const chartConfig = {
    activities: {
      label: "Activities",
    },
    "PR opened": {
      label: "PR Opened",
      color: "#34d399",
    },
    "PR merged": {
      label: "PR Merged",
      color: "#A855F7",
    },
    "Issue opened": {
      label: "Issue Opened",
      color: "#F97316",
    },
    "Issue closed": {
      label: "Issue Closed",
      color: "#3B82F6",
    },
    "Issue labeled": {
      label: "Issue Labeled",
      color: "#EAB308",
    },
    "Review submitted": {
      label: "Review Submitted",
      color: "#64748b",
    },
    "Issue assigned": {
      label: "Issue Assigned",
      color: "#6366F1",
    },
  } satisfies ChartConfig

export function ActivityTypes({ entries, totalActivities }: ActivityTypesProps) {
    const chartData = useMemo(() => {
        const findEntry = (name: string) => entries.find(e => e.activity_name === name);
    
        const data = [
          { 
            name: "PR opened", 
            value: findEntry("PR opened")?.activities.length || 0, 
            fill: chartConfig["PR opened"].color
          },
          { 
            name: "PR merged", 
            value: findEntry("PR merged")?.activities.length || 0, 
            fill: chartConfig["PR merged"].color
          },
          { 
            name: "Issue opened", 
            value: findEntry("Issue opened")?.activities.length || 0, 
            fill: chartConfig["Issue opened"].color 
          },
          { 
            name: "Issue closed", 
            value: findEntry("Issue closed")?.activities.length || 0, 
            fill: chartConfig["Issue closed"].color
          },
          { 
            name: "Issue labeled", 
            value: findEntry("Issue labeled")?.activities.length || 0, 
            fill: chartConfig["Issue labeled"].color
          },
          { 
            name: "Review submitted", 
            value: findEntry("Review submitted")?.activities.length || 0, 
            fill: chartConfig["Review submitted"].color
          },
          { 
            name: "Issue assigned", 
            value: findEntry("Issue assigned")?.activities.length || 0, 
            fill: chartConfig["Issue assigned"].color
          },
        ];
        
        return data.filter(item => item.value > 0);
      }, [entries]);

  const calcPercentage = (items: number, totalItems: number) => {
    if (totalItems === 0) return "0.0"
    const res = (items / totalItems) * 100
    return res.toFixed(1)
  }

  return (
    <Card className="flex flex-col h-full rounded-[20px] border border-zinc-200 bg-white shadow-xl shadow-[#edfff7] dark:border-white/10 dark:bg-zinc-950 dark:bg-linear-to-b dark:from-zinc-900 dark:via-zinc-900 dark:to-black dark:shadow-black/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Distribution
        </CardTitle>
        <PieChartIcon className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
      </CardHeader>
      
      <CardContent className="flex flex-1 flex-col items-center pb-6">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-50 w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={57}
              strokeWidth={5}
            >
              <Label
              className=""
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 7}
                          className="dark:fill-white fill-black text-[17px] font-bold"
                        >
                          Total
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 14}
                          className="dark:fill-white text-[17px] font-bold"
                        >
                          Activities
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4 px-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: item.fill }}
              />
              <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {item.name}
              </span>
              <span className="ml-auto font-semibold text-zinc-500">
                {calcPercentage(item.value, totalActivities)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}