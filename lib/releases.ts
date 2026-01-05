import fs from "fs/promises";
import path from "path";

export type Release = {
  repo: string;
  version: string;
  date: string;
  summary: string;
  contributors: { username: string }[];
  githubUrl: string;
};

export async function getReleases(): Promise<Release[]> {
  const filePath = path.join(
    process.cwd(),
    "public/releases/releases.json"
  );

  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}
