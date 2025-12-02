// fcc/utils/gitLoader.ts

import path from "path";
import fs from "fs";
import simpleGit from "simple-git";

/**
 * Load an external Git repository by cloning it to a temporary directory
 * @param repoUrl - GitHub repository URL (e.g., https://github.com/user/repo)
 * @returns Path to the cloned repository directory
 */
export async function loadExternalGitRepo(repoUrl: string): Promise<string> {
  try {
    const baseDir = path.join(process.cwd(), "tmp", "fcc_repos");

    // skapa mapp om den inte finns
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // skapa unik mapp för repot
    const repoName = repoUrl.split("/").pop()?.replace(".git", "") ?? "repo";
    const targetDir = path.join(baseDir, repoName);

    // radera gamla kloner
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    console.log(`[FCC GitLoader] Cloning repo: ${repoUrl}`);
    await simpleGit().clone(repoUrl, targetDir);

    console.log(`[FCC GitLoader] Repo cloned to: ${targetDir}`);
    return targetDir;
  } catch (err) {
    console.error("[FCC GitLoader] Failed to clone repo:", err);
    throw new Error(`Failed to clone repo: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

