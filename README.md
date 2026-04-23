# hackathon-mode

`hackathon-mode` is an MCP server that injects a hackathon operating protocol into AI agents: ship fast, stay concise, keep a strategic project index, and preserve project-specific rules across sessions.

Current project version: `1.1.1`

> https://github.com/oorbea/hackathon-mode

## Requirements

- Node.js `>=22`
- npm with lockfile support

## Installation

Run without installing:

```bash
npx hackathon-mode@latest
```

Build from source:

```bash
git clone https://github.com/oorbea/hackathon-mode
cd hackathon-mode
npm install
npm run build
npm start
```

## Agent Configuration

All MCP-compatible agents use the same server command. For source builds, replace the `npx` command with `node /path/to/hackathon-mode/dist/index.js`.

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

Common config locations:

| Agent | User-level config | Project-level config |
|---|---|---|
| Claude Code | `~/.claude.json` | `.mcp.json` |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` |
| OpenAI Codex | `~/.codex/mcp.json` | project MCP config |
| Gemini CLI | `~/.gemini/settings.json` | project MCP config |
| Google Antigravity | `~/.antigravity/mcp.json` | `.antigravity/mcp.json` |
| OpenClaw | `~/.openclaw/mcp.json` | `.openclaw/mcp.json` |

Claude Code can also add it from the CLI:

```bash
claude mcp add --scope user hackathon-mode -- npx hackathon-mode@latest
claude mcp add hackathon-mode -- npx hackathon-mode@latest
```

## Quick Start

1. Call `enable_hackathon_mode`.
2. Call `initialize_repo` if the project needs starter files.
3. Call `update_index` to generate `.hackathon-index.md`.
4. Call `brainstorm` for stack-aware feature ideas.
5. Add persistent project rules with `add_rule` when needed.
6. Call `pitch` and `time_check` during demo prep.
7. Call `disable_hackathon_mode` when normal behavior should return.

## Hackathon Protocol

When active, the server injects a short hidden tool named `_hackathon_rules` into the MCP tool list. Agents receive the protocol on connection and can also read the full resource at `hackathon://protocol`.

The active rules are:

- Skip docs and tests unless explicitly requested.
- Prefer working code over polish.
- Avoid abstractions and future-proofing during the hackathon window.
- Treat shortcuts as acceptable when they help ship.
- Suggest high-impact wow features.
- Keep replies concise.
- Read `.hackathon-index.md` before touching files.
- Match the user's language.

## Tools

| Tool | Params | Description |
|---|---|---|
| `enable_hackathon_mode` | none | Activates Hackathon Mode globally and records activation time. |
| `disable_hackathon_mode` | none | Deactivates Hackathon Mode. |
| `get_mode_status` | none | Returns active state and the short protocol. |
| `initialize_repo` | `workspaceRoot?`, `projectName?`, `goals?`, `techStack?`, `dockerCompose?`, `features?` | Creates missing starter files for a hackathon project. |
| `update_index` | `workspaceRoot?` | Regenerates `.hackathon-index.md`. |
| `brainstorm` | `workspaceRoot?`, `count?` | Suggests 1-5 wow-factor features for the detected stack. |
| `add_rule` | `workspaceRoot?`, `rule` | Appends a mandatory project rule to `.hackathon-rules.md`. |
| `remove_rule` | `workspaceRoot?`, `index` | Removes a project rule by 1-based index. |
| `list_rules` | `workspaceRoot?` | Lists persisted project rules. |
| `cache_status` | none | Shows in-memory cache and duplicate-response tracking state. |
| `pitch` | `workspaceRoot?` | Generates a concise demo pitch from project context files. |
| `checkpoint` | `workspaceRoot?`, `message?` | Runs `git add -A` and creates a `chk:` checkpoint commit. |
| `time_check` | `durationHours?` | Reports elapsed time, remaining time, phase, and deadline. |

All `workspaceRoot` params default to the server process working directory when omitted.

## Resources

| URI | Description |
|---|---|
| `hackathon://protocol` | Markdown description of the Hackathon Protocol and current active/inactive state. |

## Files and State

`hackathon-mode` can create or update these files:

| Path | Written by | Purpose |
|---|---|---|
| `~/.hackathon-mcp-config.json` | `enable_hackathon_mode`, `disable_hackathon_mode` | Global active/inactive state and activation time. |
| `.hackathon-index.md` | `update_index` | Workspace map for agent orientation. |
| `.hackathon-rules.md` | `add_rule`, `remove_rule` | Persistent project rules injected into the active protocol. |
| `README.md` | `initialize_repo` | Starter project README, only created when missing. |
| `.env.example` | `initialize_repo` | Starter environment variable template, only created when missing. |
| `HACKATHON_PLAN.md` | `initialize_repo` | Starter hackathon plan, only created when missing. |
| `.gitignore` | `initialize_repo` | Starter gitignore, only created when missing. |
| `docker-compose.yml` | `initialize_repo` | Optional local services file, only created when requested and missing. |

`checkpoint` is intentionally broad: it stages all current changes with `git add -A` and creates a `chk:` commit.

## Security

Known npm vulnerabilities should stay at zero before release:

```bash
npm audit --json
```

As of 2026-04-23, `npm audit --json` reports:

```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 0,
    "moderate": 0,
    "high": 0,
    "critical": 0,
    "total": 0
  }
}
```

Direct dependency versions are pinned in `package.json`; transitive dependency versions are locked by `package-lock.json`.

## Development

```bash
npm run dev
npm run build
npm start
./node_modules/.bin/tsc --noEmit
npm ls --depth=0 --json
```

Project layout:

```text
src/
  index.ts             MCP server, tool registration, resource registration
  logic/
    brainstorm.ts      Feature suggestion engine
    cache.ts           Short-lived caches and duplicate detection
    checkpoint.ts      Git checkpoint commits
    config.ts          Global state persistence
    indexing.ts        Workspace scanner and index writer
    pitch.ts           Demo pitch generator
    repo-init.ts       Starter file and docker-compose generator
    rules.ts           Project rule persistence
    time-check.ts      Hackathon phase/time reporting
```

Agent-facing implementation context is maintained in `AGENTS.md`; Claude-specific discovery points to the same context through `CLAUDE.md`.
