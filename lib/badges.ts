export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  color: string;
  category: "streak" | "points" | "special";
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  // Streak Badges
  "streak_5": {
    slug: "streak_5",
    name: "Consistency Starter",
    description: "Maintained a 5-day contribution streak",
    icon: "🔥",
    color: "from-orange-400 to-red-500",
    category: "streak",
  },
  "streak_10": {
    slug: "streak_10",
    name: "Regular Contributor",
    description: "Maintained a 10-day contribution streak",
    icon: "⚡",
    color: "from-blue-400 to-indigo-600",
    category: "streak",
  },
  "streak_30": {
    slug: "streak_30",
    name: "Streak Master",
    description: "Maintained a 30-day contribution streak",
    icon: "👑",
    color: "from-yellow-400 to-amber-600",
    category: "streak",
  },

  // Point Badges
  "points_100": {
    slug: "points_100",
    name: "Century Club",
    description: "Earned more than 100 points",
    icon: "💯",
    color: "from-green-400 to-emerald-600",
    category: "points",
  },
  "points_500": {
    slug: "points_500",
    name: "High Achiever",
    description: "Earned more than 500 points",
    icon: "🚀",
    color: "from-purple-400 to-violet-600",
    category: "points",
  },

  // Special Badges
  "core_team": {
    slug: "core_team",
    name: "Core Team",
    description: "Official CircuitVerse Core Team Member",
    icon: "🛡️",
    color: "from-red-500 to-rose-700",
    category: "special",
  },
  "woc_5": {
    slug: "woc_5",
    name: "WoC 5.0",
    description: "Selected for Winter of Code 5.0",
    icon: "❄️",
    color: "from-cyan-400 to-blue-500",
    category: "special",
  },
};

export function getContributorBadges(contributor: any) {
  const badges: BadgeDefinition[] = [];

  const addBadge = (slug: string) => {
    const badge = BADGE_DEFINITIONS[slug];
    if (badge) badges.push(badge);
  };

  // Streak logic
  const currentStreak = contributor.current_streak || 0;
  const longestStreak = contributor.longest_streak || 0;
  const maxStreak = Math.max(currentStreak, longestStreak);

  if (maxStreak >= 30) addBadge("streak_30");
  else if (maxStreak >= 10) addBadge("streak_10");
  else if (maxStreak >= 5) addBadge("streak_5");

  // Points logic
  const totalPoints = contributor.total_points || 0;
  if (totalPoints >= 500) addBadge("points_500");
  else if (totalPoints >= 100) addBadge("points_100");

  // Special logic
  if (contributor.role === "Core Team") {
    addBadge("core_team");
  }

  // Manually add WoC 5.0 for the user
  if (contributor.username === "vivekyadav1207vy" || contributor.username === "vivekyadav-3") {
    addBadge("woc_5");
  }

  return badges;
}
