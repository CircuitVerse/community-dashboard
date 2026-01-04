"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex justify-center px-6 pt-0 sm:pt-24 md:pt-28 lg:pt-18 overflow-hidden bg-background">

      <div
        aria-hidden
        className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#50B78B]/20 blur-3xl"
      />

      <main
        role="alert"
        className="relative z-10 max-w-xl text-center space-y-8"
      >
        <div>
          <h1 className="text-[9rem] font-extrabold tracking-tight bg-gradient-to-r from-[#50B78B] to-[#70D7AB] bg-clip-text text-transparent">
            404
          </h1>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-[#50B78B]" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            Page not found
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The page you’re looking for may have been moved, renamed, or doesn’t
            exist. Please check the URL or return to the homepage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Link
            href="/"
            aria-label="Go to homepage"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#50B78B] px-6 py-3 text-white font-medium transition hover:bg-[#45a97f] focus:outline-none focus:ring-2 focus:ring-[#50B78B]/60"
          >
            <Home className="h-5 w-5" />
            Go Home
          </Link>

          <button
            aria-label="Go back to previous page"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-3 text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </button>
        </div>
      </main>
    </div>
  );
}
