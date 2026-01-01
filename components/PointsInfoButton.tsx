"use client";

import { useState } from "react";
import Hint from "./hint";

const POINTS_CONFIG = [
  { label: "PR merged", points: 5 },
  { label: "PR opened", points: 2 },
  { label: "Issue opened", points: 1 },
] as const;

interface PointsContentProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const PointsContent = ({ isMobile = false, onClose }: PointsContentProps) => (
  <div
    className={
      isMobile
        ? "p-6 bg-white dark:bg-zinc-900"
        : "flex flex-col gap-3 w-[280px] p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700"
    }
  >
    {/* Header */}
    {isMobile ? (
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold text-[#50B78B] text-base"
          id="points-modal-title"
        >
          Points Allocation
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl leading-none"
        >
          ×
        </button>
      </div>
    ) : (
      <p className="font-semibold text-[#50B78B] text-sm">Points Allocation</p>
    )}

    {/* Points List */}
    <ul className={isMobile ? "space-y-3 mb-4" : "space-y-2 text-sm"}>
      {POINTS_CONFIG.map((item, index) => (
        <li
          key={item.label}
          className={`flex items-center justify-between ${
            isMobile
              ? `py-2 ${
                  index < POINTS_CONFIG.length - 1
                    ? "border-b border-zinc-200 dark:border-zinc-700"
                    : ""
                }`
              : "gap-4"
          }`}
        >
          <span
            className={`text-zinc-700 dark:text-zinc-300 ${
              isMobile ? "text-sm" : ""
            }`}
          >
            {item.label}
          </span>
          <span
            className={`font-semibold text-[#50B78B] whitespace-nowrap ${
              isMobile ? "text-base" : ""
            }`}
          >
            +{item.points}{" "}
            {isMobile ? "pts" : item.points === 1 ? "point" : "points"}
          </span>
        </li>
      ))}
    </ul>

    {/* Footer */}
    <div
      className={`${
        isMobile ? "pt-4" : "pt-2 mt-1"
      } border-t border-zinc-200 dark:border-zinc-700`}
    >
      <p
        className={`text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed ${
          isMobile ? "text-center" : ""
        }`}
      >
        Leaderboard reflects total activity score
      </p>
    </div>
  </div>
);

export default function PointsInfoButton() {
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  return (
    <>
      {/* Desktop: Hover tooltip */}
      <div className="hidden md:inline-flex">
        <Hint side="bottom" align="center" label={<PointsContent />}>
          <button
            type="button"
            className="text-xl text-[#50B78B]/70 hover:text-[#50B78B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/50 rounded-sm inline-flex items-center justify-center leading-none"
            aria-label="Show points allocation"
          >
            ⓘ
          </button>
        </Hint>
      </div>

      {/* Mobile: Bottom sheet modal */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setShowMobileInfo(true)}
          className="text-lg text-[#50B78B]/70 active:text-[#50B78B] transition-colors focus:outline-none rounded-sm"
        >
          ⓘ
        </button>

        {showMobileInfo && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
              onClick={() => setShowMobileInfo(false)}
            />

            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-300"
              role="dialog"
            >
              <PointsContent
                isMobile
                onClose={() => setShowMobileInfo(false)}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
