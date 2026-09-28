import type { Metadata } from "next";
import { getPeopleData } from "@/lib/people";
import { PeopleClientView } from "@/components/people/PeopleClientView";

export const metadata: Metadata = {
  title: "People | CircuitVerse",
  description: "Meet the team and contributors who made CircuitVerse possible.",
};

export default async function PeoplePage() {
  const data = await getPeopleData();
  return <PeopleClientView initialData={data} />;
}
