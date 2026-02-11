import fs from "fs";
import path from "path";

const REPOS = [
  { name: "Mobile App", slug: "CircuitVerse/Mobile-App" },
  { name: "Vue Simulator", slug: "CircuitVerse/cv-frontend-vue" },
];

const HEADERS = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
};

// ---------- GitHub API helpers ----------

async function fetchReleases(repo: string) {
  const allReleases: any[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
      { headers: HEADERS }
    );

    if (!res.ok) break;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    allReleases.push(...data);
    page++;
  }

  return allReleases;
}

async function fetchCommitsBetween(
  repo: string,
  base: string,
  head: string
) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/compare/${base}...${head}`,
    { headers: HEADERS }
  );
  return res.json();
}

function extractContributors(commits: any[]) {
  const map: Record<string, number> = {};

  commits.forEach((c) => {
    const user = c.author?.login;
    if (!user) return;
    if (user.includes("bot")) return;

    map[user] = (map[user] || 0) + 1;
  });

  return Object.entries(map)
    .map(([username, commits]) => ({ username, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
}

// ---------- Helpers ----------

function getReleaseSummary(body?: string) {
  if (!body) {
    return "This release includes internal improvements, bug fixes, and contributor updates.";
  }

  const firstLine = body
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);

  return (
    firstLine ||
    "This release includes internal improvements, bug fixes, and contributor updates."
  );
}

// ---------- MAIN ----------

async function run() {
  const allReleases: any[] = [];

  for (const repo of REPOS) {
    const releases = await fetchReleases(repo.slug);

    if (!Array.isArray(releases)) {
      console.error("❌ Failed to fetch releases for", repo.slug);
      continue;
    }

    for (let i = 0; i < releases.length; i++) {
      const current = releases[i];

      // Skip draft releases (important for Vue Simulator)
      if (current.draft) continue;

      // Find previous non-draft release
      let previous = null;
      for (let j = i + 1; j < releases.length; j++) {
        if (!releases[j].draft) {
          previous = releases[j];
          break;
        }
      }

      let contributors: any[] = [];

      if (previous) {
        const compare = await fetchCommitsBetween(
          repo.slug,
          previous.tag_name,
          current.tag_name
        );

        contributors = extractContributors(compare?.commits || []);
      }

      allReleases.push({
        repo: repo.name,
        repoSlug: repo.slug,
        version: current.tag_name,
        date: current.published_at?.slice(0, 10),
        summary: getReleaseSummary(current.body),
        contributors,
        githubUrl: current.html_url,
      });
    }
  } // ✅ CLOSES repo loop

  const outputPath = path.join(
    process.cwd(),
    "public/releases/releases.json"
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allReleases, null, 2));

  console.log("✅ Releases + contributors generated");
}

run();
