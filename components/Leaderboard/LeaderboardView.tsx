"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { Medal, Trophy, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { sortEntries, type SortBy } from "@/lib/leaderboard";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ActivityTrendChart from "../../components/Leaderboard/ActivityTrendChart";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type LeaderboardEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role?: string | null;

  total_points: number;

  activity_breakdown: Record<
    string,
    {
      count: number;
      points: number;
    }
  >;

  daily_activity?: Array<{
    date: string; // ISO string
    points: number;
    count: number;
  }>;
};

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  period: "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  topByActivity: Record<
    string,
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }>
  >;
  hiddenRoles: string[];
}

export default function LeaderboardView({
  entries,
  period,
  startDate,
  endDate,
  topByActivity,
  hiddenRoles,
}: LeaderboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search query state
  const [searchQuery, setSearchQuery] = useState("");

  // sorting
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const s = searchParams.get('sort');
    if(s === 'pr_opened' || s === 'pr_merged' || s === 'issues')
      return s as SortBy;
    return 'points';
  });

  useEffect(() => {
    const s = searchParams.get('sort');
    setSortBy(s === 'pr_opened' || s === 'pr_merged' || s === 'issues' ? (s as SortBy) : 'points');
  }, [searchParams]);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const pathname = usePathname();

  // Get selected roles from query params
  // If no roles are selected, default to all visible roles (excluding hidden ones)
  const selectedRoles = useMemo(() => {
    const rolesParam = searchParams.get("roles");
    if (rolesParam) {
      return new Set(rolesParam.split(","));
    }
    // Default: exclude hidden roles
    const allRoles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role && !hiddenRoles.includes(entry.role)) {
        allRoles.add(entry.role);
      }
    });
    return allRoles;
  }, [searchParams, entries, hiddenRoles]);

  // Get unique roles from entries
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role) {
        roles.add(entry.role);
      }
    });
    return Array.from(roles).sort();
  }, [entries]);

  // Filter entries by selected roles and search query
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by roles
    if (selectedRoles.size > 0) {
      filtered = filtered.filter(
        (entry) => entry.role && selectedRoles.has(entry.role)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        const name = (entry.name || entry.username).toLowerCase();
        const username = entry.username.toLowerCase();
        return name.includes(query) || username.includes(query);
      });
    }

    // applying sorting
    try{
      filtered = sortEntries(filtered, sortBy);
    } 
    catch(e){
      console.error('Error sorting entries:', e);
    }

    return filtered;
  }, [entries, selectedRoles, searchQuery, sortBy]);

  const toggleRole = (role: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    updateRolesParam(newSelected);
  };

  const clearFilters = () => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const params = new URLSearchParams(searchParams.toString());
  if(isMobile){
    setSearchQuery("");
    return;
  }
  params.delete("roles");
  params.delete("sort");
  params.delete("order");

  window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  setSearchQuery("");
  setSortBy("points");
};
 

  const updateRolesParam = (roles: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (roles.size > 0) {
      params.set("roles", Array.from(roles).join(","));
    } else {
      params.delete("roles");
    }
    if(typeof window !== 'undefined') window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  };

  // Filter top contributors by selected roles
  const filteredTopByActivity = useMemo(() => {
    if (selectedRoles.size === 0) {
      return topByActivity;
    }

    const filtered: typeof topByActivity = {};

    for (const [activityName, contributors] of Object.entries(topByActivity)) {
      const filteredContributors = contributors.filter((contributor) => {
        // Find the contributor in entries to get their role
        const entry = entries.find((e) => e.username === contributor.username);
        return entry?.role && selectedRoles.has(entry.role);
      });

      if (filteredContributors.length > 0) {
        filtered[activityName] = filteredContributors;
      }
    }

    return filtered;
  }, [topByActivity, selectedRoles, entries]);

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return (
        <Trophy className="h-6 w-6 text-[#FFD700]" aria-label="1st place" />
      );
    if (rank === 2)
      return (
        <Medal className="h-6 w-6 text-[#C0C0C0]" aria-label="2nd place" />
      );
    if (rank === 3)
      return (
        <Medal className="h-6 w-6 text-[#CD7F32]/70" aria-label="3rd place" />
      );
    return null;
  };

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
              <div className="min-w-0">
                <h1 className="text-4xl text-[#50B78B] font-bold mb-2">
                  {periodLabels[period]} Leaderboard
                </h1>
                <p className="text-muted-foreground">
                  {filteredEntries.length} of {entries.length} contributors
                  {(selectedRoles.size > 0 || searchQuery) && " (filtered)"}
                </p>
              </div>

              {/* Filters */}
              <div
                className="
                  w-full
                  md:w-auto md:ml-auto
                  flex flex-col
                  md:items-end
                  lg:flex-row lg:items-center
                  gap-2
                "
              >
                <div className="flex items-center gap-2 w-full md:justify-end">
                  <div className="relative w-full md:w-[16rem]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search contributors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 w-full bg-white dark:bg-[#07170f] border border-[#50B78B]/60 dark:border-[#50B78B]/40 focus-visible:ring-2 focus-visible:ring-[#50B78B]"
                    />
                  </div>

                  <div className="hidden sm:flex">
                    <button
                      type="button"
                      className="h-9 w-28 px-3 rounded-md bg-[#50B78B] text-white text-sm flex items-center justify-center gap-2"
                    >
                      <span>
                        {sortBy === "points"
                          ? "Total Points"
                          : sortBy === "pr_opened"
                          ? "PR Opened"
                          : sortBy === "pr_merged"
                          ? "PR Merged"
                          : "Issue Opened"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {(selectedRoles.size > 0 || searchQuery || sortBy !== "points") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-9 hover:bg-[#50B78B]/20 cursor-pointer"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}

                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border border-[#50B78B]/30 hover:bg-[#50B78B]/20 cursor-pointer"
                      >
                        <Filter className="h-4 w-4 mr-1.5" />
                        Filter
                        {selectedRoles.size > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[#50B78B] text-white">
                            {selectedRoles.size}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-56 bg-white dark:bg-[#07170f]"
                        >
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                              Sort By
                            </h4>
                            <div className="space-y-0.5">
                              {[
                                { key: 'points' as SortBy, label: 'Total Points' },
                                { key: 'pr_opened' as SortBy, label: 'PRs Opened' },
                                { key: 'pr_merged' as SortBy, label: 'PRs Merged' },
                                { key: 'issues' as SortBy, label: 'Issue Opened' },
                              ].map((opt) => {
                                const active = sortBy === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={(e) => {
                                      setPopoverOpen(false);
                                      setSortBy(opt.key as SortBy);
                                      const params = new URLSearchParams(searchParams.toString());
                                      if(opt.key === 'points'){
                                        params.delete('sort');
                                        params.delete('order');
                                        if(typeof window !== 'undefined') 
                                          window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
                                      }else{
                                        params.set('sort', opt.key);
                                        params.set('order', 'desc');
                                        if(typeof window !== 'undefined') 
                                          window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
                                      }
                                    }}
                                    className={cn('w-full text-left px-4 py-2 cursor-pointer rounded-md text-sm', active ? 'bg-[#50B78B] text-white' : 'hover:bg-muted')}
                                    aria-pressed={active}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>{opt.label}</div>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            <h4 className="font-medium text-sm">
                              Role
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto px-4">
                              {availableRoles.map((role) => (
                                <div
                                  key={role}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={role}
                                    checked={selectedRoles.has(role)}
                                    onCheckedChange={() => toggleRole(role)}
                                  />
                                  <label
                                    htmlFor={role}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {role}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-8 border-b">
            {(["week", "month", "year"] as const).map((p) => (
              <Link
                key={p}
                href={`/leaderboard/${p}`}
                className={cn(
                  "px-4 py-2 font-medium transition-colors border-b-2 relative outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/60 rounded-sm",
                  period === p
                    ? "border-[#50B78B] text-[#50B78B] bg-linear-to-t from-[#50B78B]/12 to-transparent dark:from-[#50B78B]/12"
                    : "border-transparent text-muted-foreground hover:text-[#50B78B]"
                )}
              >
                {periodLabels[p]}
              </Link>
            ))}
          </div>

          {/* Leaderboard */}
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {entries.length === 0
                  ? "No contributors with points in this period"
                  : "No contributors match the selected filters"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <Card
                    key={entry.username}
                    className={cn(
                      "transition-all hover:shadow-md",
                      isTopThree && "border-[#50B78B]/50"
                    )}
                  >
                    <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">

                        {/* Rank */}
                        <div className="flex items-center justify-center size-12 shrink-0">
                          {getRankIcon(rank) || (
                            <span className="text-2xl font-bold text-[#50B78B]">
                              {rank}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar className="size-14 shrink-0">
                          <AvatarImage
                            src={entry.avatar_url || undefined}
                            alt={entry.name || entry.username}
                          />
                          <AvatarFallback>
                            {(entry.name || entry.username)
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Contributor Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-semibold">
                              {entry.name || entry.username}
                            </h3>
                            {entry.role && (
                              <span className="text-xs px-2 py-1 rounded-full bg-[#50B78B]/10 text-[#50B78B]">
                                {entry.role}
                              </span>
                            )}
                          </div>

                          <a
                            href={`https://github.com/${entry.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-[#50B78B] transition-colors"
                          >
                            @{entry.username}
                          </a>

                          <div className="mb-3" />

                          {/* Activity Breakdown */}
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(entry.activity_breakdown)
                              .sort((a, b) => {
                                // Predefined priority order for consistent display across rows
                                const activityPriority: Record<string, number> = {
                                  "PR merged": 1,
                                  "PR opened": 2,
                                  "Issue opened": 3,
                                };
                                const priorityA = activityPriority[a[0]] ?? 99;
                                const priorityB = activityPriority[b[0]] ?? 99;
                                // Sort by priority first, then alphabetically for unknown activities
                                if (priorityA !== priorityB) {
                                  return priorityA - priorityB;
                                }
                                return a[0].localeCompare(b[0]);
                              })
                              .map(([activityName, data]) => (
                                <div
                                  key={activityName}
                                  className="text-xs bg-muted px-3 py-1 rounded-full"
                                >
                                  <span className="font-medium">
                                    {activityName}:
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {data.count}
                                  </span>
                                  {data.points > 0 && (
                                    <span className="text-[#50B78B] ml-1">
                                      (+{data.points})
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Total Points with Trend Chart */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="hidden sm:block">
                          {/* Activity Trend Chart */}
                          {entry.daily_activity &&
                            entry.daily_activity.length > 0 && (
                              <ActivityTrendChart
                                dailyActivity={entry.daily_activity}
                                startDate={startDate}
                                endDate={endDate}
                                mode="points"
                              />
                            )}</div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-[#50B78B]">
                              {entry.total_points}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              points
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Top Contributors by Activity */}
        {Object.keys(filteredTopByActivity).length > 0 && (
          <div className="hidden xl:block w-80 shrink-0">
            <div>
              <h2 className="text-xl font-bold mb-6">Top Contributors</h2>
              <div className="space-y-4">
                {Object.entries(filteredTopByActivity).map(
                  ([activityName, contributors]) => (
                    <Card key={activityName} className="overflow-hidden p-0">
                      <CardContent className="p-0">
                        <div className="bg-[#50B78B]/8 dark:bg-[#50B78B]/12 px-4 py-2.5 border-b">
                          <h3 className="font-semibold text-sm text-foreground">
                            {activityName}
                          </h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {contributors.map((contributor, index) => (
                            <Link
                              key={contributor.username}
                              href={`/${contributor.username}`}
                              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors group"
                            >
                              <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                {index === 0 && (
                                  <Trophy className="h-4 w-4 text-[#50B78B]" />
                                )}
                                {index === 1 && (
                                  <Medal className="h-4 w-4 text-zinc-400" />
                                )}
                                {index === 2 && (
                                  <Medal className="h-4 w-4 text-[#50B78B]/70" />
                                )}
                              </div>
                              <Avatar className="h-9 w-9 shrink-0 border">
                                <AvatarImage
                                  src={contributor.avatar_url || undefined}
                                  alt={contributor.name || contributor.username}
                                />
                                <AvatarFallback className="text-xs">
                                  {(contributor.name || contributor.username)
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-[#50B78B] transition-colors leading-tight">
                                  {contributor.name || contributor.username}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {contributor.count}{" "}
                                  {contributor.count === 1
                                    ? "activity"
                                    : "activities"}{" "}
                                  · {contributor.points} pts
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}  