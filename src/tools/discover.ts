import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export const BEATBRAIN_API = "https://occipital-cqaymsy2sa-uc.a.run.app";

export interface BeatBrainTrack {
  id: string;
  artist: string;
  name: string;
  source_id: string;
  source: string;
  image: string;
  isrc: string;
}

export interface DiscoverResponse {
  tracks: BeatBrainTrack[];
  updated: string;
}

const SOURCE_LABELS: Record<string, string> = {
  spotify_new_releases: "Spotify New Releases",
  reddit_fresh: "Reddit [FRESH]",
  hnhh: "HotNewHipHop",
  pitchfork_bnm: "Pitchfork BNM",
  billboard: "Billboard",
};

export const discoverTool: AgentTool = {
  name: "beatbrain_discover",
  label: "BeatBrain Discover",
  description:
    "Fetch the latest music discoveries from BeatBrain. Returns a ranked list of trending tracks from Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HNHH. Each track includes a Spotify link. Use this when someone asks what's hot, what to listen to, or wants music recommendations.",
  parameters: Type.Object({
    limit: Type.Optional(
      Type.Number({
        description: "Max tracks to return (default 25, max 150)",
        minimum: 1,
        maximum: 150,
      })
    ),
    source: Type.Optional(
      Type.String({
        description:
          "Filter by source: spotify_new_releases, reddit_fresh, hnhh, pitchfork_bnm, billboard. Omit for all sources.",
      })
    ),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const limit = (params?.limit as number) ?? 25;
    const sourceFilter = params?.source as string | undefined;

    const res = await fetch(`${BEATBRAIN_API}/discover/v2`);
    if (!res.ok) {
      throw new Error(`BeatBrain API error: ${res.status} ${res.statusText}`);
    }

    const data: DiscoverResponse = await res.json();
    let tracks = data.tracks;

    if (sourceFilter) {
      tracks = tracks.filter((t) => t.source === sourceFilter);
    }

    tracks = tracks.slice(0, limit);

    // Source breakdown
    const sourceCounts: Record<string, number> = {};
    for (const t of data.tracks) {
      sourceCounts[t.source] = (sourceCounts[t.source] ?? 0) + 1;
    }
    const sourceBreakdown = Object.entries(sourceCounts)
      .map(([s, c]) => `${SOURCE_LABELS[s] ?? s}: ${c}`)
      .join(", ");

    const formatted = tracks
      .map(
        (t, i) =>
          `${i + 1}. ${t.artist} — "${t.name}"\n   Source: ${SOURCE_LABELS[t.source] ?? t.source}\n   Spotify: https://open.spotify.com/track/${t.source_id}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `BeatBrain Discover Feed (updated ${data.updated})\nTotal tracks in feed: ${data.tracks.length} (${sourceBreakdown})\nShowing: ${tracks.length}${sourceFilter ? ` (filtered: ${sourceFilter})` : ""}\n\n${formatted}`,
        },
      ],
      details: {
        trackCount: tracks.length,
        totalTracks: data.tracks.length,
        updated: data.updated,
      },
    };
  },
};
