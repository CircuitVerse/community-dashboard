import fs from "fs";
import path from "path";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const ORG = "CircuitVerse";
const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  throw new Error("❌ GITHUB_TOKEN is required");
}

// Ensure TOKEN is string type for the rest of the file
const GITHUB_TOKEN: string = TOKEN;

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

interface GitHubUser {
  login: string;
  avatar_url: string;
  type?: string;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  state: string;
  html_url: string;
  draft: boolean;
}

interface GitHubIssue {
  number: number;
  title: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  state: string;
  html_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  pull_request?: {
    merged_at: string | null;
  }; // Present if it's a PR
}

interface GitHubReview {
  id: number;
  user: GitHubUser;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED";
  submitted_at: string;
  pull_request_url: string;
}

interface ReviewMetrics {
  totalReviews: number;
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  averageReviewTimeHours: number;
  topReviewers: Array<{
    username: string;
    reviewCount: number;
    avatarUrl: string;
  }>;
  reviewVelocity: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  dailyReviewData: Array<{
    date: string;
    reviews: number;
    avgTimeHours: number;
  }>;
  reviewStateDistribution: {
    approved: number;
    changesRequested: number;
    commented: number;
    pending: number;
  };
  prsNeedingReview: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    ageHours: number;
    isDraft: boolean;
  }>;
  prsReadyToMerge: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    approvals: number;
    ageHours: number;
  }>;
}

interface IssueMetrics {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  pendingTriage: number;
  recentlyTriaged: number;
  triageVelocity: {
    daily: number;
    weekly: number;
  };
  ageDistribution: {
    lessThan24h: number;
    oneToSevenDays: number;
    sevenToThirtyDays: number;
    moreThanThirtyDays: number;
  };
  dailyTriageData: Array<{
    date: string;
    triaged: number;
    pending: number;
    total: number;
  }>;
  issuesPendingTriage: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    ageHours: number;
    labels: string[];
  }>;
}

interface AnalyticsData {
  organization: string;
  lastUpdated: string;
  reviewMetrics: ReviewMetrics;
  issueMetrics: IssueMetrics;
  repositories: number;
}

/* -------------------------------------------------------
   UTILS
------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function smartSleep(res: Response, defaultMs: number = 500): Promise<void> {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining) {
    const remainingCount = parseInt(remaining, 10);
    if (remainingCount > 500) {
      await sleep(200);
    } else if (remainingCount > 100) {
      await sleep(400);
    } else {
      await sleep(1000);
    }
  } else {
    await sleep(defaultMs);
  }
}

function isBotUser(user: GitHubUser): boolean {
  if (!user?.login) return true;
  if (user.type && user.type !== "User") return true;
  return user.login.endsWith("[bot]");
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

/* -------------------------------------------------------
   GITHUB API CALLS
------------------------------------------------------- */

async function fetchFromGitHub(endpoint: string): Promise<unknown> {
  const url = `${GITHUB_API}${endpoint}`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'community-dashboard-analytics',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  await smartSleep(res);
  return res.json();
}

async function getRepositories(): Promise<Array<{ name: string; owner: { login: string } }>> {
  console.log("📥 Fetching repositories...");
  const repos = await fetchFromGitHub(`/orgs/${ORG}/repos?type=all&per_page=100`) as Array<{ name: string; owner: { login: string }; archived: boolean; disabled: boolean }>;
  return repos.filter((repo: { archived: boolean; disabled: boolean }) => !repo.archived && !repo.disabled);
}

async function getPullRequests(owner: string, repo: string, since: Date): Promise<GitHubPullRequest[]> {
  console.log(`📥 Fetching PRs for ${repo}...`);
  const prs = await fetchFromGitHub(
    `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&since=${since.toISOString()}&per_page=100`
  ) as GitHubPullRequest[];
  return prs.filter((pr: GitHubPullRequest) => !isBotUser(pr.user));
}

async function getIssues(owner: string, repo: string, since: Date): Promise<GitHubIssue[]> {
  console.log(`📥 Fetching issues for ${repo}...`);
  const issues = await fetchFromGitHub(
    `/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc&since=${since.toISOString()}&per_page=100`
  ) as GitHubIssue[];
  // Filter out PRs (GitHub treats PRs as issues) and bot users
  return issues.filter((issue: GitHubIssue) => 
    !issue.pull_request && !isBotUser(issue.user)
  );
}

async function getReviews(owner: string, repo: string, prNumber: number): Promise<GitHubReview[]> {
  try {
    const reviews = await fetchFromGitHub(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`) as GitHubReview[];
    return reviews.filter((review: GitHubReview) => !isBotUser(review.user));
  } catch (error) {
    console.warn(`⚠️ Failed to fetch reviews for PR ${prNumber}: ${error}`);
    return [];
  }
}

/* -------------------------------------------------------
   DATA PROCESSING
------------------------------------------------------- */

function calculateReviewMetrics(
  pullRequests: GitHubPullRequest[], 
  allReviews: Record<string, GitHubReview[]>,
  repoMap: Record<string, string> // Maps PR number to repository name
): ReviewMetrics {
  const now = new Date();
  const last7Days = daysAgo(7);
  const last30Days = daysAgo(30);

  let totalReviews = 0;
  let reviewsLast7Days = 0;
  let reviewsLast30Days = 0;
  const reviewerStats: Record<string, { count: number; avatar_url: string }> = {};
  const reviewTimes: number[] = [];
  const dailyReviews: Record<string, { reviews: number; times: number[] }> = {};
  const stateDistribution = { approved: 0, changesRequested: 0, commented: 0, pending: 0 };

  // Track PRs needing review and ready to merge
  const prsNeedingReview: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    ageHours: number;
    isDraft: boolean;
  }> = [];
  const prsReadyToMerge: Array<{
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
    createdAt: string;
    url: string;
    repository: string;
    approvals: number;
    ageHours: number;
  }> = [];

  // Process all reviews
  Object.entries(allReviews).forEach(([prNumber, reviews]) => {
    const pr = pullRequests.find(p => p.number.toString() === prNumber);
    if (!pr) return;

    reviews.forEach(review => {
      const reviewDate = new Date(review.submitted_at);
      const prCreatedDate = new Date(pr.created_at);
      
      totalReviews++;
      
      if (reviewDate >= last7Days) reviewsLast7Days++;
      if (reviewDate >= last30Days) reviewsLast30Days++;

      // Track reviewer stats
      if (review.user && !reviewerStats[review.user.login]) {
        reviewerStats[review.user.login] = {
          count: 0,
          avatar_url: review.user.avatar_url,
        };
      }
      if (review.user && reviewerStats[review.user.login]) {
        reviewerStats[review.user.login]!.count++;
      }

      // Calculate review time
      const timeDiff = reviewDate.getTime() - prCreatedDate.getTime();
      const hoursToReview = timeDiff / (1000 * 60 * 60);
      reviewTimes.push(hoursToReview);

      // Daily review data
      const dateStr = formatDate(reviewDate);
      if (!dailyReviews[dateStr]) {
        dailyReviews[dateStr] = { reviews: 0, times: [] };
      }
      dailyReviews[dateStr].reviews++;
      dailyReviews[dateStr].times.push(hoursToReview);

      // Review state distribution
      switch (review.state) {
        case 'APPROVED':
          stateDistribution.approved++;
          break;
        case 'CHANGES_REQUESTED':
          stateDistribution.changesRequested++;
          break;
        case 'COMMENTED':
          stateDistribution.commented++;
          break;
      }
    });
  });

  // Identify PRs needing review and ready to merge
  pullRequests.forEach(pr => {
    // Skip closed PRs, merged PRs, and draft PRs for review considerations
    if (pr.state !== 'open' || pr.merged_at || pr.draft) return;

    const prReviews = allReviews[pr.number.toString()] || [];
    const approvals = prReviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = prReviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
    const ageHours = (now.getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60);

    // PRs needing review: open, non-draft, non-merged, with no reviews or only comments
    if (prReviews.length === 0 || prReviews.every(r => r.state === 'COMMENTED')) {
      prsNeedingReview.push({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        url: pr.html_url,
        repository: repoMap[pr.number.toString()] || 'unknown',
        ageHours: Math.round(ageHours * 10) / 10,
        isDraft: pr.draft,
      });
    }

    // PRs ready to merge: have approvals, no pending change requests, not merged yet
    if (approvals > 0 && changesRequested === 0) {
      prsReadyToMerge.push({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        url: pr.html_url,
        repository: repoMap[pr.number.toString()] || 'unknown',
        approvals,
        ageHours: Math.round(ageHours * 10) / 10,
      });
    }
  });

  // Count pending reviews
  stateDistribution.pending = prsNeedingReview.length;

  // Generate daily review data for the last 14 days
  const dailyReviewData = [];
  for (let i = 13; i >= 0; i--) {
    const date = daysAgo(i);
    const dateStr = formatDate(date);
    const dayData = dailyReviews[dateStr] || { reviews: 0, times: [] };
    
    dailyReviewData.push({
      date: dateStr,
      reviews: dayData.reviews,
      avgTimeHours: dayData.times.length > 0 
        ? dayData.times.reduce((a, b) => a + b, 0) / dayData.times.length 
        : 0,
    });
  }

  const averageReviewTimeHours = reviewTimes.length > 0 
    ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length 
    : 0;

  const topReviewers = Object.entries(reviewerStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([username, stats]) => ({
      username,
      reviewCount: stats.count,
      avatarUrl: stats.avatar_url,
    }));

  return {
    totalReviews,
    reviewsLast7Days,
    reviewsLast30Days,
    averageReviewTimeHours: Math.round(averageReviewTimeHours * 100) / 100,
    topReviewers,
    reviewVelocity: {
      daily: reviewsLast7Days / 7,
      weekly: reviewsLast7Days,
      monthly: reviewsLast30Days,
    },
    dailyReviewData,
    reviewStateDistribution: stateDistribution,
    prsNeedingReview: prsNeedingReview.sort((a, b) => a.ageHours - b.ageHours).slice(0, 20),
    prsReadyToMerge: prsReadyToMerge.sort((a, b) => a.ageHours - b.ageHours).slice(0, 20),
  };
}

function calculateIssueMetrics(issues: GitHubIssue[], repoMap: Record<string, string>): IssueMetrics {
  const now = new Date();
  const last7Days = daysAgo(7);

  const openIssues = issues.filter(issue => issue.state === 'open');
  const closedIssues = issues.filter(issue => issue.state === 'closed');
  
  // Issues without labels are considered pending triage
  const pendingTriage = openIssues.filter(issue => 
    issue.labels.length === 0 || 
    !issue.labels.some(label => 
      ['bug', 'enhancement', 'feature', 'documentation', 'question', 'help wanted', 'good first issue'].includes(label.name.toLowerCase())
    )
  );

  const recentlyTriaged = issues.filter(issue => {
    const updatedDate = new Date(issue.updated_at);
    return updatedDate >= last7Days && issue.labels.length > 0;
  });

  // Calculate age distribution for pending triage issues
  const ageDistribution = {
    lessThan24h: 0,
    oneToSevenDays: 0,
    sevenToThirtyDays: 0,
    moreThanThirtyDays: 0,
  };

  // Create detailed list of issues pending triage
  const issuesPendingTriage = pendingTriage.map(issue => {
    const createdDate = new Date(issue.created_at);
    const ageInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    
    if (ageInHours < 24) {
      ageDistribution.lessThan24h++;
    } else if (ageInHours < 24 * 7) {
      ageDistribution.oneToSevenDays++;
    } else if (ageInHours < 24 * 30) {
      ageDistribution.sevenToThirtyDays++;
    } else {
      ageDistribution.moreThanThirtyDays++;
    }

    return {
      number: issue.number,
      title: issue.title,
      author: issue.user.login,
      authorAvatar: issue.user.avatar_url,
      createdAt: issue.created_at,
      url: issue.html_url,
      repository: repoMap[issue.number.toString()] || 'unknown',
      ageHours: Math.round(ageInHours * 10) / 10,
      labels: issue.labels.map(label => label.name),
    };
  }).sort((a, b) => a.ageHours - b.ageHours).slice(0, 50); // Top 50 newest first

  // Generate daily triage data for the last 14 days
  const dailyTriageData = [];
  for (let i = 13; i >= 0; i--) {
    const date = daysAgo(i);
    const dateStr = formatDate(date);
    
    const dayTriaged = issues.filter(issue => {
      const updatedDate = new Date(issue.updated_at);
      return formatDate(updatedDate) === dateStr && issue.labels.length > 0;
    }).length;
    
    const dayPending = issues.filter(issue => {
      const createdDate = new Date(issue.created_at);
      return formatDate(createdDate) === dateStr && issue.labels.length === 0;
    }).length;

    dailyTriageData.push({
      date: dateStr,
      triaged: dayTriaged,
      pending: dayPending,
      total: dayTriaged + dayPending,
    });
  }

  return {
    totalIssues: issues.length,
    openIssues: openIssues.length,
    closedIssues: closedIssues.length,
    pendingTriage: pendingTriage.length,
    recentlyTriaged: recentlyTriaged.length,
    triageVelocity: {
      daily: recentlyTriaged.length / 7,
      weekly: recentlyTriaged.length,
    },
    ageDistribution,
    dailyTriageData,
    issuesPendingTriage,
  };
}

/* -------------------------------------------------------
   MAIN SCRIPT
------------------------------------------------------- */

async function generateAnalytics(): Promise<void> {
  console.log("🚀 Starting analytics generation...");
  
  try {
    // Get repositories
    const repositories = await getRepositories();
    console.log(`📊 Found ${repositories.length} repositories`);
    
    // Process main repositories for comprehensive data
    const mainRepos = repositories.slice(0, 15); // Increased from 10 to 15
    console.log(`📊 Processing ${mainRepos.length} main repositories`);

    // Extended date range: last 6 months for more comprehensive recent data
    const since = daysAgo(180); // 6 months instead of 30 days
    console.log(`📅 Analyzing data since: ${since.toISOString().split('T')[0]}`);

    const allPullRequests: GitHubPullRequest[] = [];
    const allIssues: GitHubIssue[] = [];
    const allReviews: Record<string, GitHubReview[]> = {};
    const repoMap: Record<string, string> = {}; // Maps item numbers to repo names

    // Fetch data from all repositories
    for (const repo of mainRepos) {
      try {
        console.log(`\n📁 Processing ${repo.name}...`);
        
        // Fetch pull requests
        const pullRequests = await getPullRequests(repo.owner.login, repo.name, since);
        allPullRequests.push(...pullRequests);
        
        // Map PR numbers to repo names
        pullRequests.forEach(pr => {
          repoMap[pr.number.toString()] = repo.name;
        });
        
        console.log(`  ✅ Found ${pullRequests.length} pull requests`);

        // Fetch reviews for recent PRs (increased limit)
        const recentPRs = pullRequests.slice(0, 30); // Increased from 20 to 30
        for (const pr of recentPRs) {
          const reviews = await getReviews(repo.owner.login, repo.name, pr.number);
          if (reviews.length > 0) {
            allReviews[pr.number.toString()] = reviews;
          }
        }
        console.log(`  ✅ Found reviews for ${Object.keys(allReviews).length} PRs`);

        // Fetch issues
        const issues = await getIssues(repo.owner.login, repo.name, since);
        allIssues.push(...issues);
        
        // Map issue numbers to repo names
        issues.forEach(issue => {
          repoMap[issue.number.toString()] = repo.name;
        });
        
        console.log(`  ✅ Found ${issues.length} issues`);

      } catch (error) {
        console.error(`❌ Error processing ${repo.name}:`, error);
      }
    }

    console.log(`\n📊 Total data collected:`);
    console.log(`  - Pull Requests: ${allPullRequests.length}`);
    console.log(`  - Issues: ${allIssues.length}`);
    console.log(`  - Reviews: ${Object.values(allReviews).flat().length}`);

    // Calculate metrics
    console.log("\n🧮 Calculating review metrics...");
    const reviewMetrics = calculateReviewMetrics(allPullRequests, allReviews, repoMap);
    
    console.log("🧮 Calculating issue metrics...");
    const issueMetrics = calculateIssueMetrics(allIssues, repoMap);

    // Prepare final data
    const analyticsData: AnalyticsData = {
      organization: ORG,
      lastUpdated: new Date().toISOString(),
      reviewMetrics,
      issueMetrics,
      repositories: mainRepos.length,
    };

    // Save to file
    const outputDir = path.join(process.cwd(), "public", "analytics");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, "analytics.json");
    fs.writeFileSync(outputFile, JSON.stringify(analyticsData, null, 2));

    console.log(`\n✅ Analytics data generated successfully!`);
    console.log(`📁 Saved to: ${outputFile}`);
    console.log(`\n📈 Summary:`);
    console.log(`  - Total Reviews: ${reviewMetrics.totalReviews}`);
    console.log(`  - Avg Review Time: ${reviewMetrics.averageReviewTimeHours.toFixed(1)}h`);
    console.log(`  - Pending Triage: ${issueMetrics.pendingTriage}`);
    console.log(`  - Open Issues: ${issueMetrics.openIssues}`);
    console.log(`  - Data Range: Last 180 days`);
    console.log(`  - PRs Needing Review: ${reviewMetrics.prsNeedingReview.length}`);
    console.log(`  - PRs Ready to Merge: ${reviewMetrics.prsReadyToMerge.length}`);

  } catch (error) {
    console.error("❌ Failed to generate analytics:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAnalytics().then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  }).catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export { generateAnalytics };