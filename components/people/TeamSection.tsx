"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { type TeamMember } from "@/lib/team-data";

interface TeamSectionProps {
  title: string;
  description: string;
  members: TeamMember[];
  teamType: 'core' | 'alumni';
}

export function TeamSection({ title, description, members, teamType }: TeamSectionProps) {
  const isCore = teamType === "core";
  const resolvedColorClass =
    teamType === "core"
      ? "text-blue-600 dark:text-blue-400"
      : "text-orange-600 dark:text-orange-400";
  return (
    <div className="mb-20">
      <div className="flex flex-col items-center text-center mb-12 relative">
        <h2 className="text-4xl font-black tracking-tight mb-4">
          <span className="text-zinc-900 dark:text-zinc-100">{isCore ? 'The ' : 'Our '}</span>
          <span className={resolvedColorClass}>{title}</span>
        </h2>

        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mx-auto">
          {description}
        </p>

        <div className={`w-24 h-1 bg-gradient-to-r from-transparent ${isCore ? 'via-blue-500/50' : 'via-orange-500/50'} to-transparent mt-6 rounded-full`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {members.map((member) => (
          <Link
            key={member.username}
            href={member.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 group-hover:border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-muted">
                    <Image
                      src={member.avatar_url}
                      alt={`${member.name}'s avatar`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>

                <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-primary transition-colors">
                  {member.name}
                </h3>

                <p className="text-xs text-muted-foreground mb-2">
                  @{member.username}
                </p>

                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${teamType === "core"
                    ? "bg-[#42B883]/10 text-[#42B883] border border-[#42B883]/20"
                    : "bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20"
                    }`}
                >
                  {member.role}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}