import fs from "fs";
import path from "path";

/* ================= CONFIG ================= */

const ORG = "CircuitVerse";
const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  throw new Error("❌ GITHUB_TOKEN is required");
}

/* ================= SCORING ================= */

const POINTS = {
  PR_OPENED: 2,
  PR_MERGED: 5,
  ISSUE_OPENED: 1,
};

/* ================= TITLE SANITIZER ================= */
/**
 * Prevents Tailwind / PostCSS crashes caused by
 * titles like: [Fix Commentator] : something
 */
function sanitizeTitle(title?: string | null) {
  if (!title) return null;

  return title
    .replace(/\[|\]/g, "") // remove brackets
    .replace(/:/g, " - ") // replace colon
    .replace(/\s+/g, " ")
    .trim();
}

/* ================= UTILS ================= */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// GitHub Search API: 30 req/min limit → throttle
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

  // ⛔ mandatory throttle
  await sleep(2500);

  return res.json();
}

function iso(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/* ================= FILTERS ================= */

function isBotUser(user: any): boolean {
  if (!user?.login) return true;
  if (user.type && user.type !== "User") return true;
  return user.login.endsWith("[bot]");
}

/* ================= TYPES ================= */

export type UserEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity: { date: string; count: number; points: number }[];
  raw_activities: {
    type: "PR opened" | "PR merged" | "Issue opened";
    occured_at: string;
    title?: string | null;
    link?: string | null;
    points: number;
  }[];
};

/* ================= HELPERS ================= */

function ensureUser(map: Map<string, UserEntry>, user: any) {
  if (!map.has(user.login)) {
    map.set(user.login, {
      username: user.login,
      name: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
      role: "Contributor",
      total_points: 0,
      activity_breakdown: {},
      daily_activity: [],
      raw_activities: [],
    });
  }
  return map.get(user.login)!;
}

function addActivity(
  entry: UserEntry,
  type: "PR opened" | "PR merged" | "Issue opened",
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

  // ✅ RAW EVENT (safe title)
  entry.raw_activities.push({
    type,
    occured_at: date,
    title: sanitizeTitle(meta?.title),
    link: meta?.link ?? null,
    points,
  });
}

/* ================= SEARCH (1000 CAP SAFE) ================= */

async function searchByDateChunks(
  baseQuery: string,
  start: Date,
  end: Date,
  stepDays = 30
): Promise<any[]> {
  const all: any[] = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const from = iso(cursor);
    const next = new Date(cursor);
    next.setDate(next.getDate() + stepDays);
    const to = next > end ? end : next;

    console.log(`→ ${from} .. ${iso(to)}`);

    let page = 1;
    while (true) {
      const res = await ghSearch(
        `${GITHUB_API}/search/issues?q=${baseQuery}+created:${from}..${iso(
          to
        )}&per_page=100&page=${page}`
      );

      all.push(...(res.items ?? []));
      if (!res.items || res.items.length < 100) break;
      page++;
    }

    cursor = to;
  }

  return all;
}

/* ================= YEAR GENERATOR ================= */

async function generateYear() {
  const since = daysAgo(365);
  const now = new Date();
  const users = new Map<string, UserEntry>();

  console.log("🔍 PRs opened");
  for (const pr of await searchByDateChunks(`org:${ORG}+is:pr`, since, now)) {
    if (isBotUser(pr.user)) continue;
    addActivity(
      ensureUser(users, pr.user),
      "PR opened",
      pr.created_at,
      POINTS.PR_OPENED,
      { title: pr.title, link: pr.html_url }
    );
  }

  console.log("🔍 PRs merged");
  for (const pr of await searchByDateChunks(
    `org:${ORG}+is:pr+is:merged`,
    since,
    now
  )) {
    if (isBotUser(pr.user)) continue;
    addActivity(
      ensureUser(users, pr.user),
      "PR merged",
      pr.closed_at,
      POINTS.PR_MERGED,
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
    addActivity(
      ensureUser(users, issue.user),
      "Issue opened",
      issue.created_at,
      POINTS.ISSUE_OPENED,
      { title: issue.title, link: issue.html_url }
    );
  }

  const entries = [...users.values()]
    .filter((u) => u.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points);

  const outDir = path.join(process.cwd(), "public", "leaderboard");
  fs.mkdirSync(outDir, { recursive: true });

  const yearData = {
    period: "year",
    updatedAt: Date.now(),
    startDate: iso(since),
    endDate: iso(now),
    hiddenRoles: [],
    topByActivity: {},
    entries,
  };

  fs.writeFileSync(
    path.join(outDir, "year.json"),
    JSON.stringify(yearData, null, 2)
  );

  console.log(`✅ Generated year.json (${entries.length} contributors)`);

  derivePeriod(yearData, 7, "week");
  derivePeriod(yearData, 14, "2week");
  derivePeriod(yearData, 21, "3week");
  derivePeriod(yearData, 30, "month");
  derivePeriod(yearData, 60, "2month");

  generateRecentActivities(yearData, 14);
}

/* ================= DERIVED PERIODS ================= */

function derivePeriod(source: any, days: number, period: string) {
  const cutoff = daysAgo(days);

  const entries = source.entries
    .map((entry: UserEntry) => {
      // only activities in range
      const acts = entry.raw_activities.filter(
        (a) => new Date(a.occured_at) >= cutoff
      );

      if (acts.length === 0) return null;

      // rebuild breakdown
      const breakdown: Record<string, { count: number; points: number }> = {};
      const daily: Record<
        string,
        { date: string; count: number; points: number }
      > = {};
      let total = 0;

      for (const a of acts) {
        const day = a.occured_at.split("T")[0]!;

        total += a.points;

        const type = a.type;

        breakdown[type] ??= { count: 0, points: 0 };
        breakdown[type].count += 1;
        breakdown[type].points += a.points;

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
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.total_points - a.total_points);

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

/* ================= RECENT ACTIVITIES ================= */

function generateRecentActivities(source: any, days = 14) {
  const cutoff = daysAgo(days);
  const groups = new Map<string, any[]>();

  for (const entry of source.entries) {
    for (const act of entry.raw_activities) {
      const day = act.occured_at.split("T")[0]!;
      if (new Date(day) < cutoff) continue;

      groups.set(day, groups.get(day) ?? []);
      groups.get(day)!.push({
        username: entry.username,
        name: entry.name,
        avatar_url: entry.avatar_url,
        points: act.points,
      });
    }
  }

  const out = [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));

  fs.writeFileSync(
    path.join(process.cwd(), "public", "leaderboard", "recent-activities.json"),
    JSON.stringify({ updatedAt: Date.now(), groups: out }, null, 2)
  );

  console.log("✅ Generated recent-activities.json");
}

/* ================= RUN ================= */

generateYear().catch((e) => {
  console.error("❌ Leaderboard generation failed");
  console.error(e);
  process.exit(1);
});
