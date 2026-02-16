import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BEATBRAIN_API } from "./discover.js";

interface CreditArtist {
  id: string;
  name: string;
}

interface TrackResponse {
  track: {
    id: string;
    artist: string;
    name: string;
    source_id?: string;
    image?: string;
    release_date?: string;
    isrc?: string;
    genres?: string[];
    instruments?: { instrument: string; artists: CreditArtist[] }[];
    production_credits?: { credit: string; artists: CreditArtist[] }[];
    song_credits?: { credit: string; artists: CreditArtist[] }[];
    links?: { type: string; url: string }[];
    releases?: {
      id: string;
      date: string;
      title: string;
      country?: string;
    }[];
    meta?: {
      duration_ms: number;
      key: number;
      mode: number;
      tempo: number;
      time_signature: number;
    };
    features?: {
      acousticness: number;
      danceability: number;
      energy: number;
      happiness: number;
      instrumentalness: number;
      liveness: number;
      loudness: number;
      speechiness: number;
    };
  };
}

const KEY_NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

export const trackTool: AgentTool = {
  name: "beatbrain_track",
  label: "BeatBrain Track",
  description:
    "Get deep info on a specific track — who played what instruments, who produced it, songwriting credits, genres, key/tempo/BPM, danceability, energy, and more. Use when someone wants to dive deep into a specific song. Accepts a Spotify track ID or ISRC.",
  parameters: Type.Object({
    spotifyId: Type.Optional(
      Type.String({ description: "Spotify track ID (from search results or Spotify URLs)" })
    ),
    isrc: Type.Optional(
      Type.String({ description: "ISRC code for the track" })
    ),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const spotifyId = params?.spotifyId as string | undefined;
    const isrc = params?.isrc as string | undefined;

    if (!spotifyId && !isrc) {
      throw new Error("Provide either spotifyId or isrc");
    }

    // If we have a Spotify ID but no ISRC, we need to search first to get the ISRC
    let queryParam = "";
    if (isrc) {
      queryParam = `isrc=${encodeURIComponent(isrc)}`;
    } else if (spotifyId) {
      // Use the search endpoint to find the ISRC from the Spotify ID
      const searchRes = await fetch(`${BEATBRAIN_API}/spotify/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `spotify:track:${spotifyId}`, limit: 1 }),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results?.length > 0 && searchData.results[0].isrc) {
          queryParam = `isrc=${encodeURIComponent(searchData.results[0].isrc)}`;
        }
      }
      // Fallback: just pass the spotify ID and let the backend handle it
      if (!queryParam) {
        queryParam = `sourceId=${encodeURIComponent(spotifyId)}&source=SPOTIFY`;
      }
    }

    const res = await fetch(`${BEATBRAIN_API}/track?${queryParam}`);
    if (!res.ok) {
      throw new Error(`Track API error: ${res.status} ${res.statusText}`);
    }

    const data: TrackResponse = await res.json();
    const t = data.track;

    const lines: string[] = [];
    lines.push(`# ${t.artist} — "${t.name}"`);
    if (t.release_date) lines.push(`Released: ${t.release_date}`);
    if (t.genres?.length) lines.push(`Genres: ${t.genres.join(", ")}`);

    // Spotify link
    const spotId = t.source_id || spotifyId;
    if (spotId) {
      lines.push(`Spotify: https://open.spotify.com/track/${spotId}`);
    }

    // Musical info
    if (t.meta) {
      const key = t.meta.key >= 0 ? KEY_NAMES[t.meta.key] : "Unknown";
      const mode = t.meta.mode === 1 ? "Major" : "Minor";
      const dur = t.meta.duration_ms
        ? `${Math.floor(t.meta.duration_ms / 60000)}:${String(Math.floor((t.meta.duration_ms % 60000) / 1000)).padStart(2, "0")}`
        : null;
      lines.push(`\nKey: ${key} ${mode} | Tempo: ${Math.round(t.meta.tempo)} BPM | Time: ${t.meta.time_signature}/4${dur ? ` | Duration: ${dur}` : ""}`);
    }

    // Audio features
    if (t.features) {
      const f = t.features;
      const pct = (v: number) => `${Math.round(v * 100)}%`;
      lines.push(
        `Danceability: ${pct(f.danceability)} | Energy: ${pct(f.energy)} | Happiness: ${pct(f.happiness)} | Acousticness: ${pct(f.acousticness)}`
      );
    }

    // Instruments
    if (t.instruments?.length) {
      lines.push("\n## Instruments");
      for (const inst of t.instruments) {
        const artists = inst.artists.map((a) => a.name).join(", ");
        lines.push(`• ${inst.instrument}: ${artists}`);
      }
    }

    // Production credits
    if (t.production_credits?.length) {
      lines.push("\n## Production");
      for (const pc of t.production_credits) {
        const artists = pc.artists.map((a) => a.name).join(", ");
        lines.push(`• ${pc.credit}: ${artists}`);
      }
    }

    // Song credits
    if (t.song_credits?.length) {
      lines.push("\n## Songwriting");
      for (const sc of t.song_credits) {
        const artists = sc.artists.map((a) => a.name).join(", ");
        lines.push(`• ${sc.credit}: ${artists}`);
      }
    }

    // Links
    const usefulLinks = t.links?.filter((l) => ["genius", "spotify"].includes(l.type));
    if (usefulLinks?.length) {
      lines.push("\n## Links");
      for (const link of usefulLinks) {
        lines.push(`• ${link.type}: ${link.url}`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        name: t.name,
        artist: t.artist,
        genres: t.genres,
        hasCredits: !!(t.instruments?.length || t.production_credits?.length),
      },
    };
  },
};
