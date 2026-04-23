import fs from "fs";
import os from "os";
import path from "path";

export interface HackathonConfig {
  active: boolean;
  activatedAt?: string;
  project?: {
    name?: string;
    goals?: string;
    techStack?: string;
  };
}

const CONFIG_PATH = path.join(os.homedir(), ".hackathon-mcp-config.json");

const DEFAULT_CONFIG: HackathonConfig = { active: false };

export function readConfig(): HackathonConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as HackathonConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: HackathonConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function enableHackathonMode(): HackathonConfig {
  const config = readConfig();
  config.active = true;
  config.activatedAt = new Date().toISOString();
  writeConfig(config);
  return config;
}

export function disableHackathonMode(): HackathonConfig {
  const config = readConfig();
  config.active = false;
  writeConfig(config);
  return config;
}

export function isActive(): boolean {
  return readConfig().active;
}
