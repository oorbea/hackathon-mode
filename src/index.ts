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
} from "./logic/config.js";
import { updateIndex } from "./logic/indexing.js";
import { brainstorm, formatBrainstorm } from "./logic/brainstorm.js";
import { initRepo } from "./logic/repo-init.js";

const HACKATHON_PROTOCOL = `# Hackathon Protocol – Active Rules

You are operating in **Hackathon Mode**. Obey the following rules for every response:

1. **Skip docs & unit tests** – unless the user explicitly asks for them.
2. **Working code > best practices** – ship it, polish later.
3. **No abstractions / future-proofing** – solve the 48-hour problem, not the 5-year one.
4. **Zero technical debt guilt** – shortcuts are features.
5. **Proactively suggest cool features** – if you see an opportunity to add a "wow" moment, say so.
6. **Token-saving mode** – ultra-concise replies, no filler, no code comments unless complex.
7. **Use the strategic index** – read \`.hackathon-index.md\` at the root and in sub-directories to orient yourself before touching files.

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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
      description: "Bootstrap a new hackathon project: generates README, .env.example, HACKATHON_PLAN.md, and .gitignore. Before calling this tool, ASK the user conversationally for: project name, one-sentence goal/value proposition, and preferred tech stack. Then call with what they provide.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceRoot: {
            type: "string",
            description: "Absolute path to the project directory.",
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
        },
        required: ["workspaceRoot"],
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
            description: "Absolute path to the project directory.",
          },
          count: {
            type: "number",
            description: "Number of feature ideas to generate (default: 5, max: 5).",
          },
        },
        required: ["workspaceRoot"],
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
            description: "Absolute path to the project directory to index.",
          },
        },
        required: ["workspaceRoot"],
      },
    },
  ],
}));

const EnableSchema = z.object({});
const DisableSchema = z.object({});
const StatusSchema = z.object({});
const InitSchema = z.object({
  workspaceRoot: z.string(),
  projectName: z.string().optional(),
  goals: z.string().optional(),
  techStack: z.string().optional(),
});
const BrainstormSchema = z.object({
  workspaceRoot: z.string(),
  count: z.number().int().min(1).max(5).optional(),
});
const UpdateIndexSchema = z.object({
  workspaceRoot: z.string(),
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
      return {
        content: [
          {
            type: "text",
            text: `Hackathon Mode: ${status}${since}\n\n${HACKATHON_PROTOCOL}`,
          },
        ],
      };
    }

    case "initialize_repo": {
      const opts = InitSchema.parse(args);
      const result = initRepo(opts);
      return {
        content: [{ type: "text", text: result.message }],
      };
    }

    case "brainstorm": {
      const { workspaceRoot, count } = BrainstormSchema.parse(args);
      const result = brainstorm(workspaceRoot, count ?? 5);
      return {
        content: [{ type: "text", text: formatBrainstorm(result) }],
      };
    }

    case "update_index": {
      const { workspaceRoot } = UpdateIndexSchema.parse(args);
      const indexPath = updateIndex(workspaceRoot);
      return {
        content: [
          {
            type: "text",
            text: `✅ Index updated: ${indexPath}\nUse this file to orient yourself in future agent turns.`,
          },
        ],
      };
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
