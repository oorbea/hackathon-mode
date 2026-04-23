#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SERVER_CONFIG = {
  command: "npx",
  args: ["-y", "hackathon-mode@latest"],
};

const VSCODE_SERVER_CONFIG = {
  type: "stdio",
  command: "npx",
  args: ["-y", "hackathon-mode@latest"],
};

const AGENT_CONFIGS = {
  claude: { path: ".mcp.json", format: "json", section: "mcpServers", serverConfig: SERVER_CONFIG },
  cursor: { path: ".cursor/mcp.json", format: "json", section: "mcpServers", serverConfig: SERVER_CONFIG },
  codex: { path: ".codex/config.toml", format: "toml" },
  copilot: { path: ".vscode/mcp.json", format: "json", section: "servers", serverConfig: VSCODE_SERVER_CONFIG },
  gemini: { path: ".gemini/settings.json", format: "json", section: "mcpServers", serverConfig: SERVER_CONFIG },
};

const AGENT_NAMES = Object.keys(AGENT_CONFIGS);

function printRootHelp() {
  console.log(`hackathon-mode

Usage:
  hackathon-mode                 Run the MCP server on stdio
  hackathon-mode init [options]  Create project-local MCP config

Options:
  --agent <name>  all | ${AGENT_NAMES.join(" | ")} (default: all)
  -h, --help      Show help

Examples:
  npx hackathon-mode@latest init --agent all
  npx hackathon-mode@latest init --agent cursor
`);
}

function printInitHelp() {
  console.log(`hackathon-mode init

Usage:
  hackathon-mode init [--agent <name>]

Creates MCP config files in the current project without adding package dependencies.

Agents:
  all
  ${AGENT_NAMES.join("\n  ")}

Examples:
  npx hackathon-mode@latest init --agent all
  npx hackathon-mode@latest init --agent claude
  npx hackathon-mode@latest init --agent cursor
`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseInitArgs(args) {
  let agent = "all";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      printInitHelp();
      process.exit(0);
    }

    if (arg === "--agent") {
      const value = args[i + 1];
      if (!value) fail("missing value for --agent");
      agent = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--agent=")) {
      agent = arg.slice("--agent=".length);
      if (!agent) fail("missing value for --agent");
      continue;
    }

    fail(`unknown init option: ${arg}`);
  }

  if (agent !== "all" && !AGENT_CONFIGS[agent]) {
    fail(`unknown agent "${agent}". Use one of: all, ${AGENT_NAMES.join(", ")}`);
  }

  return { agent };
}

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return { existed: false, data: {} };
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    fail(`could not read ${filePath}: ${err.message}`);
  }

  try {
    const data = JSON.parse(raw);
    if (data === null || Array.isArray(data) || typeof data !== "object") {
      fail(`${filePath} must contain a JSON object`);
    }
    return { existed: true, data };
  } catch (err) {
    fail(`${filePath} contains invalid JSON: ${err.message}`);
  }
}

function writeJsonAgentConfig(workspaceRoot, config) {
  const { path: relativePath, section, serverConfig } = config;
  const filePath = path.join(workspaceRoot, relativePath);
  const { existed, data } = readJsonConfig(filePath);

  const existingServers = data[section];
  if (
    existingServers !== undefined &&
    (existingServers === null || Array.isArray(existingServers) || typeof existingServers !== "object")
  ) {
    fail(`${relativePath} has an invalid ${section} value; expected an object`);
  }

  const nextData = {
    ...data,
    [section]: {
      ...(existingServers ?? {}),
      "hackathon-mode": serverConfig,
    },
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(nextData, null, 2)}\n`, "utf-8");

  return existed ? "updated" : "created";
}

function writeCodexConfig(workspaceRoot, config) {
  const relativePath = config.path;
  const filePath = path.join(workspaceRoot, relativePath);
  const existed = fs.existsSync(filePath);
  const block = `[mcp_servers."hackathon-mode"]\ncommand = "npx"\nargs = ["-y", "hackathon-mode@latest"]\n`;
  let content = "";

  if (existed) {
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      fail(`could not read ${filePath}: ${err.message}`);
    }
  }

  const existingBlockPattern = /(^|\n)\[mcp_servers\.(?:"hackathon-mode"|hackathon-mode)\]\n[\s\S]*?(?=\n\[|$)/;
  let nextContent;
  if (existingBlockPattern.test(content)) {
    nextContent = content.replace(existingBlockPattern, `$1${block.trimEnd()}`);
    if (!nextContent.endsWith("\n")) nextContent += "\n";
  } else {
    const separator = content.trim().length > 0 ? "\n\n" : "";
    nextContent = `${content.replace(/\s*$/, "")}${separator}${block}`;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, nextContent, "utf-8");

  return existed ? "updated" : "created";
}

function writeAgentConfig(workspaceRoot, config) {
  if (config.format === "toml") {
    return writeCodexConfig(workspaceRoot, config);
  }
  return writeJsonAgentConfig(workspaceRoot, config);
}

function initProject(args) {
  const { agent } = parseInitArgs(args);
  const selectedAgents = agent === "all" ? AGENT_NAMES : [agent];
  const workspaceRoot = process.cwd();
  const results = [];

  for (const agentName of selectedAgents) {
    const config = AGENT_CONFIGS[agentName];
    const status = writeAgentConfig(workspaceRoot, config);
    results.push({ agentName, relativePath: config.path, status });
  }

  console.log("hackathon-mode project bootstrap complete.\n");
  for (const result of results) {
    console.log(`- ${result.status}: ${result.relativePath} (${result.agentName})`);
  }
  console.log("\nOpen your MCP-compatible agent in this project and call enable_hackathon_mode.");
}

const args = process.argv.slice(2);

if (args.length === 0) {
  await import("../dist/index.js");
} else if (args[0] === "-h" || args[0] === "--help") {
  printRootHelp();
} else if (args[0] === "init") {
  initProject(args.slice(1));
} else {
  fail(`unknown command: ${args[0]}`);
}
