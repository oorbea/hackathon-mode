# Claude Code Context

Claude Code should use `AGENTS.md` as the canonical agent context for this repository. This file exists so Claude can discover the same guidance through its native convention.

## Quick Reference

```bash
npm run dev      # Run the MCP server from TypeScript with tsx
npm run build    # Compile TypeScript into dist/
npm start        # Run the compiled server from dist/
npm audit        # Check known npm vulnerabilities; expected total is 0
```

Runtime support is Node `>=22`. Direct dependencies are pinned in `package.json`, and transitive dependencies are locked by `package-lock.json`.

## Important Behavior

- `src/index.ts` registers all MCP tools/resources and routes calls into `src/logic/`.
- Hackathon mode state is persisted at `~/.hackathon-mcp-config.json`.
- `update_index` writes `.hackathon-index.md`.
- `add_rule` and `remove_rule` write `.hackathon-rules.md`.
- `initialize_repo` creates starter files only when missing.
- `checkpoint` is intentionally side-effectful: it runs `git add -A` and creates a `chk:` commit.

For tool-by-tool behavior, architecture notes, and development rules, read `AGENTS.md`.
