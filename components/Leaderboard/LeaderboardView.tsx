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
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Medal,
  Trophy,
  GitMerge,
  GitPullRequest,
  AlertCircle,
  Search, Grid3X3, List,
  SearchX,
  Eye,
  Tag,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { sortEntries, type SortBy } from "@/lib/leaderboard";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LeaderboardCard, type LeaderboardEntry } from "./LeaderboardCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
const activityStyles: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  "PR merged": {
    icon: GitMerge,
    bgColor: "bg-purple-500/10 dark:bg-purple-500/15",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-l-purple-500"
  },
  "PR opened": {
    icon: GitPullRequest,
    bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-l-blue-500"
  },
  "Issue opened": {
    icon: AlertCircle,
    bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-l-orange-500"
  },
  "Issue closed": {
    icon: CheckCircle,
    bgColor: "bg-green-500/10 dark:bg-green-500/15",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-l-green-500"
  },
  "Issue labeled": {
    icon: Tag,
    bgColor: "bg-pink-500/10 dark:bg-pink-500/15",
    textColor: "text-pink-700 dark:text-pink-400",
    borderColor: "border-l-pink-500"
  },
  "Review submitted": {
    icon: Eye,
    bgColor: "bg-teal-500/10 dark:bg-teal-500/15",
    textColor: "text-teal-700 dark:text-teal-400",
    borderColor: "border-l-teal-500"
  }
};

const getActivityStyle = (activityName: string) => {
  return activityStyles[activityName] || {
    icon: () => null,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-l-gray-400"
  };
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


  // Page size state - default to showing top 50 for better readability and performance
  const [pageSize, setPageSize] = useState<number>(() => {
    const limit = searchParams.get('limit');
    if (limit) {
      if (limit === 'all') {
        return Infinity;
      }
      const parsed = parseInt(limit, 10);
      if ([10, 25, 50, 100].includes(parsed)) {
        return parsed;
      }
    }
    // Default: show top 50 entries for better UX and performance
    return 50;
  });

  useEffect(() => {
    const limit = searchParams.get('limit');
    if (limit) {
      if (limit === 'all') {
        setPageSize(Infinity);
        return;
      }
      const parsed = parseInt(limit, 10);
      if ([10, 25, 50, 100].includes(parsed)) {
        setPageSize(parsed);
      } else {
        setPageSize(50);
      }
    } else {
      setPageSize(50);
    }
  }, [searchParams]);

  // Current page state - default to page 1
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const page = searchParams.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      return parsed > 0 ? parsed : 1;
    }
    return 1;
  });

  useEffect(() => {
    const page = searchParams.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      setCurrentPage(parsed > 0 ? parsed : 1);
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // sorting
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const s = searchParams.get('sort');
    if (s === 'pr_opened' || s === 'pr_merged' || s === 'issues' || s === 'reviews' || s === 'issue_closed' || s === 'issue_labeled')
      return s as SortBy;
    return 'points';
  });

  useEffect(() => {
    const s = searchParams.get('sort');
    setSortBy(s === 'pr_opened' || s === 'pr_merged' || s === 'issues' || s === 'reviews' || s === 'issue_closed' || s === 'issue_labeled' ? (s as SortBy) : 'points');
  }, [searchParams]);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const pathname = usePathname();

  // Initialize from URL param (works on server and client)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const v = searchParams.get("v");
    return v === "grid" ? "grid" : "list";
  });

  // On mobile/tablet, always force list mode after mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setViewMode("list");
    }
  }, []);

  // Sync with URL param changes (for desktop)
  useEffect(() => {
    const v = searchParams.get("v");
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setViewMode(v === "grid" ? "grid" : "list");
    }
  }, [searchParams]);
  const topRef = useRef<HTMLDivElement | null>(null);
  const scrollToLeaderboardTop = () => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    requestAnimationFrame(() => {
      if (!topRef.current) return;

      const rect = topRef.current.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const offset = 80;

      window.scrollTo({
        top: Math.max(absoluteTop - offset, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    // Prevent grid view on mobile/tablet
    if (typeof window !== "undefined" && window.innerWidth < 1024 && mode === "grid") {
      return;
    }
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "list") {
      params.delete("v");
    } else {
      params.set("v", mode);
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
  };

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
    // Filter by selectedRoles (same logic as filteredEntries, but no search filter)
    let entriesForRanking = entries;

    if (selectedRoles.size > 0) {
      entriesForRanking = entriesForRanking.filter(
        (entry) => entry.role && selectedRoles.has(entry.role)
      );
    }

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
    }
    catch (e) {
      console.error('Error sorting entries:', e);
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
        window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
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
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
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
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
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
      params.set("limit", "all");
      setPageSize(Infinity);
    } else {
      params.set("limit", newPageSize.toString());
      setPageSize(newPageSize);
    }
    // Reset to page 1 when page size changes
    params.delete("page");
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
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
    scrollToLeaderboardTop();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
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
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
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

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  return (
    <div ref={topRef} className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
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
                  lg:w-auto lg:ml-auto
                  flex flex-col
                  lg:flex-row lg:items-center
                  gap-2
                "
              >
                {/* Search bar - full width on mobile/tablet */}
                <div className="relative w-full lg:w-[16rem]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search contributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-full bg-white dark:bg-[#07170f] border border-[#50B78B]/60 dark:border-[#50B78B]/40 focus-visible:ring-2 focus-visible:ring-[#50B78B]"
                  />
                </div>

                {/* Controls row - grid/list on left, filter on right */}
                <div className="flex items-center justify-between w-full lg:w-auto lg:justify-end gap-2">
                  <div className="flex items-center gap-2">
                    {/* Hide grid/list toggle on mobile/tablet, show only on desktop */}
                    <div className="hidden lg:flex w-fit items-center justify-center gap-1 p-1 bg-muted rounded-lg">
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleViewModeChange("list")}
                        className={cn(
                          "h-8 px-3",
                          viewMode === "list"
                            ? "bg-[#50B78B] hover:bg-[#50B78B]/90 text-white"
                            : "hover:bg-[#50B78B]/10 text-muted-foreground"
                        )}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleViewModeChange("grid")}
                        className={cn(
                          "h-8 px-3",
                          viewMode === "grid"
                            ? "bg-[#50B78B] hover:bg-[#50B78B]/90 text-white"
                            : "hover:bg-[#50B78B]/10 text-muted-foreground"
                        )}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="hidden md:flex">
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
                                : sortBy === "issue_closed"
                                    ? "Issue Closed"
                                    : sortBy === "issue_labeled"
                                      ? "Issue Labeled"
                                      : sortBy === "reviews"
                                        ? "Review Submitted"
                                        : "Issue Opened"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                        className="w-64 bg-white dark:bg-[#07170f] border-[#50B78B]/20"
                      >
                        <div className="space-y-4">
                          {/* Sort By Section */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 text-foreground">
                              Sort By
                            </h4>
                            <div className="space-y-1">
                              {[
                                { key: 'points' as SortBy, label: 'Total Points' },
                                { key: 'pr_opened' as SortBy, label: 'PRs Opened' },
                                { key: 'pr_merged' as SortBy, label: 'PRs Merged' },
                                { key: 'issues' as SortBy, label: 'Issue Opened' },
                                { key: 'issue_closed' as SortBy, label: 'Issue Closed' },
                                { key: 'issue_labeled' as SortBy, label: 'Issue Labeled' },
                                { key: 'reviews' as SortBy, label: 'Review Submitted' },
                              ].map((opt) => {
                                const active = sortBy === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={(e) => {
                                      setPopoverOpen(false);
                                      setSortBy(opt.key as SortBy);
                                      const params = new URLSearchParams(searchParams.toString());
                                      if (opt.key === 'points') {
                                        params.delete('sort');
                                        params.delete('order');
                                      } else {
                                        params.set('sort', opt.key);
                                        params.set('order', 'desc');
                                      }
                                      params.delete('page');
                                      setCurrentPage(1);
                                      if (typeof window !== 'undefined')
                                        window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
                                    }}
                                    className={cn(
                                      'w-full text-left px-3 py-2 cursor-pointer rounded-md text-sm font-medium transition-all',
                                      active
                                        ? 'bg-[#50B78B] text-white shadow-sm'
                                        : 'hover:bg-[#50B78B]/10 text-foreground'
                                    )}
                                    aria-pressed={active}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-border" />

                          {/* Role Section */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 text-foreground">
                              Role
                            </h4>
                            <div className="space-y-2">
                              {availableRoles.map((role) => (
                                <label
                                  key={role}
                                  htmlFor={`role-${role}`}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group",
                                    selectedRoles.has(role)
                                      ? "bg-[#50B78B]/10 border border-[#50B78B]/30 shadow-sm"
                                      : "bg-muted/30 hover:bg-muted/60 border border-transparent"
                                  )}
                                >
                                  <Checkbox
                                    id={`role-${role}`}
                                    checked={selectedRoles.has(role)}
                                    onCheckedChange={() => toggleRole(role)}
                                    className={cn(
                                      "data-[state=checked]:bg-[#50B78B] data-[state=checked]:border-[#50B78B] border-2",
                                      "transition-all duration-200"
                                    )}
                                  />
                                  <span className={cn(
                                    "text-sm font-medium flex-1 transition-colors",
                                    selectedRoles.has(role)
                                      ? "text-[#50B78B]"
                                      : "text-foreground group-hover:text-[#50B78B]"
                                  )}>
                                    {role}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b">
            <div className="flex gap-2">
              {(["week", "month", "year"] as const).map((p) => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("page");
                const href = `/leaderboard/${p}${params.toString() ? `?${params.toString()}` : ''}`;
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
              <label htmlFor="page-size-select" className="text-sm text-muted-foreground whitespace-nowrap">
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

          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
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
                {(searchQuery || selectedRoles.size > 0 || sortBy !== "points") && (
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
            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 items-stretch"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 lg:space-y-4 lg:block items-stretch"
            )}>
              {paginatedEntries.map((entry, index) => {
                // Use the pre-computed rank from entryRanks, which is based on full sorted list
                // This ensures rank doesn't change with search or pagination
                const rank = entryRanks.get(entry.username) || 1;
                return (
                  <LeaderboardCard
                    key={entry.username}
                    entry={entry}
                    rank={rank}
                    startDate={startDate}
                    endDate={endDate}
                    variant={viewMode === "grid" ? "grid" : "list"}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pageSize !== Infinity && totalPages > 1 && filteredEntries.length > 0 && (
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
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                          …
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={cn(
                          "h-9 w-9 p-0",
                          currentPage === pageNum
                            ? "bg-[#50B78B] text-white hover:bg-[#50B78B]/90"
                            : "hover:bg-[#50B78B]/20 hover:text-[#50B78B]"
                        )}
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={currentPage === pageNum ? "page" : undefined}
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
                          <div className={cn(
                            "px-4 py-2.5 border-b border-l-4",
                            style.bgColor,
                            style.borderColor
                          )}>
                            <h3 className={cn("font-semibold text-sm", style.textColor)}>
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
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                    <span>{contributor.count} {contributor.count === 1 ? "activity" : "activities"}</span>
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