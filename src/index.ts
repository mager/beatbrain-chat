#!/usr/bin/env node
import * as readline from "node:readline";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { discoverTool } from "./tools/discover.js";
import { searchTool } from "./tools/search.js";
import { creatorTool } from "./tools/creator.js";
import { trackTool } from "./tools/track.js";
import { genreTool } from "./tools/genre.js";

// ── Palette ──────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  purple: "\x1b[38;5;141m",
  cyan: "\x1b[38;5;81m",
  gold: "\x1b[38;5;220m",
  pink: "\x1b[38;5;211m",
  gray: "\x1b[38;5;242m",
  white: "\x1b[38;5;255m",
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  clearLine: "\x1b[2K\r",
};

// ── Animated spinner with musical symbols ────────────────
const NOTES = ["♪", "♫", "♬", "♩", "♭", "♮", "♯", "𝄞"];
const NOTE_COLORS = [c.purple, c.cyan, c.gold, c.pink];

class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  start(): void {
    process.stdout.write(c.hide);
    this.interval = setInterval(() => {
      const note = NOTES[this.frame % NOTES.length];
      const color = NOTE_COLORS[this.frame % NOTE_COLORS.length];
      process.stdout.write(
        `${c.clearLine}  ${color}${note}${c.reset} ${c.dim}${this.label}${c.reset}`
      );
      this.frame++;
    }, 120);
  }

  update(label: string): void {
    this.label = label;
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write(`${c.clearLine}${c.show}`);
  }

  get active(): boolean {
    return this.interval !== null;
  }
}

// ── Typewriter: buffers text and drains word-by-word ──────
const WORD_DELAY_MS = 60; // ~16 words/sec visible, feels fluid

class Typewriter {
  private pending = ""; // partial text waiting for word boundaries
  private words: string[] = []; // complete words ready to print
  private draining = false;
  private resolvers: (() => void)[] = [];

  push(text: string): void {
    this.pending += text;
    // Split on word boundaries — keep whitespace attached to the preceding word
    const parts = this.pending.split(/(?<=\s)/);
    // Last part may be incomplete (no trailing space), hold it back
    this.pending = parts.pop() ?? "";
    for (const part of parts) {
      this.words.push(part);
    }
    if (!this.draining && this.words.length > 0) {
      this.draining = true;
      this.drain();
    }
  }

  private async drain(): Promise<void> {
    while (this.words.length > 0) {
      const word = this.words.shift()!;
      process.stdout.write(word);
      await sleep(WORD_DELAY_MS);
    }
    this.draining = false;
    // Check if more words arrived while we were finishing
    if (this.words.length > 0) {
      this.draining = true;
      this.drain();
      return;
    }
    // Notify flush waiters
    for (const r of this.resolvers) r();
    this.resolvers = [];
  }

  /** Flush remaining partial text and wait for drain to finish */
  async flush(): Promise<void> {
    // Push any remaining partial text
    if (this.pending) {
      this.words.push(this.pending);
      this.pending = "";
      if (!this.draining) {
        this.draining = true;
        this.drain();
      }
    }
    if (!this.draining) return;
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── .env loader ──────────────────────────────────────────
function loadEnv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      break;
    }
  }
}

loadEnv();

// ── System prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `You are Temporal — a music-obsessed friend who lives and breathes new releases, deep cuts, and everything in between.

## Your Context Brain

You're powered by the BeatBrain platform (beatbrain.xyz) — a music discovery engine that aggregates trending tracks from five sources: Spotify New Releases, Reddit [FRESH], Billboard Hot 100, Pitchfork Best New Music, and HotNewHipHop. Tracks are scored and ranked using a weighted algorithm. You also have access to Spotify's full catalog, deep MusicBrainz metadata (credits, instruments, genres), and genre-based exploration.

## Your Tools

1. **beatbrain_discover** — The live BeatBrain discover feed. Ranked trending tracks from all five sources with Spotify links.
2. **beatbrain_search** — Search Spotify for specific artists, songs, or queries. Returns popularity scores and Spotify links.
3. **beatbrain_creator** — Deep artist/creator profiles. Genres, origin, active years, top tracks, production credits, songwriting credits, external links.
4. **beatbrain_track** — Deep track analysis. Instruments, production, songwriting, musical key, BPM, danceability, energy, happiness, and more.
5. **beatbrain_genre** — Genre-based discovery. Find popular tracks in any genre.

## CRITICAL: Tool Chaining — GO DEEP AUTOMATICALLY

DO NOT just call one tool and summarize. When someone asks about a song or artist, ALWAYS chain tools to build a rich answer:

- **"Tell me about [song]"** → search it → THEN call beatbrain_track on the result for full credits/analysis
- **"Who is [artist]?"** → search them → get a track result → use the track's MBID data to call beatbrain_creator
- **"What's hot?"** → call discover → pick 2-3 standout tracks and call beatbrain_track on them to give deeper context
- **"Play me some [genre]"** → call genre → pick the best result and call beatbrain_track for depth
- **Any song mention** → ALWAYS try to get the track analysis (credits, key, BPM, who produced it)

The user came here for depth, not a search results page. One tool call is never enough when you can chain.

## Response Style

- **Lead with what matters.** Don't say "Based on the search results..." — just talk about the music.
- **Be specific.** Don't say "popular tracks recently." Say "their track 'Unholy' with Kim Petras is sitting at 77 popularity on Spotify right now, it's still charting."
- **Include the vibe.** Key, BPM, danceability, energy — translate these into human language. "It's in D minor at 130 BPM with 85% energy — basically a dark, driving banger."
- **Credit the humans.** When you have production/instrument credits, share them naturally. "Produced by [name], with [name] on bass — you can hear that groove in the bridge."
- **Always include Spotify links** so people can actually listen.
- **Keep it conversational.** This is a chat with a knowledgeable friend, not a music review blog.
- **Have opinions.** If something is mid, say so. If something is incredible, get excited.
- **Short responses for simple questions, deep responses for deep questions.** Match the energy.

## What NOT To Do

- **NEVER narrate your tool usage or thinking process.** Don't say "Let me search for that," "analyzing the track," "let's check out the track analysis," "let me look that up," or anything similar. Just call the tools silently and present the results naturally.
- Don't say "It seems like..." or "Based on the search results..." — just state it.
- Don't ask "Would you like to know more?" after every response — just go deep the first time.
- Don't repeat the same information in different words to pad the response.
- Don't give a list of bullet points when a conversational paragraph works better.
- If you can't find something specific, say so directly and suggest what you CAN find.
- Don't start responses with filler transitions. Jump straight to the answer.

You're here to help people find their next favorite song — and understand why it's great.`;

// ── CLI args ─────────────────────────────────────────────
function parseArgs(): { provider: string; model: string } {
  const args = process.argv.slice(2);
  let provider = process.env.BEATBRAIN_PROVIDER ?? "groq";
  let model = process.env.BEATBRAIN_MODEL ?? "openai/gpt-oss-120b";

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--provider" || args[i] === "-p") && args[i + 1]) {
      provider = args[++i];
    } else if ((args[i] === "--model" || args[i] === "-m") && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
${c.bold}${c.purple}♫${c.reset} ${c.bold}Temporal${c.reset} ${c.dim}— your music-obsessed AI friend${c.reset}

${c.white}Usage:${c.reset} temporal [options]

${c.white}Options:${c.reset}
  -p, --provider <name>   LLM provider ${c.dim}(default: groq)${c.reset}
  -m, --model <name>      Model name ${c.dim}(default: gpt-oss-120b)${c.reset}
  -h, --help              Show this help

${c.white}Environment:${c.reset}
  GROQ_API_KEY             ${c.dim}Free at console.groq.com${c.reset}
  GEMINI_API_KEY           ${c.dim}Free at aistudio.google.com${c.reset}
  BEATBRAIN_PROVIDER       ${c.dim}Override default provider${c.reset}
  BEATBRAIN_MODEL          ${c.dim}Override default model${c.reset}

${c.white}Examples:${c.reset}
  ${c.dim}$${c.reset} temporal
  ${c.dim}$${c.reset} temporal -p google -m gemini-2.0-flash
  ${c.dim}$${c.reset} temporal -p anthropic -m claude-sonnet-4-20250514
`);
      process.exit(0);
    }
  }

  return { provider, model };
}

// ── Hero banner ──────────────────────────────────────────
function printBanner(provider: string, model: string): void {
  console.log();
  console.log(`  ${c.purple}${c.bold}♫ ♪ ♬${c.reset}  ${c.bold}${c.white}T E M P O R A L${c.reset}`);
  console.log(`  ${c.dim}─────────────────────────────────${c.reset}`);
  console.log(`  ${c.dim}Your music-obsessed friend.${c.reset}`);
  console.log(`  ${c.dim}Ask me anything about music.${c.reset}`);
  console.log(`  ${c.gray}${provider}/${model}${c.reset}`);
  console.log();
}

// ── Tool label map ───────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  beatbrain_discover: "tuning into the feed",
  beatbrain_search: "searching the catalog",
  beatbrain_creator: "pulling up the artist",
  beatbrain_track: "analyzing the track",
  beatbrain_genre: "exploring the genre",
};

// ── Main ─────────────────────────────────────────────────
async function main() {
  const { provider, model: modelName } = parseArgs();

  printBanner(provider, modelName);

  // Validate API key
  const keyEnvMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    groq: "GROQ_API_KEY",
  };
  const expectedEnv = keyEnvMap[provider] ?? `${provider.toUpperCase()}_API_KEY`;
  if (!process.env[expectedEnv] && !process.env.ANTHROPIC_OAUTH_TOKEN) {
    console.error(`  ${c.pink}✗ ${expectedEnv} is not set.${c.reset}`);
    console.error(
      `  ${c.dim}Set it in your environment or create a .env file${c.reset}`
    );
    process.exit(1);
  }

  let model;
  try {
    model = getModel(provider as any, modelName);
  } catch (e: any) {
    console.error(`  ${c.pink}✗ Failed to initialize model: ${e.message}${c.reset}`);
    process.exit(1);
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools: [discoverTool, searchTool, creatorTool, trackTool, genreTool],
    },
  });

  // ── State ──────────────────────────────────────────────
  let spinner: Spinner | null = null;
  let typewriter = new Typewriter();
  let hasOutput = false; // tracks whether we've printed any text this turn

  agent.subscribe((event) => {
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent?.type === "text_delta"
    ) {
      const delta = event.assistantMessageEvent.delta;

      // Kill spinner on first text
      if (spinner?.active) {
        spinner.stop();
        spinner = null;
      }

      // Print prefix before first text of this turn
      if (!hasOutput) {
        process.stdout.write(`  ${c.gold}♪${c.reset} `);
        hasOutput = true;
      }

      typewriter.push(delta);
    }

    if (event.type === "tool_execution_start") {
      const label =
        TOOL_LABELS[event.toolName ?? ""] ?? event.toolName ?? "working";

      if (spinner?.active) {
        // Already spinning — just update the label (tool chain)
        spinner.update(label);
      } else {
        // New spinner
        spinner = new Spinner(label);
        spinner.start();
      }
    }
  });

  // ── REPL ───────────────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("close", () => {
    console.log(`\n  ${c.purple}♫${c.reset} ${c.dim}Keep listening to good music.${c.reset}\n`);
    process.exit(0);
  });

  const askQuestion = (): Promise<string> =>
    new Promise((resolve) => {
      rl.question(`  ${c.cyan}♩${c.reset} `, resolve);
    });

  while (true) {
    const input = await askQuestion();
    const trimmed = input.trim();

    if (!trimmed) continue;
    if (trimmed === "exit" || trimmed === "quit" || trimmed === "q") {
      rl.close();
      break;
    }

    // Reset per-turn state
    hasOutput = false;
    typewriter = new Typewriter();

    try {
      console.log();
      await agent.prompt(trimmed);
      // Wait for typewriter to finish draining
      await typewriter.flush();
      console.log("\n");
    } catch (err: any) {
      const s = spinner as Spinner | null;
      if (s?.active) {
        s.stop();
        spinner = null;
      }
      await typewriter.flush();
      console.log(`\n  ${c.pink}✗ ${err.message}${c.reset}\n`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
