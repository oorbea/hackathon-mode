import fs from "fs";
import path from "path";

interface RepoInitOptions {
  workspaceRoot: string;
  projectName?: string;
  goals?: string;
  techStack?: string;
}

interface ResolvedOptions {
  workspaceRoot: string;
  projectName: string;
  goals: string;
  techStack: string;
}

interface RepoInitResult {
  filesCreated: string[];
  message: string;
}

const HACKATHON_GITIGNORE = `node_modules/
dist/
.next/
out/
.env
*.log
coverage/
.DS_Store
`;

function writeIfMissing(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

function generateReadme(opts: ResolvedOptions): string {
  return `# ${opts.projectName}

> ${opts.goals}

## Tech Stack
${opts.techStack}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture

_TBD – fill in as you build._

---
*Built with ❤️ at a hackathon using [hackathon-mode](https://github.com/oorbea/hackathon-mode)*
`;
}

function generateEnvExample(opts: ResolvedOptions): string {
  const lines = [
    "# Copy this file to .env and fill in the values",
    "# NEVER commit .env to git",
    "",
  ];
  if (/openai|gpt|ai/i.test(opts.techStack)) {
    lines.push("OPENAI_API_KEY=sk-...");
  }
  if (/supabase/i.test(opts.techStack)) {
    lines.push("SUPABASE_URL=https://xxx.supabase.co", "SUPABASE_ANON_KEY=...");
  }
  if (/postgres|prisma|drizzle/i.test(opts.techStack)) {
    lines.push("DATABASE_URL=postgres://user:pass@localhost:5432/db");
  }
  if (/redis/i.test(opts.techStack)) {
    lines.push("REDIS_URL=redis://localhost:6379");
  }
  lines.push("PORT=3000");
  return lines.join("\n");
}

function generateHackathonPlan(opts: ResolvedOptions): string {
  return `# 🚀 Hackathon Plan – ${opts.projectName}

## Goals
${opts.goals}

## Tech Stack
${opts.techStack}

## Timeline (48-hour sprints)

### Hour 0-4: Foundation
- [ ] Repo setup & deploy pipeline
- [ ] Auth (if needed)
- [ ] DB schema / data model

### Hour 4-12: Core MVP
- [ ] Main feature #1
- [ ] Main feature #2
- [ ] Basic UI shell

### Hour 12-24: Polish
- [ ] Connect front-end to back-end
- [ ] Fix critical bugs
- [ ] Add at least ONE "wow" feature

### Hour 24-36: Demo Prep
- [ ] Seed demo data
- [ ] Record a fallback video demo
- [ ] Prepare pitch deck (max 5 slides)

### Hour 36-48: Buffer & Submit
- [ ] Bug fixes
- [ ] Deploy to production
- [ ] Submit before deadline

## Wow Features
_(Run \`brainstorm\` tool to generate ideas)_

## Notes
_Add notes here as you build._
`;
}

export function initRepo(opts: RepoInitOptions): RepoInitResult {
  const filesCreated: string[] = [];
  const { workspaceRoot } = opts;
  const resolved = {
    workspaceRoot,
    projectName: opts.projectName ?? path.basename(workspaceRoot),
    goals: opts.goals ?? "TBD – describe your project goal",
    techStack: opts.techStack ?? "TBD – list your technologies",
  };

  const files: Array<[string, string]> = [
    [path.join(workspaceRoot, "README.md"), generateReadme(resolved)],
    [path.join(workspaceRoot, ".env.example"), generateEnvExample(resolved)],
    [path.join(workspaceRoot, "HACKATHON_PLAN.md"), generateHackathonPlan(resolved)],
    [path.join(workspaceRoot, ".gitignore"), HACKATHON_GITIGNORE],
  ];

  for (const [filePath, content] of files) {
    if (writeIfMissing(filePath, content)) {
      filesCreated.push(path.relative(workspaceRoot, filePath));
    }
  }

  const message =
    filesCreated.length > 0
      ? `Initialized repo with: ${filesCreated.join(", ")}.\nNext: run \`update_index\` then \`brainstorm\` for feature ideas.`
      : "All files already exist – nothing was overwritten. Use update_index to refresh the context index.";

  return { filesCreated, message };
}
