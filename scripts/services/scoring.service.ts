import { RawActivity, Contributor } from "../types";
import { coreTeamMembers, alumniMembers } from "../../lib/team-data";

// Create sets for fast lookup
const CORE_TEAM_USERNAMES = new Set(coreTeamMembers.map(m => m.username.toLowerCase()));
const ALUMNI_USERNAMES = new Set(alumniMembers.map(m => m.username.toLowerCase()));

export const POINTS = {
    "PR opened": 2,
    "PR merged": 5,
    "Issue opened": 1,
    "Review submitted": 4,
    "Issue labeled": 2,
    "Issue assigned": 2,
    "Issue closed": 1,
} as const;

export class ScoringEngine {

    static ensureUser(
        map: Map<string, Contributor>,
        user: { login: string; name?: string | null; avatar_url?: string | null }
    ): Contributor {
        if (!map.has(user.login)) {
            // Determine role based on team membership
            const usernameLower = user.login.toLowerCase();
            let role = "Contributor";
            if (CORE_TEAM_USERNAMES.has(usernameLower)) {
                role = "Maintainer";
            } else if (ALUMNI_USERNAMES.has(usernameLower)) {
                role = "Alumni";
            }

            map.set(user.login, {
                username: user.login,
                name: user.name ?? null,
                avatar_url: user.avatar_url ?? null,
                role,
                total_points: 0,
                activity_breakdown: {},
                daily_activity: [],
                raw_activities: [],
            });
        }
        return map.get(user.login)!;
    }

    static sanitizeTitle(title?: string | null) {
        if (!title) return null;
        return title
            .replace(/\[|\]/g, "")
            .replace(/:/g, " - ")
            .replace(/\s+/g, " ")
            .trim();
    }

    static addActivity(
        entry: Contributor,
        type: RawActivity["type"],
        date: string,
        points: number,
        meta?: { title?: string; link?: string }
    ) {
        const day = date.split("T")[0]!;

        entry.total_points += points;

        entry.activity_breakdown[type] ??= { count: 0, points: 0 };
        entry.activity_breakdown[type].count += 1;
        entry.activity_breakdown[type].points += points;

        const existing = entry.daily_activity.find((d) => d.date === day);
        if (existing) {
            existing.count += 1;
            existing.points += points;
        } else {
            entry.daily_activity.push({ date: day, count: 1, points });
        }

        entry.raw_activities.push({
            type,
            occured_at: date,
            title: this.sanitizeTitle(meta?.title),
            link: meta?.link ?? null,
            points,
        });
    }

    static deduplicateAndRecalculate(users: Map<string, Contributor>) {
        for (const user of users.values()) {
            // Deduplicate raw_activities by unique key
            const seen = new Set<string>();
            user.raw_activities = user.raw_activities.filter(act => {
                const key = `${act.type}:${act.occured_at}:${act.link ?? act.title}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Recalculate totals from deduplicated activities
            user.total_points = 0;
            user.activity_breakdown = {};
            user.daily_activity = [];

            const dailyMap = new Map<string, { count: number; points: number }>();

            for (const act of user.raw_activities) {
                // Update total points
                user.total_points += act.points;

                // Update activity breakdown
                if (!user.activity_breakdown[act.type]) {
                    user.activity_breakdown[act.type] = { count: 0, points: 0 };
                }
                const breakdown = user.activity_breakdown[act.type]!;
                breakdown.count++;
                breakdown.points += act.points;

                // Update daily activity
                const day = act.occured_at.slice(0, 10);
                if (!dailyMap.has(day)) {
                    dailyMap.set(day, { count: 0, points: 0 });
                }
                const d = dailyMap.get(day)!;
                d.count++;
                d.points += act.points;
            }

            // Convert daily map to array
            user.daily_activity = [...dailyMap.entries()]
                .map(([date, d]) => ({ date, count: d.count, points: d.points }))
                .sort((a, b) => b.date.localeCompare(a.date));
        }
    }
}
