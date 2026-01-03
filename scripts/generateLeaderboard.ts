// scripts/generateLeaderboard.ts

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

/**
 * Shape expected by the leaderboard generator.
 * This is INTENTIONALLY decoupled from DB activity shape.
 */
export type LeaderboardActivity = {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  type: string;
  points: number;
  occured_at: string;
};

type ActivityBreakdown = Record<string, { count: number; points: number }>;

type DailyActivity = {
  date: string;
  count: number;
  points: number;
};

export type Contributor = {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: ActivityBreakdown;
  daily_activity: DailyActivity[];
};

/**
 * Public shape used by JSON / frontend consumers
 */
export type UserEntry = Contributor & {
  activities?: {
    type: string;
    title?: string | null;
    occured_at: string;
    link?: string | null;
    points: number;
  }[];
};

/* -------------------------------------------------------
   DB → LEADERBOARD MAPPER
------------------------------------------------------- */

export function mapDbActivityToLeaderboardActivity(
  dbActivity: {
    contributor: string;
    contributor_name: string | null;
    contributor_avatar_url: string | null;
    contributor_role: string | null;
    activity_definition: string;
    occured_at: string;
    points: number | null;
    title?: string | null;
    link?: string | null;
  }
): LeaderboardActivity {
  return {
    username: dbActivity.contributor,
    name: dbActivity.contributor_name,
    avatar_url: dbActivity.contributor_avatar_url ?? "",
    role: dbActivity.contributor_role ?? "Contributor",
    type: dbActivity.activity_definition,
    occured_at: dbActivity.occured_at,
    points: dbActivity.points ?? 0,
  };
}

/* -------------------------------------------------------
   NORMALIZE ACTIVITY LABEL
------------------------------------------------------- */

function normalizeActivityLabel(type: string): string | null {
  const t = type.toLowerCase();

  if (t === "pull_request_opened") return "PR opened";
  if (t === "pull_request_merged") return "PR merged";
  if (t.includes("issue")) return "Issue opened";
  if (t.includes("commit")) return "Commit";
  if (t.includes("star")) return "Star";

  return null;
}

/* -------------------------------------------------------
   SAFE BREAKDOWN MUTATION
------------------------------------------------------- */

function addToBreakdown(
  breakdown: ActivityBreakdown,
  label: string,
  points: number
) {
  breakdown[label] ??= { count: 0, points: 0 };
  breakdown[label].count += 1;
  breakdown[label].points += points;
}

/* -------------------------------------------------------
   MAIN LEADERBOARD GENERATOR (PURE)
------------------------------------------------------- */

export function generateLeaderboard(
  activities: LeaderboardActivity[]
): Contributor[] {
  const contributors: Record<string, Contributor> = {};

  for (const activity of activities) {
    if (!activity.username) continue;

    const contributor =
      contributors[activity.username] ??= {
        username: activity.username,
        name: activity.name ?? null,
        avatar_url: activity.avatar_url,
        role: activity.role,
        total_points: 0,
        activity_breakdown: {},
        daily_activity: [],
      };

    const label = normalizeActivityLabel(activity.type);
    if (!label) continue;

    addToBreakdown(
      contributor.activity_breakdown,
      label,
      activity.points
    );

    contributor.total_points += activity.points;

    // ---- DAILY ACTIVITY (SAFE DATE PARSING) ----
    const parsedDate = new Date(activity.occured_at);
    if (isNaN(parsedDate.getTime())) continue;

    const date = parsedDate.toISOString().slice(0, 10);

    let day = contributor.daily_activity.find(d => d.date === date);
    if (!day) {
      day = { date, count: 0, points: 0 };
      contributor.daily_activity.push(day);
    }

    day.count += 1;
    day.points += activity.points;
  }

  return Object.values(contributors);
}
