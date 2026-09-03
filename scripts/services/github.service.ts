import { GitHubSearchItem } from "../types";

export class GitHubService {
    private token: string;
    private apiBase: string;

    constructor(token: string, apiBase: string = "https://api.github.com") {
        this.token = token;
        this.apiBase = apiBase;
    }

    /* -------------------------------------------------------
       UTILS
    ------------------------------------------------------- */

    private sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // Dynamic rate limiting based on GitHub API headers
    private async smartSleep(res: Response, defaultMs: number = 500): Promise<void> {
        const remaining = res.headers.get('x-ratelimit-remaining');
        if (remaining) {
            const remainingCount = parseInt(remaining, 10);
            if (remainingCount > 500) {
                await this.sleep(200);
            } else if (remainingCount > 100) {
                await this.sleep(400);
            } else {
                await this.sleep(1000);
            }
        } else {
            await this.sleep(defaultMs);
        }
    }

    private iso(d: Date) {
        return d.toISOString().split("T")[0];
    }

    /* -------------------------------------------------------
       CORE FETCHERS
    ------------------------------------------------------- */

    async fetchAll<T = unknown>(url: string): Promise<T[]> {
        let page = 1;
        const results: T[] = [];
        while (true) {
            const join = url.includes("?") ? "&" : "?";
            const res = await fetch(`${url}${join}per_page=100&page=${page}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github+json",
                },
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`GitHub API ${res.status}: ${text}`);
            }
            await this.smartSleep(res, 500);
            const data: T[] = await res.json();
            results.push(...data);

            if (data.length < 100) break;
            page++;
        }

        return results;
    }

    async fetchOrgRepos(org: string): Promise<string[]> {
        const repos: string[] = [];
        let page = 1;

        console.log(`📦 Fetching all repositories for ${org}...`);

        while (true) {
            const res = await fetch(
                `${this.apiBase}/orgs/${org}/repos?per_page=100&page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            );

            if (!res.ok) {
                console.error(`   ⚠️ Failed to fetch repos: ${res.status}`);
                break;
            }

            await this.smartSleep(res, 500);
            const data: unknown[] = await res.json();
            if (!data.length) break;

            for (const r of data) {
                repos.push((r as { name: string }).name);
            }
            page++;
        }
        return repos;
    }

    async get(url: string) {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json",
            },
        });

        // We return response to let caller handle status
        if (res.ok) {
            await this.smartSleep(res, 300);
        }
        return res;
    }

    /* -------------------------------------------------------
       SPECIFIC FETCHERS
    ------------------------------------------------------- */

    async fetchRepoPRs(org: string, repo: string, since: Date): Promise<unknown[]> {
        const prs: unknown[] = [];
        let page = 1;
        while (true) {
            const res = await fetch(
                `${this.apiBase}/repos/${org}/${repo}/pulls?state=all&per_page=100&page=${page}&sort=updated&direction=desc`,
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            );
            if (!res.ok) {
                console.error(`   ⚠️ Failed to fetch PRs for ${repo}: ${res.status}`);
                break;
            }
            const data: unknown[] = await res.json();
            if (!data.length) break;

            // Filter PRs updated since the cutoff date
            for (const pr of data) {
                const typedPR = pr as { updated_at?: string };
                if (typedPR.updated_at && new Date(typedPR.updated_at) >= since) {
                    prs.push(pr);
                }
            }

            // Stop if we've gone past the since date
            const lastPR = data[data.length - 1] as { updated_at?: string };
            if (lastPR?.updated_at && new Date(lastPR.updated_at) < since) break;

            page++;
            await this.smartSleep(res, 1000);
        }
        return prs;
    }

    async fetchPRReviews(org: string, repo: string, prNumber: number): Promise<unknown[]> {
        const res = await fetch(
            `${this.apiBase}/repos/${org}/${repo}/pulls/${prNumber}/reviews`,
            {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github+json",
                },
            }
        );
        if (!res.ok) {
            console.error(`   ⚠️ Failed to fetch reviews for ${repo}#${prNumber}: ${res.status}`);
            return [];
        }
        await this.smartSleep(res, 500);
        return res.json();
    }

    async fetchIssueEvents(org: string, repo: string, issueNumber: string): Promise<unknown[]> {
        const res = await fetch(
            `${this.apiBase}/repos/${org}/${repo}/issues/${issueNumber}/events`,
            {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github+json",
                },
            }
        );

        if (!res.ok) {
            console.error(`     ⚠️ Failed to fetch events for ${repo}#${issueNumber}: ${res.status}`);
            return [];
        }

        await this.smartSleep(res, 500);
        return res.json();
    }

    /* -------------------------------------------------------
       SEARCH
    ------------------------------------------------------- */

    async ghSearch(url: string) {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json",
            },
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`GitHub API ${res.status}: ${text}`);
        }

        // ⛔ Mandatory throttle (30 req/min)
        await this.sleep(2500);

        return res.json();
    }

    async searchByDateChunks(
        baseQuery: string,
        start: Date,
        end: Date,
        stepDays = 30,
        dateField = "created"
    ): Promise<GitHubSearchItem[]> {
        const all: GitHubSearchItem[] = [];
        let cursor = new Date(start);

        while (cursor < end) {
            const from = this.iso(cursor);
            const next = new Date(cursor);
            next.setDate(next.getDate() + stepDays);
            const to = next > end ? end : next;

            console.log(`→ ${from} .. ${this.iso(to)}`);

            let page = 1;
            while (true) {
                const res = await this.ghSearch(
                    `${this.apiBase}/search/issues?q=${baseQuery}+${dateField}:${from}..${this.iso(
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
}
