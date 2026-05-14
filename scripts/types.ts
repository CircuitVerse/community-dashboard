export type RawActivity = {
    type: "PR opened" | "PR merged" | "Issue opened" | "Review submitted" | "Issue labeled" | "Issue assigned" | "Issue closed";
    occured_at: string;
    title?: string | null;
    link?: string | null;
    points: number;
};

export type DailyActivity = {
    date: string;
    count: number;
    points: number;
};

export type Contributor = {
    username: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    total_points: number;
    activity_breakdown: Record<string, { count: number; points: number }>;
    daily_activity: DailyActivity[];
    raw_activities: RawActivity[];
};

/**
 * 👇 REQUIRED BY lib/db.ts & FRONTEND
 */
export type UserEntry = {
    username: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    total_points: number;
    activity_breakdown: Record<string, { count: number; points: number }>;
    daily_activity: DailyActivity[];
    activities?: RawActivity[];
};

export interface GitHubSearchItem {
    user: { login: string; name?: string | null; avatar_url?: string | null; type?: string };
    title: string;
    html_url: string;
    created_at: string;
    closed_at?: string | null;
}

export interface YearData {
    period: string;
    updatedAt: number;
    startDate?: string;
    endDate?: string;
    entries: Contributor[];
}

export interface RecentActivityItem {
    username: string;
    name: string | null;
    title: string | null;
    link: string | null;
    avatar_url: string | null;
    type?: string;
    date?: string;
    points?: number;
}

export interface RepoStats {
    name: string;
    description: string | null;
    language: string | null;
    avatar_url: string;
    html_url: string;
    stars: number;
    forks: number;
    current: {
        pr_opened: number;
        pr_merged: number;
        issue_created: number;
        currentTotalContribution: number;
    };
    previous: {
        pr_merged: number;
    };
    growth: {
        pr_merged: number;
    };
};

export interface ExistingYearData {
    period: string;
    updatedAt: number;
    lastFetchedAt?: number;
    startDate?: string;
    endDate?: string;
    entries: Contributor[];
}
