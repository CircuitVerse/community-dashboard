"use client";

import ThemeSelector from "@/app/ThemeSelector";
import { Config } from "@/types/config";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Users } from "lucide-react";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
import { Button } from "./ui/button";

interface NavbarProps {
  config: Config;
}

const navItems = [
  { name: "Home", href: "/", icon: Home },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  { name: "People", href: "/people", icon: Users },
];

const Navbar = ({ config }: NavbarProps) => {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 dark:border-white/10 bg-background/80 backdrop-blur-md">
        <div className="relative mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src={config.org.logo_url}
              alt={config.org.name}
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="font-semibold text-lg">
              {config.org.name}
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border bg-background/90 backdrop-blur shadow-sm">
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
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/CircuitVerse/community-dashboard"
              target="_blank"
            >
              <Button variant={"outline"} size={"icon"}>
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={17}
                  height={17}
                  className="dark:invert cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Button>
            </Link>
            <ThemeSelector />
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <nav
        className={`md:hidden fixed bottom-4 left-1/2 transition-transform duration-400 ease-in-out -translate-x-1/2 z-50 ${
          scrollDirection === "down"
            ? "translate-y-50"
            : "translate-y-0"
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
