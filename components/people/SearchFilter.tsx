"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  X,
  Trophy,
  Users,
  Calendar,
  Grid3X3,
  List,
  Activity,
} from "lucide-react";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
}

export interface FilterState {
  search: string;
  sortBy: "name" | "points" | "recent" | "activity";
  sortOrder: "asc" | "desc";
  minPoints: number;
  viewMode: "grid" | "list";
}

interface SearchFilterProps {
  contributors: ContributorEntry[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onViewModeChange: (viewMode: "grid" | "list") => void;
}

export function SearchFilter({
  contributors,
  filters,
  onFiltersChange,
  onViewModeChange,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFiltersCount = [
    filters.search,
    filters.minPoints > 0,
    filters.sortBy !== "points" || filters.sortOrder !== "desc",
  ].filter(Boolean).length;

  /* ---------------------------------------------------------------------- */
  /* FIX 1: remove `any`                                                     */
  /* ---------------------------------------------------------------------- */
  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      sortBy: "points",
      sortOrder: "desc",
      minPoints: 0,
      viewMode: filters.viewMode,
    });
  };

  const clearSearch = () => {
    handleFilterChange("search", "");
  };

  return (
    <div className="space-y-2 mt-4 mb-4">
      <Card className="shadow-sm">
        <CardContent className="px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contributors by name or username..."
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange("search", e.target.value)
                }
                className="pl-10 pr-10"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split("-") as [
                  FilterState["sortBy"],
                  FilterState["sortOrder"]
                ];
                onFiltersChange({
                  ...filters,
                  sortBy,
                  sortOrder,
                });
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points-desc">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Highest Points
                  </div>
                </SelectItem>
                <SelectItem value="points-asc">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Lowest Points
                  </div>
                </SelectItem>
                <SelectItem value="name-asc">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Name A-Z
                  </div>
                </SelectItem>
                <SelectItem value="name-desc">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Name Z-A
                  </div>
                </SelectItem>
                <SelectItem value="activity-desc">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Most Active
                  </div>
                </SelectItem>
                <SelectItem value="recent-desc">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Most Recent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-green-600 dark:bg-green-500 text-white"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Advanced Filters</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Minimum Points
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minPoints || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "minPoints",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Showing{" "}
                      {
                        contributors.filter(
                          (c) =>
                            c.total_points >= filters.minPoints
                        ).length
                      }{" "}
                      contributors
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex border rounded-lg p-1 bg-muted/20">
              <Button
                variant={
                  filters.viewMode === "grid"
                    ? "default"
                    : "ghost"
                }
                size="sm"
                onClick={() => {
                  handleFilterChange("viewMode", "grid");
                  onViewModeChange("grid");
                }}
                className="px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={
                  filters.viewMode === "list"
                    ? "default"
                    : "ghost"
                }
                size="sm"
                onClick={() => {
                  handleFilterChange("viewMode", "list");
                  onViewModeChange("list");
                }}
                className="px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search:&nbsp;
                  {`"${filters.search}"`}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleFilterChange("search", "")
                    }
                    className="h-auto w-auto p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.minPoints > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Min Points: {filters.minPoints}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleFilterChange("minPoints", 0)
                    }
                    className="h-auto w-auto p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
