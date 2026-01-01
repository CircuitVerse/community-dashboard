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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Medal,
  Trophy,
  GitMerge,
  GitPullRequest,
  AlertCircle,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { sortEntries, type SortBy } from "@/lib/leaderboard";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ActivityTrendChart from "../../components/Leaderboard/ActivityTrendChart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PointsInfoButton from "@/components/PointsInfoButton";

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
    date: string;
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

// Activity type styling configuration
const activityStyles: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  "PR merged": {
    icon: GitMerge,
    bgColor: "bg-purple-500/10 dark:bg-purple-500/15",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-l-purple-500",
  },
  "PR opened": {
    icon: GitPullRequest,
    bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-l-blue-500",
  },
  "Issue opened": {
    icon: AlertCircle,
    bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-l-orange-500",
  },
};

const getActivityStyle = (activityName: string) => {
  return (
    activityStyles[activityName] || {
      icon: () => null,
      bgColor: "bg-muted",
      textColor: "text-muted-foreground",
      borderColor: "border-l-gray-400",
    }
  );
};

function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
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

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Page size state - default to showing all entries (preserve existing behavior)
  const [pageSize, setPageSize] = useState<number>(() => {
    const limit = searchParams.get("limit");
    if (limit) {
      const parsed = parseInt(limit, 10);
      if ([10, 25, 50, 100].includes(parsed)) {
        return parsed;
      }
    }
    // Default: show all entries (preserve existing behavior)
    return Infinity;
  });

  useEffect(() => {
    const limit = searchParams.get("limit");
    if (limit) {
      const parsed = parseInt(limit, 10);
      if ([10, 25, 50, 100].includes(parsed)) {
        setPageSize(parsed);
      } else {
        setPageSize(Infinity);
      }
    } else {
      setPageSize(Infinity);
    }
  }, [searchParams]);

  // Current page state - default to page 1
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const page = searchParams.get("page");
    if (page) {
      const parsed = parseInt(page, 10);
      return parsed > 0 ? parsed : 1;
    }
    return 1;
  });

  useEffect(() => {
    const page = searchParams.get("page");
    if (page) {
      const parsed = parseInt(page, 10);
      setCurrentPage(parsed > 0 ? parsed : 1);
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // sorting
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const s = searchParams.get("sort");
    if (s === "pr_opened" || s === "pr_merged" || s === "issues")
      return s as SortBy;
    return "points";
  });

  useEffect(() => {
    const s = searchParams.get("sort");
    setSortBy(
      s === "pr_opened" || s === "pr_merged" || s === "issues"
        ? (s as SortBy)
        : "points"
    );
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
    const allRoles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role && !hiddenRoles.includes(entry.role)) {
        allRoles.add(entry.role);
      }
    });
    return allRoles;
  }, [searchParams, entries, hiddenRoles]);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role) {
        roles.add(entry.role);
      }
    });
    return Array.from(roles).sort();
  }, [entries]);

  // Calculate ranks based on current sort criteria
  // Rank is independent of search query and pagination
  // When role filtering is active, ranks are computed within the filtered subset
  const entryRanks = useMemo(() => {
    // Always filter by selectedRoles to exclude hidden roles
    const entriesForRanking = entries.filter(
      (entry) => entry.role && selectedRoles.has(entry.role)
    );

    // Sort by current sort criteria and calculate ranks
    const sorted = sortEntries(entriesForRanking, sortBy);
    const rankMap = new Map<string, number>();
    sorted.forEach((entry, index) => {
      rankMap.set(entry.username, index + 1);
    });
    return rankMap;
  }, [entries, selectedRoles, sortBy]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (selectedRoles.size > 0) {
      filtered = filtered.filter(
        (entry) => entry.role && selectedRoles.has(entry.role)
      );
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        const name = (entry.name || entry.username).toLowerCase();
        const username = entry.username.toLowerCase();
        return name.includes(query) || username.includes(query);
      });
    }

    // applying sorting
    try {
      filtered = sortEntries(filtered, sortBy);
    } catch (e) {
      console.error("Error sorting entries:", e);
    }

    return filtered;
  }, [entries, selectedRoles, debouncedSearchQuery, sortBy]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (pageSize === Infinity) {
      return 1; // Show all entries on one "page"
    }
    return Math.ceil(filteredEntries.length / pageSize);
  }, [filteredEntries.length, pageSize]);

  // Slice entries based on pageSize and currentPage
  const paginatedEntries = useMemo(() => {
    if (pageSize === Infinity) {
      return filteredEntries;
    }
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredEntries.slice(start, end);
  }, [filteredEntries, pageSize, currentPage]);

  // Reset to page 1 when pageSize changes or when filteredEntries change significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      setCurrentPage(1);

      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `${pathname}?${params.toString()}`
        );
      }
    }
  }, [
    debouncedSearchQuery,
    pageSize,
    totalPages,
    currentPage,
    searchParams,
    pathname,
  ]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1 && pageSize !== Infinity) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      setCurrentPage(1);
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `${pathname}?${params.toString()}`
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]); // Only reset when search query changes

  const toggleRole = (role: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    // Reset to page 1 when roles change
    const params = new URLSearchParams(searchParams.toString());
    if (newSelected.size > 0) {
      params.set("roles", Array.from(newSelected).join(","));
    } else {
      params.delete("roles");
    }
    params.delete("page"); // Reset pagination
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const params = new URLSearchParams(searchParams.toString());
    if (isMobile) {
      setSearchQuery("");
      return;
    }
    params.delete("roles");
    params.delete("sort");
    params.delete("order");
    // Reset to page 1 when clearing filters
    params.delete("page");
    setCurrentPage(1);
    // Note: We preserve the limit param when clearing filters

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    setSearchQuery("");
    setSortBy("points");
  };

  const updatePageSize = (newPageSize: number | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPageSize === "all" || newPageSize === Infinity) {
      params.delete("limit");
      setPageSize(Infinity);
    } else {
      params.set("limit", newPageSize.toString());
      setPageSize(newPageSize);
    }
    // Reset to page 1 when page size changes
    params.delete("page");
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
  };

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      updatePage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      updatePage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updatePage(page);
    }
  };

  const updateRolesParam = (roles: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (roles.size > 0) {
      params.set("roles", Array.from(roles).join(","));
    } else {
      params.delete("roles");
    }
    if (typeof window !== "undefined")
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const filteredTopByActivity = useMemo(() => {
    if (selectedRoles.size === 0) {
      return topByActivity;
    }

    const filtered: typeof topByActivity = {};

    for (const [activityName, contributors] of Object.entries(topByActivity)) {
      const filteredContributors = contributors.filter((contributor) => {
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-4xl font-bold text-[#50B78B] mb-2">
                  <span>{periodLabels[period]} Leaderboard</span>
                  <PointsInfoButton />
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
                  {(selectedRoles.size > 0 ||
                    searchQuery ||
                    sortBy !== "points") && (
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
                        <h4 className="font-medium text-sm">Sort By</h4>
                        <div className="space-y-0.5">
                          {[
                            { key: "points" as SortBy, label: "Total Points" },
                            { key: "pr_opened" as SortBy, label: "PRs Opened" },
                            { key: "pr_merged" as SortBy, label: "PRs Merged" },
                            { key: "issues" as SortBy, label: "Issue Opened" },
                          ].map((opt) => {
                            const active = sortBy === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={(e) => {
                                  setPopoverOpen(false);
                                  setSortBy(opt.key as SortBy);
                                  const params = new URLSearchParams(
                                    searchParams.toString()
                                  );
                                  if (opt.key === "points") {
                                    params.delete("sort");
                                    params.delete("order");
                                  } else {
                                    params.set("sort", opt.key);
                                    params.set("order", "desc");
                                  }
                                  // Reset to page 1 when sort changes
                                  params.delete("page");
                                  setCurrentPage(1);
                                  if (typeof window !== "undefined")
                                    window.history.replaceState(
                                      null,
                                      "",
                                      `${pathname}?${params.toString()}`
                                    );
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2 cursor-pointer rounded-md text-sm",
                                  active
                                    ? "bg-[#50B78B] text-white"
                                    : "hover:bg-muted"
                                )}
                                aria-pressed={active}
                              >
                                <div className="flex items-center justify-between">
                                  <div>{opt.label}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <h4 className="font-medium text-sm">Role</h4>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b">
            <div className="flex gap-2">
              {(["week", "month", "year"] as const).map((p) => {
                // Preserve query parameters when switching periods, but reset page to 1
                const params = new URLSearchParams(searchParams.toString());
                params.delete("page"); // Reset pagination when switching periods
                const href = `/leaderboard/${p}${
                  params.toString() ? `?${params.toString()}` : ""
                }`;
                return (
                  <Link
                    key={p}
                    href={href}
                    className={cn(
                      "px-4 py-2 font-medium transition-colors border-b-2 relative outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/60 rounded-sm",
                      period === p
                        ? "border-[#50B78B] text-[#50B78B] bg-linear-to-t from-[#50B78B]/12 to-transparent dark:from-[#50B78B]/12"
                        : "border-transparent text-muted-foreground hover:text-[#50B78B]"
                    )}
                  >
                    {periodLabels[p]}
                  </Link>
                );
              })}
            </div>

            {/* Entries per page selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="page-size-select"
                className="text-sm text-muted-foreground whitespace-nowrap"
              >
                Show
              </label>
              <Select
                value={pageSize === Infinity ? "all" : pageSize.toString()}
                onValueChange={(value) => {
                  if (value === "all") {
                    updatePageSize("all");
                  } else {
                    updatePageSize(parseInt(value, 10));
                  }
                }}
              >
                <SelectTrigger
                  id="page-size-select"
                  size="sm"
                  className="h-9 w-24 border border-[#50B78B]/30 hover:bg-[#50B78B]/20 focus-visible:ring-2 focus-visible:ring-[#50B78B]"
                  aria-label="Select number of entries per page"
                >
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Leaderboard - IMPROVED EMPTY STATE */}
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                {/* Improved Icon with circular background */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full bg-[#50B78B]/10 dark:bg-[#50B78B]/15" />
                  <div className="absolute inset-2 rounded-full bg-[#50B78B]/5 dark:bg-[#50B78B]/10 flex items-center justify-center">
                    <SearchX className="h-8 w-8 text-[#50B78B]/70" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  {entries.length === 0
                    ? "No contributors with points in this period"
                    : searchQuery
                    ? `No contributors matching "${searchQuery}"`
                    : "No contributors match the selected filters"}
                </p>
                {(searchQuery ||
                  selectedRoles.size > 0 ||
                  sortBy !== "points") && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-[#50B78B]/30 hover:bg-[#50B78B]/20 hover:text-[#50B78B]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedEntries.map((entry, index) => {
                // Use pre-calculated rank based on sort criteria (independent of search/pagination)
                const savedRank = entryRanks.get(entry.username);
                // Fallback: use position in filteredEntries (not pagination-dependent)
                const fallbackRank =
                  filteredEntries.findIndex(
                    (e) => e.username === entry.username
                  ) + 1;
                const rank = savedRank ?? fallbackRank;
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

                        {/* Avatar - NOW CLICKABLE */}
                        <a
                          href={`https://github.com/${entry.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <Avatar className="size-14 hover:ring-2 hover:ring-[#50B78B] transition-all cursor-pointer">
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
                        </a>

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

                          {/* Activity Breakdown - Enhanced with visual distinction */}
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(entry.activity_breakdown)
                              .sort((a, b) => {
                                const activityPriority: Record<string, number> =
                                  {
                                    "PR merged": 1,
                                    "PR opened": 2,
                                    "Issue opened": 3,
                                  };
                                const priorityA = activityPriority[a[0]] ?? 99;
                                const priorityB = activityPriority[b[0]] ?? 99;
                                if (priorityA !== priorityB) {
                                  return priorityA - priorityB;
                                }
                                return a[0].localeCompare(b[0]);
                              })
                              .map(([activityName, data]) => {
                                const style = getActivityStyle(activityName);
                                const IconComponent = style.icon;

                                return (
                                  <div
                                    key={activityName}
                                    className={cn(
                                      "relative text-xs px-3 py-1.5 rounded-md border-l-2 transition-all hover:shadow-sm",
                                      style.bgColor,
                                      style.borderColor
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {IconComponent && (
                                        <IconComponent
                                          className={cn(
                                            "w-3.5 h-3.5",
                                            style.textColor
                                          )}
                                        />
                                      )}
                                      <span
                                        className={cn(
                                          "font-semibold",
                                          style.textColor
                                        )}
                                      >
                                        {activityName}:
                                      </span>
                                      <span className="text-muted-foreground font-medium">
                                        {data.count}
                                      </span>
                                      {data.points > 0 && (
                                        <span
                                          className={cn(
                                            "ml-0.5 font-bold",
                                            style.textColor
                                          )}
                                        >
                                          (+{data.points})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Total Points with Trend Chart */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="hidden sm:block">
                            {entry.daily_activity &&
                              entry.daily_activity.length > 0 && (
                                <ActivityTrendChart
                                  dailyActivity={entry.daily_activity}
                                  startDate={startDate}
                                  endDate={endDate}
                                  mode="points"
                                />
                              )}
                          </div>
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

          {/* Pagination Controls */}
          {pageSize !== Infinity &&
            totalPages > 1 &&
            filteredEntries.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-9 border border-[#50B78B]/30 hover:bg-[#50B78B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {/* Calculate which page numbers to show */}
                  {(() => {
                    const pages: number[] = [];

                    if (totalPages <= 7) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);

                      if (currentPage <= 4) {
                        // Show first 5 pages, then ellipsis, then last
                        for (let i = 2; i <= 5; i++) {
                          pages.push(i);
                        }
                        pages.push(-1); // -1 represents ellipsis
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        // Show first, ellipsis, then last 5 pages
                        pages.push(-1); // -1 represents ellipsis
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Show first, ellipsis, current-1, current, current+1, ellipsis, last
                        pages.push(-1); // -1 represents ellipsis
                        pages.push(currentPage - 1);
                        pages.push(currentPage);
                        pages.push(currentPage + 1);
                        pages.push(-1); // -1 represents ellipsis
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((pageNum, idx) => {
                      if (pageNum === -1) {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-muted-foreground"
                          >
                            …
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "ghost"
                          }
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={cn(
                            "h-9 w-9 p-0",
                            currentPage === pageNum
                              ? "bg-[#50B78B] text-white hover:bg-[#50B78B]/90"
                              : "hover:bg-[#50B78B]/20 hover:text-[#50B78B]"
                          )}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={
                            currentPage === pageNum ? "page" : undefined
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    });
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-9 border border-[#50B78B]/30 hover:bg-[#50B78B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Go to next page"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next</span>
                </Button>
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
                  ([activityName, contributors]) => {
                    const style = getActivityStyle(activityName);

                    return (
                      <Card key={activityName} className="overflow-hidden p-0">
                        <CardContent className="p-0">
                          <div
                            className={cn(
                              "px-4 py-2.5 border-b border-l-4",
                              style.bgColor,
                              style.borderColor
                            )}
                          >
                            <h3
                              className={cn(
                                "font-semibold text-sm",
                                style.textColor
                              )}
                            >
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
                                    alt={
                                      contributor.name || contributor.username
                                    }
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
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                    <span>
                                      {contributor.count}{" "}
                                      {contributor.count === 1
                                        ? "activity"
                                        : "activities"}
                                    </span>
                                    <span>·</span>
                                    <span>{contributor.points} pts</span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
