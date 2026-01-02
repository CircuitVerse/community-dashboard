"use client";

import { ContributorCard } from "./ContributorCard";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
}

interface PeopleGridProps {
  contributors: ContributorEntry[];
  onContributorClick: (contributor: ContributorEntry) => void;
  viewMode?: 'grid' | 'list';
  loading?: boolean;
}

export function PeopleGrid({ 
  contributors, 
  onContributorClick, 
  viewMode = 'grid',
  loading = false 
}: PeopleGridProps) {
  if (loading) {
    return (
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
        : "space-y-4"}>
        {Array.from({ length: viewMode === 'grid' ? 15 : 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={`bg-muted rounded-lg p-4 ${
              viewMode === 'grid' ? 'space-y-3' : 'h-20'
            }`}>
              {viewMode === 'grid' ? (
                <>
                  <div className="w-20 h-20 bg-muted-foreground/20 rounded-full mx-auto" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto" />
                    <div className="h-6 bg-muted-foreground/20 rounded w-16 mx-auto" />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 h-full">
                  <div className="w-12 h-12 bg-muted-foreground/20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-1/3" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-1/4" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 opacity-20">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9L15.5 9L18 9L18 12.5C18 13.6 17.1 14.5 16 14.5S14 13.6 14 12.5V11L12.5 11L12.5 12.5C12.5 13.3 12.8 14 13.3 14.5C12.2 15.2 11 16.3 11 18H13C13 17.4 13.4 17 14 17H16C16.6 17 17 17.4 17 18H19C19 16.3 17.8 15.2 16.7 14.5C17.2 14 17.5 13.3 17.5 12.5L17.5 9.5L21 9ZM7.5 9C8.3 9 9 8.3 9 7.5S8.3 6 7.5 6 6 6.7 6 7.5 6.7 9 7.5 9ZM5.75 10.25C5.34 10.25 5 10.59 5 11V13C5 13.41 5.34 13.75 5.75 13.75S6.5 13.41 6.5 13V11C6.5 10.59 6.16 10.25 5.75 10.25ZM8.25 10.25C7.84 10.25 7.5 10.59 7.5 11V13C7.5 13.41 7.84 13.75 8.25 13.75S9 13.41 9 13V11C9 10.59 8.66 10.25 8.25 10.25Z"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-3 text-muted-foreground">No contributors found</h3>
        <p className="text-muted-foreground max-w-md mx-auto text-lg">
          No contributors match your current filters. Try adjusting your search or filter criteria to find more people.
        </p>
        <div className="mt-6 p-4 bg-muted/20 rounded-lg max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Try removing some filters or searching for a different term
          </p>
        </div>
      </div>
    );
  }

  const gridClasses = viewMode === 'grid' 
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
    : "space-y-4";

  return (
    <div className={gridClasses}>
      {contributors.map((contributor) => (
        <ContributorCard
          key={contributor.username}
          contributor={contributor}
          onClick={onContributorClick}
          variant={viewMode}
          showStats={true}
        />
      ))}
    </div>
  );
}