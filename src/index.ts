import * as readline from "node:readline";
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { discoverTool } from "./tools/discover.js";

const SYSTEM_PROMPT = `You are BeatBrain Chat — a music-obsessed friend who lives and breathes new releases, deep cuts, and everything in between.

You have access to the BeatBrain discover feed, which aggregates trending tracks from Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HotNewHipHop. Use the beatbrain_discover tool to check what's hot.

Your personality:
- Enthusiastic but not overwhelming. You're the friend who always has a recommendation.
- Opinionated — you have genuine taste. If something is mid, say so (nicely).
- You know genres deeply: hip-hop, indie, electronic, R&B, rock, jazz, Latin, and beyond.
- When recommending tracks, give context: why it's interesting, what it sounds like, who it's for.
- Keep responses conversational — this is a chat, not a music review blog.
- Use the discover feed proactively when someone asks "what should I listen to" or similar.
- If someone mentions an artist or genre, relate it to what's currently trending.

You're here to help people find their next favorite song.`;

// Resolve provider and model from env or defaults
const provider = (process.env.BEATBRAIN_PROVIDER ?? "anthropic") as any;
const modelName = process.env.BEATBRAIN_MODEL ?? "claude-sonnet-4-20250514";

async function main() {
  console.log("\n🎵 BeatBrain Chat");
  console.log("Your music-obsessed friend. Ask me anything about music.\n");
  console.log(`Model: ${provider}/${modelName}`);
  console.log('Type "exit" or Ctrl+C to quit.\n');

  let model;
  try {
    model = getModel(provider, modelName);
  } catch (e: any) {
    console.error(`Failed to initialize model: ${e.message}`);
    console.error(
      "Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or configure BEATBRAIN_PROVIDER/BEATBRAIN_MODEL."
    );
    process.exit(1);
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools: [discoverTool],
    },
  });

  // Stream assistant output
  agent.subscribe((event) => {
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent?.type === "text_delta"
    ) {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
    if (
      event.type === "tool_execution_start"
    ) {
      console.log(`\n🔧 Using ${event.toolName}...`);
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("\n\x1b[36myou:\x1b[0m ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === "exit") {
        console.log("\n👋 Later! Keep listening to good music.\n");
        rl.close();
        process.exit(0);
      }

      try {
        console.log("");
        process.stdout.write("\x1b[33mbeatbrain:\x1b[0m ");
        await agent.prompt(trimmed);
        console.log(""); // newline after streaming
      } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
      }

      prompt();
    });
  };

  prompt();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
