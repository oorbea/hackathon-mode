import { readConfig } from "./config.js";

interface TimeCheckOptions {
  durationHours?: number;
}

const PHASES = [
  { name: "Foundation", start: 0, end: 4 },
  { name: "MVP", start: 4, end: 12 },
  { name: "Polish", start: 12, end: 24 },
  { name: "Demo Prep", start: 24, end: 36 },
  { name: "Buffer", start: 36, end: 48 },
];

function fmt(hours: number): string {
  const safe = Math.max(0, hours);
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function timeCheck(opts: TimeCheckOptions = {}): string {
  const config = readConfig();
  if (!config.activatedAt) return "active=false msg=enable_hackathon_mode_first";

  const duration = opts.durationHours ?? 48;
  const activated = new Date(config.activatedAt).getTime();
  const elapsed = Math.max(0, (Date.now() - activated) / 3_600_000);
  const remaining = Math.max(0, duration - elapsed);
  const scaledHour = duration > 0 ? (elapsed / duration) * 48 : 48;
  const phase = PHASES.find((p) => scaledHour >= p.start && scaledHour < p.end)?.name ?? "Submission";
  const deadline = new Date(activated + duration * 3_600_000).toISOString();

  return [
    `active=${config.active}`,
    `activatedAt=${config.activatedAt}`,
    `duration=${duration}h`,
    `elapsed=${fmt(elapsed)}`,
    `remaining=${fmt(remaining)}`,
    `phase=${phase}`,
    `deadline=${deadline}`,
  ].join("\n");
}
