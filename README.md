# 🎵 BeatBrain Chat

A music-obsessed AI friend in your terminal. Ask it what to listen to and it pulls from the live [BeatBrain](https://beatbrain.xyz) discover feed — aggregating Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HotNewHipHop. Deep-dive into any track's production credits, instruments, BPM, key, and audio features. Explore artist profiles and genre-based discovery.

Built with [pi-mono](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-agent-core` + `@mariozechner/pi-ai`), the same toolkit that powers [OpenClaw](https://github.com/openclaw/openclaw).

**100% free** — powered by Groq's free API tier running Llama 4 Scout. No paid API keys required.

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
npm start
```

## Usage

```
♫ ♪ ♬  B E A T B R A I N
─────────────────────────────────
Your music-obsessed friend.
Ask me anything about music.
groq/meta-llama/llama-4-scout-17b-16e-instruct

♩ has sam smith put out anything good lately?
♪ Sam Smith's "Unholy" with Kim Petras is still charting — sitting at 77
  popularity on Spotify. It's in A minor at 131 BPM with 71% danceability,
  basically a dark, groovy pop banger. Produced by Jimmy Napes and
  Ilya Salmanzadeh...
  https://open.spotify.com/track/3nqQXoyQOWXiESFLlDF1hG
```

## Tools (Context Brain)

The agent chains these tools automatically to build rich, deep answers:

| Tool | Description |
|------|-------------|
| `beatbrain_discover` | Live ranked discover feed from all 5 sources with Spotify links |
| `beatbrain_search` | Search Spotify for artists, songs, or queries with popularity scores |
| `beatbrain_track` | Deep track analysis: instruments, production credits, songwriting, key, BPM, danceability, energy |
| `beatbrain_creator` | Artist/creator profiles: genres, origin, active years, top tracks, credits, external links |
| `beatbrain_genre` | Genre-based discovery: find popular tracks in any genre |

The agent chains tools automatically — ask about a song and it'll search, pull the full track analysis, and talk about who produced it, what key it's in, and why it bangs.

## CLI Options

```
Usage: beatbrain-chat [options]

Options:
  -p, --provider <name>   LLM provider (default: groq)
  -m, --model <name>      Model name (default: llama-4-scout)
  -h, --help              Show this help
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key ([free](https://console.groq.com)) |
| `GEMINI_API_KEY` | — | Google AI Studio key ([free](https://aistudio.google.com)) |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `BEATBRAIN_PROVIDER` | `groq` | Override default provider |
| `BEATBRAIN_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | Override default model |

### Alternative providers

```bash
beatbrain-chat -p google -m gemini-2.0-flash    # free
beatbrain-chat -p anthropic -m claude-sonnet-4-20250514
beatbrain-chat -p openai -m gpt-4o
```

## How It Works

BeatBrain Chat uses `@mariozechner/pi-agent-core` to create a stateful agent with five custom tools (the "context brain"). The agent maintains conversation context across turns, streams responses token-by-token with a typewriter effect, and chains multiple tools to build rich answers.

The default model is **Llama 4 Scout** on Groq — a MoE model (17B active / 16 experts) with April 2025 training data, running at 750 tokens/sec. It knows about recent music and is completely free.

## Stack

- **Agent Runtime**: [@mariozechner/pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) — stateful agent loop with tool execution
- **LLM API**: [@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — unified multi-provider LLM interface
- **Data**: [BeatBrain](https://beatbrain.xyz) API (Go backend on Cloud Run) + Spotify + MusicBrainz

## Blog Post

Read the full writeup: [Building a Music Agent CLI with pi-mono](https://mager.co/blog/2026-02-14-beatbrain-chat-pi-mono)

## License

MIT
