import { getReleases } from "@/lib/releases";
import { ReleaseCard } from "@/components/Releases/ReleaseCard";

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#50B78B]">
          Releases
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Celebrating contributors across CircuitVerse releases
        </p>
      </div>

      <div className="space-y-4">
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
