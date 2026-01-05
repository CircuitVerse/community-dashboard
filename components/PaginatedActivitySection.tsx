"use client";

import { useState } from "react";
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
    <div className="space-y-3 select-none">
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
                    <p className="truncate text-sm font-medium">
                      {activity.title ?? "Untitled Activity"}
                    </p>

                    <Link
                      href={activity.link ?? "#"}
                      target="_blank"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#50B78B] p-1"
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