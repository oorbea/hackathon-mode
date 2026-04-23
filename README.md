# hackathon-mode 🚀

> An MCP server that overrides AI agent behavior (Claude Code, Cursor, etc.) to prioritize **speed**, **functionality**, and **token efficiency** during a hackathon.

---

## What It Does

When active, hackathon-mode injects the **Hackathon Protocol** into every agent interaction:

| Rule | Effect |
|------|--------|
| Skip docs & tests | No boilerplate noise unless you ask |
| Working code > best practices | Ship first, polish never |
| No abstractions / future-proofing | Solve today's problem |
| Zero technical debt guilt | Shortcuts are features |
| Proactive "wow" suggestions | Agent surfaces cool ideas unprompted |
| Token-saving mode | Ultra-concise replies |
| Strategic indexing | `.hackathon-index.md` keeps agents oriented |

---

## Installation

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Build from source

```bash
git clone https://github.com/oorbea/hackathon-mode
cd hackathon-mode
npm install
npm run build
```

### Claude Code

Add the server to your Claude Code MCP configuration:

```bash
# Option A – run with node (after build)
claude mcp add hackathon-mode node /absolute/path/to/hackathon-mode/dist/index.js

# Option B – run with tsx (no build required)
claude mcp add hackathon-mode npx tsx /absolute/path/to/hackathon-mode/src/index.ts
```

Or edit `~/.claude/claude_desktop_config.json` (Claude Desktop) / your project's `.mcp.json` manually:

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "node",
      "args": ["/absolute/path/to/hackathon-mode/dist/index.js"]
    }
  }
}
```

### Cursor

Open **Cursor Settings → MCP** and add a new server:

| Field | Value |
|-------|-------|
| Name | `hackathon-mode` |
| Type | `stdio` |
| Command | `node` |
| Args | `/absolute/path/to/hackathon-mode/dist/index.js` |

Or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "hackathon-mode": {
      "command": "node",
      "args": ["/absolute/path/to/hackathon-mode/dist/index.js"]
    }
  }
}
```

---

## Quick Start

### 1. Enable Hackathon Mode

In your AI chat, call the tool:

```
enable_hackathon_mode
```

The agent will now follow the Hackathon Protocol for every subsequent message.

### 2. Initialize your project

```
initialize_repo
  workspaceRoot: /path/to/your/project
  projectName: MyAwesomeApp
  goals: "A real-time collaborative whiteboard for remote teams"
  techStack: "Next.js, Supabase, OpenAI"
```

This creates:
- `README.md` – project overview
- `.env.example` – pre-populated with env vars for your stack
- `HACKATHON_PLAN.md` – 48-hour sprint plan
- `.gitignore` – sensible defaults

### 3. Update the strategic index

```
update_index
  workspaceRoot: /path/to/your/project
```

Generates `.hackathon-index.md` – a compact map of your codebase that helps the AI agent orient itself quickly in future turns.

### 4. Brainstorm wow-factor features

```
brainstorm
  workspaceRoot: /path/to/your/project
  count: 5
```

Returns 3–5 tailored feature ideas with effort estimates and tech hints.

### 5. Check / disable mode

```
get_mode_status    # shows current state + protocol rules
disable_hackathon_mode  # restores normal AI behavior
```

---

## Tools Reference

| Tool | Description |
|------|-------------|
| `enable_hackathon_mode` | Activate the Hackathon Protocol globally |
| `disable_hackathon_mode` | Deactivate and restore normal behavior |
| `get_mode_status` | Show current state + full protocol text |
| `initialize_repo` | Bootstrap boilerplate files for a new project |
| `brainstorm` | Get 3–5 "wow-factor" feature ideas |
| `update_index` | Regenerate `.hackathon-index.md` for faster agent context |

## Resources

| URI | Description |
|-----|-------------|
| `hackathon://protocol` | The Hackathon Protocol as a system prompt fragment |

---

## State

Mode state is stored in `~/.hackathon-mcp-config.json` and persists across sessions.

```json
{
  "active": true,
  "activatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## Development

```bash
npm run dev    # run with tsx (no build step)
npm run build  # compile TypeScript → dist/
npm start      # run compiled output
```

---

## Project Structure

```
src/
  index.ts          # MCP server entry point
  logic/
    config.ts       # State management (~/.hackathon-mcp-config.json)
    indexing.ts     # Workspace scanning + .hackathon-index.md generation
    brainstorm.ts   # "Wow-factor" feature suggestion engine
    repo-init.ts    # Project boilerplate generation
```

---

*Built with the hackathon spirit: lean and effective.*
