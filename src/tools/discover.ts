import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

const BEATBRAIN_API = "https://occipital-cqaymsy2sa-uc.a.run.app";

export interface BeatBrainTrack {
  id: string;
  artist: string;
  name: string;
  source_id: string;
  source: string;
  image: string;
  isrc: string;
}

interface DiscoverResponse {
  tracks: BeatBrainTrack[];
  updated: string;
}

export const discoverTool: AgentTool = {
  name: "beatbrain_discover",
  label: "BeatBrain Discover",
  description:
    "Fetch the latest music discoveries from BeatBrain. Returns a ranked list of trending tracks from sources like Spotify New Releases, Reddit [FRESH], Billboard, Pitchfork Best New Music, and HNHH. Use this to see what's hot right now.",
  parameters: Type.Object({
    limit: Type.Optional(
      Type.Number({
        description: "Max tracks to return (default 20, max 150)",
        minimum: 1,
        maximum: 150,
      })
    ),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const limit = (params?.limit as number) ?? 20;

    const res = await fetch(`${BEATBRAIN_API}/discover/v2`);
    if (!res.ok) {
      throw new Error(`BeatBrain API error: ${res.status} ${res.statusText}`);
    }

    const data: DiscoverResponse = await res.json();
    const tracks = data.tracks.slice(0, limit);

    const formatted = tracks
      .map(
        (t, i) =>
          `${i + 1}. ${t.artist} — "${t.name}" [${t.source}] (Spotify: ${t.source_id})`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `BeatBrain Discover Feed (updated ${data.updated})\n${tracks.length} tracks:\n\n${formatted}`,
        },
      ],
      details: { trackCount: tracks.length, updated: data.updated },
    };
  },
};
