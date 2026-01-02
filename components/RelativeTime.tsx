"use client";

import { formatTimeAgo } from "@/lib/utils";
import { format } from "date-fns";
import { isYesterday } from "date-fns";
import Hint from "./hint";

interface RelativeTimeProps {
  date: Date;
  className?: string;
}

export default function RelativeTime({
  date,
  className,
}: RelativeTimeProps) {
  // Format absolute time like: "Monday, November 11, 2025 at 2:30 PM"
  const absoluteTime = format(
    date,
    "EEEE, MMMM d, yyyy 'at' h:mm a"
  );

  return (
    <Hint label={absoluteTime} side="top">
      <time className={className}>
        {isYesterday(date)
          ? "Yesterday"
          : formatTimeAgo(date)}
      </time>
    </Hint>
  );
}
