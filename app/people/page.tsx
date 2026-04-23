"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { PeopleStats } from "@/components/people/PeopleStats";
import { PeopleGrid } from "@/components/people/PeopleGrid";
import { ContributorDetail } from "@/components/people/ContributorDetail";
import { TeamSection } from "@/components/people/TeamSection";
import { type TeamMember } from "@/lib/team-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useScrollRestoration } from "@/lib/hooks/useScrollRestoration";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";




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

type PeopleResponse = {
  updatedAt: number;
  people: ContributorEntry[];
  coreTeam: TeamMember[];
  alumni: TeamMember[];
};

async function fetchPeople(): Promise<PeopleResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const apiUrl = base ? `${base}/api/people` : "/api/people";

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) return { updatedAt: 0, people: [], coreTeam: [], alumni: [] };
    return res.json();
  } catch {
    return { updatedAt: 0, people: [], coreTeam: [], alumni: [] };
  }
}
export default function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [people, setPeople] = useState<ContributorEntry[]>([]);
  const [coreTeam, setCoreTeam] = useState<TeamMember[]>([]);
  const [alumni, setAlumni] = useState<TeamMember[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<ContributorEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(() => {
    const limit = searchParams.get('limit');
    if (limit) {
      if (limit === 'all') {
        return Infinity;
      }
      const parsed = parseInt(limit, 10);
      if ([12, 24, 48, 96].includes(parsed)) {
        return parsed;
      }
    }
    return 24; // Default page size
  });

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const page = searchParams.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      return parsed > 0 ? parsed : 1;
    }
    return 1;
  });

  // Use scroll restoration hook - active when no contributor is selected (list view)
  const { saveScrollPosition } = useScrollRestoration({ isActive: !selectedContributor });

  // Pagination helper functions
  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    setCurrentPage(page);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPeople();
        setPeople(data.people);
        setCoreTeam(data.coreTeam || []);
        setAlumni(data.alumni || []);
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

const filteredPeople = useMemo(() => {
  if (!searchQuery.trim()) return people;

  const query = searchQuery.toLowerCase();

  return people.filter((person) => {
    const name = person.name?.toLowerCase() || "";
    const username = person.username.toLowerCase();
    return name.includes(query) || username.includes(query);
  });
}, [people, searchQuery]);

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (pageSize === Infinity) {
      return 1; // Show all entries on one "page"
    }
    return Math.ceil(filteredPeople.length / pageSize);
  }, [filteredPeople.length, pageSize]);

  const paginatedPeople = useMemo(() => {
    if (pageSize === Infinity) {
      return filteredPeople;
    }
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredPeople.slice(start, end);
  }, [filteredPeople, pageSize, currentPage]);

  // Sync pagination state with URL params
  useEffect(() => {
    const page = searchParams.get('page');
    const parsedPage = page ? parseInt(page, 10) : 1;
    if (parsedPage > 0) {
      setCurrentPage(parsedPage);
    }
  }, [searchParams]);

  useEffect(() => {
    const limit = searchParams.get('limit');
    if (limit === 'all') {
      setPageSize(Infinity);
    } else {
      const parsedLimit = limit ? parseInt(limit, 10) : 24;
      if ([12, 24, 48, 96].includes(parsedLimit)) {
        setPageSize(parsedLimit);
      }
    }
  }, [searchParams]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1 && pageSize !== Infinity) {
      updatePage(1);
    }
  }, [searchQuery]);

  // Reset to page 1 when filtered results change significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      updatePage(1);
    }
  }, [currentPage, totalPages]);


  const handleContributorClick = (contributor: ContributorEntry) => {
    saveScrollPosition();
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
        <h1 className="text-4xl font-bold">
          <span className="text-black dark:text-white">Our </span>
          <span className="text-emerald-600 dark:text-emerald-400">People</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4 mt-4">
          Meet the team who made CircuitVerse possible.
        </p>
        {updatedAt && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Updated {new Date(updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-16">
          {/* Core Team Loading */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={`core-${i}`} className="animate-pulse">
                  <div className="bg-muted rounded-lg p-6 text-center space-y-3">
                    <div className="w-20 h-20 bg-muted-foreground/20 rounded-full mx-auto" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto" />
                      <div className="h-6 bg-muted-foreground/20 rounded w-16 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alumni Loading */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-80 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`alumni-${i}`} className="animate-pulse">
                  <div className="bg-muted rounded-lg p-6 text-center space-y-3">
                    <div className="w-20 h-20 bg-muted-foreground/20 rounded-full mx-auto" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto" />
                      <div className="h-6 bg-muted-foreground/20 rounded w-16 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contributors Section Loading */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-72 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-96 mx-auto" />
            </div>

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
                <h3 className="text-lg font-semibold mb-2">
                  Loading Community Data
                </h3>
                <p className="text-muted-foreground">
                  Fetching team members and contributors...
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <TeamSection
            title="Core Team"
            description="The dedicated team members who lead and maintain CircuitVerse, ensuring the platform continues to evolve and serve the community."
            members={coreTeam}
            teamType="core"
          />

          <TeamSection
            title="Alumni"
            description="Former team members who have made significant contributions to CircuitVerse and helped shape it into what it is today."
            members={alumni}
            teamType="alumni"
          />

        <div className="mb-8">
  {/* TITLE */}
    <div className="mb-4">
    <h2 className="text-3xl font-bold">
      <span className="text-black dark:text-white">Community </span>
      <span className="text-[#42B883]">Contributors</span>
    </h2>
  </div>

  {/* DESCRIPTION */}
  <p className="text-lg text-muted-foreground max-w-3xl mb-6">
    Amazing community members who contribute to CircuitVerse through
    code, documentation, and more.
  </p>
</div>

            <div className="flex flex-col gap-4">
            <PeopleStats 
              contributors={filteredPeople} 
              allContributors={people}
              onContributorClick={handleContributorClick}
            />

            <div className="flex items-center justify-between gap-4 py-8">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-foreground">
                  {filteredPeople.length}{' '}
                  <span className="text-[#42B883]">
                    {filteredPeople.length === 1 ? 'Contributor' : 'Contributors'}
                  </span>
                  {searchQuery && <span className="text-foreground"> found</span>}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search contributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                
                {/* Page size selector */}
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
                      className="h-10 w-20"
                      aria-label="Select number of contributors per page"
                    >
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                      <SelectItem value="96">96</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <PeopleGrid
              contributors={paginatedPeople}
              onContributorClick={handleContributorClick}
              viewMode="grid"
              loading={false}
            />

            {/* Pagination Controls */}
            {pageSize !== Infinity && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-9 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              ? "bg-[#42B883] text-white hover:bg-[#42B883]/90"
                              : "hover:bg-[#42B883]/20 hover:text-[#42B883]"
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
                  className="h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Go to next page"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next</span>
                </Button>
              </div>
            )}
          </div>
            
        </>
      )}
    </div>
  );
}
