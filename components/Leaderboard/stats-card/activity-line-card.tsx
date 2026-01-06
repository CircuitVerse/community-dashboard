"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/* -------------------------------------------------------------------------- */
/*                               Types                                        */
/* -------------------------------------------------------------------------- */

interface ChartDataItem {
  week: string;
  value: number;
  isPeak: boolean;
}

interface CustomPeakLabelProps {
  x?: number;
  y?: number;
  index?: number;
  chartData?: ChartDataItem[];
  color?: string;
}

/* -------------------------------------------------------------------------- */
/*                        Custom Peak Label                                   */
/* -------------------------------------------------------------------------- */

const CustomPeakLabel = ({
  x,
  y,
  index,
  chartData,
  color = "#50B78B",
}: CustomPeakLabelProps) => {
  if (
    x == null ||
    y == null ||
    index == null ||
    !chartData ||
    !chartData[index]
  ) {
    return null;
  }

  const isPeak = chartData[index].isPeak;
  if (!isPeak) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x={-20}
        y={-35}
        width={40}
        height={24}
        rx={4}
        fill={color}
      />
      <polygon
        points="0,0 -6,-8 6,-8"
        fill={color}
        transform="translate(0, -5)"
      />
      <text
        x={0}
        y={-20}
        textAnchor="middle"
        fill="black"
        fontSize={12}
        fontWeight="bold"
      >
        High
      </text>
      <circle
        cx={0}
        cy={0}
        r={4}
        fill="white"
        stroke={color}
        strokeWidth={2}
      />
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Chart Config                                 */
/* -------------------------------------------------------------------------- */

const chartConfig = {
  value: {
    label: "Activities",
    color: "#50B78B",
  },
} satisfies ChartConfig;

/* -------------------------------------------------------------------------- */
/*                              Props                                         */
/* -------------------------------------------------------------------------- */

interface ActivityLineCardProps {
  totalActivitiesLabel?: number;
  prev_month?: number;
  week1?: number;
  week2?: number;
  week3?: number;
  week4?: number;
}

/* -------------------------------------------------------------------------- */
/*                           Component                                        */
/* -------------------------------------------------------------------------- */

export function ActivityLineCard({
  totalActivitiesLabel = 0,
  prev_month = 0,
  week1 = 0,
  week2 = 0,
  week3 = 0,
  week4 = 0,
}: ActivityLineCardProps) {
  const formattedTotal = new Intl.NumberFormat("en-US").format(
    totalActivitiesLabel
  );

  const maxValue = Math.max(week1, week2, week3, week4);

  const chartData: ChartDataItem[] = useMemo(
    () => [
      { week: "1st", value: week1, isPeak: week1 === maxValue },
      { week: "2nd", value: week2, isPeak: week2 === maxValue },
      { week: "3rd", value: week3, isPeak: week3 === maxValue },
      { week: "4th", value: week4, isPeak: week4 === maxValue },
    ],
    [week1, week2, week3, week4, maxValue]
  );

  let momChange: number | null = null;

  if (prev_month > 0) {
    momChange =
      (totalActivitiesLabel - prev_month) / prev_month;
  }

  const isUp = momChange !== null && momChange > 0;
  const isDown = momChange !== null && momChange < 0;

  let changeLabel: string;

  if (prev_month === 0) {
    changeLabel = "New";
  } else if (prev_month < 100) {
    changeLabel = `${(momChange! + 1).toFixed(1)}×`;
  } else {
    changeLabel = `${(momChange! * 100).toFixed(1)}%`;
  }

  return (
    <Card className="rounded-[20px] border-zinc-200 dark:border-white/10 bg-white dark:bg-linear-to-b dark:from-zinc-900 dark:via-zinc-900 dark:to-black shadow-xl shadow-[#edfff7] dark:shadow-black/50 overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#50B78B] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              Total Activities
            </CardTitle>
            <div className="mt-2 text-5xl font-bold tracking-tight text-[#50B78B] dark:text-white">
              {formattedTotal}
            </div>
            <CardDescription className="mt-2 text-sm font-medium">
              {prev_month === 0
                ? "New activity tracking started"
                : isUp
                ? "Activity up from last month"
                : isDown
                ? "Activity down from last month"
                : "Activity unchanged from last month"}
            </CardDescription>
          </div>

          <div className="flex flex-col items-end gap-4">
            <MoreHorizontal className="h-5 w-5 text-zinc-400" />
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                isUp
                  ? "bg-[#50B78B]/20 text-[#50B78B]"
                  : isDown
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-zinc-500/20 text-zinc-400"
              }`}
            >
              {isUp && (
                <ArrowUpRight className="mr-1 size-4" />
              )}
              {isDown && (
                <ArrowDownRight className="mr-1 size-4" />
              )}
              {changeLabel}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-50 w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 40, left: 12, right: 12, bottom: 4 }}
          >
            <defs>
              <linearGradient
                id="fillValue"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              strokeOpacity={0.1}
            />

            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 6)}
            />

            <ChartTooltip
              cursor={{
                stroke: "#a1a1aa",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={<ChartTooltipContent hideLabel />}
            />

            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              fillOpacity={0.4}
              stroke="none"
            />

            <Line
              dataKey="value"
              type="natural"
              stroke="var(--color-value)"
              strokeWidth={3}
              dot={false}
            >
              <LabelList
                dataKey="value"
                position="top"
                content={
                  <CustomPeakLabel
                    chartData={chartData}
                    color={chartConfig.value.color}
                  />
                }
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
