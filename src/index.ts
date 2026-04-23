#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  enableHackathonMode,
  disableHackathonMode,
  readConfig,
  isActive,
  configCache,
} from "./logic/config.js";
import { updateIndex, scanCache, indexFileCache } from "./logic/indexing.js";
import { brainstorm, formatBrainstorm } from "./logic/brainstorm.js";
import { initRepo } from "./logic/repo-init.js";
import { loadRules, addRule, removeRule, rulesCache } from "./logic/rules.js";
import { SessionTracker } from "./logic/cache.js";

const sessionTracker = new SessionTracker();
let activeWorkspace: string | null = null;

function resolveWorkspace(ws?: string): string {
  const resolved = ws ?? process.cwd();
  activeWorkspace = resolved;
  return resolved;
}

const HACKATHON_PROTOCOL = `# Hackathon Protocol – Active Rules

You are operating in **Hackathon Mode**. Obey the following rules for every response:

1. **Skip docs & unit tests** – unless the user explicitly asks for them.
2. **Working code > best practices** – ship it, polish later.
3. **No abstractions / future-proofing** – solve the 48-hour problem, not the 5-year one.
4. **Zero technical debt guilt** – shortcuts are features.
5. **Proactively suggest cool features** – if you see an opportunity to add a "wow" moment, say so.
6. **Token-saving mode** – ultra-concise replies, no filler, no code comments unless complex.
7. **Use the strategic index** – read \`.hackathon-index.md\` at the root and in sub-directories to orient yourself before touching files.
8. **Match the user's language** – ALWAYS reply in the same language the user writes in. Never switch to English unless the user writes in English.

Stay lean. Stay fast. Win the hackathon.
`;

const server = new Server(
  { name: "hackathon-mode", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const active = isActive();
  const tools = [];

  if (active) {
    let rulesSection = "";
    if (activeWorkspace) {
      const rules = loadRules(activeWorkspace);
      if (rules.length > 0) {
        rulesSection =
          "\n\n## Project Rules (MANDATORY — follow these in EVERY response)\n\n" +
          rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
      }
    }
    tools.push({
      name: "_hackathon_rules",
      description: `HACKATHON MODE IS ACTIVE. You MUST follow these rules for EVERY response in this session, without exception:\n\n${HACKATHON_PROTOCOL}${rulesSection}\n\nThis tool exists only to inject these rules. Do not call it.`,
      inputSchema: { type: "object", properties: {}, required: [] },
    });
  }

  tools.push(
    {
      name: "enable_hackathon_mode",
      description: "Activate Hackathon Mode globally. All subsequent AI interactions will follow the Hackathon Protocol.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "disable_hackathon_mode",
      description: "Deactivate Hackathon Mode and restore normal AI behavior.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_mode_status",
      description: "Return the current Hackathon Mode state and the full Hackathon Protocol instructions.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "initialize_repo",
      description: "Bootstrap a new hackathon project. Before calling, ASK the user conversationally for: (1) project name, (2) one-sentence goal, (3) tech stack, (4) whether they want a docker-compose.yml, and if yes (5) what services/features they need (databases, cache, queues, storage, etc.). Then call with everything they provide.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory. Defaults to current working directory if omitted.",
          },
          projectName: {
            type: "string",
            description: "Name of the project.",
          },
          goals: {
            type: "string",
            description: "One-sentence project goal / value proposition.",
          },
          techStack: {
            type: "string",
            description: "Comma-separated list of technologies (e.g. 'Next.js, Supabase, OpenAI').",
          },
          dockerCompose: {
            type: "boolean",
            description: "Whether to generate a docker-compose.yml for local development.",
          },
          features: {
            type: "string",
            description: "Comma-separated services/features needed (e.g. 'postgres, redis, auth, file uploads'). Used to generate docker services and plan sections.",
          },
        },
        required: [],
      },
    },
    {
      name: "brainstorm",
      description: "Analyze the current project and suggest 3-5 high-impact 'wow-factor' features tailored to the tech stack.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory. Defaults to current working directory if omitted.",
          },
          count: {
            type: "number",
            description: "Number of feature ideas to generate (default: 5, max: 5).",
          },
        },
        required: [],
      },
    },
    {
      name: "update_index",
      description: "Scan the workspace and regenerate the .hackathon-index.md strategic context file.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory to index. Defaults to current working directory if omitted.",
          },
        },
        required: [],
      },
    },
    {
      name: "add_rule",
      description: "Add a project-specific rule that the agent MUST follow when Hackathon Mode is active. Rules persist in .hackathon-rules.md at the workspace root.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory. Defaults to current working directory if omitted.",
          },
          rule: {
            type: "string",
            description: "The rule text to add (e.g. 'Always commit after making changes').",
          },
        },
        required: ["rule"],
      },
    },
    {
      name: "remove_rule",
      description: "Remove a project rule by its index number (1-based). Use list_rules first to see current rules and their indices.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory. Defaults to current working directory if omitted.",
          },
          index: {
            type: "number",
            description: "1-based index of the rule to remove.",
          },
        },
        required: ["index"],
      },
    },
    {
      name: "list_rules",
      description: "List all project-specific rules for the workspace.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory. Defaults to current working directory if omitted.",
          },
        },
        required: [],
      },
    },
    {
      name: "cache_status",
      description: "Check what data is already cached in this session (config, file tree, index, rules). Call this before brainstorm or update_index to avoid redundant work.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  );

  return { tools };
});

const EnableSchema = z.object({});
const DisableSchema = z.object({});
const StatusSchema = z.object({});
const InitSchema = z.object({
  workspaceRoot: z.string().optional(),
  projectName: z.string().optional(),
  goals: z.string().optional(),
  techStack: z.string().optional(),
  dockerCompose: z.boolean().optional(),
  features: z.string().optional(),
});
const BrainstormSchema = z.object({
  workspaceRoot: z.string().optional(),
  count: z.number().int().min(1).max(5).optional(),
});
const UpdateIndexSchema = z.object({
  workspaceRoot: z.string().optional(),
});
const AddRuleSchema = z.object({
  workspaceRoot: z.string().optional(),
  rule: z.string(),
});
const RemoveRuleSchema = z.object({
  workspaceRoot: z.string().optional(),
  index: z.number().int().min(1),
});
const ListRulesSchema = z.object({
  workspaceRoot: z.string().optional(),
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "enable_hackathon_mode": {
      EnableSchema.parse(args ?? {});
      const config = enableHackathonMode();
      return {
        content: [
          {
            type: "text",
            text: `✅ Hackathon Mode ENABLED (${config.activatedAt})\n\n${HACKATHON_PROTOCOL}`,
          },
        ],
      };
    }

    case "disable_hackathon_mode": {
      DisableSchema.parse(args ?? {});
      disableHackathonMode();
      return {
        content: [
          {
            type: "text",
            text: "🛑 Hackathon Mode DISABLED. Normal AI behavior restored.",
          },
        ],
      };
    }

    case "get_mode_status": {
      StatusSchema.parse(args ?? {});
      const config = readConfig();
      const status = config.active ? "🟢 ACTIVE" : "🔴 INACTIVE";
      const since = config.activatedAt ? `\nActive since: ${config.activatedAt}` : "";
      const text = `Hackathon Mode: ${status}${since}\n\n${HACKATHON_PROTOCOL}`;
      if (sessionTracker.check("get_mode_status", text) === "duplicate") {
        return { content: [{ type: "text", text: "⚡ No changes since last call. Use cached version." }] };
      }
      return { content: [{ type: "text", text }] };
    }

    case "initialize_repo": {
      const opts = InitSchema.parse(args);
      const ws = resolveWorkspace(opts.workspaceRoot);
      const result = initRepo({ ...opts, workspaceRoot: ws });
      return {
        content: [{ type: "text", text: result.message }],
      };
    }

    case "brainstorm": {
      const { workspaceRoot, count } = BrainstormSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const result = brainstorm(ws, count ?? 5);
      return {
        content: [{ type: "text", text: formatBrainstorm(result) }],
      };
    }

    case "update_index": {
      const { workspaceRoot } = UpdateIndexSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const indexPath = updateIndex(ws);
      return {
        content: [
          {
            type: "text",
            text: `✅ Index updated: ${indexPath}\nUse this file to orient yourself in future agent turns.`,
          },
        ],
      };
    }

    case "add_rule": {
      const { workspaceRoot, rule } = AddRuleSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const rules = addRule(ws, rule);
      return {
        content: [
          {
            type: "text",
            text: `✅ Rule added (#${rules.length}): "${rule}"\n\nActive rules:\n${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
          },
        ],
      };
    }

    case "remove_rule": {
      const { workspaceRoot, index } = RemoveRuleSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const { rules, removed } = removeRule(ws, index);
      if (!removed) {
        return {
          content: [{ type: "text", text: `❌ No rule at index ${index}. Use list_rules to see valid indices.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `✅ Removed rule #${index}: "${removed}"\n\nRemaining rules:\n${rules.length > 0 ? rules.map((r, i) => `${i + 1}. ${r}`).join("\n") : "(none)"}`,
          },
        ],
      };
    }

    case "list_rules": {
      const { workspaceRoot } = ListRulesSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const rules = loadRules(ws);
      const text =
        rules.length > 0
          ? `## Project Rules (${rules.length})\n\n${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
          : "No project rules defined. Use `add_rule` to create one.";
      if (sessionTracker.check(`list_rules:${ws}`, text) === "duplicate") {
        return { content: [{ type: "text", text: "⚡ No changes since last call. Use cached version." }] };
      }
      return { content: [{ type: "text", text }] };
    }

    case "cache_status": {
      const lines: string[] = ["## Session Cache Status", ""];

      const cfgAge = configCache.ageMs();
      if (cfgAge >= 0) {
        const cfg = configCache.get();
        lines.push(`- **Config**: cached (active=${cfg?.active}), ${Math.round(cfgAge / 1000)}s ago`);
      } else {
        lines.push("- **Config**: not cached");
      }

      const scans = scanCache.snapshot();
      if (scans.length === 0) {
        lines.push("- **Workspace scans**: none cached");
      } else {
        for (const { key, ageMs, value } of scans) {
          lines.push(`- **Workspace scan** [\`${key}\`]: ${value.length} entries, ${Math.round(ageMs / 1000)}s ago`);
        }
      }

      const indexes = indexFileCache.snapshot();
      if (indexes.length === 0) {
        lines.push("- **Index files**: none cached");
      } else {
        for (const { key, ageMs, value } of indexes) {
          const sizeKB = (value.length / 1024).toFixed(1);
          lines.push(`- **Index file** [\`${key}\`]: ${sizeKB}KB, ${Math.round(ageMs / 1000)}s ago`);
        }
      }

      const ruleEntries = rulesCache.snapshot();
      if (ruleEntries.length === 0) {
        lines.push("- **Project rules**: none cached");
      } else {
        for (const { key, ageMs, value } of ruleEntries) {
          lines.push(`- **Project rules** [\`${key}\`]: ${value.length} rules, ${Math.round(ageMs / 1000)}s ago`);
        }
      }

      const seen = sessionTracker.seen();
      if (seen.length > 0) {
        lines.push(`- **Deduplicated responses**: ${seen.join(", ")}`);
      }

      lines.push("", "_Call \`update_index\` only if workspace files changed. Otherwise skip re-scanning._");

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "hackathon://protocol",
      name: "Hackathon Protocol",
      description: "System prompt fragment with the active Hackathon behavioral rules.",
      mimeType: "text/markdown",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "hackathon://protocol") {
    const config = readConfig();
    const status = config.active ? "**Status: 🟢 ACTIVE**" : "**Status: 🔴 INACTIVE** (enable with `enable_hackathon_mode` tool)";
    return {
      contents: [
        {
          uri: "hackathon://protocol",
          mimeType: "text/markdown",
          text: `${status}\n\n${HACKATHON_PROTOCOL}`,
        },
      ],
    };
  }
  throw new Error(`Resource not found: ${request.params.uri}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("hackathon-mode MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
