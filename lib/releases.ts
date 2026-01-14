import fs from "fs/promises";
import path from "path";

export type Release = {
  repo: string;
  repoSlug: string;
  version: string;
  date: string;
  summary: string;
  contributors: {
    username: string;
    commits: number;
  }[];
  githubUrl: string;
};


export async function getReleases(): Promise<Release[]> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public/releases/releases.json"
    );

    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load releases data", err);
    return [];
  }
}
