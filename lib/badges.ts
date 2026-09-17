export type BadgeVariant = "bronze" | "silver" | "gold";

export type EarnedBadge = {
  slug: string;
  name: string;
  variant: BadgeVariant;
};

// EOD Streak Thresholds (consecutive days with points > 0)
export const STREAK_THRESHOLDS = {
  BRONZE: 5,
  SILVER: 10,
  GOLD: 15,
} as const;
