"use client";

import Image from "next/image";
import { type TeamMember } from "@/lib/team-data";

interface PeopleHeroProps {
    coreTeam?: TeamMember[];
    totalCount?: number;
}

export function PeopleHero({ coreTeam = [], totalCount = 0 }: PeopleHeroProps) {
    // Display top 8 core team members as avatars for the hero
    const displayTeam = coreTeam.slice(0, 8);

    return (
        <div className="relative mb-20 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-16 md:px-12 md:py-24">
            {/* Subtle Background Accent */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 h-96 w-96 rounded-full bg-emerald-500/5 blur-[100px]" />
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]" />

            <div className="relative z-10 flex flex-col items-center text-center">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
                    <span className="text-zinc-900 dark:text-zinc-100 italic">Our </span>
                    <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                        People
                    </span>
                </h1>

                <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed mb-10">
                    Meet the visionary team and the vibrant community driving CircuitVerse towards a better future for digital logic education.
                </p>

                {/* Core Team Avatars Stack - Moved to bottom */}
                {displayTeam.length > 0 && (
                    <div className="flex -space-x-3">
                        {displayTeam.map((member, index) => (
                            <div
                                key={member.username}
                                style={{ zIndex: index + 1 }}
                                className="relative flex-shrink-0 h-12 w-12 rounded-full ring-2 ring-white dark:ring-zinc-950 grayscale hover:grayscale-0 transition-all duration-300 transform hover:scale-110 hover:z-50"
                            >
                                <Image
                                    src={member.avatar_url}
                                    alt={member.name}
                                    width={48}
                                    height={48}
                                    className="rounded-full object-cover"
                                />
                            </div>
                        ))}
                        <div
                            style={{ zIndex: displayTeam.length + 1 }}
                            className="relative flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-950 text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-sm"
                        >
                            {totalCount}+
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
