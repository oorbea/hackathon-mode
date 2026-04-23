import fs from "fs";
import path from "path";

interface RepoInitOptions {
  workspaceRoot: string;
  projectName?: string;
  goals?: string;
  techStack?: string;
  dockerCompose?: boolean;
  features?: string;
}

interface ResolvedOptions {
  workspaceRoot: string;
  projectName: string;
  goals: string;
  techStack: string;
  dockerCompose: boolean;
  features: string;
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
${opts.dockerCompose ? `
## Local Infrastructure

\`\`\`bash
docker compose up -d
\`\`\`
` : ""}
## Architecture

_TBD – fill in as you build._

---
*Built at a hackathon using [hackathon-mode](https://github.com/oorbea/hackathon-mode)*
`;
}

function generateEnvExample(opts: ResolvedOptions): string {
  const combined = `${opts.techStack} ${opts.features}`.toLowerCase();
  const lines = [
    "# Copy this file to .env and fill in the values",
    "# NEVER commit .env to git",
    "",
  ];
  if (/openai|gpt|\bai\b/.test(combined)) lines.push("OPENAI_API_KEY=sk-...");
  if (/anthropic|claude/.test(combined)) lines.push("ANTHROPIC_API_KEY=sk-ant-...");
  if (/supabase/.test(combined)) lines.push("SUPABASE_URL=https://xxx.supabase.co", "SUPABASE_ANON_KEY=...");
  if (/postgres|prisma|drizzle/.test(combined)) lines.push("DATABASE_URL=postgres://user:pass@localhost:5432/db");
  if (/redis/.test(combined)) lines.push("REDIS_URL=redis://localhost:6379");
  if (/mongo/.test(combined)) lines.push("MONGODB_URL=mongodb://localhost:27017/db");
  if (/mysql/.test(combined)) lines.push("DATABASE_URL=mysql://user:pass@localhost:3306/db");
  if (/s3|minio|storage/.test(combined)) lines.push("S3_BUCKET=...", "S3_REGION=us-east-1", "AWS_ACCESS_KEY_ID=...", "AWS_SECRET_ACCESS_KEY=...");
  if (/jwt|auth/.test(combined)) lines.push("JWT_SECRET=change-me");
  if (/smtp|email|sendgrid|resend/.test(combined)) lines.push("SMTP_HOST=...", "SMTP_PORT=587", "SMTP_USER=...", "SMTP_PASS=...");
  if (/stripe/.test(combined)) lines.push("STRIPE_SECRET_KEY=sk_test_...", "STRIPE_WEBHOOK_SECRET=whsec_...");
  lines.push("PORT=3000");
  return lines.join("\n");
}

function generateDockerCompose(opts: ResolvedOptions): string {
  const combined = `${opts.techStack} ${opts.features}`.toLowerCase();
  const services: string[] = [];
  const volumes: string[] = [];

  if (/postgres|prisma|drizzle/.test(combined)) {
    services.push(`  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data`);
    volumes.push("  postgres_data:");
  }

  if (/mysql/.test(combined)) {
    services.push(`  mysql:
    image: mysql:8-debian
    environment:
      MYSQL_ROOT_PASSWORD: pass
      MYSQL_DATABASE: db
      MYSQL_USER: user
      MYSQL_PASSWORD: pass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql`);
    volumes.push("  mysql_data:");
  }

  if (/mongo/.test(combined)) {
    services.push(`  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db`);
    volumes.push("  mongo_data:");
  }

  if (/redis/.test(combined)) {
    services.push(`  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data`);
    volumes.push("  redis_data:");
  }

  if (/rabbit|rabbitmq|queue|amqp/.test(combined)) {
    services.push(`  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq`);
    volumes.push("  rabbitmq_data:");
  }

  if (/minio|s3|storage/.test(combined)) {
    services.push(`  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data`);
    volumes.push("  minio_data:");
  }

  if (/elastic|elasticsearch/.test(combined)) {
    services.push(`  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data`);
    volumes.push("  elastic_data:");
  }

  const servicesBlock = services.length > 0
    ? services.join("\n\n")
    : `  # No services detected – add your own here`;

  const volumesBlock = volumes.length > 0
    ? `\nvolumes:\n${volumes.join("\n")}`
    : "";

  return `services:\n${servicesBlock}\n${volumesBlock}`.trimEnd() + "\n";
}

function generateHackathonPlan(opts: ResolvedOptions): string {
  const featuresSection = opts.features
    ? `\n## Features to Build\n${opts.features.split(",").map(f => `- [ ] ${f.trim()}`).join("\n")}\n`
    : "";

  return `# Hackathon Plan – ${opts.projectName}

## Goals
${opts.goals}

## Tech Stack
${opts.techStack}
${featuresSection}
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
  const resolved: ResolvedOptions = {
    workspaceRoot,
    projectName: opts.projectName ?? path.basename(workspaceRoot),
    goals: opts.goals ?? "TBD – describe your project goal",
    techStack: opts.techStack ?? "TBD – list your technologies",
    dockerCompose: opts.dockerCompose ?? false,
    features: opts.features ?? "",
  };

  const files: Array<[string, string]> = [
    [path.join(workspaceRoot, "README.md"), generateReadme(resolved)],
    [path.join(workspaceRoot, ".env.example"), generateEnvExample(resolved)],
    [path.join(workspaceRoot, "HACKATHON_PLAN.md"), generateHackathonPlan(resolved)],
    [path.join(workspaceRoot, ".gitignore"), HACKATHON_GITIGNORE],
  ];

  if (resolved.dockerCompose) {
    files.push([path.join(workspaceRoot, "docker-compose.yml"), generateDockerCompose(resolved)]);
  }

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
