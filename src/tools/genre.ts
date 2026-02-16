import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BEATBRAIN_API } from "./discover.js";

interface GenreTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  popularity: number;
  genres: string[];
  release_date: string;
}

export const genreTool: AgentTool = {
  name: "beatbrain_genre",
  label: "BeatBrain Genre",
  description:
    "Explore tracks by genre. Search for popular tracks in a specific genre like hip-hop, rock, electronic, jazz, R&B, latin, indie, pop, etc. Great for when someone wants genre-specific recommendations. Returns tracks sorted by popularity with Spotify links.",
  parameters: Type.Object({
    genre: Type.String({
      description:
        "Genre to explore (e.g. 'hip-hop', 'rock', 'electronic', 'jazz', 'r&b', 'latin', 'indie', 'pop', 'metal', 'soul')",
    }),
    limit: Type.Optional(
      Type.Number({
        description: "Max tracks to return (default 15, max 50)",
        minimum: 1,
        maximum: 50,
      })
    ),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const genre = params.genre as string;
    const limit = (params?.limit as number) ?? 15;

    const res = await fetch(`${BEATBRAIN_API}/genre/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genre, limit }),
    });

    if (!res.ok) {
      throw new Error(`Genre API error: ${res.status} ${res.statusText}`);
    }

    const data: { genre: string; tracks: GenreTrack[]; note?: string } = await res.json();
    const tracks = data.tracks ?? [];

    if (tracks.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No tracks found for genre "${genre}".` }],
        details: { genre, resultCount: 0 },
      };
    }

    const formatted = tracks
      .map(
        (t, i) =>
          `${i + 1}. ${t.artist} — "${t.name}" (${t.album}, ${t.release_date})\n   Popularity: ${t.popularity}/100${t.genres?.length ? ` | Genres: ${t.genres.join(", ")}` : ""}\n   Spotify: https://open.spotify.com/track/${t.id}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Genre: ${genre}\nTracks found: ${tracks.length}\n\n${formatted}`,
        },
      ],
      details: { genre, resultCount: tracks.length },
    };
  },
};
