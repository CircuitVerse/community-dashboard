import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function main() {
  const outputPath = join(process.cwd(), "app", "overrides.gen.css");
  const configPath = join(process.cwd(), "config.yaml");

  try {
    // 🚨 config.yaml is optional (Vercel-safe)
    if (!existsSync(configPath)) {
      console.warn("⚠️ config.yaml not found. Skipping theme download.");

      if (!existsSync(outputPath)) {
        await writeFile(outputPath, "", "utf8");
      }
      return;
    }

    // Import ONLY if config exists
    const { getConfig } = await import("../lib/config");
    const config = getConfig();
    const themeUrl = config?.leaderboard?.theme;

    if (!themeUrl) {
      console.log("No theme configured.");

      if (!existsSync(outputPath)) {
        await writeFile(outputPath, "", "utf8");
      }
      return;
    }

    console.log(`Fetching theme from: ${themeUrl}`);

    const response = await fetch(themeUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch theme: ${response.status} ${response.statusText}`
      );
    }

    const cssContent = await response.text();
    await writeFile(outputPath, cssContent, "utf8");
    console.log(`✅ Theme downloaded successfully`);
  } catch {
    console.warn("⚠️ Theme fetch failed. Using empty override.");
    await writeFile(outputPath, "", "utf8");
  }
}

main();
