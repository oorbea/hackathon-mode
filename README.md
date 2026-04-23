# hackathon-mode

MCP server that overrides AI agent behavior for hackathon speed: skip docs/tests, ship fast, save tokens, and keep a strategic index so agents orient instantly.

## What It Does

When active, every agent interaction follows the Hackathon Protocol:

| Rule | Behavior |
|------|----------|
| Skip docs & tests | Unless you explicitly ask |
| Working code > best practices | Ship it, polish later |
| No abstractions | Solve the 48-hour problem, not the 5-year one |
| Zero tech debt guilt | Shortcuts are features |
| Suggest wow features | Agent proactively proposes high-impact ideas |
| Token-saving mode | Ultra-concise replies, no filler, no unnecessary comments |
| Strategic indexing | Agent reads/writes `.hackathon-index.md` to stay oriented across sessions |

---

## Installation

### NPX (no install needed)

Any agent that supports MCP can use:

```
npx hackathon-mode@latest
```

### Build from source

```bash
git clone https://github.com/oorbea/hackathon-mode
cd hackathon-mode
npm install
npm run build
```

---

## Agent Configuration

All agents use the same JSON block. Replace `npx hackathon-mode@latest` with `node /path/to/hackathon-mode/dist/index.js` if you built from source.

### Claude Code

**User-level** (applies to all projects):

```bash
claude mcp add --scope user hackathon-mode -- npx hackathon-mode@latest
```

**Project-level** (this project only, stored in `.mcp.json`):

```bash
claude mcp add hackathon-mode -- npx hackathon-mode@latest
```

Or manually edit `~/.claude.json` (user) / `.mcp.json` (project):

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

---

### Cursor

**User-level** — edit `~/.cursor/mcp.json`:

**Project-level** — edit `.cursor/mcp.json` at repo root (commit this for team sharing):

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

---

### OpenAI Codex

Edit `~/.codex/mcp.json`:

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

---

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

---

### Google Antigravity

Edit `~/.antigravity/mcp.json` (user-level) or `.antigravity/mcp.json` at repo root (project-level):

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

> Check [Antigravity docs](https://antigravity.dev/docs/mcp) for the exact config path if this differs in your version.

---

### OpenClaw

Edit `~/.openclaw/mcp.json` (user-level) or `.openclaw/mcp.json` at repo root (project-level):

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "npx",
      "args": ["hackathon-mode@latest"]
    }
  }
}
```

> Check [OpenClaw docs](https://openclaw.dev/docs/mcp) for the exact config path if this differs in your version.

---

## User-Level vs Project-Level

| Scope | Where | Effect |
|-------|-------|--------|
| **User-level** | `~/.claude.json`, `~/.cursor/mcp.json`, etc. | Active in all projects on your machine |
| **Project-level** | `.mcp.json`, `.cursor/mcp.json`, etc. at repo root | Active only in this repo; can be committed so teammates get it automatically |

---

## Quick Start

1. **Activate** — in your agent, call `enable_hackathon_mode`
2. **Bootstrap** — call `initialize_repo` with just the workspace path; the agent will ask you for project name, goal, and tech stack before creating the files
3. **Index** — call `update_index` to generate `.hackathon-index.md`
4. **Ideate** — call `brainstorm` for a list of high-impact feature ideas tailored to your stack
5. **Ship** — build fast; run `update_index` again whenever the structure changes significantly
6. **Wrap up** — call `disable_hackathon_mode` to restore normal behavior

---

## Tools

| Tool | Params | Description |
|------|--------|-------------|
| `enable_hackathon_mode` | — | Activate the Hackathon Protocol globally |
| `disable_hackathon_mode` | — | Restore normal AI behavior |
| `get_mode_status` | — | Check active state + read the full protocol |
| `initialize_repo` | `workspaceRoot` (required), `projectName`, `goals`, `techStack` (optional — agent asks you) | Generate README, .env.example, HACKATHON_PLAN.md, .gitignore |
| `update_index` | `workspaceRoot` | Regenerate `.hackathon-index.md` for fast agent orientation |
| `brainstorm` | `workspaceRoot`, `count` (1–5) | Suggest wow-factor features matched to your stack |

## Resources

| URI | Description |
|-----|-------------|
| `hackathon://protocol` | Markdown fragment with the active Hackathon Protocol rules |

---

## State

Mode state is persisted to `~/.hackathon-mcp-config.json`. Active state survives agent restarts.

---

## Development

```bash
npm run dev      # Run with tsx (no build step)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled server
```

```
src/
  index.ts              # MCP server entry + tool registration
  logic/
    config.ts           # State persistence (~/.hackathon-mcp-config.json)
    indexing.ts         # Workspace scanner → .hackathon-index.md
    brainstorm.ts       # Feature suggestion engine
    repo-init.ts        # Project bootstrapper
```
