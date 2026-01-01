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
import { Medal, Trophy, Filter, X, Search, Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LeaderboardCard } from "./LeaderboardCard";

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
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
  };

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

    return filtered;
  }, [entries, selectedRoles, searchQuery]);

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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("roles");
    router.push(`?${params.toString()}`, { scroll: false });
    setSearchQuery("");
  };

  const updateRolesParam = (roles: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (roles.size > 0) {
      params.set("roles", Array.from(roles).join(","));
    } else {
      params.delete("roles");
    }
    router.push(`?${params.toString()}`, { scroll: false });
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

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
              <div className="min-w-0 text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">
                  <span className="text-black dark:text-white">{periodLabels[period]} </span>
                  <span className="text-[#42B883]">Leaderboard</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  Celebrating our amazing community contributors
                </p>
                <p className="text-sm text-muted-foreground">
                  {filteredEntries.length} of {entries.length} contributors
                  {(selectedRoles.size > 0 || searchQuery) && " (filtered)"}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                
              <div className="w-fit self-center sm:self-auto flex items-center justify-center gap-1 p-1 bg-muted rounded-lg">
                   <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("grid")}
                    className={cn(
                      "h-8 px-3",
                      viewMode === "grid" 
                        ? "bg-[#42B883] hover:bg-[#369970] text-white" 
                        : "hover:bg-[#42B883]/10 text-muted-foreground"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("list")}
                    className={cn(
                      "h-8 px-3",
                      viewMode === "list" 
                        ? "bg-[#42B883] hover:bg-[#369970] text-white" 
                        : "hover:bg-[#42B883]/10 text-muted-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                 
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:flex-1 sm:min-w-0 md:w-[16rem]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search contributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-9 h-9 w-full bg-white dark:bg-[#07170f] border border-[#42B883]/60 dark:border-[#42B883]/40 text-foreground dark:text-foreground shadow-sm dark:shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42B883] focus-visible:ring-offset-0 transition-colors",
                     "sm:w-full"
                    )}
                  />
                </div>

                {/* Role Filter */}
                {availableRoles.length > 0 && (
                  <>
                    <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:gap-2 justify-between sm:justify-start">
                      {(selectedRoles.size > 0 || searchQuery) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-9 shrink-0 hover:bg-[#42B883]/20 dark:hover:bg-[#42B883]/20 focus:border-[#42B883] focus-visible:ring-2 focus-visible:ring-[#42B883]/40 outline-none order-2 sm:order-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-[min(11rem,calc(100%-6rem))] px-1 has-[>svg]:px-1 sm:w-auto sm:px-3 sm:has-[>svg]:px-2.5 border border-[#42B883]/30 dark:border-[#42B883]/30 hover:bg-[#42B883]/20 dark:hover:bg-[#42B883]/20 focus:border-[#42B883] focus-visible:ring-2 focus-visible:ring-[#42B883]/40 outline-none min-w-0 order-1 sm:order-2"
                          >
                            <Filter className="h-4 w-4 mr-1.5 sm:mr-2" />
                            Role
                            {selectedRoles.size > 0 && (
                              <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[#42B883] text-white">
                                {selectedRoles.size}
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#07170f]"
                          align="end"
                        >
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">
                              Filter by Role
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
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
                  </>
                )}
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
                  "px-4 py-2 font-medium transition-colors border-b-2 relative outline-none focus-visible:ring-2 focus-visible:ring-[#42B883]/60 rounded-sm",
                  period === p
                    ? "border-[#42B883] text-[#42B883] bg-linear-to-t from-[#42B883]/12 to-transparent dark:from-[#42B883]/12"
                    : "border-transparent text-muted-foreground hover:text-[#42B883]"
                )}
              >
                {periodLabels[p]}
              </Link>
            ))}
          </div>

          {/* Leaderboard */}
          {filteredEntries.length === 0 ? (
            <Card className="border-[#42B883]/20">
              <CardContent className="py-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6 opacity-20">
                  <Trophy className="w-full h-full text-[#42B883]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-muted-foreground">
                  {entries.length === 0
                    ? "No contributors with points in this period"
                    : "No contributors match the selected filters"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {entries.length === 0
                    ? "Check back later as contributors start earning points through their activities."
                    : "Try adjusting your search or filter criteria to find more contributors."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              viewMode === "grid" 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" 
                : "space-y-4"
            )}>
              {filteredEntries.map((entry, index) => {
                const rank = index + 1;
                return (
                  <LeaderboardCard
                    key={entry.username}
                    entry={entry}
                    rank={rank}
                    startDate={startDate}
                    endDate={endDate}
                    variant={viewMode}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Top Contributors by Activity */}
        {Object.keys(filteredTopByActivity).length > 0 && (
          <div className="hidden xl:block w-80 shrink-0">
            <div>
              <h2 className="text-xl font-bold mb-6">
                <span className="text-black dark:text-white">Top </span>
                <span className="text-[#42B883]">Contributors</span>
              </h2>
              <div className="space-y-4">
                {Object.entries(filteredTopByActivity).map(
                  ([activityName, contributors]) => (
                    <Card key={activityName} className="overflow-hidden p-0 border-[#42B883]/20">
                      <CardContent className="p-0">
                        <div className="bg-[#42B883]/8 dark:bg-[#42B883]/12 px-4 py-2.5 border-b border-[#42B883]/20">
                          <h3 className="font-semibold text-sm text-foreground">
                            {activityName}
                          </h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {contributors.map((contributor, index) => (
                            <div
                              key={contributor.username}
                              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#42B883]/5 transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                {index === 0 && (
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                )}
                                {index === 1 && (
                                  <Medal className="h-4 w-4 text-gray-400" />
                                )}
                                {index === 2 && (
                                  <Medal className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                              <Avatar className="h-9 w-9 shrink-0 border border-[#42B883]/10">
                                <AvatarImage
                                  src={contributor.avatar_url || undefined}
                                  alt={contributor.name || contributor.username}
                                />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-[#42B883]/20 to-[#42B883]/10 text-[#42B883]">
                                  {(contributor.name || contributor.username)
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-[#42B883] transition-colors leading-tight">
                                  {contributor.name || contributor.username}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {contributor.count}{" "}
                                  {contributor.count === 1
                                    ? "activity"
                                    : "activities"}{" "}
                                  · <span className="font-semibold text-[#42B883]">{contributor.points} pts</span>
                                </p>
                              </div>
                            </div>
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