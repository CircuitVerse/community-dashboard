import { getReleases } from "@/lib/releases";
import { ReleaseCard } from "@/components/Releases/ReleaseCard";

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#50B78B]">
          Releases
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 mt-1">
          Celebrating contributors across CircuitVerse releases
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {releases.map((release, index) => (
         <ReleaseCard
  key={`${release.repoSlug}-${release.version}`}
  release={release}
/>
        ))}
      </div>
    </div>
  );
}
