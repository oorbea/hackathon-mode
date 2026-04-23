import { execFileSync } from "child_process";

interface CheckpointOptions {
  workspaceRoot: string;
  message?: string;
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function summarizeStatus(status: string): string {
  const files = status
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3));

  if (files.length === 0) return "changes";
  if (files.length === 1) return files[0].replace(/[\\/]/g, ":").slice(0, 60);

  const groups = new Set(files.map((f) => f.split(/[\\/]/)[0] || f));
  const label = Array.from(groups).slice(0, 3).join(", ");
  return `${files.length} files: ${label}`.slice(0, 72);
}

export function checkpoint(opts: CheckpointOptions): string {
  try {
    git(["rev-parse", "--is-inside-work-tree"], opts.workspaceRoot);
  } catch {
    return "error=not_git_repo";
  }

  const status = git(["status", "--short"], opts.workspaceRoot);
  if (!status) return "changed=false msg=no_changes";

  const summary = (opts.message?.trim() || summarizeStatus(status)).replace(/\s+/g, " ");
  const message = `chk: ${summary}`.slice(0, 88);

  git(["add", "-A"], opts.workspaceRoot);
  try {
    const out = git(["commit", "-m", message], opts.workspaceRoot);
    const hash = git(["rev-parse", "--short", "HEAD"], opts.workspaceRoot);
    const changed = status.split("\n").filter(Boolean).length;
    return [`changed=true`, `commit=${hash}`, `message=${message}`, `files=${changed}`, out].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message.replace(/\s+/g, " ") : "commit_failed";
    return `error=commit_failed msg=${msg}`;
  }
}
