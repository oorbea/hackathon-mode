# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Run server with tsx (no build step, for development)
npm run build    # Compile TypeScript → dist/
npm run start    # Run compiled server (requires build first)
```

No test or lint scripts exist — intentional.

## Architecture

MCP (Model Context Protocol) server that injects hackathon behavioral rules into AI agents (Claude Code, Cursor, etc.) to optimize for speed during 48-hour hackathons.

**Entry point:** `src/index.ts` — defines MCP server, registers all 6 tools and 1 resource, handles all request routing via `@modelcontextprotocol/sdk` with stdio transport.

**Logic modules** (`src/logic/`):
- `config.ts` — persists active/inactive state to `~/.hackathon-mcp-config.json`
- `indexing.ts` — scans workspace (depth 4, skips node_modules/.git/dist/.next) and writes `.hackathon-index.md` for agent orientation
- `brainstorm.ts` — detects tech stack via regex, selects 3–5 "wow-factor" features from a hardcoded bank of 10
- `repo-init.ts` — generates README.md, .env.example, HACKATHON_PLAN.md, .gitignore boilerplate

**Tools exposed:**
1. `enable_hackathon_mode` / `disable_hackathon_mode` / `get_mode_status` — protocol lifecycle
2. `initialize_repo` — bootstraps new project with 4 boilerplate files
3. `update_index` — generates `.hackathon-index.md`
4. `brainstorm` — suggests features tailored to detected stack

**Resource:** `hackathon://protocol` — exposes the 7 protocol rules as markdown.

## Adding Tools or Resources

All tools are registered in `src/index.ts` via `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)`. Add new tool logic in `src/logic/` and wire up both handlers.
