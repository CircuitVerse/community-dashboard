import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";
import { useState } from "react";

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

export function GitHubHeatmap({ dailyActivity, className = "" }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  
  const activityMap = new Map(dailyActivity.map(day => [day.date, day]));

  const generateDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (!dateStr) continue;
      
      const activity = activityMap.get(dateStr);
      
      days.push({
        date: dateStr,
        count: activity?.count || 0,
        points: activity?.points || 0,
        dayOfWeek: date.getDay(),
        isToday: i === 0
      });
    }
    
    return days;
  };

  const days = generateDays();

  const maxActivity = Math.max(...dailyActivity.map(d => d.points), 1);

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
      'bg-muted/30 dark:bg-muted/20', // level 0
      'bg-green-200 dark:bg-green-900/40', // level 1
      'bg-green-400 dark:bg-green-700/60', // level 2
      'bg-green-600 dark:bg-green-500/80', // level 3
      'bg-green-700 dark:bg-green-400'  // level 4
    ];
    return colors[level];
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Group days into weeks (starting from Sunday)
  const weeks: Array<Array<typeof days[0]>> = [];
  let currentWeek: Array<typeof days[0]> = [];

  // Add empty days at the beginning if the first day is not Sunday
  const firstDay = days[0];
  if (firstDay && firstDay.dayOfWeek !== 0) {
    for (let i = 0; i < firstDay.dayOfWeek; i++) {
      currentWeek.push({
        date: '',
        count: 0,
        points: 0,
        dayOfWeek: i,
        isToday: false
      });
    }
  }

  days.forEach((day) => {
    currentWeek.push(day);
    
    if (day.dayOfWeek === 6 || day === days[days.length - 1]) {
      // Fill remaining slots if needed
      while (currentWeek.length < 7 && day === days[days.length - 1]) {
        currentWeek.push({
          date: '',
          count: 0,
          points: 0,
          dayOfWeek: currentWeek.length,
          isToday: false
        });
      }
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Get month labels for the timeline
  const getMonthPositions = (): Array<{ month: string; position: number }> => {
    const positions: Array<{ month: string; position: number }> = [];
    let currentMonth = -1;
    let lastPosition = -60; 
    
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find(day => day.date);
      if (firstDayOfWeek && firstDayOfWeek.date) {
        const date = new Date(firstDayOfWeek.date);
        const month = date.getMonth();
        const position = weekIndex * 15;
        
        if (month !== currentMonth && position > lastPosition + 40) { 
          positions.push({
            month: monthLabels[month] || '',
            position: position
          });
          currentMonth = month;
          lastPosition = position;
        }
      }
    });
    
    return positions;
  };

  const monthPositions = getMonthPositions();
  const totalContributions = dailyActivity.reduce((sum, day) => sum + day.count, 0);
  const currentYear = new Date().getFullYear();

  const handleMouseEnter = (day: any, event: React.MouseEvent<HTMLDivElement>) => {
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
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          Contribution Activity
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalContributions} contributions in {currentYear}
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
                <div key={i} className={`h-3 leading-3 ${i % 2 === 0 ? '' : 'opacity-0'}`}>
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1 shrink-0">
                  {week.map((day, dayIndex) => {
                    const level = day.date ? getContributionLevel(day.points) : 0;
                    const isEmpty = !day.date;
                    
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm border border-border/30 transition-all duration-200 hover:ring-2 hover:ring-primary hover:scale-110 cursor-pointer ${
                          isEmpty 
                            ? 'bg-transparent border-transparent' 
                            : getContributionColor(level)
                        } ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                        onMouseEnter={(e) => handleMouseEnter(day, e)}
                        onMouseLeave={handleMouseLeave}
                        title={day.date ? 
                          `${day.count} contributions on ${new Date(day.date).toLocaleDateString()}` : 
                          ''
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
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm border border-border/30 ${getContributionColor(level)}`}
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
            {new Date(tooltip.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short", 
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="text-muted-foreground">
            {tooltip.count} {tooltip.count === 1 ? "contribution" : "contributions"}
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