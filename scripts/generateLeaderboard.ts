/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { GitHubService } from "./services/github.service";
import { ScoringEngine, POINTS } from "./services/scoring.service";
import {
  DailyActivity,
  Contributor,
  UserEntry,
  GitHubSearchItem,
  YearData,
  RecentActivityItem,
  RepoStats,
  ExistingYearData
} from "./types";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const ORG = "CircuitVerse";
const TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = "https://api.github.com";

if (!TOKEN) {
  throw new Error("❌ GITHUB_TOKEN is required");
}

const github = new GitHubService(TOKEN, GITHUB_API);

/* -------------------------------------------------------
   UTILS
------------------------------------------------------- */

function iso(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
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
   REVIEW FETCHING
------------------------------------------------------- */

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

async function fetchAllReviews(
  users: Map<string, Contributor>,
  since: Date,
  now: Date
) {
  console.log("🔍 Review submitted");

  // Fetch all repos in the organization
  const allRepos = await github.fetchOrgRepos(ORG);

  // Track reviews to avoid duplicates (one review per reviewer per PR)
  const reviewSeen = new Set<string>();

  // Parallel batch size
  const BATCH_SIZE = 5;

  for (const repoName of allRepos) {
    console.log(`   → ${repoName}`);
    const prs = (await github.fetchRepoPRs(ORG, repoName, since)) as any[];
    console.log(`      ${prs.length} PRs found (fetching in batches of ${BATCH_SIZE})`);

    // Process PRs in parallel batches
    const prBatches = chunk(prs, BATCH_SIZE);

    for (const batch of prBatches) {
      // Fetch reviews for batch in parallel
      const reviewResults = await Promise.all(
        batch.map(pr => github.fetchPRReviews(ORG, repoName, pr.number).then(reviews => ({ pr, reviews: reviews as GitHubReview[] })))
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

          ScoringEngine.addActivity(
            ScoringEngine.ensureUser(users, review.user),
            "Review submitted",
            review.submitted_at,
            POINTS["Review submitted"],
            { title: `Review on PR #${pr.number}`, link: `https://github.com/${ORG}/${repoName}/pull/${pr.number}` }
          );
        }
      }

      // Small delay between batches to avoid overwhelming the API
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

/* -------------------------------------------------------
   OVERVIEW LOGIC
------------------------------------------------------- */

// ------ Helpers ------

async function fetchRepoMeta(repo: string) {
  const res = await github.get(`${GITHUB_API}/repos/${ORG}/${repo}`);
  if (!res.ok) return null;
  return res.json()
}

// ------ Metric fetchers ------

async function fetchIssuesCreated(repo: string, current_start: Date) {
  console.log("      🔎 Fetching current issues...");
  const issues = (await github.fetchAll(
    `${GITHUB_API}/repos/${ORG}/${repo}/issues?state=all&since=${iso(current_start)}`
  )) as any[]; // TODO: Type this properly in future

  return issues.filter(
    (i: any) =>
      !i.pull_request &&
      new Date(i.created_at) >= current_start &&
      !isBotUser(i.user)
  ).length;
}

async function fetchPRsOpened(repo: string, current_start: Date) {
  console.log("      🔎 Fetching current PRs opened...");

  let count = 0;
  let page = 1;

  while (true) {
    const res = await github.get(
      `${GITHUB_API}/repos/${ORG}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100&page=${page}`
    );

    if (!res.ok) break;

    const prs = (await res.json()) as any[];
    if (!prs.length) break;

    for (const pr of prs) {
      if (new Date(pr.created_at) < current_start) return count; // Early exit
      if (!isBotUser(pr.user)) count++;
    }

    if (prs.length < 100) break;
    page++;
  }

  return count;
}

async function fetchPRsMerge(repo: string, current_start: Date, previous_start: Date, now: Date) {
  console.log("      🔎 Fetching PRs merged...");
  const prs = (await github.fetchAll(
    `${GITHUB_API}/repos/${ORG}/${repo}/pulls?state=closed&sort=updated&direction=desc`
  )) as any[];

  let current = 0;
  let previous = 0;

  for (const pr of prs) {
    if (!pr.merged_at) continue;
    if (isBotUser(pr.user)) continue;
    const mergedAt = new Date(pr.merged_at);
    if (mergedAt >= current_start && mergedAt <= now) current++;
    if (mergedAt >= previous_start && mergedAt < current_start) previous++;
  }

  return { current, previous };
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

async function generateRepoOverview() {
  console.log("📊 Generating repo overview");

  const NOW = new Date();
  const CURRENT_START = daysAgo(30);
  const PREVIOUS_START = daysAgo(60);

  const repos = await github.fetchOrgRepos(ORG);

  const res: RepoStats[] = [];

  console.log(`📦 ${repos.length} repositories found`);

  for (const repo of repos) {
    try {
      console.log(`   📁 Fetching repo ${ORG}/${repo}...`);
      const meta = await fetchRepoMeta(repo);
      if (!meta) {
        console.log(`      ⚠️ Skipped (meta fetch failed)`);
        continue;
      }
      console.log(`      📈 Fetching CURRENT stats`);
      const issue_created = await fetchIssuesCreated(repo, CURRENT_START);
      const pr_opened = await fetchPRsOpened(repo, CURRENT_START);
      const { current: pr_merged, previous: pr_merged_prev } = await fetchPRsMerge(repo, CURRENT_START, PREVIOUS_START, NOW);

      const currentTotal = issue_created + pr_opened + pr_merged;
      res.push({
        name: repo,
        description: meta.description,
        language: meta.language,
        avatar_url: meta.owner?.avatar_url ?? '',
        html_url: meta.html_url,
        stars: meta.stargazers_count,
        forks: meta.forks,
        current: {
          pr_opened,
          pr_merged,
          issue_created,
          currentTotalContribution: currentTotal
        },
        previous: {
          pr_merged: pr_merged_prev,
        },
        growth: {
          pr_merged: pr_merged - pr_merged_prev,
        },
      });
      console.log(`      ✅ Done`);
    } catch (error) {
      console.error(`      ❌ Error processing ${repo}:`, error);
      // Continue with next repo
      continue;
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
  const updatedIssues = await github.searchByDateChunks(
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
    await new Promise(r => setTimeout(r, 1000));
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
    const events: GitHubIssueEvent[] = (await github.fetchIssueEvents(ORG, repoName, issueNumber)) as GitHubIssueEvent[];

    // Process events for triaging activities
    for (const event of events) {
      if (!event.actor?.login || isBotUser(event.actor)) continue;

      const eventDate = new Date(event.created_at);
      if (eventDate < since || eventDate > now) continue;

      const user = ScoringEngine.ensureUser(users, event.actor);

      switch (event.event) {
        case "labeled":
          // Only count meaningful labels (not automated ones)
          if (event.label?.name && !isAutomatedLabel(event.label.name)) {
            ScoringEngine.addActivity(
              user,
              "Issue labeled",
              event.created_at,
              POINTS["Issue labeled"],
              {
                title: `Labeled issue #${issueNumber}: ${event.label.name}`,
                link: issue.html_url
              }
            );
          }
          break;

        case "assigned":
          // Only count assignments where the actor is not assigning themselves
          if (event.assignee && event.actor.login !== event.assignee.login) {
            ScoringEngine.addActivity(
              user,
              "Issue assigned",
              event.created_at,
              POINTS["Issue assigned"],
              {
                title: `Assigned issue #${issueNumber} to ${event.assignee.login}`,
                link: issue.html_url
              }
            );
          }
          break;

        case "closed":
          // Only count manual closures by maintainers
          if (event.actor.login !== issue.user.login) {
            ScoringEngine.addActivity(
              user,
              "Issue closed",
              event.created_at,
              POINTS["Issue closed"],
              {
                title: `Closed issue #${issueNumber}: ${ScoringEngine.sanitizeTitle(issue.title)}`,
                link: issue.html_url
              }
            );
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
    // Incremental: fetch only since last run
    since = new Date(existing.lastFetchedAt);
    console.log(`📦 Incremental update since ${iso(since)}`);
  } else {
    // Full fetch: last 365 days
    since = daysAgo(365);
    console.log(`📦 Full fetch from ${iso(since)}`);
  }

  console.log("🔍 PRs opened");
  for (const pr of await github.searchByDateChunks(`org:${ORG}+is:pr`, since, now)) {
    if (isBotUser(pr.user)) continue;
    ScoringEngine.addActivity(
      ScoringEngine.ensureUser(users, pr.user),
      "PR opened",
      pr.created_at,
      POINTS["PR opened"],
      { title: pr.title, link: pr.html_url }
    );
  }

  console.log("🔍 PRs merged");
  for (const pr of await github.searchByDateChunks(
    `org:${ORG}+is:pr+is:merged`,
    since,
    now,
    30,
    "merged"
  )) {
    if (isBotUser(pr.user)) continue;
    ScoringEngine.addActivity(
      ScoringEngine.ensureUser(users, pr.user),
      "PR merged",
      pr.closed_at!,
      POINTS["PR merged"],
      { title: pr.title, link: pr.html_url }
    );
  }

  console.log("🔍 Issues opened");
  for (const issue of await github.searchByDateChunks(
    `org:${ORG}+is:issue`,
    since,
    now
  )) {
    if (isBotUser(issue.user)) continue;
    ScoringEngine.addActivity(
      ScoringEngine.ensureUser(users, issue.user),
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
  ScoringEngine.deduplicateAndRecalculate(users);

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
  derivePeriod(yearData, 60, "2month");
  generateRecentActivities(yearData);
  await generateRepoOverview();
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

        const bucket =
          breakdown[a.type] ?? (breakdown[a.type] = { count: 0, points: 0 });

        bucket.count += 1;
        bucket.points += a.points;

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
      {
        updatedAt: Date.now(),
        groups: Array.from(groups.entries()).sort((a, b) =>
          b[0].localeCompare(a[0])
        ),
      },
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
