"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";




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
    return await res.json();
  } catch {
    return { updatedAt: 0, people: [], coreTeam: [], alumni: [] };
  }
}

export default function PeopleSearch() {
  const [people, setPeople] = useState<ContributorEntry[]>([]);
  const [coreTeam, setCoreTeam] = useState<TeamMember[]>([]);
  const [alumni, setAlumni] = useState<TeamMember[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<ContributorEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const contributorsSectionRef = useRef<HTMLDivElement | null>(null);

  const buildUrl = (params: URLSearchParams) => {
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  // Stable primitive for effect deps so dependency array size never changes
  const searchParamsString = typeof searchParams?.toString === "function" ? searchParams.toString() : "";

  // Pagination state - synced with URL for shareable links and back/forward
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (typeof searchParams?.get !== "function") return 50;
    const limit = searchParams.get("limit");
    if (limit) {
      if (limit === "all") return Infinity;
      const parsed = parseInt(limit, 10);
      if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) return parsed;
    }
    return 50;
  });
  const [currentPage, setCurrentPageState] = useState<number>(() => {
    if (typeof searchParams?.get !== "function") return 1;
    const page = searchParams.get("page");
    if (page) {
      const parsed = parseInt(page, 10);
      return parsed > 0 ? parsed : 1;
    }
    return 1;
  });

  useEffect(() => {
    const params = searchParams;
    if (typeof params?.get !== "function") return;
    const limit = params.get("limit");
    if (limit) {
      if (limit === "all") {
        setPageSizeState(Infinity);
        return;
      }
      const parsed = parseInt(limit, 10);
      if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
        setPageSizeState(parsed);
      } else {
        setPageSizeState(50);
      }
    } else {
      setPageSizeState(50);
    }
  }, [searchParamsString]);

  useEffect(() => {
    const params = searchParams;
    if (typeof params?.get !== "function") return;
    const page = params.get("page");
    if (page) {
      const parsed = parseInt(page, 10);
      setCurrentPageState(parsed > 0 ? parsed : 1);
    } else {
      setCurrentPageState(1);
    }
  }, [searchParamsString]);

  useEffect(() => {
    if (!loading && window.location.hash === "#contributors") {
      const el = document.getElementById("contributors");
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);

        return () => clearTimeout(timer);
      }
    }
  }, [loading]);



  // Use scroll restoration hook - active when no contributor is selected (list view)
  const { saveScrollPosition } = useScrollRestoration({ isActive: !selectedContributor });


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

  const totalPages = useMemo(() => {
    if (pageSize === Infinity) return 1;
    return Math.ceil(filteredPeople.length / pageSize);
  }, [filteredPeople.length, pageSize]);

  const paginatedPeople = useMemo(() => {
    if (pageSize === Infinity) return filteredPeople;
    const start = (currentPage - 1) * pageSize;
    return filteredPeople.slice(start, start + pageSize);
  }, [filteredPeople, pageSize, currentPage]);

  // Reset to page 1 when current page is out of range (e.g. after search/filter)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      const params = new URLSearchParams(searchParamsString);
      params.delete("page");
      setCurrentPageState(1);
      router.replace(buildUrl(params), { scroll: false });
    }
  }, [totalPages, currentPage, searchParamsString, pathname ?? ""]);

  const scrollToContributorsTop = () => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      if (!contributorsSectionRef.current) return;
      const rect = contributorsSectionRef.current.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const offset = 80;
      window.scrollTo({
        top: Math.max(absoluteTop - offset, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  };

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (page === 1) params.delete("page");
    else params.set("page", page.toString());
    setCurrentPageState(page);
    scrollToContributorsTop();
    router.replace(buildUrl(params), { scroll: false });
  };

  const updatePageSize = (newPageSize: number | "all") => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (newPageSize === "all" || newPageSize === Infinity) {
      params.set("limit", "all");
      setPageSizeState(Infinity);
    } else {
      params.set("limit", newPageSize.toString());
      setPageSizeState(newPageSize);
    }
    params.delete("page");
    setCurrentPageState(1);
    router.replace(buildUrl(params), { scroll: false });
  };

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
<section id="contributors" ref={contributorsSectionRef} className="mb-8 scroll-mt-28">
  <div className="mb-8">
    <div className="mb-4">
      <h2 className="text-3xl font-bold">
        <span className="text-black dark:text-white">Community </span>
        <span className="text-[#42B883]">Contributors</span>
      </h2>
    </div>

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

    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-8">
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

      <div className="flex flex-wrap items-center gap-4">
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
        {filteredPeople.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="people-page-size" className="text-sm text-muted-foreground whitespace-nowrap">
              Show
            </label>
            <Select
              value={pageSize === Infinity ? "all" : pageSize.toString()}
              onValueChange={(value: string) => {
                if (value === "all") updatePageSize("all");
                else updatePageSize(parseInt(value, 10));
              }}
            >
              <SelectTrigger
                id="people-page-size"
                size="sm"
                className="h-9 w-24 border border-[#42B883]/30 hover:bg-[#42B883]/20 focus-visible:ring-2 focus-visible:ring-[#42B883]"
                aria-label="Contributors per page"
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
        )}
      </div>
    </div>

    <PeopleGrid
      contributors={paginatedPeople}
      onContributorClick={handleContributorClick}
      viewMode="grid"
      loading={false}
    />

    {filteredPeople.length > 0 && pageSize !== Infinity && totalPages > 1 && (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updatePage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-9 border border-[#42B883]/30 hover:bg-[#42B883]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous</span>
        </Button>
        <div className="flex items-center gap-1">
          {(() => {
            const pages: number[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              if (currentPage <= 4) {
                for (let i = 2; i <= 5; i++) pages.push(i);
                pages.push(-1);
                pages.push(totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push(-1);
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(-1);
                pages.push(currentPage - 1, currentPage, currentPage + 1);
                pages.push(-1);
                pages.push(totalPages);
              }
            }
            return pages.map((pageNum, idx) =>
              pageNum === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">…</span>
              ) : (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updatePage(pageNum)}
                  className={cn(
                    "h-9 w-9 p-0",
                    currentPage === pageNum
                      ? "bg-[#42B883] text-white hover:bg-[#42B883]/90"
                      : "hover:bg-[#42B883]/20 hover:text-[#42B883]"
                  )}
                  aria-label={`Page ${pageNum}`}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </Button>
              )
            );
          })()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="h-9 border border-[#42B883]/30 hover:bg-[#42B883]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next</span>
        </Button>
      </div>
    )}
  </div>
</section>

            
        </>
      )}
    </div>
  );
}
