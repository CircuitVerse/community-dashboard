import fs from "fs";
import path from "path";
import { coreTeamMembers, alumniMembers } from "../lib/team-data";

// Create sets for fast lookup
const CORE_TEAM_USERNAMES = new Set(coreTeamMembers.map(m => m.username.toLowerCase()));
const ALUMNI_USERNAMES = new Set(alumniMembers.map(m => m.username.toLowerCase()));

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const ORG = "CircuitVerse";
const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN

if (!TOKEN) {
  throw new Error("❌ GITHUB_TOKEN is required");
}

/* -------------------------------------------------------
   SCORING
------------------------------------------------------- */

const POINTS = {
  "PR opened": 2,
  "PR merged": 5,
  "Issue opened": 1,
  "Review submitted": 4,
  "Issue labeled": 2,
  "Issue assigned": 2,
  "Issue closed": 1,
} as const;

/* -------------------------------------------------------
   TYPES (EXPORTED — IMPORTANT)
------------------------------------------------------- */

export type RawActivity = {
  type: "PR opened" | "PR merged" | "Issue opened" | "Review submitted" | "Issue labeled" | "Issue assigned" | "Issue closed";
  occured_at: string;
  title?: string | null;
  link?: string | null;
  points: number;
};

export type DailyActivity = {
  date: string;
  count: number;
  points: number;
};

export type Contributor = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: DailyActivity[];
  raw_activities: RawActivity[];
  active_prs?: Array<{ title: string; link: string; updatedAt: string }>;
  stale_prs?: Array<{ title: string; link: string; updatedAt: string }>;
  streak?: {
    current: number;
    longest: number;
    lastActivityDate: string | null;
  };
};

/**
 * 👇 REQUIRED BY lib/db.ts & FRONTEND
 */
export type UserEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: DailyActivity[];
  activities?: RawActivity[];
};

interface GitHubSearchItem {
  user: { login: string; name?: string | null; avatar_url?: string | null; type?: string };
  title: string;
  html_url: string;
  created_at: string;
  closed_at?: string | null;
}

interface YearData {
  period: string;
  updatedAt: number;
  startDate?: string;
  endDate?: string;
  entries: Contributor[];
}

interface RecentActivityItem {
  username: string;
  name: string | null;
  title: string | null;
  link: string | null;
  avatar_url: string | null;
  type?: string;
  date?: string;
  points?: number;
}

/* -------------------------------------------------------
   UTILS
------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Dynamic rate limiting based on GitHub API headers
async function smartSleep(res: Response, defaultMs: number = 500): Promise<void> {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining) {
    const remainingCount = parseInt(remaining, 10);
    if (remainingCount > 500) {
      // Plenty of quota - go fast
      await sleep(200);
    } else if (remainingCount > 100) {
      // Medium quota - normal speed
      await sleep(400);
    } else {
      // Low quota - slow down
      await sleep(1000);
    }
  } else {
    // No header - use default
    await sleep(defaultMs);
  }
}

function iso(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/* -------------------------------------------------------
   REPO STATS AGGREGATION (SHARED)
------------------------------------------------------- */

const repoStatsMap = new Map<string, { pr_opened: number, pr_merged: number, pr_merged_prev: number, issue_created: number, top_contributors: Map<string, number> }>();
const CURRENT_START_DATE = daysAgo(30);
const PREVIOUS_START_DATE = daysAgo(60);

function getRepoStats(repoName: string) {
  if (!repoStatsMap.has(repoName)) {
    repoStatsMap.set(repoName, { pr_opened: 0, pr_merged: 0, pr_merged_prev: 0, issue_created: 0, top_contributors: new Map() });
  }
  return repoStatsMap.get(repoName)!;
}

function addRepoContributor(repoName: string, username: string, points: number) {
  const stats = getRepoStats(repoName);
  stats.top_contributors.set(username, (stats.top_contributors.get(username) || 0) + points);
}

function extractRepoName(html_url?: string | null) {
  if (!html_url) return null;
  // https://github.com/CircuitVerse/CircuitVerse/pull/123 -> CircuitVerse
  try {
    const parts = new URL(html_url).pathname.split('/');
    return parts[2]; // [empty, org, repo, ...]
  } catch {
    return null;
  }
}

function sanitizeTitle(title?: string | null) {
  if (!title) return null;
  return title
    .replace(/\[|\]/g, "")
    .replace(/:/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBotUser(user: { login?: string; type?: string } | null | undefined): boolean {
  if (!user?.login) return true;
  if (user.type && user.type !== "User") return true;
  return user.login.endsWith("[bot]");
}

// Utility to split array into chunks for parallel processing
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/* -------------------------------------------------------
   GITHUB SEARCH (RATE + 1000 CAP SAFE)
------------------------------------------------------- */

async function ghSearch(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  // ⛔ Mandatory throttle (30 req/min)
  await sleep(2500);

  return res.json();
}

async function searchByDateChunks(
  baseQuery: string,
  start: Date,
  end: Date,
  stepDays = 30,
  dateField = "created"
): Promise<GitHubSearchItem[]> {
  const all: GitHubSearchItem[] = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const from = iso(cursor);
    const next = new Date(cursor);
    next.setDate(next.getDate() + stepDays);
    const to = next > end ? end : next;

    console.log(`→ ${from} .. ${iso(to)}`);

    let page = 1;
    while (true) {
      const res = (await ghSearch(
        `${GITHUB_API}/search/issues?q=${baseQuery}+${dateField}:${from}..${iso(
          to
        )}&per_page=100&page=${page}`
      )) as { items: GitHubSearchItem[] };

      all.push(...(res.items ?? []));
      if (!res.items || res.items.length < 100) break;
      page++;
    }

    cursor = to;
  }

  return all;
}

/* -------------------------------------------------------
   CORE HELPERS
------------------------------------------------------- */

function ensureUser(
  map: Map<string, Contributor>,
  user: { login: string; name?: string | null; avatar_url?: string | null }
): Contributor {
  if (!map.has(user.login)) {
    // Determine role based on team membership
    const usernameLower = user.login.toLowerCase();
    let role = "Contributor";
    if (CORE_TEAM_USERNAMES.has(usernameLower)) {
      role = "Maintainer";
    } else if (ALUMNI_USERNAMES.has(usernameLower)) {
      role = "Alumni";
    }
    
    map.set(user.login, {
      username: user.login,
      name: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
      role,
      total_points: 0,
      activity_breakdown: {},
      daily_activity: [],
      raw_activities: [],
    });
  }
  return map.get(user.login)!;
}

function addActivity(
  entry: Contributor,
  type: RawActivity["type"],
  date: string,
  points: number,
  meta?: { title?: string; link?: string }
) {
  const day = date.split("T")[0]!;

  entry.total_points += points;

  entry.activity_breakdown[type] ??= { count: 0, points: 0 };
  entry.activity_breakdown[type].count += 1;
  entry.activity_breakdown[type].points += points;

  const existing = entry.daily_activity.find((d) => d.date === day);
  if (existing) {
    existing.count += 1;
    existing.points += points;
  } else {
    entry.daily_activity.push({ date: day, count: 1, points });
  }

  entry.raw_activities.push({
    type,
    occured_at: date,
    title: sanitizeTitle(meta?.title),
    link: meta?.link ?? null,
    points,
  });
}

/* -------------------------------------------------------
   REVIEW FETCHING
------------------------------------------------------- */

interface GitHubRepo {
  name: string;
}

interface GitHubPR {
  number: number;
  user: { login: string; avatar_url?: string; type?: string };
  updated_at?: string;
}

interface GitHubReview {
  user: { login: string; avatar_url?: string; type?: string };
  state: string;
  submitted_at: string;
}

interface GitHubIssueEvent {
  event: string;
  actor: { login: string; avatar_url?: string; type?: string };
  created_at: string;
  label?: { name: string };
  assignee?: { login: string };
}


async function fetchOrgRepos(): Promise<string[]> {
  const repos: string[] = [];
  let page = 1;

  console.log(`📦 Fetching all repositories for ${ORG}...`);

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${ORG}/repos?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) {
        console.error(`   ⚠️ Failed to fetch repos: ${res.status}`);
        break;
    }

    await smartSleep(res, 500);
    const data = (await res.json()) as GitHubRepo[];
    if (!data.length) break;

    for (const r of data) {
      repos.push(r.name);
    }
    page++;
  }
  return repos;
}

async function fetchRepoPRs(repo: string, since: Date): Promise<GitHubPR[]> {
  const prs: GitHubPR[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/repos/${ORG}/${repo}/pulls?state=all&per_page=100&page=${page}&sort=updated&direction=desc`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) {
      console.error(`   ⚠️ Failed to fetch PRs for ${repo}: ${res.status}`);
      break;
    }
    const data = (await res.json()) as GitHubPR[];
    if (!data.length) break;
    
    // Filter PRs updated since the cutoff date
    for (const pr of data) {
      if (pr.updated_at && new Date(pr.updated_at) >= since) {
        prs.push(pr);
      }
    }
    
    // Stop if we've gone past the since date
    const lastPR = data[data.length - 1];
    if (lastPR?.updated_at && new Date(lastPR.updated_at) < since) break;
    
    page++;
    await smartSleep(res, 1000);
  }
  return prs;
}

async function fetchPRReviews(repo: string, prNumber: number): Promise<GitHubReview[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${ORG}/${repo}/pulls/${prNumber}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) {
    console.error(`   ⚠️ Failed to fetch reviews for ${repo}#${prNumber}: ${res.status}`);
    return [];
  }
  await smartSleep(res, 500);
  return res.json() as Promise<GitHubReview[]>;
}

async function fetchAllReviews(
  users: Map<string, Contributor>,
  since: Date,
  now: Date
) {
  console.log("🔍 Review submitted");
  
  // Fetch all repos in the organization
  const allRepos = await fetchOrgRepos();
  
  // Track reviews to avoid duplicates (one review per reviewer per PR)
  const reviewSeen = new Set<string>();
  
  // Parallel batch size
  const BATCH_SIZE = 5;
  
  for (const repoName of allRepos) {
    console.log(`   → ${repoName}`);
    const prs = await fetchRepoPRs(repoName, since);
    console.log(`      ${prs.length} PRs found (fetching in batches of ${BATCH_SIZE})`);
    
    // Process PRs in parallel batches
    const prBatches = chunk(prs, BATCH_SIZE);
    
    for (const batch of prBatches) {
      // Fetch reviews for batch in parallel
      const reviewResults = await Promise.all(
        batch.map(pr => fetchPRReviews(repoName, pr.number).then(reviews => ({ pr, reviews })))
      );
      
      // Process review results
      for (const { pr, reviews } of reviewResults) {
        for (const review of reviews) {
          // Skip bots
          if (!review.user?.login) continue;
          if (review.user.login.endsWith("[bot]")) continue;
          if (review.user.type && review.user.type !== "User") continue;
          
          // Skip self-reviews
          if (review.user.login === pr.user.login) continue;
          
          // Only count approved or changes_requested
          if (!["APPROVED", "CHANGES_REQUESTED"].includes(review.state)) continue;
          
          // Check date
          const reviewDate = new Date(review.submitted_at);
          if (reviewDate < since || reviewDate > now) continue;
          
          // Deduplicate: only count one review per reviewer per PR
          const dedupKey = `${review.user.login}:${repoName}:${pr.number}`;
          if (reviewSeen.has(dedupKey)) continue;
          reviewSeen.add(dedupKey);
          
          addActivity(
            ensureUser(users, review.user),
            "Review submitted",
            review.submitted_at,
            POINTS["Review submitted"],
            { title: `Review on PR #${pr.number}`, link: `https://github.com/${ORG}/${repoName}/pull/${pr.number}` }
          );

          // Aggregate for overview
          const reviewDateRaw = review.submitted_at;
          const rDate = new Date(reviewDateRaw);
          if (rDate >= CURRENT_START_DATE) {
            addRepoContributor(repoName, review.user.login, POINTS["Review submitted"]);
          }
        }
      }
      
      // Small delay between batches to avoid overwhelming the API
      await sleep(300);
    }
  }
}

/* -------------------------------------------------------
   OVERVIEW LOGIC
------------------------------------------------------- */

export type RepoStats = {
  name: string;
  description: string | null;
  language: string | null;
  avatar_url: string;
  html_url: string;
  stars: number;
  forks: number;
  open_issues: number;
  current: {
    pr_opened: number;
    pr_merged: number;
    issue_created: number;
    currentTotalContribution: number;
  }
  previous: {
    pr_merged: number;
  }
  growth: {
    pr_merged: number;
  };
  top_contributors: Array<{
    username: string;
    avatar_url: string | null;
    points: number;
  }>;
};

// ------ Helpers ------

async function fetchRepoMeta(repo: string) {
  const res = await fetch(`${GITHUB_API}/repos/${ORG}/${repo}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
    }
  });

  if (!res.ok) return null;
  await smartSleep(res, 300)
  return res.json() as Promise<{
    description: string | null;
    language: string | null;
    owner: { avatar_url: string };
    html_url: string;
    stargazers_count: number;
    forks: number;
    open_issues_count: number;
  }>;
}

async function fetchAll<T = any>(url: string): Promise<T[]> {
  let page = 1;
  const results: T[] = [];
  while (true) {
    const join = url.includes("?") ? "&" : "?";
    const fullUrl = `${url}${join}per_page=100&page=${page}`;
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`❌ Failed to fetch ${fullUrl}: ${res.status} ${text}`);
      throw new Error(`GitHub API ${res.status}: ${text}`);
    }
    await smartSleep(res, 500);
    const data = (await res.json()) as any;
    
    if (!data) {
      console.warn(`⚠️ No data received from ${fullUrl}`);
      break;
    }

    // Handle both direct array and search result object { items: [] }
    const items = Array.isArray(data) ? data : (data.items || []);
    if (!Array.isArray(items)) {
      console.warn(`⚠️ Received non-array items from ${fullUrl}:`, items);
      break;
    }

    results.push(...items);

    if (items.length < 100) break;
    page++;
    
    // Safety break for search API limits
    if (page > 10) break; // Search API only returns first 1000 results
  }

  return results;
}

function writeRepoOverview(repo: RepoStats[]) {
  fs.writeFileSync(
    path.join(process.cwd(), "public", "leaderboard", "overview.json"),
    JSON.stringify({
      updatedAt: Date.now(),
      period: "Last_30days",
      repos: repo
    }, null, 2)
  );
  console.log(`✅ Generated overview.json (${repo.length} repos)`);
}

async function generateRepoOverview(aggregatedStats: Map<string, { pr_opened: number, pr_merged: number, pr_merged_prev: number, issue_created: number, top_contributors: Map<string, number> }>) {
  console.log("📊 Generating repo overview");
  
  const repos = await fetchOrgRepos();
  const res: RepoStats[] = [];

  for (const repoName of repos) {
    try {
      console.log(`   📁 Processing repo ${ORG}/${repoName}...`);
      const meta = await fetchRepoMeta(repoName);
      if (!meta) continue;

      const stats = aggregatedStats.get(repoName) || { pr_opened: 0, pr_merged: 0, pr_merged_prev: 0, issue_created: 0, top_contributors: new Map() };
      
      // Sort top contributors and take top 5
      const topContributors = [...stats.top_contributors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([username, points]) => ({
          username,
          avatar_url: `https://github.com/${username}.png`,
          points
        }));

      res.push({
        name: repoName,
        description: meta.description,
        language: meta.language,
        avatar_url: meta.owner?.avatar_url ?? '',
        html_url: meta.html_url,
        stars: meta.stargazers_count,
        forks: meta.forks,
        open_issues: meta.open_issues_count,
        current: {
          pr_opened: stats.pr_opened,
          pr_merged: stats.pr_merged,
          issue_created: stats.issue_created,
          currentTotalContribution: stats.pr_opened + stats.pr_merged + stats.issue_created
        },
        previous: {
          pr_merged: stats.pr_merged_prev,
        },
        growth: {
          pr_merged: stats.pr_merged - stats.pr_merged_prev,
        },
        top_contributors: topContributors
      });
    } catch (error) {
      console.error(`      ❌ Error processing ${repoName}:`, error);
    }
  }
  writeRepoOverview(res);
}

/* -------------------------------------------------------
   FETCH ISSUE TRIAGING ACTIVITIES
------------------------------------------------------- */

async function fetchIssueTriagingActivities(
  users: Map<string, Contributor>,
  since: Date,
  now: Date
) {
  console.log("🔍 Issue triaging activities");
  
  // Use GitHub Search API for better historical coverage
  console.log("   📌 Fetching issue events (labeled, assigned, closed)...");
  
  // Search for issues that were updated in our timeframe to capture triaging activities
  const updatedIssues = await searchByDateChunks(
    `org:${ORG}+is:issue`,
    since,
    now,
    30,
    "updated"
  );
  
  console.log(`   📊 Found ${updatedIssues.length} updated issues to scan for triaging activities`);
  
  // Process issues in batches to avoid rate limiting
  const batchSize = 10;
  const issueBatches = chunk(updatedIssues, batchSize);
  
  for (const [batchIndex, batch] of issueBatches.entries()) {
    console.log(`   🔄 Processing issue batch ${batchIndex + 1}/${issueBatches.length}...`);
    
    // Process each issue for events
    await Promise.all(
      batch.map(issue => processIssueTriagingEvents(users, issue, since, now))
    );
    
    // Small delay between batches
    await sleep(1000);
  }
  
  console.log("✅ Issue triaging activities scan completed");
}

async function processIssueTriagingEvents(
  users: Map<string, Contributor>,
  issue: GitHubSearchItem,
  since: Date,
  now: Date
) {
  try {
    // Extract repo name from html_url
    const url = new URL(issue.html_url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected: [org, repo, 'issues', number]
    if (pathParts.length < 4 || pathParts[2] !== 'issues') return;
    
    const repoName = pathParts[1];
    const issueNumber = pathParts[3];
    
    if (!repoName || !issueNumber || isNaN(Number(issueNumber))) return;
    
    // Fetch issue events (labeled, assigned, closed)
    const eventsRes = await fetch(
      `${GITHUB_API}/repos/${ORG}/${repoName}/issues/${issueNumber}/events`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    
    if (!eventsRes.ok) {
      console.error(`     ⚠️ Failed to fetch events for ${repoName}#${issueNumber}: ${eventsRes.status}`);
      return;
    }
    
    const events = (await eventsRes.json()) as GitHubIssueEvent[];
    await smartSleep(eventsRes, 500);
    
    // Process events for triaging activities
    for (const event of events) {
      if (!event.actor?.login || isBotUser(event.actor)) continue;
      
      const eventDate = new Date(event.created_at);
      if (eventDate < since || eventDate > now) continue;
      
      const user = ensureUser(users, event.actor);
      
      switch (event.event) {
        case "labeled":
          // Only count meaningful labels (not automated ones)
          if (event.label?.name && !isAutomatedLabel(event.label.name)) {
            addActivity(
              user,
              "Issue labeled",
              event.created_at,
              POINTS["Issue labeled"],
              { 
                title: `Labeled issue #${issueNumber}: ${event.label.name}`, 
                link: issue.html_url 
              }
            );

            // Aggregate for overview
            const evDate = new Date(event.created_at);
            if (evDate >= CURRENT_START_DATE) {
              addRepoContributor(repoName, event.actor.login, POINTS["Issue labeled"]);
            }
          }
          break;
          
        case "assigned":
          // Only count assignments where the actor is not assigning themselves
          if (event.assignee && event.actor.login !== event.assignee.login) {
            addActivity(
              user,
              "Issue assigned",
              event.created_at,
              POINTS["Issue assigned"],
              { 
                title: `Assigned issue #${issueNumber} to ${event.assignee?.login}`, 
                link: issue.html_url 
              }
            );

            // Aggregate for overview
            const evDate = new Date(event.created_at);
            if (evDate >= CURRENT_START_DATE) {
              addRepoContributor(repoName, event.actor.login, POINTS["Issue assigned"]);
            }
          }
          break;
          
        case "closed":
          // Only count manual closures by maintainers
          if (event.actor.login !== issue.user.login) {
            addActivity(
              user,
              "Issue closed",
              event.created_at,
              POINTS["Issue closed"],
              { 
                title: `Closed issue #${issueNumber}: ${sanitizeTitle(issue.title)}`, 
                link: issue.html_url 
              }
            );

            // Aggregate for overview
            const evDate = new Date(event.created_at);
            if (evDate >= CURRENT_START_DATE) {
              addRepoContributor(repoName, event.actor.login, POINTS["Issue closed"]);
            }
          }
          break;
      }
    }
  } catch (error) {
    console.error(`     ❌ Error processing issue events: ${error}`);
  }
}

// Helper function to filter out automated labels
function isAutomatedLabel(labelName: string): boolean {
  const automatedLabels = [
    'stale',
    'wontfix',
    'duplicate',
    'invalid',
    'dependencies',
    'security',
    'github_actions'
  ];
  
  return automatedLabels.some(auto => 
    labelName.toLowerCase().includes(auto.toLowerCase())
  );
}


/* -------------------------------------------------------
   INCREMENTAL UPDATE HELPERS
------------------------------------------------------- */

interface ExistingYearData {
  period: string;
  updatedAt: number;
  lastFetchedAt?: number;
  startDate?: string;
  endDate?: string;
  entries: Array<{
    username: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    total_points: number;
    activity_breakdown: Record<string, { count: number; points: number }>;
    daily_activity: Array<{ date: string; count: number; points: number }>;
    raw_activities: RawActivity[];
  }>;
}

function loadExistingYearData(): ExistingYearData | null {
  const filePath = path.join(process.cwd(), "public", "leaderboard", "year.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data as ExistingYearData;
  } catch {
    return null;
  }
}

function mergeExistingActivities(
  users: Map<string, Contributor>,
  existing: ExistingYearData | null
) {
  if (!existing) return;
  
  for (const entry of existing.entries) {
    // Create or get user
    let user = users.get(entry.username);
    if (!user) {
      user = {
        username: entry.username,
        name: entry.name,
        avatar_url: entry.avatar_url,
        role: entry.role,
        total_points: 0,
        activity_breakdown: {},
        daily_activity: [],
        raw_activities: [],
      };
      users.set(entry.username, user);
    }
    
    // Merge raw_activities from existing data
    if (entry.raw_activities) {
      for (const act of entry.raw_activities) {
        user.raw_activities.push(act);
      }
    }
  }
}

function calculateStreaks(user: Contributor) {
  if (user.daily_activity.length === 0) {
    user.streak = { current: 0, longest: 0, lastActivityDate: null };
    return;
  }

  // Sort by date ascending to calculate streaks
  const sortedDays = [...user.daily_activity].sort((a, b) => a.date.localeCompare(b.date));
  
  let longest = 0;
  let current = 0;
  let lastDate: Date | null = null;

  for (const day of sortedDays) {
    const currentDate = new Date(day.date);
    
    if (lastDate) {
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
      } else if (diffDays > 1) {
        current = 1;
      }
    } else {
      current = 1;
    }
    
    longest = Math.max(longest, current);
    lastDate = currentDate;
  }

  // Check if current streak is still active (last activity today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastActDate = lastDate ? new Date(lastDate) : null;
  if (lastActDate) {
    lastActDate.setHours(0, 0, 0, 0);
    const diffFromToday = Math.floor((today.getTime() - lastActDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffFromToday > 1) {
      current = 0; // Streak broken
    }
  } else {
    current = 0;
  }

  user.streak = {
    current,
    longest,
    lastActivityDate: lastDate ? iso(lastDate) : null
  };
}

function deduplicateAndRecalculate(users: Map<string, Contributor>) {
  for (const user of users.values()) {
    // Deduplicate raw_activities by unique key
    const seen = new Set<string>();
    user.raw_activities = user.raw_activities.filter(act => {
      const key = `${act.type}:${act.occured_at}:${act.link ?? act.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Recalculate totals from deduplicated activities
    user.total_points = 0;
    user.activity_breakdown = {};
    user.daily_activity = [];
    
    const dailyMap = new Map<string, { count: number; points: number }>();
    
    for (const act of user.raw_activities) {
      // Update total points
      user.total_points += act.points;
      
      // Update activity breakdown
      if (!user.activity_breakdown[act.type]) {
        user.activity_breakdown[act.type] = { count: 0, points: 0 };
      }
      const breakdown = user.activity_breakdown[act.type]!;
      breakdown.count++;
      breakdown.points += act.points;
      
      // Update daily activity
      const day = act.occured_at.slice(0, 10);
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { count: 0, points: 0 });
      }
      const d = dailyMap.get(day)!;
      d.count++;
      d.points += act.points;
    }
    
    // Convert daily map to array
    user.daily_activity = [...dailyMap.entries()]
      .map(([date, d]) => ({ date, count: d.count, points: d.points }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate streaks
    calculateStreaks(user);
  }
}

/* -------------------------------------------------------
   GENERATE YEAR
------------------------------------------------------- */

async function generateYear() {
  console.log("🚀 Generating leaderboard");

  const now = new Date();
  const users = new Map<string, Contributor>();
  


  // Load existing data for incremental update
  const existing = loadExistingYearData();
  const isIncremental = existing?.lastFetchedAt != null;
  
  // Determine fetch start date
  let since: Date;
  if (isIncremental && existing?.lastFetchedAt) {
    since = new Date(existing.lastFetchedAt);
    console.log(`📦 Incremental update since ${iso(since)}`);
  } else {
    since = daysAgo(365);
    console.log(`📦 Full fetch from ${iso(since)}`);
  }

  console.log("🔍 PRs opened");
  for (const pr of await searchByDateChunks(`org:${ORG}+is:pr`, since, now)) {
    if (isBotUser(pr.user)) continue;
    
    // Aggregate for overview
    const repoName = extractRepoName(pr.html_url);
    if (repoName) {
      const prDate = new Date(pr.created_at);
      if (prDate >= CURRENT_START_DATE) {
        const rStats = getRepoStats(repoName);
        rStats.pr_opened++;
        addRepoContributor(repoName, pr.user.login, POINTS["PR opened"]);
      }
    }

    addActivity(
      ensureUser(users, pr.user),
      "PR opened",
      pr.created_at,
      POINTS["PR opened"],
      { title: pr.title, link: pr.html_url }
    );
  }

  console.log("🔍 PRs merged");
  for (const pr of await searchByDateChunks(
    `org:${ORG}+is:pr+is:merged`,
    since,
    now,
    30,
    "merged"
  )) {
    if (isBotUser(pr.user)) continue;
    
    // Aggregate for overview
    const repoName = extractRepoName(pr.html_url);
    if (repoName && pr.closed_at) {
      const mergedAt = new Date(pr.closed_at);
      const rStats = getRepoStats(repoName);
      if (mergedAt >= CURRENT_START_DATE && mergedAt <= now) {
        rStats.pr_merged++;
        addRepoContributor(repoName, pr.user.login, POINTS["PR merged"]);
      } else if (mergedAt >= PREVIOUS_START_DATE && mergedAt < CURRENT_START_DATE) {
        rStats.pr_merged_prev++;
      }
    }

    addActivity(
      ensureUser(users, pr.user),
      "PR merged",
      pr.closed_at!,
      POINTS["PR merged"],
      { title: pr.title, link: pr.html_url }
    );
  }

  console.log("🔍 Issues opened");
  for (const issue of await searchByDateChunks(
    `org:${ORG}+is:issue`,
    since,
    now
  )) {
    if (isBotUser(issue.user)) continue;
    
    // Aggregate for overview
    const repoName = extractRepoName(issue.html_url);
    if (repoName) {
      const issueDate = new Date(issue.created_at);
      if (issueDate >= CURRENT_START_DATE) {
        const rStats = getRepoStats(repoName);
        rStats.issue_created++;
        addRepoContributor(repoName, issue.user.login, POINTS["Issue opened"]);
      }
    }

    addActivity(
      ensureUser(users, issue.user),
      "Issue opened",
      issue.created_at,
      POINTS["Issue opened"],
      { title: issue.title, link: issue.html_url }
    );
  }

  // Fetch reviews
  await fetchAllReviews(users, since, now);
  
  // Fetch issue triaging activities
  await fetchIssueTriagingActivities(users, since, now);
  
  // Merge existing activities (incremental mode)
  if (isIncremental) {
    console.log("🔄 Merging with existing data...");
    mergeExistingActivities(users, existing);
  }
  
  // Deduplicate and recalculate all totals
  console.log("🧹 Deduplicating activities...");
  deduplicateAndRecalculate(users);

  // Fetch currently active and stale PRs (open, non-draft)
  console.log("🔍 Fetching open PRs for active/stale tracking...");
  const openPRs = await fetchAll<{ title: string; html_url: string; updated_at: string; user: { login: string } }>(`${GITHUB_API}/search/issues?q=org:${ORG}+is:pr+is:open+-is:draft`);
  
  const staleThreshold = daysAgo(14);

  for (const pr of openPRs) {
    if (!pr.user?.login || isBotUser(pr.user)) continue;
    const user = users.get(pr.user.login);
    if (user) {
      const updatedAt = new Date(pr.updated_at);
      const prData = {
        title: pr.title,
        link: pr.html_url,
        updatedAt: pr.updated_at
      };

      if (updatedAt < staleThreshold) {
        user.stale_prs ??= [];
        user.stale_prs.push(prData);
      } else {
        user.active_prs ??= [];
        user.active_prs.push(prData);
      }
    }
  }

  const entries = [...users.values()]
    .filter((u) => u.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points);

  const outDir = path.join(process.cwd(), "public", "leaderboard");
  fs.mkdirSync(outDir, { recursive: true });

  // Calculate actual date range (always show full year range for display)
  const displaySince = daysAgo(365);
  
  const yearData = {
    period: "year",
    updatedAt: Date.now(),
    lastFetchedAt: Date.now(),  // Track when we last fetched for incremental updates
    startDate: iso(displaySince),
    endDate: iso(now),
    hiddenRoles: [],
    topByActivity: {},
    entries,
  };

  fs.writeFileSync(
    path.join(outDir, "year.json"),
    JSON.stringify(yearData, null, 2)
  );

  const mode = isIncremental ? "(incremental)" : "(full)";
  console.log(`✅ Generated year.json ${mode} (${entries.length})`);

  derivePeriod(yearData, 7, "week");
  derivePeriod(yearData, 30, "month");
  generateRecentActivities(yearData);
  await generateRepoOverview(repoStatsMap)
}

/* -------------------------------------------------------
   DERIVED PERIODS
------------------------------------------------------- */

function derivePeriod(source: YearData, days: number, period: string) {
  const cutoff = daysAgo(days);

  const entries = source.entries
    .map((entry: Contributor) => {
      const acts = entry.raw_activities.filter(
        (a) => new Date(a.occured_at) >= cutoff
      );
      if (acts.length === 0) return null;

      const breakdown: Record<string, { count: number; points: number }> = {};
      const daily: Record<string, DailyActivity> = {};
      let total = 0;

       for (const a of acts) {
        const day = a.occured_at.split("T")[0]!;

        total += a.points;

        breakdown[a.type] ??= { count: 0, points: 0 };
        breakdown[a.type].count += 1;
        breakdown[a.type].points += a.points;

        daily[day] ??= { date: day, count: 0, points: 0 };
        daily[day].count += 1;
        daily[day].points += a.points;
      }

      return {
        username: entry.username,
        name: entry.name,
        avatar_url: entry.avatar_url,
        role: entry.role,
        total_points: total,
        activity_breakdown: breakdown,
        daily_activity: Object.values(daily),
        activities: acts,
      };
    })
    .filter(Boolean)
    .sort((a: UserEntry | null, b: UserEntry | null) => (b?.total_points ?? 0) - (a?.total_points ?? 0));

  fs.writeFileSync(
    path.join(process.cwd(), "public", "leaderboard", `${period}.json`),
    JSON.stringify(
      {
        period,
        updatedAt: Date.now(),
        startDate: iso(cutoff),
        endDate: iso(new Date()),
        hiddenRoles: [],
        topByActivity: {},
        entries,
      },
      null,
      2
    )
  );

  console.log(`✅ Generated ${period}.json`);
}

/* -------------------------------------------------------
   RECENT ACTIVITIES
------------------------------------------------------- */

function generateRecentActivities(source: YearData, days = 14) {
  const cutoff = daysAgo(days);
  const groups = new Map<string, RecentActivityItem[]>();

  for (const entry of source.entries) {
    for (const act of entry.raw_activities) {
      const day = act.occured_at.split("T")[0]!;
      if (new Date(day) < cutoff) continue;

      groups.set(day, groups.get(day) ?? []);
      groups.get(day)!.push({
        username: entry.username,
        name: entry.name,
        title: act.title ?? null,
        link: act.link ?? null,
        avatar_url: entry.avatar_url,
        points: act.points,
      });
    }
  }

  fs.writeFileSync(
    path.join(process.cwd(), "public", "leaderboard", "recent-activities.json"),
    JSON.stringify(
      { updatedAt: Date.now(), groups: [...groups.entries()] },
      null,
      2
    )
  );

  console.log("✅ Generated recent-activities.json");
}

/* -------------------------------------------------------
   RUN
------------------------------------------------------- */

generateYear().catch((e) => {
  console.error("❌ Leaderboard generation failed");
  console.error(e);
  process.exit(1);
});
