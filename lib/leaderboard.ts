import type { LeaderboardEntry } from "@/components/Leaderboard/LeaderboardCard";

export type SortBy = 'points' | 'pr_opened' | 'pr_merged' | 'issues' | 'issue_closed' | 'issue_labeled'| 'reviews' ;

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
    } else if(sortBy === 'issue_closed'){
      res = getActivityCount(b, 'Issue closed') - getActivityCount(a, 'Issue closed');
    } else if(sortBy === 'issue_labeled'){
      res = getActivityCount(b, 'Issue labeled') - getActivityCount(a, 'Issue labeled');
    } else if(sortBy === 'reviews'){
      res = getActivityCount(b, 'Review submitted') - getActivityCount(a, 'Review submitted');
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

/**
 * Whether the `roles` query param actually narrows the leaderboard.
 *
 * With no param every visible role is selected, which is the default view, so
 * the role filter is only "active" once at least one visible role is left out.
 */
export function isRoleFilterActive(
  rolesParam: string | null,
  visibleRoles: Iterable<string>
): boolean {
  if (!rolesParam) return false;

  const selected = new Set(rolesParam.split(",").filter(Boolean));
  if (selected.size === 0) return false;

  for (const role of visibleRoles) {
    if (!selected.has(role)) return true;
  }
  return false;
}
