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

export function PaginatedActivitySection({
  group,
  itemsPerPage = 9,
}: PaginatedActivitySectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(group.activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = group.activities.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
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
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {activity.contributor_name ?? activity.contributor}
                      </span>
                    </span>
                    <span>•</span>
                    <RelativeTime
                      date={new Date(
                        activity.occured_at ?? activity.closed_at
                      )}
                    />
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
          <div className="bg-zinc-50 dark:bg-white/5 px-4 py-4 border-t">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
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
                  {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-xs text-zinc-400"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = page as number;
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={`h-8 w-8 p-0 transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-[#50B78B] hover:bg-[#50B78B]/90 text-white shadow-sm"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#50B78B] hover:border-[#50B78B]/20 hover:shadow-sm"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
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

              <div className="text-xs text-zinc-500 hidden sm:block mt-2 mb-[-8]">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-50 dark:bg-white/5 px-4 py-2 text-[10px] text-center text-zinc-400 uppercase tracking-widest">
          Activity Stream
        </div>
      </div>
    </div>
  );
}