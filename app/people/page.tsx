import { Suspense } from "react";
import type { Metadata } from "next";
import { getPeopleListingData } from "@/lib/people";
import { PeopleClientView } from "@/components/people/PeopleClientView";

export const metadata: Metadata = {
  title: "People | CircuitVerse",
  description: "Meet the team and contributors who made CircuitVerse possible.",
  alternates: {
    canonical: "/people/",
  },
};

export default function PeoplePage() {
  const data = getPeopleListingData();
  return (
    <Suspense>
      <PeopleClientView initialData={data} />
    </Suspense>
  );
}
