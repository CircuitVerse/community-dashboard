import type { LeaderboardEntry } from "@/components/Leaderboard/LeaderboardView";

export type SortBy = 'points' | 'pr_opened' | 'pr_merged' | 'issues';

export function getActivityCount(entry: LeaderboardEntry, activityKey: string){
  return entry.activity_breakdown?.[activityKey]?.count || 0;
}

export function sortEntries( entries: LeaderboardEntry[], sortBy: SortBy){
  const sorted = [...entries].sort((a, b) => {
    let res = 0;
    if(sortBy === 'points'){
      res = (b.total_points || 0) - (a.total_points || 0);
    } else if(sortBy === 'pr_opened'){
      res = getActivityCount(b, 'PR opened') - getActivityCount(a, 'PR opened');
    } else if(sortBy === 'pr_merged'){
      res = getActivityCount(b, 'PR merged') - getActivityCount(a, 'PR merged');
    } else if(sortBy === 'issues'){
      res = getActivityCount(b, 'Issue opened') - getActivityCount(a, 'Issue opened');
    }

    if(res === 0){
      res = (b.total_points || 0) - (a.total_points || 0);
      if(res === 0) 
        res = a.username.localeCompare(b.username);
    }
    return res;
  });
  return sorted;
}
