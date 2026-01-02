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

  // Sort chronologically
  const sortedDays = [...dailyActivity].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  // Calculate Longest Streak with gap detection
  sortedDays.forEach((day) => {
    if (!day) return;
    if (day.count > 0) {
      const currentDate = new Date(day.date);
      if (lastDate) {
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      lastDate = currentDate;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
  });

  // Calculate Current Streak (working backwards from today/yesterday)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  const reverseDays = [...sortedDays].reverse();
  let currentStreak = 0;
  let lastActiveIndex = -1;

  for (let i = 0; i < reverseDays.length; i++) {
    const day = reverseDays[i];
    if (day && day.count > 0 && (day.date === todayStr || day.date === yesterdayStr)) {
      lastActiveIndex = i;
      break;
    }
  }

  if (lastActiveIndex !== -1) {
    currentStreak = 1;
    for (let i = lastActiveIndex; i < reverseDays.length - 1; i++) {
      const currentDay = reverseDays[i];
      const nextDay = reverseDays[i + 1];
      
      if (!currentDay || !nextDay) break;

      const d1 = new Date(currentDay.date);
      const d2 = new Date(nextDay.date);
      const diffTime = Math.abs(d1.getTime() - d2.getTime());
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1 && nextDay.count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, longest: longestStreak };
}
