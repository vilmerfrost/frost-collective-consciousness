/**
 * FCC v4.4 - Prompt Version Manager
 */

import * as fs from 'fs';
import * as path from 'path';

interface PromptVersion {
  name: string;
  version: string;
  file: string;
  pinned: boolean;
}

const VERSIONS_DIR = path.join(process.cwd(), 'fcc', 'prompts', 'versions');
const PROMPTS_DIR = path.join(process.cwd(), 'fcc', 'prompts');

/**
 * Load latest prompt version
 */
export function loadLatestPrompt(promptName: string): string {
  const latestVersion = getLatestVersion(promptName);
  if (latestVersion) {
    return loadPromptVersion(promptName, latestVersion);
  }
  
  // Fallback to default location
  const defaultPath = path.join(PROMPTS_DIR, 'system', `${promptName}.md`);
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf8');
  }
  
  throw new Error(`Prompt not found: ${promptName}`);
}

/**
 * Pin a specific prompt version
 */
export function pinVersion(promptName: string, version: string): void {
  const versions = listVersions(promptName);
  const versionFile = path.join(VERSIONS_DIR, promptName, `${version}.md`);
  
  if (!fs.existsSync(versionFile)) {
    throw new Error(`Version ${version} not found for prompt ${promptName}`);
  }

  // Update pinned versions registry
  const registryPath = path.join(VERSIONS_DIR, 'registry.json');
  let registry: Record<string, string> = {};
  
  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  }
  
  registry[promptName] = version;
  
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Rollback to a previous version
 */
export function rollbackVersion(promptName: string, version: string): void {
  pinVersion(promptName, version);
}

/**
 * Get latest version for a prompt
 */
function getLatestVersion(promptName: string): string | null {
  const registryPath = path.join(VERSIONS_DIR, 'registry.json');
  
  if (fs.existsSync(registryPath)) {
    const registry: Record<string, string> = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return registry[promptName] || null;
  }
  
  return null;
}

/**
 * List all versions for a prompt
 */
function listVersions(promptName: string): string[] {
  const promptVersionsDir = path.join(VERSIONS_DIR, promptName);
  
  if (!fs.existsSync(promptVersionsDir)) {
    return [];
  }
  
  return fs.readdirSync(promptVersionsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

/**
 * Load a specific prompt version
 */
function loadPromptVersion(promptName: string, version: string): string {
  const versionFile = path.join(VERSIONS_DIR, promptName, `${version}.md`);
  
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, 'utf8');
  }
  
  throw new Error(`Version ${version} not found for prompt ${promptName}`);
}

