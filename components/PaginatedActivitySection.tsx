"use client";

import { useRef, useState } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import RelativeTime from "@/components/RelativeTime";
import { ActivityGroup } from "@/lib/db";
import Link from "next/link";
import {
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Helper function to get consistent colors for repositories
function getRepoColor(repoName: string | null): string {
  const colors: readonly string[] = [
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800", 
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
    "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
    "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"
  ];

  if (!repoName) {
    return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-300 dark:border-zinc-800";
  }
  
  // Create a simple hash from the repo name for consistent color assignment
  let hash = 0;
  for (let i = 0; i < repoName.length; i++) {
    hash = repoName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length] ?? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-300 dark:border-zinc-800";
}

interface PaginatedActivitySectionProps {
  group: ActivityGroup;
  itemsPerPage?: number;
}

/**
* Displays a paginated list of activities with a sliding window navigation.
* @param props - Component properties
* @param props.group - The activity group to display
* @param props.itemsPerPage - Number of items per page (default: 9)
* @returns A paginated activity section component
*/ 
export function PaginatedActivitySection({
  group,
  itemsPerPage = 9,
}: PaginatedActivitySectionProps){
  /** Current active page number */
  const [currentPage, setCurrentPage] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollSectionToTop = () => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;

      const offset = 80;

      window.scrollTo({
        top: Math.max(absoluteTop - offset, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  };

  const totalPages = Math.ceil(group.activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = group.activities.slice(startIndex, endIndex);

  /** Number of page buttons visible at once */
  const windowSize = 3;

  /** Starting page number of the visible pagination window */
  const [windowStart, setWindowStart] = useState(1);

  /** Navigate to the next page and shift the pagination window forward when required */
  const goToNext = () => {
    const nextPage = Math.min(totalPages, currentPage + 1);
    setCurrentPage(nextPage);
    scrollSectionToTop();
    setWindowStart((ws) => {
      if (nextPage > ws + windowSize - 1) {
        return ws + 1;
      }
      return ws;
    });
  };

  /** Navigate to the previous page and shift the pagination window backward if required **/
  const goToPrevious = () => {
    const nextPage = Math.max(1, currentPage - 1);
    setCurrentPage(nextPage);
    scrollSectionToTop();
    setWindowStart((ws) => {
      if (nextPage < ws) {
        return ws - 1;
      }
      return ws;
    });
  };

  /** Navigate to a specific page and adjust the pagination window to keep it in view **/
  const goToPage = (page: number) => {
    setCurrentPage(page);
    scrollSectionToTop();
    setWindowStart((ws) => {
      if (page < ws) return page;
      if (page > ws + windowSize - 1) {
        return page - windowSize + 1;
      }
      return ws;
    });
  };

  /** returns the list of pagenos currently visible in the pagination window **/
  const getPageNumbers = () => {
    const pages: number[] = [];
    const end = Math.min(windowStart + windowSize - 1, totalPages);
    for(let i = windowStart; i <= end; i++){
      pages.push(i);
    }

    return pages;
  };

  return (
    <div ref={containerRef} className="space-y-3 select-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#50B78B]" />
          <h3 className="text-xs uppercase tracking-wider text-zinc-500">
            {group.activity_name}
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {group.activities.length} / WEEK
        </span>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="divide-y">
          {currentActivities.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              No activities to display
            </div>
          ) : (
            currentActivities.map((activity) => (
              <div
                key={activity.slug}
                className="group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#50B78B] opacity-0 group-hover:opacity-100 transition" />

                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  <AvatarImage
                    src={activity.contributor_avatar_url ?? undefined}
                  />
                  <AvatarFallback>
                    {(activity.contributor_name ?? activity.contributor)
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0 sm:items-center">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {activity.title ?? "Untitled Activity"}
                        </p>
                        {activity.repo && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-mono shrink-0 mt-1 sm:hidden ${getRepoColor(activity.repo)}`}
                          >
                            {activity.repo}
                          </Badge>
                        )}
                      </div>
                      {activity.repo && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-mono shrink-0 hidden sm:block ${getRepoColor(activity.repo)}`}
                        >
                          {activity.repo}
                        </Badge>
                      )}
                    </div>

                    <Link
                      href={activity.link ?? "#"}
                      target="_blank"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#50B78B] p-1 shrink-0"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                    <span>
  by{" "}
  <Link
  href={`https://github.com/${activity.contributor}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-zinc-700 dark:text-zinc-300 hover:text-[#50B78B] hover:underline transition-colors"
>
  {activity.contributor_name ?? activity.contributor}
</Link>

</span>

                    <span>•</span>
                    <RelativeTime date={new Date(activity.occured_at)} />
                  </div>
                </div>

                {(activity.points ?? 0) > 0 && (
                  <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800">
                    <Sparkles className="h-3 w-3 text-[#50B78B]" />
                    {activity.points}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-zinc-50 dark:bg-white/5 px-4 py-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mx-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="h-8 px-2 sm:px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#50B78B] transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum) => (
                    <Button
                      key={`${windowStart}-${pageNum}`}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className={`h-8 w-8 p-0 cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-[#50B78B] text-white"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#50B78B]"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  ))}  
                  {(() => { 
                    const windowEnd = windowStart + windowSize - 1;
                    if(windowEnd >= totalPages) return null;
                    const PageButton = (page: number) => (
                      <Button
                        key={`${windowStart}-${page}`}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className={`h-8 w-8 p-0 cursor-pointer ${
                          currentPage === page
                            ? "bg-[#50B78B] text-white"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#50B78B]"
                        }`}
                      >
                        {page}
                      </Button>
                    );
                    if(windowEnd === totalPages - 1){
                      return PageButton(totalPages);
                    }
                    return(
                      <>
                        <span className="px-1 text-zinc-400">…</span>
                        {PageButton(totalPages)}
                      </>
                    );
                  })()}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 sm:px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#50B78B] transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-zinc-500 font-mono ml-4 shrink-0">
                {currentPage} / {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}