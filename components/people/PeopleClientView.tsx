"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Users, Search } from "lucide-react";
import { PeopleStats } from "@/components/people/PeopleStats";
import { PeopleGrid } from "@/components/people/PeopleGrid";
import { TeamSection } from "@/components/people/TeamSection";
import { Input } from "@/components/ui/input";
import type { PeopleListingData } from "@/types/people";

interface PeopleClientViewProps {
  initialData: PeopleListingData;
}

export function PeopleClientView({ initialData }: PeopleClientViewProps) {
  const { people, coreTeam, alumni, updatedAt } = initialData;
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Synchronize URL search params with local search state without refreshing route
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const currentQ = url.searchParams.get("q") || "";
    const trimmed = searchQuery.trim();

    if (trimmed !== currentQ) {
      if (trimmed) {
        url.searchParams.set("q", trimmed);
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState(null, "", url.toString());
    }
  }, [searchQuery]);

  // Synchronize search state on browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      setSearchQuery(url.searchParams.get("q") || "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  const formattedDate = useMemo(() => {
    if (updatedAt <= 0) return null;
    const d = new Date(updatedAt);
    const datePart = d.toLocaleString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `Updated ${datePart} UTC`;
  }, [updatedAt]);

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
        {formattedDate && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>

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

      <section id="contributors" className="mb-8 scroll-mt-28">
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
          />

          <div className="flex items-center justify-between gap-4 py-8">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">
                {filteredPeople.length}{" "}
                <span className="text-[#42B883]">
                  {filteredPeople.length === 1 ? "Contributor" : "Contributors"}
                </span>
                {searchQuery && <span className="text-foreground"> found</span>}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contributors..."
                aria-label="Search contributors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <PeopleGrid
            contributors={filteredPeople}
            viewMode="grid"
            loading={false}
          />
        </div>
      </section>
    </div>
  );
}
