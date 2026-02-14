# 🎵 BeatBrain Chat

A music-obsessed AI friend in your terminal. Ask it what to listen to and it pulls from the live [BeatBrain](https://beatbrain.xyz) discover feed — aggregating Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HotNewHipHop.

Built with [pi-mono](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-agent-core` + `@mariozechner/pi-ai`), the same toolkit that powers [OpenClaw](https://github.com/openclaw/openclaw).

## Quick Start

```bash
git clone https://github.com/mager/beatbrain-chat.git
cd beatbrain-chat
npm install
npm run build
```

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Run it:

```bash
npm start
```

## Usage

```
🎵 BeatBrain Chat
Your music-obsessed friend. Ask me anything about music.

you: what's hot right now?
🔧 Using beatbrain_discover...
beatbrain: Here's what's trending today...

you: I'm into indie rock, anything good?
beatbrain: ...

you: exit
👋 Later! Keep listening to good music.
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Anthropic API key (default provider) |
| `OPENAI_API_KEY` | — | OpenAI API key (if using OpenAI) |
| `BEATBRAIN_PROVIDER` | `anthropic` | LLM provider (`anthropic`, `openai`, `google`, etc.) |
| `BEATBRAIN_MODEL` | `claude-sonnet-4-20250514` | Model name |

## How It Works

BeatBrain Chat uses `@mariozechner/pi-agent-core` to create a stateful agent with a custom tool:

- **`beatbrain_discover`** — Fetches the ranked discover feed from BeatBrain's API, which scores tracks using a weighted algorithm across multiple music sources.

The agent streams responses in real-time and maintains conversation context across turns.

## Stack

- **Agent Runtime**: [@mariozechner/pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) — stateful agent loop with tool execution
- **LLM API**: [@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — unified multi-provider LLM interface
- **Data Source**: [BeatBrain](https://beatbrain.xyz) discover API (Go backend on Cloud Run)

## Blog Post

Read the full writeup: [Building a Music Agent CLI with pi-mono](https://mager.co/blog) _(link coming soon)_

## License

MIT
