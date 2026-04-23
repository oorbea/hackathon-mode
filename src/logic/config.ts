import fs from "fs";
import os from "os";
import path from "path";
import { CachedValue } from "./cache.js";

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

export const configCache = new CachedValue<HackathonConfig>(5_000);

export function readConfig(): HackathonConfig {
  const cached = configCache.get();
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as HackathonConfig;
    configCache.set(config);
    return config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: HackathonConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  configCache.set(config);
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
