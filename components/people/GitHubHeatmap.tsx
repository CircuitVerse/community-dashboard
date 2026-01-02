import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";
import { useState, useMemo } from "react";

interface HeatmapProps {
  dailyActivity: Array<{ date: string; count: number; points: number }>;
  className?: string;
}

interface TooltipData {
  date: string;
  count: number;
  points: number;
  x: number;
  y: number;
}

// Helper to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function GitHubHeatmap({ dailyActivity, className = "" }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Helper to extract year from YYYY-MM-DD string without timezone issues
  const getYearFromDateStr = (dateStr: string): number => {
    const [year] = dateStr.split("-");
    return parseInt(year ?? "0", 10);
  };

  // Get available years from the activity data
  const availableYears = useMemo(() => {
    const years = new Set(dailyActivity.map((d) => getYearFromDateStr(d.date)));
    // Add current year if not present (for empty states)
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [dailyActivity]);

  // Default to the most recent year with data, or current year
  const [selectedYear, setSelectedYear] = useState(() => {
    if (dailyActivity.length === 0) return new Date().getFullYear();
    // Find the latest year in the activity data
    const years = dailyActivity.map((d) => getYearFromDateStr(d.date));
    return Math.max(...years);
  });

  // Filter activity for selected year
  const yearActivity = useMemo(() => {
    return dailyActivity.filter((d) => {
      return getYearFromDateStr(d.date) === selectedYear;
    });
  }, [dailyActivity, selectedYear]);

  const activityMap = useMemo(() => {
    return new Map(yearActivity.map((day) => [day.date, day]));
  }, [yearActivity]);

  // Generate days for the full calendar year (GitHub style - shows all 12 months)
  const generateDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateLocal(today);
    const currentYear = today.getFullYear();
    const isCurrentYear = selectedYear === currentYear;

    // Always show full year: Jan 1 to Dec 31
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = formatDateLocal(currentDate);
      const isFuture = isCurrentYear && currentDate > today;

      const activity = activityMap.get(dateStr);

      days.push({
        date: dateStr,
        count: activity?.count || 0,
        points: activity?.points || 0,
        dayOfWeek: currentDate.getDay(),
        isToday: isCurrentYear && dateStr === todayStr,
        isFuture: isFuture,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const days = generateDays();

  // Calculate max activity for the selected year's data
  const maxActivity = useMemo(() => {
    return Math.max(...yearActivity.map((d) => d.points), 1);
  }, [yearActivity]);

  const getContributionLevel = (points: number) => {
    if (points === 0) return 0;
    const intensity = points / maxActivity;
    if (intensity <= 0.25) return 1;
    if (intensity <= 0.5) return 2;
    if (intensity <= 0.75) return 3;
    return 4;
  };

  const getContributionColor = (level: number) => {
    const colors = [
      "bg-muted/30 dark:bg-muted/20", // level 0
      "bg-green-200 dark:bg-green-900/40", // level 1
      "bg-green-400 dark:bg-green-700/60", // level 2
      "bg-green-600 dark:bg-green-500/80", // level 3
      "bg-green-700 dark:bg-green-400", // level 4
    ];
    return colors[level];
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Group days into weeks (starting from Sunday)
  const weeks: Array<Array<(typeof days)[0]>> = [];
  let currentWeek: Array<(typeof days)[0]> = [];

  // Add empty days at the beginning if the first day is not Sunday
  const firstDay = days[0];
  if (firstDay && firstDay.dayOfWeek !== 0) {
    for (let i = 0; i < firstDay.dayOfWeek; i++) {
      currentWeek.push({
        date: "",
        count: 0,
        points: 0,
        dayOfWeek: i,
        isToday: false,
        isFuture: false,
      });
    }
  }

  days.forEach((day) => {
    currentWeek.push(day);

    if (day.dayOfWeek === 6 || day === days[days.length - 1]) {
      // Fill remaining slots if needed (only for the last week)
      while (currentWeek.length < 7 && day === days[days.length - 1]) {
        currentWeek.push({
          date: "",
          count: 0,
          points: 0,
          dayOfWeek: currentWeek.length,
          isToday: false,
          isFuture: false,
        });
      }
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Get month labels for the timeline - hardcoded fixed positions for consistent alignment
  const getMonthPositions = (): Array<{ month: string; position: number }> => {
    const cellWidth = 15; // width per week column (12px cell + 3px gap)

    // Hardcoded positions: 53 weeks total, each month gets ~4.4 weeks
    // Positions: Jan=0, Feb=4, Mar=8, Apr=13, May=17, Jun=21, Jul=26, Aug=30, Sep=35, Oct=39, Nov=43, Dec=48
    const monthWeekPositions = [0, 4, 8, 13, 17, 21, 26, 30, 35, 39, 43, 48];

    return monthLabels.map((month, index) => ({
      month,
      position: (monthWeekPositions[index] ?? 0) * cellWidth,
    }));
  };

  const monthPositions = getMonthPositions();

  // Calculate total contributions for the selected year
  const totalContributions = yearActivity.reduce(
    (sum, day) => sum + day.count,
    0
  );

  const handleMouseEnter = (
    day: (typeof days)[0],
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!day.date) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      date: day.date,
      count: day.count,
      points: day.points,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Contribution Activity
          </CardTitle>
          {/* Year Switcher */}
          {availableYears.length > 1 && (
            <div className="flex items-center gap-1">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${
                    selectedYear === year
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {totalContributions} contributions in {selectedYear}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 overflow-x-auto">
          {/* Month labels */}
          <div className="relative h-4 min-w-195 sm:min-w-0 ml-8">
            {monthPositions.map((pos, i) => (
              <div
                key={i}
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${pos.position}px` }}
              >
                {pos.month}
              </div>
            ))}
          </div>

          {/* Day labels and heatmap */}
          <div className="flex gap-1 min-w-195 sm:min-w-0">
            {/* Day labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground w-8 shrink-0 justify-around">
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className={`h-3 leading-3 ${i % 2 === 0 ? "" : "opacity-0"}`}
                >
                  {i % 2 === 0 ? label : ""}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1 shrink-0">
                  {week.map((day, dayIndex) => {
                    const level =
                      day.date && !day.isFuture
                        ? getContributionLevel(day.points)
                        : 0;
                    const isEmpty = !day.date;
                    const isFuture = day.isFuture;

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm border border-border/30 transition-all duration-200 ${
                          isEmpty
                            ? "bg-transparent border-transparent"
                            : isFuture
                            ? "bg-muted/30 dark:bg-muted/20 cursor-default"
                            : `${getContributionColor(
                                level
                              )} hover:ring-2 hover:ring-primary hover:scale-110 cursor-pointer`
                        } ${
                          day.isToday
                            ? "ring-2 ring-blue-500 ring-offset-1"
                            : ""
                        }`}
                        onMouseEnter={(e) =>
                          !isFuture && handleMouseEnter(day, e)
                        }
                        onMouseLeave={handleMouseLeave}
                        title={
                          day.date && !isFuture
                            ? `${day.count} contributions on ${new Date(
                                day.date + "T00:00:00"
                              ).toLocaleDateString()}`
                            : ""
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm border border-border/30 ${getContributionColor(
                    level
                  )}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground border rounded-md shadow-lg px-3 py-2 text-sm pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold">
            {new Date(tooltip.date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="text-muted-foreground">
            {tooltip.count}{" "}
            {tooltip.count === 1 ? "contribution" : "contributions"}
          </div>
          {tooltip.points > 0 && (
            <div className="text-primary font-mono text-xs">
              +{tooltip.points} points
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
