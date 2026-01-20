/**
 * GitHub Stats SVG Generator
 * Generates a styled SVG showing CircuitVerse organization statistics
 * 
 * Run: npx tsx scripts/generateGitHubStats.ts
 */

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


/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

interface RepoMeta {
  name: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number; // This is usually stars in listing
  open_issues_count: number;
  size: number; // in KB
  license?: { spdx_id: string } | null;
}

interface RepoDetail {
  subscribers_count: number;
}

interface OrgStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  totalReleases: number;
  totalPackages: number | null;
  totalSizeGB: string;
  preferredLicense: string | null;
  sponsors: number | null;
  issues: {
    open: number;
    closed: number;
    drafts: number;
  };
  pullRequests: {
    open: number;
    merged: number;
    closed: number;
    drafts: number;
  };
}

/* -------------------------------------------------------
   UTILS
------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithAuth(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.substring(0, 100)}`);
  }

  await sleep(200); // Slight rate limiting
  return res.json();
}

async function fetchAllPages<T = unknown>(url: string): Promise<T[]> {
  let page = 1;
  const results: T[] = [];

  while (true) {
    try {
      const join = url.includes("?") ? "&" : "?";
      const data = await fetchWithAuth(`${url}${join}per_page=100&page=${page}`);
      if (!data || !Array.isArray(data)) break;
      results.push(...data);
      if (data.length < 100) break;
      page++;
    } catch (e) {
      console.warn(`Warning: Failed to fetch page ${page} of ${url}`, e);
      break;
    }
  }

  return results;
}

async function fetchSearchCount(query: string): Promise<number> {
  try {
    const data = await fetchWithAuth(
      `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=1`
    );
    return data?.total_count || 0;
  } catch (e) {
    console.warn(`Warning: Failed search query '${query}'`, e);
    return 0;
  }
}

/* -------------------------------------------------------
   DATA FETCHING
------------------------------------------------------- */

async function fetchOrgStats(): Promise<OrgStats> {
  console.log(`📊 Fetching stats for ${ORG}...`);

  // Fetch all repositories
  console.log("   → Fetching repositories...");
  const repos = await fetchAllPages<RepoMeta>(`${GITHUB_API}/orgs/${ORG}/repos`);

  // Aggregate repo stats
  let totalStars = 0;
  let totalForks = 0;
  let totalWatchers = 0;
  let totalSizeKB = 0;
  const licenseCount: Record<string, number> = {};
  
  // Need to fetch details for actual subscribers (watchers) count and releases
  console.log("   → Fetching detailed repo stats (subscribers & releases)...");
  let totalReleases = 0;

  for (const repo of repos) {
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;
    totalSizeKB += repo.size || 0;
    
    if (repo.license?.spdx_id) {
      licenseCount[repo.license.spdx_id] = (licenseCount[repo.license.spdx_id] || 0) + 1;
    }

    // Get real subscribers count (watchers)
    try {
      const detail = await fetchWithAuth(`${GITHUB_API}/repos/${ORG}/${repo.name}`) as RepoDetail;
      totalWatchers += detail.subscribers_count || 0;
    } catch (e) {
      console.warn(`   ⚠️ Failed to fetch details for ${repo.name}, using list data`);
      // Fallback to watchers_count from list (which is stars, but better than 0) or just ignore
    }

    // Get releases (ALL repos, no sampling)
    try {
      const releases = await fetchAllPages(`${GITHUB_API}/repos/${ORG}/${repo.name}/releases`);
      totalReleases += releases.length;
    } catch (e) {
       console.warn(`   ⚠️ Failed to fetch releases for ${repo.name}`);
    }
  }

  // Find most common license
  const preferredLicense = Object.entries(licenseCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Fetch issue/PR counts using Search API
  console.log("   → Fetching issues...");
  const openIssues = await fetchSearchCount(`org:${ORG} is:issue is:open`);
  const closedIssues = await fetchSearchCount(`org:${ORG} is:issue is:closed`);

  console.log("   → Fetching pull requests...");
  const openPRs = await fetchSearchCount(`org:${ORG} is:pr is:open`);
  const mergedPRs = await fetchSearchCount(`org:${ORG} is:pr is:merged`);
  const closedPRs = await fetchSearchCount(`org:${ORG} is:pr is:closed is:unmerged`);
  const draftPRs = await fetchSearchCount(`org:${ORG} is:pr draft:true`);

  const totalSizeGB = (totalSizeKB / 1024 / 1024).toFixed(2);

  return {
    totalRepos: repos.length,
    totalStars,
    totalForks,
    totalWatchers,
    totalReleases,
    totalPackages: null, // GitHub packages API requires different permissions
    totalSizeGB,
    preferredLicense,
    sponsors: null, // Sponsors API requires special permissions
    issues: {
      open: openIssues,
      closed: closedIssues,
      drafts: 0,
    },
    pullRequests: {
      open: openPRs,
      merged: mergedPRs,
      closed: closedPRs,
      drafts: draftPRs,
    },
  };
}

/* -------------------------------------------------------
   SVG ICONS (matching reference design)
------------------------------------------------------- */

// Icons matching the reference image style
const ICONS = {
  repo: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/></svg>`,
  license: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 010 1.5h-.427l2.111 4.692a.75.75 0 01-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.054.049-.193.17a4.25 4.25 0 01-.568.428c-.386.251-.931.516-1.629.516-.698 0-1.243-.265-1.629-.516a4.25 4.25 0 01-.568-.427 2.5 2.5 0 01-.247-.22l-.006-.005-.002-.002-.001-.001L11 6.5l-.53.53a.75.75 0 01-.154-.838L12.427 4.5h-.234c-.09 0-.178-.044-.261-.088l-1.044-.594a1.01 1.01 0 00-.513-.138H8.75V15.25a.75.75 0 01-1.5 0V3.68H5.732c-.184 0-.363.053-.513.138l-1.044.594a.493.493 0 01-.261.088h-.234l2.111 4.692a.75.75 0 01-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.054.049-.193.17a4.25 4.25 0 01-.568.428c-.386.251-.931.516-1.629.516-.698 0-1.243-.265-1.629-.516a4.25 4.25 0 01-.568-.427 2.5 2.5 0 01-.247-.22l-.006-.005-.002-.002-.001-.002L1 6.5l-.53.53a.75.75 0 01-.154-.838L2.427 4.5H2a.75.75 0 010-1.5h2.234c.044 0 .086-.011.124-.033l1.29-.736c.264-.151.563-.231.867-.231H7.25V.75a.75.75 0 011.5 0zm-5.5 5.5l-1.625 3.625c.135.092.282.177.44.254.331.164.678.25.935.25s.604-.086.935-.25c.158-.077.305-.162.44-.254L4.75 6.25zm6.5 0l-1.625 3.625c.135.092.282.177.44.254.331.164.678.25.935.25s.604-.086.935-.25c.158-.077.305-.162.44-.254L11.25 6.25z"/></svg>`,
  release: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M2.5 7.775V2.75a.25.25 0 01.25-.25h5.025a.25.25 0 01.177.073l6.25 6.25a.25.25 0 010 .354l-5.025 5.025a.25.25 0 01-.354 0l-6.25-6.25a.25.25 0 01-.073-.177zm-1.5 0V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.237.513l6.25 6.25a1.75 1.75 0 010 2.474l-5.025 5.025a1.75 1.75 0 01-2.474 0l-6.25-6.25A1.75 1.75 0 011 7.775zM6 5a1 1 0 100 2 1 1 0 000-2z"/></svg>`,
  package: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M8.878.392a1.75 1.75 0 00-1.756 0l-5.25 3.045A1.75 1.75 0 001 4.951v6.098c0 .624.332 1.2.872 1.514l5.25 3.045a1.75 1.75 0 001.756 0l5.25-3.045c.54-.313.872-.89.872-1.514V4.951c0-.624-.332-1.2-.872-1.514L8.878.392zM7.875 1.69a.25.25 0 01.25 0l4.63 2.685L8 7.133 3.245 4.375l4.63-2.685zM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432L2.5 5.677zm6.25 8.271l4.625-2.683a.25.25 0 00.125-.216V5.677L8.75 8.432v5.516z"/></svg>`,
  storage: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M2.75 2h10.5a.75.75 0 000-1.5H2.75a.75.75 0 000 1.5zm10.5 12H2.75a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5zM2.75 5a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h10.5a.75.75 0 00.75-.75v-4.5a.75.75 0 00-.75-.75H2.75zM6 8.5a1 1 0 11-2 0 1 1 0 012 0z"/></svg>`,
  heart: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M7.655 14.916v-.001h-.002l-.006-.003-.018-.01a22.066 22.066 0 01-3.744-2.584C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.044 5.231-3.886 6.818a22.094 22.094 0 01-3.433 2.414 7.152 7.152 0 01-.329.18l-.018.01-.006.003h-.002l-.001.001a.752.752 0 01-.65 0l-.001-.001z"/></svg>`,
  star: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>`,
  fork: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 010 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 010-1.798c.45-.678 1.367-1.932 2.637-3.023C4.33 2.992 6.019 2 8 2zM1.679 7.932a.12.12 0 000 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.824-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 000-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`,
  trend: `<svg width="14" height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M1 3a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v10a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V3zm5 4a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v6a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V7zm5-2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v8a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V5z"/></svg>`,
  issueOpen: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#22c55e"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>`,
  issueClosed: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#a855f7"><path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z"/><path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 10-13 0 6.5 6.5 0 0013 0z"/></svg>`,
  issueDraft: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#8b949e"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>`,
  issueSkipped: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#8b949e"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/><path d="M4.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z"/></svg>`,
  prOpen: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#22c55e"><path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 101.5 0 .75.75 0 00-1.5 0z"/></svg>`,
  prMerged: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#a855f7"><path d="M5.45 5.154A4.25 4.25 0 009.25 7.5h1.378a2.251 2.251 0 110 1.5H9.25A5.734 5.734 0 015 7.123v3.505a2.25 2.25 0 11-1.5 0V5.372a2.25 2.25 0 111.95-.218zM4.25 13.5a.75.75 0 100-1.5.75.75 0 000 1.5zm8.5-4.5a.75.75 0 100-1.5.75.75 0 000 1.5zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"/></svg>`,
  prDraft: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#8b949e"><path d="M3.25 1A2.25 2.25 0 011 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5zM8 5a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z"/></svg>`,
  prClosed: `<svg width="12" height="12" viewBox="0 0 16 16" fill="#ef4444"><path d="M3.25 1A2.25 2.25 0 001 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5zm8.78 3.03a.75.75 0 00-1.06-1.06L8 7.44 5.78 5.22a.75.75 0 00-1.06 1.06L6.94 8.5 4.72 10.72a.75.75 0 101.06 1.06L8 9.56l2.22 2.22a.75.75 0 101.06-1.06L9.06 8.5l2.22-2.22z"/></svg>`,
};

function icon(name: keyof typeof ICONS, x: number = 0, y: number = 0): string {
  return `<g transform="translate(${x}, ${y - 10})">${ICONS[name]}</g>`;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

function generateProgressBar(
  values: { value: number; color: string }[],
  width: number,
  height: number = 8,
  id: string
): string {
  const total = values.reduce((sum, v) => sum + v.value, 0);
  if (total === 0) {
    return `<rect x="0" y="0" width="${width}" height="${height}" rx="4" fill="#3f3f46"/>`;
  }

  let x = 0;
  const segments: string[] = [];

  for (const { value, color } of values) {
    const segmentWidth = (value / total) * width;
    if (segmentWidth > 0) {
      segments.push(
        `<rect x="${x}" y="0" width="${segmentWidth}" height="${height}" fill="${color}"/>`
      );
      x += segmentWidth;
    }
  }

  return `
    <g>
      <clipPath id="${id}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="4"/>
      </clipPath>
      <g clip-path="url(#${id})">
        ${segments.join("\n        ")}
      </g>
    </g>
  `;
}

function generateSVG(stats: OrgStats): string {
  const width = 600;
  const height = 340;

  const issuesBar = generateProgressBar(
    [
      { value: stats.issues.open, color: "#22c55e" },
      { value: stats.issues.closed, color: "#a855f7" },
    ],
    180, 10, "issuesClip"
  );

  const prsBar = generateProgressBar(
    [
      { value: stats.pullRequests.open, color: "#22c55e" },
      { value: stats.pullRequests.merged, color: "#a855f7" },
      { value: stats.pullRequests.closed, color: "#ef4444" },
    ],
    180, 10, "prsClip"
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .title { font: bold 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #ffffff; }
      .repo-count { font: 500 15px 'Segoe UI', Ubuntu, Sans-Serif; fill: #58a6ff; }
      .stat-label { font: 500 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #c9d1d9; }
      .section-title { font: 500 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #58a6ff; }
      .sub-label-center { font: 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #8b949e; text-anchor: middle; }
      .legend-text { font: 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: #8b949e; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#0d1117" rx="6"/>
  
  <!-- Inner card with border -->
  <rect x="20" y="50" width="${width - 40}" height="${height - 70}" fill="none" stroke="#1f6feb" stroke-width="1" rx="6"/>

  <!-- Title -->
  <text x="20" y="32" class="title">GitHub Stats</text>

  <!-- Repositories Header (on its own line) -->
  <g transform="translate(35, 75)">
    ${icon("repo", 0, 0)}
    <text x="22" class="repo-count">${stats.totalRepos} Repositories</text>
  </g>

  <!-- Stats Grid - Two Columns (starting below Repos) -->
  <g transform="translate(35, 100)">
    <!-- Left Column -->
    <g>
      ${icon("license", 0, 0)}
      <text x="22" class="stat-label">Prefers ${stats.preferredLicense || "Various"} license</text>
      
      ${icon("release", 0, 24)}
      <text x="22" y="24" class="stat-label">${stats.totalReleases} Releases</text>
      
      ${icon("package", 0, 48)}
      <text x="22" y="48" class="stat-label">${stats.totalPackages || 0} Packages</text>
      
      ${icon("storage", 0, 72)}
      <text x="22" y="72" class="stat-label">${stats.totalSizeGB} GB used</text>
    </g>

    <!-- Right Column (aligned with license row) -->
    <g transform="translate(280, 0)">
      ${icon("heart", 0, 0)}
      <text x="22" class="stat-label">${stats.sponsors || 0} Sponsors</text>
      
      ${icon("star", 0, 24)}
      <text x="22" y="24" class="stat-label">${formatNumber(stats.totalStars)} Stargazers</text>
      
      ${icon("fork", 0, 48)}
      <text x="22" y="48" class="stat-label">${formatNumber(stats.totalForks)} Forkers</text>
      
      ${icon("eye", 0, 72)}
      <text x="22" y="72" class="stat-label">${formatNumber(stats.totalWatchers)} Watchers</text>
    </g>
  </g>

  <!-- Issues and PRs Section -->
  <g transform="translate(35, 200)">
    ${icon("trend", 0, 0)}
    <text x="22" class="section-title">Overall issues and pull requests status</text>
    
    <!-- Centered subtitle -->
    <text x="${(width - 70) / 2}" y="20" class="sub-label-center">On ${ORG}'s repositories</text>

    <!-- Headers -->
    <text x="70" y="48" class="stat-label">Issues</text>
    <text x="350" y="48" class="stat-label">Pull requests</text>

    <!-- Progress Bars -->
    <g transform="translate(0, 58)">
      ${issuesBar}
    </g>
    <g transform="translate(280, 58)">
      ${prsBar}
    </g>

    <!-- Issue Legend -->
    <g transform="translate(0, 82)">
      ${ICONS.issueOpen}
      <text x="18" y="10" class="legend-text">${formatNumber(stats.issues.open)} open</text>
      
      <g transform="translate(100, 0)">${ICONS.issueClosed}</g>
      <text x="118" y="10" class="legend-text">${formatNumber(stats.issues.closed)} closed</text>
    </g>
    
    <g transform="translate(0, 100)">
      ${ICONS.issueDraft}
      <text x="18" y="10" class="legend-text">${stats.issues.drafts} drafts</text>
      
      <g transform="translate(100, 0)">${ICONS.issueSkipped}</g>
      <text x="118" y="10" class="legend-text">0 skipped</text>
    </g>

    <!-- PR Legend -->
    <g transform="translate(280, 82)">
      ${ICONS.prOpen}
      <text x="18" y="10" class="legend-text">${formatNumber(stats.pullRequests.open)} open</text>
      
      <g transform="translate(90, 0)">${ICONS.prMerged}</g>
      <text x="108" y="10" class="legend-text">${formatNumber(stats.pullRequests.merged)} merged</text>
    </g>
    
    <g transform="translate(280, 100)">
      ${ICONS.prDraft}
      <text x="18" y="10" class="legend-text">${stats.pullRequests.drafts} drafts</text>
      
      <g transform="translate(90, 0)">${ICONS.prClosed}</g>
      <text x="108" y="10" class="legend-text">${formatNumber(stats.pullRequests.closed)} closed</text>
    </g>
  </g>
</svg>`
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

async function main() {
  console.log("🚀 Starting GitHub Stats SVG generation...\n");

  const stats = await fetchOrgStats();

  console.log("\n📋 Stats collected:");
  console.log(`   Repos: ${stats.totalRepos}`);
  console.log(`   Stars: ${stats.totalStars}`);
  console.log(`   Forks: ${stats.totalForks}`);
  console.log(`   Releases: ${stats.totalReleases}`);
  console.log(`   Size: ${stats.totalSizeGB} GB`);
  console.log(`   Issues: ${stats.issues.open} open, ${stats.issues.closed} closed`);
  console.log(`   PRs: ${stats.pullRequests.open} open, ${stats.pullRequests.merged} merged, ${stats.pullRequests.drafts} drafts`);

  const svg = generateSVG(stats);

  const outputPath = path.join(process.cwd(), "public", "github-stats.svg");
  fs.writeFileSync(outputPath, svg);

  console.log(`\n✅ Generated ${outputPath}`);
}

main().catch((e) => {
  console.error("❌ Failed to generate GitHub Stats:", e);
  process.exit(1);
});
