export interface DailyActivity {
  date: string;
  count: number;
  points: number;
}

/**
 * Calculates current and longest contribution streaks
 */
export function calculateStreaks(dailyActivity: DailyActivity[]) {
  if (!dailyActivity || dailyActivity.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Helper to parse YYYY-MM-DD to a UTC timestamp at midnight
  const getTimestamp = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Sort and filter for days with activity
  const activeDays = dailyActivity
    .filter(day => day.count > 0)
    .map(day => ({
      ...day,
      timestamp: getTimestamp(day.date)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (activeDays.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Calculate Longest Streak
  let longestStreak = 0;
  let tempStreak = 0;
  let lastTimestamp: number | null = null;

  activeDays.forEach((day) => {
    if (lastTimestamp !== null) {
      const diffDays = Math.round((day.timestamp - lastTimestamp) / MS_PER_DAY);

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
      // If diffDays is 0, it's the same day, don't increment or reset
    } else {
      tempStreak = 1;
    }
    lastTimestamp = day.timestamp;
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  });

  // Calculate Current Streak
  // We need to know what "today" and "yesterday" are in the same relative time
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayUTC = todayUTC - MS_PER_DAY;

  const lastDay = activeDays[activeDays.length - 1];
  let currentStreak = 0;

  // Only consider current if the last active day was today or yesterday
  if (lastDay.timestamp === todayUTC || lastDay.timestamp === yesterdayUTC) {
    currentStreak = 1;
    for (let i = activeDays.length - 1; i > 0; i--) {
      const current = activeDays[i].timestamp;
      const previous = activeDays[i - 1].timestamp;
      const diff = Math.round((current - previous) / MS_PER_DAY);

      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        break;
      }
      // diff === 0 handled implicitly (streak continues without incrementing count)
    }
  }

  return { current: currentStreak, longest: longestStreak };
}
