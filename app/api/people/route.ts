import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { coreTeamMembers, alumniMembers } from "@/lib/team-data";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
}

interface LeaderboardData {
  period: string;
  updatedAt: number;
  entries: ContributorEntry[];
}

export async function GET() {
  try {
    const publicPath = path.join(process.cwd(), 'public', 'leaderboard');
    
    const files = fs.readdirSync(publicPath).filter(file => file.endsWith('.json') && file !== 'recent-activities.json');
    
    const allContributors = new Map<string, ContributorEntry>();
    let latestUpdatedAt = 0;

    for (const file of files) {
      try {
        const filePath = path.join(publicPath, file);
        const data: LeaderboardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (data.updatedAt > latestUpdatedAt) {
          latestUpdatedAt = data.updatedAt;
        }

        for (const entry of data.entries || []) {
          // More precise bot filtering to avoid filtering legitimate users
          const username = entry.username.toLowerCase();
          const isBot = username.endsWith('[bot]') || 
                       username.endsWith('-bot') || 
                       username.endsWith('_bot') ||
                       username === 'dependabot' ||
                       username === 'renovate' ||
                       username === 'github-actions' ||
                       username.startsWith('renovate[') ||
                       username.startsWith('dependabot[');
          
          if (isBot) {
            continue;
          }

          const existing = allContributors.get(entry.username);
          if (!existing || entry.total_points > existing.total_points) {
            allContributors.set(entry.username, entry);
          }
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }

    const people = Array.from(allContributors.values())
      .sort((a, b) => b.total_points - a.total_points);

    return NextResponse.json({
      updatedAt: latestUpdatedAt,
      people,
      coreTeam: coreTeamMembers,
      alumni: alumniMembers
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    return NextResponse.json(
      { error: 'Failed to fetch people' },
      { status: 500 }
    );
  }
}