# 🎵 BeatBrain Chat

A music-obsessed AI friend in your terminal. Ask it what to listen to and it pulls from the live [BeatBrain](https://beatbrain.xyz) discover feed — aggregating Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HotNewHipHop. Search for any artist or track and get Spotify links to start listening.

Built with [pi-mono](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-agent-core` + `@mariozechner/pi-ai`), the same toolkit that powers [OpenClaw](https://github.com/openclaw/openclaw).

**100% free** — powered by Groq's free API tier running Llama 3.3 70B. No paid API keys required.

## Quick Start

```bash
git clone https://github.com/mager/beatbrain-chat.git
cd beatbrain-chat
npm install
npm run build
```

Get a free API key at [console.groq.com](https://console.groq.com):

```bash
export GROQ_API_KEY=gsk_...
```

Run it:

```bash
npm start
```

## Usage

```
🎵 BeatBrain Chat
Your music-obsessed friend. Ask me anything about music.
groq/llama-3.3-70b-versatile

you: what's hot right now?
📡 Checking the feed...
beatbrain: Here's what's trending today...

you: find me some Kendrick Lamar tracks
🔍 Searching...
beatbrain: Here's a solid Kendrick selection...

you: exit
👋 Later! Keep listening to good music.
```

## Tools

BeatBrain Chat has two tools the agent can use:

- **`beatbrain_discover`** — Fetches the ranked discover feed from BeatBrain's API. Supports filtering by source (`spotify_new_releases`, `reddit_fresh`, `hnhh`, `pitchfork_bnm`, `billboard`) and limiting results.
- **`beatbrain_search`** — Searches Spotify via BeatBrain for specific artists, songs, or queries. Returns popularity scores and Spotify links.

## CLI Options

```
Usage: beatbrain-chat [options]

Options:
  -p, --provider <name>   LLM provider (default: groq)
  -m, --model <name>      Model name (default: llama-3.3-70b-versatile)
  -h, --help              Show this help
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key ([free at console.groq.com](https://console.groq.com)) |
| `OPENAI_API_KEY` | — | OpenAI API key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (if using Anthropic) |
| `BEATBRAIN_PROVIDER` | `groq` | Override default provider |
| `BEATBRAIN_MODEL` | `llama-3.3-70b-versatile` | Model name |

### Alternative providers

```bash
# OpenAI
beatbrain-chat -p openai -m gpt-4o

# Anthropic
beatbrain-chat -p anthropic -m claude-sonnet-4-20250514
```

## How It Works

BeatBrain Chat uses `@mariozechner/pi-agent-core` to create a stateful agent with custom tools. The agent maintains conversation context across turns, streams responses token-by-token, and decides which tools to call based on the conversation.

## Stack

- **Agent Runtime**: [@mariozechner/pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) — stateful agent loop with tool execution
- **LLM API**: [@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — unified multi-provider LLM interface
- **Data Source**: [BeatBrain](https://beatbrain.xyz) discover API + Spotify search (Go backend on Cloud Run)

## Blog Post

Read the full writeup: [Building a Music Agent CLI with pi-mono](https://mager.co/blog/2026-02-14-beatbrain-chat-pi-mono)

## License

MIT
