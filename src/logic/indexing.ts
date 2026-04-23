import fs from "fs";
import path from "path";
import { KeyedCache } from "./cache.js";

const INDEX_FILENAME = ".hackathon-index.md";
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".next", "out", "coverage", ".cache"]);
const MAX_DEPTH = 4;

function loadGitignorePatterns(root: string): Set<string> {
  try {
    const content = fs.readFileSync(path.join(root, ".gitignore"), "utf-8");
    return new Set(
      content.split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("!") && !l.includes("*") && !l.includes("?"))
        .map((l) => l.replace(/\/$/, ""))
    );
  } catch {
    return new Set();
  }
}

interface FileEntry {
  relPath: string;
  type: "file" | "dir";
}

export const scanCache = new KeyedCache<FileEntry[]>(60_000);
export const indexFileCache = new KeyedCache<string>(60_000);

function scanDir(dir: string, root: string, depth: number, extraIgnore: Set<string> = new Set()): FileEntry[] {
  if (depth > MAX_DEPTH) return [];
  const entries: FileEntry[] = [];
  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const item of items) {
    if (item.name.startsWith(".") && item.name !== ".env.example") continue;
    if (IGNORE_DIRS.has(item.name) || extraIgnore.has(item.name)) continue;
    const full = path.join(dir, item.name);
    const rel = path.relative(root, full);
    if (item.isDirectory()) {
      entries.push({ relPath: rel, type: "dir" });
      entries.push(...scanDir(full, root, depth + 1, extraIgnore));
    } else {
      entries.push({ relPath: rel, type: "file" });
    }
  }
  return entries;
}

function buildMarkdown(dir: string, entries: FileEntry[]): string {
  const lines: string[] = [
    `# ${path.basename(dir)}`,
    "",
    "## Structure",
    "```",
  ];
  for (const e of entries) {
    const segments = e.relPath.split(path.sep);
    const depth = segments.length - 1;
    const indent = "  ".repeat(depth);
    const label = segments[segments.length - 1];
    const suffix = e.type === "dir" ? "/" : "";
    lines.push(`${indent}${label}${suffix}`);
  }
  const keyExts = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".json", ".yaml", ".yml", ".md", ".env.example"]);
  const keyFiles = entries.filter((e) => e.type === "file" && keyExts.has(path.extname(e.relPath)));
  lines.push("```", "", `Keys: ${keyFiles.map((f) => f.relPath).join(", ")}`);
  return lines.join("\n");
}

export function getScanSignature(workspaceRoot: string): string {
  const gitignore = loadGitignorePatterns(workspaceRoot);
  const entries = scanDir(workspaceRoot, workspaceRoot, 0, gitignore);
  return entries.map((e) => `${e.type}:${e.relPath}`).join("|");
}

export function updateIndex(workspaceRoot: string): string {
  scanCache.invalidate(workspaceRoot);
  indexFileCache.invalidate(workspaceRoot);

  const gitignore = loadGitignorePatterns(workspaceRoot);
  const entries = scanDir(workspaceRoot, workspaceRoot, 0, gitignore);
  scanCache.set(workspaceRoot, entries);

  const content = buildMarkdown(workspaceRoot, entries);
  const indexPath = path.join(workspaceRoot, INDEX_FILENAME);
  fs.writeFileSync(indexPath, content, "utf-8");
  indexFileCache.set(workspaceRoot, content);

  return indexPath;
}

export function readIndex(workspaceRoot: string): string | null {
  const cached = indexFileCache.get(workspaceRoot);
  if (cached !== undefined) return cached;

  const indexPath = path.join(workspaceRoot, INDEX_FILENAME);
  try {
    const content = fs.readFileSync(indexPath, "utf-8");
    indexFileCache.set(workspaceRoot, content);
    return content;
  } catch {
    return null;
  }
}

export function getFileTree(workspaceRoot: string, maxDepth = 3): string {
  let entries = scanCache.get(workspaceRoot);
  if (!entries) {
    entries = scanDir(workspaceRoot, workspaceRoot, 0);
    scanCache.set(workspaceRoot, entries);
  }
  return entries
    .filter((e) => e.relPath.split(path.sep).length <= maxDepth)
    .map((e) => (e.type === "dir" ? `[dir] ${e.relPath}` : `[file] ${e.relPath}`))
    .join("\n");
}
