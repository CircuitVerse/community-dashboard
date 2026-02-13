import { Suspense } from "react";
import PeopleSearch from "./PeopleSearch";

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeopleSearch />
    </Suspense>
  );
}
