import type { TeamMember } from "@/lib/team-data";

export interface ActivityItem {
  type: string;
  title: string;
  occured_at: string;
  link: string;
  points: number;
}

export interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
  activities?: ActivityItem[];
}

export interface ContributorListingEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  activeDays: number;
  hasRecentActivity: boolean;
}

export interface PeopleListingData {
  updatedAt: number;
  people: ContributorListingEntry[];
  coreTeam: TeamMember[];
  alumni: TeamMember[];
}

export interface PeopleData {
  updatedAt: number;
  people: ContributorEntry[];
  coreTeam: TeamMember[];
  alumni: TeamMember[];
}

export interface LeaderboardDataset {
  period?: string;
  updatedAt?: number;
  entries?: unknown[];
}
