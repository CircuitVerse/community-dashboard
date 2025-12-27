"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, TrendingUp, Activity } from "lucide-react";
import { PeopleStats } from "@/components/people/PeopleStats";
import { SearchFilter, FilterState } from "@/components/people/SearchFilter";
import { PeopleGrid } from "@/components/people/PeopleGrid";
import { ContributorDetail } from "@/components/people/ContributorDetail";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
  activities?: Array<{
    type: string;
    title: string;
    occured_at: string;
    link: string;
    points: number;
  }>;
}

interface ApiResponse {
  updatedAt: number;
  people: ContributorEntry[];
  stats?: {
    totalContributors: number;
    totalPoints: number;
    averagePoints: number;
    topRoles: [string, number][];
  };
}

type PeopleResponse = {
  updatedAt: number;
  people: any[];
};

async function fetchPeople(): Promise<PeopleResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const apiUrl = base ? `${base}/api/people` : "/api/people";

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) return { updatedAt: 0, people: [] };
    return res.json();
  } catch {
    return { updatedAt: 0, people: [] };
  }
}
export default function PeoplePage() {
  const [people, setPeople] = useState<ContributorEntry[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [selectedContributor, setSelectedContributor] = useState<ContributorEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sortBy: 'points',
    sortOrder: 'desc',
    minPoints: 0,
    viewMode: 'grid',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPeople();
        setPeople(data.people);
        setUpdatedAt(data.updatedAt);
      } catch (error) {
        console.error('Failed to load contributors:', error);
        setError('Failed to load contributors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredContributors = useMemo(() => {
    let filtered = [...people]; 

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name || c.username).toLowerCase().includes(searchLower) ||
        c.username.toLowerCase().includes(searchLower) ||
        c.role.toLowerCase().includes(searchLower)
      );
    }

    if (filters.minPoints > 0) {
      filtered = filtered.filter(c => c.total_points >= filters.minPoints);
    }

    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'name':
          compareValue = (a.name || a.username).localeCompare(b.name || b.username);
          break;
        case 'points':
          compareValue = a.total_points - b.total_points;
          break;
        case 'activity':
          const aActivityCount = Object.values(a.activity_breakdown || {}).reduce((sum, act) => sum + act.count, 0);
          const bActivityCount = Object.values(b.activity_breakdown || {}).reduce((sum, act) => sum + act.count, 0);
          compareValue = aActivityCount - bActivityCount;
          break;
        case 'recent':
          const aRecentActivity = Math.max(...(a.daily_activity?.map(d => new Date(d.date).getTime()) || [0]));
          const bRecentActivity = Math.max(...(b.daily_activity?.map(d => new Date(d.date).getTime()) || [0]));
          compareValue = aRecentActivity - bRecentActivity;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [people, filters]);

  const handleViewModeChange = (viewMode: 'grid' | 'list') => {
    setFilters(prev => ({ ...prev, viewMode }));
  };

  const handleContributorClick = (contributor: ContributorEntry) => {
    setSelectedContributor(contributor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selectedContributor) {
    return (
      <ContributorDetail 
        contributor={selectedContributor} 
        onBack={() => setSelectedContributor(null)} 
      />
    );
  }

  if (error) {
    return (
      <div className="mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="p-8 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-black dark:text-white">Our </span>
          <span className="text-[#42B883]">People</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          Meet the contributors who made CircuitVerse possible this year.
        </p>
        {updatedAt && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Updated {new Date(updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-20" />
                      <div className="h-6 bg-muted rounded w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 h-10 bg-muted rounded-lg" />
                <div className="w-48 h-10 bg-muted rounded-lg" />
                <div className="w-24 h-10 bg-muted rounded-lg" />
                <div className="w-20 h-10 bg-muted rounded-lg" />
              </div>
            </CardContent>
          </Card>

          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold mb-2">Loading Contributors</h3>
            <p className="text-muted-foreground">Fetching community data...</p>
          </div>
        </div>
      ) : (
        <>
          <PeopleStats 
          contributors={people} 
          onContributorClick={handleContributorClick}
        />

          <SearchFilter
            contributors={people}
            filters={filters}
            onFiltersChange={setFilters}
            onViewModeChange={handleViewModeChange}
          />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg font-medium">
                  {filteredContributors.length} of {people.length} contributors
                </span>
              </div>
              {filters.search && (
                <Badge variant="secondary" className="font-normal">
                  matching "{filters.search}"
                </Badge>
              )}
            </div>

            {filteredContributors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>
                  Sorted by {filters.sortBy} 
                  {filters.sortOrder === 'desc' ? ' (high to low)' : ' (low to high)'}
                </span>
              </div>
            )}
          </div>

          <PeopleGrid
            contributors={filteredContributors}
            onContributorClick={handleContributorClick}
            viewMode={filters.viewMode}
            loading={false}
          />
        </>
      )}
    </div>
  );
}
