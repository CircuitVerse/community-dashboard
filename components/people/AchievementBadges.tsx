import { BadgeDefinition } from "@/lib/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy } from "lucide-react";

interface AchievementBadgesProps {
  badges: BadgeDefinition[];
}

export function AchievementBadges({ badges }: AchievementBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Achievements & Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <TooltipProvider>
            {badges.map((badge) => (
              <Tooltip key={badge.slug}>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      relative group cursor-help p-3 rounded-2xl flex items-center justify-center
                      bg-gradient-to-br ${badge.color} 
                      shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                      w-16 h-16
                    `}
                  >
                    <span className="text-3xl select-none group-hover:scale-110 transition-transform">
                      {badge.icon}
                    </span>
                    {/* Glossy overlay effect */}
                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="p-3 max-w-xs bg-popover/95 backdrop-blur-sm border-primary/20 shadow-2xl">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">{badge.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
