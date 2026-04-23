import fs from "fs";
import path from "path";

interface PitchOptions {
  workspaceRoot: string;
}

function readIfExists(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return "";
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

function cleanLine(value: string): string {
  return value
    .replace(/^- \[[ xX]\]\s*/gm, "")
    .replace(/[`*_#>]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
}

function firstItems(value: string, count: number): string[] {
  return value
    .split("\n")
    .map((l) => l.replace(/^- \[[ xX]\]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, count);
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")}...`;
}

export function generatePitch(opts: PitchOptions): string {
  const plan = readIfExists(path.join(opts.workspaceRoot, "HACKATHON_PLAN.md"));
  const index = readIfExists(path.join(opts.workspaceRoot, ".hackathon-index.md"));
  const readme = readIfExists(path.join(opts.workspaceRoot, "README.md"));

  const goal = cleanLine(section(plan, "Goals")) || cleanLine(readme.split("\n").find((l) => l.startsWith(">")) ?? "") || "The problem is still being defined.";
  const stack = cleanLine(section(plan, "Tech Stack")) || "the current stack";
  const features = firstItems(section(plan, "Features to Build"), 3);
  const keys = (index.match(/Keys:\s*(.*)/)?.[1] ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 4);

  const solution = features.length > 0
    ? `${features.join(", ")} built with ${stack}`
    : `a fast MVP built with ${stack}`;
  const demo = keys.length > 0
    ? `Open ${keys[0]}, show the main flow, then highlight ${features[0] ?? "the wow moment"}.`
    : `Show the main flow, the result, and the wow moment.`;

  return truncateWords([
    `Problem: ${goal}`,
    `Solution: ${solution}.`,
    `Demo: ${demo}`,
    "Close: why now, why this team, ask judges to try it live."
  ].join("\n"), 190);
}
