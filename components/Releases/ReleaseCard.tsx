import { Release } from "@/lib/releases";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ReleaseCard({ release }: { release: Release }) {
  return (
    <Card className="transition-all hover:shadow-md hover:border-[#50B78B]/50">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              {release.repo} — {release.version}
            </h3>
            <p className="text-sm text-muted-foreground">
              {release.summary}
            </p>
          </div>

          <span className="text-sm text-zinc-500 whitespace-nowrap">
            {release.date}
          </span>
        </div>

        {/* Contributors */}
        {release.contributors.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {release.contributors.map((c) => (
              <Link
                key={c.username}
                href={`https://github.com/${c.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "bg-[#50B78B]/10 hover:bg-[#50B78B]/20 transition"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={`https://github.com/${c.username}.png`}
                    alt={c.username}
                  />
                  <AvatarFallback className="text-xs">
                    {c.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span className="text-sm font-medium text-[#50B78B]">
                  @{c.username}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* GitHub link */}
        {release.githubUrl && (
          <div className="pt-2">
            <Link
              href={release.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-[#50B78B] transition"
            >
              View on GitHub →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
