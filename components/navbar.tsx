"use client";

import ThemeSelector from "@/app/ThemeSelector";
import { Config } from "@/types/config";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Users, Tag, BarChart3 } from "lucide-react";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
import { Button } from "./ui/button";

interface NavbarProps {
  config: Config;
}

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "People", href: "/people", icon: Users },
  { name: "Releases", href: "/releases", icon: Tag },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const Navbar = ({ config }: NavbarProps) => {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const actionBtnClass =
    "rounded-xl border border-zinc-200/60 dark:border-white/10 bg-background/40 backdrop-blur-md shadow-sm hover:bg-background/60 transition";

  return (
    <>
      {/* Desktop Navbar */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-full border border-zinc-200/60 dark:border-white/10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md shadow-md">
        <div className="px-4 h-14 flex items-center justify-between">          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={config.org.logo_url}
              alt={config.org.name}
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="font-semibold text-lg">{config.org.name}</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md shadow-sm">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-full transition-all
                    ${
                      active
                        ? "bg-[#50B78B]/20 text-[#50B78B] dark:bg-[#50B78B]/30 dark:text-[#50B78B]"
                        : "text-muted-foreground hover:text-primary"
                    }
                  `}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className={`${actionBtnClass} h-10 w-10 p-0`}
            >
              <a
                href="https://github.com/CircuitVerse/community-dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={17}
                  height={17}
                  className="dark:invert"
                />
              </a>
            </Button>

            <div
              className={`${actionBtnClass} h-10 w-10 flex items-center justify-center`}
            >
              <ThemeSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <nav
        className={`lg:hidden fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
        scrollDirection === "down" ? "-bottom-40 opacity-0 pointer-events-none" : "bottom-4 opacity-100"
        }`}
      >
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-white/10 bg-background/90 backdrop-blur-xl shadow-xl p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center justify-center
                  px-3 py-2 rounded-full transition-all
                  ${
                    active
                      ? "bg-[#50B78B]/20 text-[#50B78B] dark:text-[#50B78B]"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }
                `}
              >
                <Icon className="h-5.5 w-5.5" />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
