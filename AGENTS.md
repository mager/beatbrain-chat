# AGENTS.md — Temporal

## What This Is

A terminal-based music chat agent built on pi-mono (`@mariozechner/pi-agent-core` + `@mariozechner/pi-ai`). It talks to the BeatBrain API to discover, search, and analyze music.

## Architecture

```
temporal/
├── src/
│   ├── index.ts          # CLI entry point, agent setup, REPL loop, system prompt
│   └── tools/
│       ├── discover.ts   # beatbrain_discover — ranked trending feed
│       ├── search.ts     # beatbrain_search — Spotify catalog search
│       ├── track.ts      # beatbrain_track — deep track analysis (credits, key, BPM, features)
│       ├── creator.ts    # beatbrain_creator — artist/creator profiles
│       └── genre.ts      # beatbrain_genre — genre-based discovery
├── dist/                 # Compiled output (tsc)
├── package.json
└── tsconfig.json
```

## Key Decisions

- **Default model**: `openai/gpt-oss-120b` on Groq (free, fast, native tool use)
- **API base**: `https://occipital-cqaymsy2sa-uc.a.run.app` (BeatBrain's Go backend on Cloud Run)
- **No framework**: Just pi-agent-core + pi-ai directly. Minimal dependencies.
- **Tool chaining**: System prompt aggressively coaches the model to chain tools (search → track analysis → credits) rather than giving shallow single-tool answers.

## Backend API (Occipital)

The tools call these endpoints on the BeatBrain backend:

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/discover/v2` | GET | `beatbrain_discover` |
| `/spotify/search` | POST | `beatbrain_search` |
| `/track` | GET | `beatbrain_track` |
| `/creator` | GET | `beatbrain_creator` |
| `/genre` | GET | `beatbrain_genre` |

## Development

```bash
npm install
npm run build    # tsc
npm start        # run the CLI
npm run dev      # build + run
```

## Adding a New Tool

1. Create `src/tools/mytool.ts` following the pattern in existing tools
2. Export an `AgentTool` with name, description, TypeBox parameters, and execute function
3. Import and add to the tools array in `src/index.ts`
4. Update the system prompt's tool documentation section
5. `npm run build && npm start`

## Environment

- `GROQ_API_KEY` — Required for default config (free at console.groq.com)
- `GEMINI_API_KEY` — For Google Gemini provider
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — For those providers
- `BEATBRAIN_PROVIDER` / `BEATBRAIN_MODEL` — Override defaults

## Style

- TypeScript, ES modules, strict mode
- Tools return structured text that the LLM interprets conversationally
- CLI uses ANSI colors and a typewriter effect for streaming output
- Musical note symbols (♪ ♫ ♬ ♩) as UI chrome
