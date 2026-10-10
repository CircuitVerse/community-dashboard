import type { Metadata } from "next";
import { getPeopleListingData } from "@/lib/people";
import { PeopleClientView } from "@/components/people/PeopleClientView";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "People | CircuitVerse",
  description: "Meet the team and contributors who made CircuitVerse possible.",
  alternates: {
    canonical: "/people/",
  },
};

export default function PeoplePage() {
  const isProd = process.env.NODE_ENV === "production";
  const data = getPeopleListingData(undefined, { strict: isProd });
  return <PeopleClientView initialData={data} />;
}
