# Agent Context

This repository contains `hackathon-mode`, a Model Context Protocol (MCP) server that injects a short hackathon-oriented operating protocol into compatible AI agents. The goal is to help agents ship fast during short events while keeping enough project context to avoid wasting tokens across sessions.

## Commands

```bash
npm run dev      # Run the MCP server from TypeScript with tsx
npm run build    # Compile TypeScript into dist/
npm start        # Run the compiled server from dist/
npm audit        # Check known npm vulnerabilities; expected total is 0
```

There are no test or lint scripts in this package. Use `./node_modules/.bin/tsc --noEmit` for type checking when validating changes without writing build output.

## Runtime and Dependencies

- Runtime support is Node `>=22`.
- Direct dependency versions are pinned in `package.json`.
- Transitive dependency versions are locked by `package-lock.json`.
- Do not upgrade dependencies just for freshness; upgrade only when needed for security, compatibility, or an explicit task.

## Architecture

- `src/index.ts` is the MCP entry point. It creates the server, registers tools and resources, validates tool input with Zod, and routes calls to logic modules.
- `src/logic/config.ts` persists global enabled/disabled state in `~/.hackathon-mcp-config.json`.
- `src/logic/indexing.ts` scans a workspace and writes `.hackathon-index.md` for fast agent orientation.
- `src/logic/rules.ts` reads and writes project rules in `.hackathon-rules.md`.
- `src/logic/brainstorm.ts` suggests hackathon feature ideas from the detected stack.
- `src/logic/repo-init.ts` bootstraps common hackathon files.
- `src/logic/pitch.ts` generates a short demo pitch from project context files.
- `src/logic/checkpoint.ts` creates git checkpoint commits.
- `src/logic/time-check.ts` reports elapsed/remaining hackathon time.
- `src/logic/cache.ts` contains short-lived caches and duplicate-response tracking.

## MCP Tools

- `enable_hackathon_mode`: turns Hackathon Mode on globally and records activation time.
- `disable_hackathon_mode`: turns Hackathon Mode off.
- `get_mode_status`: returns active state and the short protocol.
- `initialize_repo`: creates missing starter files such as `README.md`, `.env.example`, `HACKATHON_PLAN.md`, `.gitignore`, and optionally `docker-compose.yml`.
- `update_index`: regenerates `.hackathon-index.md` for a workspace.
- `brainstorm`: suggests 1-5 wow-factor features for the current stack.
- `add_rule`: appends a mandatory project rule to `.hackathon-rules.md`.
- `remove_rule`: removes a project rule by 1-based index.
- `list_rules`: lists project rules from `.hackathon-rules.md`.
- `cache_status`: reports current in-memory cache and duplicate-tracking state.
- `pitch`: generates a concise demo pitch from `.hackathon-index.md`, `HACKATHON_PLAN.md`, and `README.md`.
- `checkpoint`: runs `git add -A` and creates a `chk:` commit. Treat this as intentionally broad and side-effectful.
- `time_check`: reports elapsed time, remaining time, phase, and deadline based on activation time.

## MCP Resources

- `hackathon://protocol`: Markdown description of the Hackathon Protocol and current active/inactive state.

## Files and Side Effects

The server can read or write these user/workspace files:

- `~/.hackathon-mcp-config.json`: global mode state.
- `.hackathon-index.md`: generated workspace map.
- `.hackathon-rules.md`: persisted project rules.
- `README.md`, `.env.example`, `HACKATHON_PLAN.md`, `.gitignore`, `docker-compose.yml`: created by `initialize_repo` only when missing.
- Git commits: `checkpoint` stages all changes with `git add -A` and commits them.

## Development Notes

- Keep tool descriptions short because agents receive them in MCP tool lists.
- Keep protocol text concise; it is injected into agent context when Hackathon Mode is active.
- When adding a tool, update both the list-tools handler and call-tool switch in `src/index.ts`, add Zod validation, and document it in `README.md` and this file.
- Avoid unrelated refactors. This package is intentionally small and direct.
