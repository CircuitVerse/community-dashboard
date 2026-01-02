"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity } from "lucide-react";
import { PeopleStats } from "@/components/people/PeopleStats";
import { PeopleGrid } from "@/components/people/PeopleGrid";
import { ContributorDetail } from "@/components/people/ContributorDetail";
import { TeamSection } from "@/components/people/TeamSection";
import { type TeamMember } from "@/lib/team-data";

interface ContributorEntry {
  username: string;
  name: string | null;
  avatar_url: string;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: Array<{ date: string; count: number; points: number }>;
  activities?: Array<{
    type: string;
    title: string;
    occured_at: string;
    link: string;
    points: number;
  }>;
}

type PeopleResponse = {
  updatedAt: number;
  people: ContributorEntry[];
  coreTeam: TeamMember[];
  alumni: TeamMember[];
};

async function fetchPeople(): Promise<PeopleResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const apiUrl = base ? `${base}/api/people` : "/api/people";

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) return { updatedAt: 0, people: [], coreTeam: [], alumni: [] };
    return res.json();
  } catch {
    return { updatedAt: 0, people: [], coreTeam: [], alumni: [] };
  }
}
export default function PeoplePage() {
  const [people, setPeople] = useState<ContributorEntry[]>([]);
  const [coreTeam, setCoreTeam] = useState<TeamMember[]>([]);
  const [alumni, setAlumni] = useState<TeamMember[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [selectedContributor, setSelectedContributor] = useState<ContributorEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPeople();
        setPeople(data.people);
        setCoreTeam(data.coreTeam || []);
        setAlumni(data.alumni || []);
        setUpdatedAt(data.updatedAt);
      } catch (error) {
        console.error('Failed to load contributors:', error);
        setError('Failed to load contributors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);



  const handleContributorClick = (contributor: ContributorEntry) => {
    setSelectedContributor(contributor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selectedContributor) {
    return (
      <ContributorDetail 
        contributor={selectedContributor} 
        onBack={() => setSelectedContributor(null)} 
      />
    );
  }

  if (error) {
    return (
      <div className="mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="p-8 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-black dark:text-white">Our </span>
          <span className="text-[#42B883]">People</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          Meet the team who made CircuitVerse possible.
        </p>
        {updatedAt && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Updated {new Date(updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-16">
          {/* Core Team Loading */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={`core-${i}`} className="animate-pulse">
                  <div className="bg-muted rounded-lg p-6 text-center space-y-3">
                    <div className="w-20 h-20 bg-muted-foreground/20 rounded-full mx-auto" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto" />
                      <div className="h-6 bg-muted-foreground/20 rounded w-16 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alumni Loading */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-80 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`alumni-${i}`} className="animate-pulse">
                  <div className="bg-muted rounded-lg p-6 text-center space-y-3">
                    <div className="w-20 h-20 bg-muted-foreground/20 rounded-full mx-auto" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto" />
                      <div className="h-6 bg-muted-foreground/20 rounded w-16 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contributors Section Loading */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <div className="h-8 bg-muted rounded w-72 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-96 mx-auto" />
            </div>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-xl" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-20" />
                          <div className="h-6 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 h-10 bg-muted rounded-lg" />
                    <div className="w-48 h-10 bg-muted rounded-lg" />
                    <div className="w-24 h-10 bg-muted rounded-lg" />
                    <div className="w-20 h-10 bg-muted rounded-lg" />
                  </div>
                </CardContent>
              </Card>

              <div className="text-center py-16">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold mb-2">Loading Community Data</h3>
                <p className="text-muted-foreground">Fetching team members and contributors...</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <TeamSection
            title="Core Team"
            description="The dedicated team members who lead and maintain CircuitVerse, ensuring the platform continues to evolve and serve the community."
            members={coreTeam}
            teamType="core"
          />

          <TeamSection
            title="Alumni"
            description="Former team members who have made significant contributions to CircuitVerse and helped shape it into what it is today."
            members={alumni}
            teamType="alumni"
          />

          <div className="mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                <span className="text-black dark:text-white">Community </span>
                <span className="text-[#42B883]">Contributors</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Amazing community members who contribute to CircuitVerse through code, documentation, and more.
              </p>
            </div>
            <div className="flex flex-col gap-4">
            <PeopleStats 
              contributors={people} 
              onContributorClick={handleContributorClick}
            />

            <PeopleGrid
              contributors={people}
              onContributorClick={handleContributorClick}
              viewMode="grid"
              loading={false}
            />
          </div>
          </div>
            
        </>
      )}
    </div>
  );
}
