import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BEATBRAIN_API } from "./discover.js";

interface SearchTrack {
  artist: string;
  id: string;
  name: string;
  popularity: number;
  thumb: string | null;
}

interface SearchResponse {
  results: SearchTrack[];
}

export const searchTool: AgentTool = {
  name: "beatbrain_search",
  label: "BeatBrain Search",
  description:
    "Search for tracks on Spotify via BeatBrain. Use this when someone asks about a specific artist, song, or wants to explore a particular query. Returns track name, artist, popularity, and Spotify link.",
  parameters: Type.Object({
    query: Type.String({
      description:
        "Search query — artist name, song title, or both (e.g. 'Kendrick Lamar', 'bohemian rhapsody', 'Tyler the Creator chromakopia')",
    }),
    limit: Type.Optional(
      Type.Number({
        description: "Max results to return (default 10, max 20)",
        minimum: 1,
        maximum: 20,
      })
    ),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const query = params.query as string;
    const limit = (params?.limit as number) ?? 10;

    const res = await fetch(`${BEATBRAIN_API}/spotify/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });

    if (!res.ok) {
      throw new Error(`Search API error: ${res.status} ${res.statusText}`);
    }

    const data: SearchResponse = await res.json();
    const results = data.results?.slice(0, limit) ?? [];

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results found for "${query}".`,
          },
        ],
        details: { query, resultCount: 0 },
      };
    }

    const formatted = results
      .map(
        (t, i) =>
          `${i + 1}. ${t.artist} — "${t.name}" (popularity: ${t.popularity}/100)\n   Spotify: https://open.spotify.com/track/${t.id}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Search results for "${query}":\n\n${formatted}`,
        },
      ],
      details: { query, resultCount: results.length },
    };
  },
};
