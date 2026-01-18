"use client";

import { useState } from "react";
import { Release } from "@/lib/releases";
import { ReleaseCard } from "./ReleaseCard";

export default function ReleasesClient({
  releases,
}: {
  releases: Release[];
}) {
  const [activeRepo, setActiveRepo] =
    useState<"Mobile App" | "Vue Simulator">("Mobile App");

  const filtered = releases.filter(
    (r) => r.repo === activeRepo
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Tabs */}
      <div
  role="tablist"
  aria-label="Release repositories"
  className="flex gap-6 border-b pb-2"
>
  <button
    role="tab"
    aria-selected={activeRepo === "Mobile App"}
    aria-controls="mobile-panel"
    onClick={() => setActiveRepo("Mobile App")}
    className={`px-4 py-1.5 rounded-md transition-all duration-200 font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/40
      ${activeRepo === "Mobile App"
        ? "text-[#50B78B] bg-[#50B78B]/10 shadow-sm"
        : "text-zinc-500 hover:bg-[#50B78B]/10 hover:text-[#50B78B] active:bg-[#50B78B]/20"}
    `}
  >
    Mobile App
  </button>

  <button
    role="tab"
    aria-selected={activeRepo === "Vue Simulator"}
    aria-controls="vue-panel"
    onClick={() => setActiveRepo("Vue Simulator")}
    className={`px-4 py-1.5 rounded-md transition-all duration-200 font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/40
      ${activeRepo === "Vue Simulator"
        ? "text-[#50B78B] bg-[#50B78B]/10 shadow-sm"
        : "text-zinc-500 hover:bg-[#50B78B]/10 hover:text-[#50B78B] active:bg-[#50B78B]/20"}
    `}
  >
    Vue Simulator
  </button>
</div>
  

      {/* Content */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No releases yet for {activeRepo}.
        </p>
      ) : (
        filtered.map((release) => (
          <ReleaseCard
            key={`${release.repoSlug}-${release.version}`}
            release={release}
          />
        ))
      )}
    </div>
  );
}
function setActiveRepo(arg0: string): void {
  throw new Error("Function not implemented.");
}

