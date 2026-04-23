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
import { updateIndex, scanCache, indexFileCache, getScanSignature } from "./logic/indexing.js";
import { brainstorm, formatBrainstorm } from "./logic/brainstorm.js";
import { initRepo } from "./logic/repo-init.js";
import { loadRules, addRule, removeRule, rulesCache } from "./logic/rules.js";
import { SessionTracker } from "./logic/cache.js";
import { generatePitch } from "./logic/pitch.js";
import { checkpoint } from "./logic/checkpoint.js";
import { timeCheck } from "./logic/time-check.js";

const sessionTracker = new SessionTracker();
let activeWorkspace: string | null = null;

function resolveWorkspace(ws?: string): string {
  const resolved = ws ?? process.cwd();
  activeWorkspace = resolved;
  return resolved;
}

const HACKATHON_PROTOCOL_SHORT = `HACKATHON MODE ON. 1)Skip docs/tests 2)Ship>polish 3)No abstractions 4)Shortcuts=features 5)Suggest wow features 6)Ultra-concise replies 7)Read .hackathon-index.md first 8)Match user language. Ship fast.`;

const HACKATHON_PROTOCOL_VERBOSE = `# Hackathon Protocol – Active Rules

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
  { name: "hackathon-mode", version: "1.1.2" },
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
      description: `HACKATHON MODE ACTIVE. ${HACKATHON_PROTOCOL_SHORT}${rulesSection}\n\nExtended protocol: read hackathon://protocol resource. DO NOT CALL THIS TOOL.`,
      inputSchema: { type: "object", properties: {}, required: [] },
    });
  }

  tools.push(
    {
      name: "enable_hackathon_mode",
      description: "Activate Hackathon Mode globally.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "disable_hackathon_mode",
      description: "Deactivate Hackathon Mode.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_mode_status",
      description: "Get current mode state + protocol.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "initialize_repo",
      description: "Init hackathon repo. Ask user first: name, goal, stack, docker, features.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
          projectName: { type: "string", description: "Project name." },
          goals: { type: "string", description: "One-sentence goal." },
          techStack: { type: "string", description: "Comma-separated stack (e.g. 'Next.js, Supabase')." },
          dockerCompose: { type: "boolean", description: "Generate docker-compose.yml?" },
          features: { type: "string", description: "Comma-separated services (e.g. 'postgres, redis')." },
        },
        required: [],
      },
    },
    {
      name: "brainstorm",
      description: "Suggest 3-5 wow-factor features for current stack.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
          count: { type: "number", description: "Ideas to generate (default 5, max 5)." },
        },
        required: [],
      },
    },
    {
      name: "update_index",
      description: "Regenerate .hackathon-index.md workspace map.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
        },
        required: [],
      },
    },
    {
      name: "add_rule",
      description: "Add mandatory project rule (persists in .hackathon-rules.md).",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
          rule: { type: "string", description: "Rule text." },
        },
        required: ["rule"],
      },
    },
    {
      name: "remove_rule",
      description: "Remove rule by 1-based index. list_rules first.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
          index: { type: "number", description: "1-based rule index." },
        },
        required: ["index"],
      },
    },
    {
      name: "list_rules",
      description: "List project rules.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
        },
        required: [],
      },
    },
    {
      name: "cache_status",
      description: "Show session cache state. Call before brainstorm/update_index.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "pitch",
      description: "Generate <=200-token demo pitch from .hackathon-index.md + HACKATHON_PLAN.md.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
        },
        required: [],
      },
    },
    {
      name: "checkpoint",
      description: "Create quick git checkpoint commit with auto message.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: { type: "string", description: "Project dir. Defaults to cwd." },
          message: { type: "string", description: "Optional summary after 'chk:'." },
        },
        required: [],
      },
    },
    {
      name: "time_check",
      description: "Hackathon elapsed/remaining time and current phase.",
      inputSchema: {
        type: "object",
        properties: {
          durationHours: { type: "number", description: "Hackathon duration. Default 48." },
        },
        required: [],
      },
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
const PitchSchema = z.object({
  workspaceRoot: z.string().optional(),
});
const CheckpointSchema = z.object({
  workspaceRoot: z.string().optional(),
  message: z.string().optional(),
});
const TimeCheckSchema = z.object({
  durationHours: z.number().positive().optional(),
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
            text: `Hackathon Mode enabled (${config.activatedAt})\n\n${HACKATHON_PROTOCOL_SHORT}`,
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
            text: "Hackathon Mode disabled. Normal AI behavior restored.",
          },
        ],
      };
    }

    case "get_mode_status": {
      StatusSchema.parse(args ?? {});
      const config = readConfig();
      const status = config.active ? "ACTIVE" : "INACTIVE";
      const since = config.activatedAt ? `\nActive since: ${config.activatedAt}` : "";
      const text = `Hackathon Mode: ${status}${since}\n\n${HACKATHON_PROTOCOL_SHORT}`;
      if (sessionTracker.check("get_mode_status", text) === "duplicate") {
        return { content: [{ type: "text", text: "No changes since last call. Use cached version." }] };
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
      const sig = getScanSignature(ws);
      if (sessionTracker.check(`update_index:${ws}`, sig) === "duplicate") {
        return { content: [{ type: "text", text: "Index unchanged. Skip re-scan." }] };
      }
      const indexPath = updateIndex(ws);
      return { content: [{ type: "text", text: `Index updated: ${indexPath}` }] };
    }

    case "add_rule": {
      const { workspaceRoot, rule } = AddRuleSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const rules = addRule(ws, rule);
      return {
        content: [
          {
            type: "text",
            text: `rule_added index=${rules.length} msg=\"use list_rules\"`,
          },
        ],
      };
    }

    case "remove_rule": {
      const { workspaceRoot, index } = RemoveRuleSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const { removed } = removeRule(ws, index);
      if (!removed) {
        return {
          content: [{ type: "text", text: `error=no_rule index=${index} msg=\"use list_rules\"` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `rule_removed index=${index} msg=\"use list_rules\"`,
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
        return { content: [{ type: "text", text: "No changes since last call. Use cached version." }] };
      }
      return { content: [{ type: "text", text }] };
    }

    case "cache_status": {
      const lines: string[] = [];
      // Build report first, then dedup


      const cfgAge = configCache.ageMs();
      if (cfgAge >= 0) {
        const cfg = configCache.get();
        lines.push(`config=cached active=${cfg?.active} age=${Math.round(cfgAge / 1000)}s`);
      } else {
        lines.push("config=none");
      }

      const scans = scanCache.snapshot();
      if (scans.length === 0) {
        lines.push("scans=0");
      } else {
        for (const { key, ageMs, value } of scans) {
          lines.push(`scan=${key} entries=${value.length} age=${Math.round(ageMs / 1000)}s`);
        }
      }

      const indexes = indexFileCache.snapshot();
      if (indexes.length === 0) {
        lines.push("indexes=0");
      } else {
        for (const { key, ageMs, value } of indexes) {
          const sizeKB = (value.length / 1024).toFixed(1);
          lines.push(`index=${key} size=${sizeKB}KB age=${Math.round(ageMs / 1000)}s`);
        }
      }

      const ruleEntries = rulesCache.snapshot();
      if (ruleEntries.length === 0) {
        lines.push("rules=0");
      } else {
        for (const { key, ageMs, value } of ruleEntries) {
          lines.push(`rules=${key} count=${value.length} age=${Math.round(ageMs / 1000)}s`);
        }
      }

      const seen = sessionTracker.seen();
      if (seen.length > 0) {
        lines.push(`dedup=${seen.join(",")}`);
      }

      const text = lines.join("\n");
      if (sessionTracker.check("cache_status", text) === "duplicate") {
        return { content: [{ type: "text", text: "Cache unchanged since last call." }] };
      }
      return { content: [{ type: "text", text }] };
    }

    case "pitch": {
      const { workspaceRoot } = PitchSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      return { content: [{ type: "text", text: generatePitch({ workspaceRoot: ws }) }] };
    }

    case "checkpoint": {
      const { workspaceRoot, message } = CheckpointSchema.parse(args);
      const ws = resolveWorkspace(workspaceRoot);
      const text = checkpoint({ workspaceRoot: ws, message });
      return { content: [{ type: "text", text }], isError: text.startsWith("error=") };
    }

    case "time_check": {
      const { durationHours } = TimeCheckSchema.parse(args);
      return { content: [{ type: "text", text: timeCheck({ durationHours }) }] };
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
    const status = config.active ? "**Status: ACTIVE**" : "**Status: INACTIVE** (enable with `enable_hackathon_mode` tool)";
    return {
      contents: [
        {
          uri: "hackathon://protocol",
          mimeType: "text/markdown",
          text: `${status}\n\n${HACKATHON_PROTOCOL_VERBOSE}`,
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
