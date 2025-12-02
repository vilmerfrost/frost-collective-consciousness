
import { GitHubContent } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

// Files to ignore to keep context relevant and small
const IGNORED_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
  ".gitignore", ".eslintrc", ".prettierrc", "tsconfig.tsbuildinfo",
  ".DS_Store", "images", "assets", "dist", "build", "node_modules"
];

const IGNORED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot"
];

/**
 * Parses various GitHub URL formats to extract owner and repo.
 * Handles:
 * - https://github.com/owner/repo/tree/branch/path
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
function parseGitHubRepo(input: string): { owner: string; repo: string } {
  // Remove leading/trailing whitespace
  input = input.trim();
  
  // Handle full GitHub URLs
  const githubUrlMatch = input.match(/github\.com[/:]([^\/]+)\/([^\/\s?#]+)/);
  if (githubUrlMatch) {
    return {
      owner: githubUrlMatch[1],
      repo: githubUrlMatch[2].replace(/\.git$/, '') // Remove .git suffix if present
    };
  }
  
  // Handle simple owner/repo format
  const parts = input.split('/').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, '') // Remove .git suffix if present
    };
  }
  
  throw new Error(`Invalid repository format: "${input}". Expected format: 'owner/repo' or a GitHub URL.`);
}

/**
 * Fetches the content of a GitHub repository recursively (up to a depth limit).
 * Returns a formatted string suitable for LLM context injection.
 */
export async function ingestGitHubRepo(
  ownerRepo: string, 
  token?: string
): Promise<string> {
  const { owner, repo } = parseGitHubRepo(ownerRepo);

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 1. Fetch Root Directory
  const rootUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents`;
  let fileList: GitHubContent[] = [];
  
  try {
    const res = await fetch(rootUrl, { headers });
    if (!res.ok) {
        if (res.status === 404) throw new Error("Repository not found or private.");
        if (res.status === 403) throw new Error("API Rate limit exceeded or invalid token.");
        throw new Error(`GitHub API Error: ${res.statusText}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
        fileList = data;
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch repo: ${error.message}`);
  }

  // 2. Process Files (Flattened for this demo, limited recursion)
  // In a full server action, we would recurse deeper. Here we stick to 
  // root + 1 level deep or specific critical paths to save bandwidth/tokens.
  
  let combinedContext = `REPOSITORY: ${owner}/${repo}\nSCAN_TIME: ${new Date().toISOString()}\n\n`;

  // Filter relevant files
  const processQueue = fileList.filter(item => {
    if (item.type === 'dir' && !IGNORED_FILES.includes(item.name)) return true;
    if (item.type === 'file') {
        const isIgnored = IGNORED_FILES.includes(item.name) || 
                          IGNORED_EXTENSIONS.some(ext => item.name.endsWith(ext));
        return !isIgnored;
    }
    return false;
  });

  // Limit processing to avoid blowing up context window in this demo
  const MAX_FILES = 15;
  let processedCount = 0;

  for (const item of processQueue) {
    if (processedCount >= MAX_FILES) break;

    if (item.type === 'file' && item.download_url) {
      try {
        const contentRes = await fetch(item.download_url);
        if (contentRes.ok) {
            const text = await contentRes.text();
            // Basic sanity check on text length
            if (text.length < 20000) { 
                combinedContext += `--- FILE: ${item.path} ---\n${text}\n\n`;
                processedCount++;
            } else {
                combinedContext += `--- FILE: ${item.path} ---\n[SKIPPED: FILE TOO LARGE]\n\n`;
            }
        }
      } catch (e) {
        console.warn(`Failed to read file ${item.path}`, e);
      }
    }
    
    // Simple 1-level recursion for 'src' or 'app' or 'lib' directories
    if (item.type === 'dir' && ['src', 'app', 'lib', 'components', 'pages'].includes(item.name)) {
        try {
            const subRes = await fetch(item.url, { headers }); // item.url is the API url for the dir
            if (subRes.ok) {
                const subData: GitHubContent[] = await subRes.json();
                for (const subItem of subData) {
                    if (processedCount >= MAX_FILES) break;
                    if (subItem.type === 'file' && subItem.download_url) {
                        const isIgnored = IGNORED_FILES.includes(subItem.name) || 
                                          IGNORED_EXTENSIONS.some(ext => subItem.name.endsWith(ext));
                        if (!isIgnored) {
                            const subContentRes = await fetch(subItem.download_url);
                            if (subContentRes.ok) {
                                const text = await subContentRes.text();
                                if (text.length < 20000) {
                                    combinedContext += `--- FILE: ${subItem.path} ---\n${text}\n\n`;
                                    processedCount++;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to read dir ${item.path}`, e);
        }
    }
  }

  if (processedCount === 0) {
      combinedContext += "No readable source files found in root or primary directories.";
  } else {
      combinedContext += `\n--- END OF REPOSITORY CONTEXT (${processedCount} files) ---`;
  }

  return combinedContext;
}
