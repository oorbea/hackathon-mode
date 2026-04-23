# hackathon-mode

MCP server that overrides AI agent behavior for hackathon speed: skip docs/tests, ship fast, save tokens, and keep a strategic index so agents orient instantly across sessions.

> [https://github.com/oorbea/hackathon-mode](https://github.com/oorbea/hackathon-mode)

---

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
| Match user's language | Agent always replies in the language the user writes in |

The protocol is **injected automatically** on every agent connection when mode is active — no need to remind the agent each session.

---

## Installation

### NPX (no install needed)

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

**User-level** (all projects on your machine):

```bash
claude mcp add --scope user hackathon-mode -- npx hackathon-mode@latest
```

**Project-level** (stored in `.mcp.json`, commit for team sharing):

```bash
claude mcp add hackathon-mode -- npx hackathon-mode@latest
```

Or manually in `~/.claude.json` (user) / `.mcp.json` (project):

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

**User-level** — `~/.cursor/mcp.json`

**Project-level** — `.cursor/mcp.json` at repo root

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

`~/.codex/mcp.json`

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

`~/.gemini/settings.json`

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

`~/.antigravity/mcp.json` (user) / `.antigravity/mcp.json` (project)

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

### OpenClaw

`~/.openclaw/mcp.json` (user) / `.openclaw/mcp.json` (project)

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

## User-Level vs Project-Level

| Scope | Config location | Effect |
|-------|----------------|--------|
| **User-level** | `~/.claude.json`, `~/.cursor/mcp.json`, etc. | Active in every project on your machine |
| **Project-level** | `.mcp.json`, `.cursor/mcp.json`, etc. at repo root | Active only in this repo; commit it so teammates get it automatically |

---

## Quick Start

1. **Activate** — ask your agent to call `enable_hackathon_mode`
2. **Bootstrap** — ask your agent to call `initialize_repo`; it will ask you for:
   - Project name
   - One-sentence goal
   - Tech stack
   - Whether you want a `docker-compose.yml`
   - If yes: what services/features you need (databases, cache, queues, storage…)
3. **Index** — call `update_index` to generate `.hackathon-index.md`
4. **Ideate** — call `brainstorm` for high-impact feature ideas tailored to your stack
5. **Ship** — build fast; re-run `update_index` whenever the project structure changes significantly
6. **Wrap up** — call `disable_hackathon_mode` to restore normal behavior

---

## Tools

| Tool | Params | Description |
|------|--------|-------------|
| `enable_hackathon_mode` | — | Activate the Hackathon Protocol |
| `disable_hackathon_mode` | — | Restore normal AI behavior |
| `get_mode_status` | — | Check active state + read the full protocol |
| `initialize_repo` | all optional | Bootstrap project files; agent asks for details conversationally |
| `update_index` | `workspaceRoot?` | Regenerate `.hackathon-index.md` |
| `brainstorm` | `workspaceRoot?`, `count?` (1–5) | Suggest wow-factor features matched to your stack |

All `workspaceRoot` params default to the current working directory when omitted.

### `initialize_repo` — generated files

| File | Always | Only if docker requested |
|------|--------|--------------------------|
| `README.md` | ✓ | |
| `.env.example` | ✓ | |
| `HACKATHON_PLAN.md` | ✓ | |
| `.gitignore` | ✓ | |
| `docker-compose.yml` | | ✓ |

Auto-detected services for `docker-compose.yml`: PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, MinIO (S3-compatible), Elasticsearch — based on your tech stack and features.

---

## Resources

| URI | Description |
|-----|-------------|
| `hackathon://protocol` | Markdown fragment with the active Hackathon Protocol rules |

---

## How enable/disable Works

When `enable_hackathon_mode` is called, a `_hackathon_rules` entry is injected into the MCP tool list. Every MCP-compatible agent fetches the tool list on connect, so the protocol is **guaranteed to be received** at the start of every session while mode is active.

When `disable_hackathon_mode` is called, `_hackathon_rules` disappears from the tool list on the next connection.

State is persisted to `~/.hackathon-mcp-config.json` and survives agent restarts.

---

## Development

```bash
npm run dev      # Run with tsx (no build step)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled server
```

```
src/
  index.ts          # MCP server, tool registration, protocol injection
  logic/
    config.ts       # State persistence (~/.hackathon-mcp-config.json)
    indexing.ts     # Workspace scanner → .hackathon-index.md
    brainstorm.ts   # Feature suggestion engine
    repo-init.ts    # Project bootstrapper + docker-compose generator
```
