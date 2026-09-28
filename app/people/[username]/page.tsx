import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContributorByUsername, getAllContributorUsernames } from "@/lib/people";
import { ContributorDetail } from "@/components/people/ContributorDetail";
import { getConfig } from "@/lib/config";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateStaticParams() {
  const usernames = await getAllContributorUsernames();
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const contributor = await getContributorByUsername(username);

  if (!contributor) {
    return {
      title: "Contributor Not Found | CircuitVerse",
      description: "The requested contributor profile could not be found.",
    };
  }

  const displayName = contributor.name
    ? `${contributor.name} (@${contributor.username})`
    : `@${contributor.username}`;

  const totalActivities = Object.values(
    contributor.activity_breakdown || {}
  ).reduce((sum, act) => sum + act.count, 0);

  const config = getConfig();
  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(config.meta.site_url);
  } catch {
    metadataBase = undefined;
  }

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: `${displayName} - CircuitVerse Contributor`,
    description: `View ${
      contributor.name || contributor.username
    }'s contributions on CircuitVerse: ${
      contributor.total_points
    } total points across ${totalActivities} activities.`,
    openGraph: {
      title: `${displayName} | CircuitVerse Community`,
      description: `${
        contributor.name || contributor.username
      } has contributed ${contributor.total_points} points to CircuitVerse.`,
      images: contributor.avatar_url
        ? [{ url: contributor.avatar_url, alt: contributor.username }]
        : [],
    },
    alternates: {
      canonical: `/people/${contributor.username}/`,
    },
  };
}

export default async function ContributorPage({ params }: PageProps) {
  const { username } = await params;
  const contributor = await getContributorByUsername(username);

  if (!contributor) {
    notFound();
  }

  return <ContributorDetail contributor={contributor} />;
}
