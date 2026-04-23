import { readIndex, getFileTree } from "./indexing.js";

interface BrainstormResult {
  features: Feature[];
  context: string;
}

interface Feature {
  title: string;
  description: string;
  wowFactor: string;
  effort: "low" | "medium" | "high";
  techHint: string;
}

const FEATURE_BANKS: Feature[] = [
  {
    title: "Real-time Collaboration Presence",
    description: "Show live cursors / avatars of collaborators using WebSockets or PartyKit.",
    wowFactor: "Instant 'multiplayer' feeling – judges love seeing live updates.",
    effort: "medium",
    techHint: "PartyKit, Socket.io, or Liveblocks",
  },
  {
    title: "AI-Powered Autocomplete",
    description: "Add an inline AI suggestion box to any text input in your app.",
    wowFactor: "Impresses immediately; feels futuristic.",
    effort: "low",
    techHint: "OpenAI streaming API + a simple debounce hook",
  },
  {
    title: "One-Click Share Link",
    description: "Generate a shareable URL that encodes current state so anyone can resume or fork.",
    wowFactor: "Viral loop built-in – judges can interact after the demo.",
    effort: "low",
    techHint: "Encode state in base64 query params or a short-URL service",
  },
  {
    title: "Ambient Analytics Dashboard",
    description: "Live, auto-refreshing charts of key metrics on a separate /dashboard route.",
    wowFactor: "Makes the project look production-ready in seconds.",
    effort: "medium",
    techHint: "Recharts or Chart.js with SSE or polling",
  },
  {
    title: "Voice Command Mode",
    description: "Trigger key actions via the Web Speech API or Whisper API.",
    wowFactor: "Jaw-dropping live demo moment.",
    effort: "medium",
    techHint: "Web Speech API (free) or OpenAI Whisper for transcription",
  },
  {
    title: "Progressive Web App (PWA) Shell",
    description: "Add a service worker + manifest so the app installs like a native app.",
    wowFactor: "Works offline and feels polished – easy points.",
    effort: "low",
    techHint: "vite-plugin-pwa or next-pwa",
  },
  {
    title: "Generative UI Theming",
    description: "Let users describe a vibe in plain text and auto-generate a CSS theme.",
    wowFactor: "Personalized experience in < 1 minute of use.",
    effort: "medium",
    techHint: "GPT-4o + CSS variable injection",
  },
  {
    title: "Drag-and-Drop Canvas",
    description: "Free-form drag-and-drop layout builder for the core content.",
    wowFactor: "Tactile and fun – keeps judges engaged.",
    effort: "high",
    techHint: "dnd-kit or react-flow",
  },
  {
    title: "QR Code Instant Demo",
    description: "Generate a QR code that deep-links judges into the live demo state.",
    wowFactor: "Eliminates 'let me pull it up on your laptop' friction.",
    effort: "low",
    techHint: "qrcode npm package or qr-code-styling",
  },
  {
    title: "Emoji Reaction Stream",
    description: "Floating emoji reactions that broadcast to all viewers in real time.",
    wowFactor: "Crowd energy during the live demo – always gets a laugh.",
    effort: "low",
    techHint: "WebSocket broadcast + CSS keyframe animations",
  },
];

function detectTechStack(tree: string): string[] {
  const hints: string[] = [];
  if (/\.tsx?|next|react/i.test(tree)) hints.push("React/Next.js");
  if (/vue/i.test(tree)) hints.push("Vue");
  if (/svelte/i.test(tree)) hints.push("Svelte");
  if (/python|\.py|fastapi|flask|django/i.test(tree)) hints.push("Python");
  if (/go\.mod|\.go\b/i.test(tree)) hints.push("Go");
  if (/rust|cargo\.toml/i.test(tree)) hints.push("Rust");
  if (/prisma|drizzle|supabase/i.test(tree)) hints.push("DB/ORM");
  if (/tailwind/i.test(tree)) hints.push("Tailwind");
  return hints;
}

function pickFeatures(count: number, tree: string): Feature[] {
  const arr = [...FEATURE_BANKS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const techStack = detectTechStack(tree);
  const preferred = arr.filter((f) =>
    techStack.some((t) => f.techHint.toLowerCase().includes(t.toLowerCase()))
  );
  const rest = arr.filter((f) => !preferred.includes(f));
  return [...preferred, ...rest].slice(0, count);
}

export function brainstorm(workspaceRoot: string, count = 5): BrainstormResult {
  const index = readIndex(workspaceRoot);
  const tree = index ?? getFileTree(workspaceRoot);
  const features = pickFeatures(Math.min(count, 5), tree);
  return { features, context: tree.slice(0, 500) };
}

export function formatBrainstorm(result: BrainstormResult): string {
  const lines: string[] = ["## 💡 Hackathon Feature Ideas\n"];
  result.features.forEach((f, i) => {
    lines.push(
      `### ${i + 1}. ${f.title} (effort: ${f.effort})`,
      f.description,
      `**Wow factor:** ${f.wowFactor}`,
      `**Tech hint:** ${f.techHint}`,
      ""
    );
  });
  return lines.join("\n");
}
