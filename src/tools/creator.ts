import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BEATBRAIN_API } from "./discover.js";

interface CreatorHighlight {
  id: string;
  title: string;
  artist: string;
  image: string;
}

interface CreatorCredit {
  type: string;
  recordings: { id: string; title: string; artist?: string }[];
}

interface Creator {
  id: string;
  name: string;
  type: string;
  disambiguation?: string;
  country?: string;
  area?: string;
  begin_area?: string;
  active_years?: { begin?: string; end?: string; ended: boolean };
  genres: string[];
  links: { type: string; url: string }[];
  credits: CreatorCredit[];
  highlights?: CreatorHighlight[];
}

export const creatorTool: AgentTool = {
  name: "beatbrain_creator",
  label: "BeatBrain Creator",
  description:
    "Get a deep profile on a music creator (artist, producer, band). Returns their genres, origin, active years, top Spotify tracks (highlights), production/songwriting credits, and external links (Spotify, Wikipedia, social media). Requires a MusicBrainz ID (MBID). Use beatbrain_search first to find an artist, then use the track endpoint to get the MBID, or search MusicBrainz directly.",
  parameters: Type.Object({
    mbid: Type.String({
      description:
        "MusicBrainz artist ID (UUID). You can find this from track data or by searching.",
    }),
  }),
  execute: async (_toolCallId, params: any, _signal, _onUpdate) => {
    const mbid = params.mbid as string;

    const res = await fetch(`${BEATBRAIN_API}/creator?mbid=${encodeURIComponent(mbid)}`);
    if (!res.ok) {
      throw new Error(`Creator API error: ${res.status} ${res.statusText}`);
    }

    const data: { creator: Creator } = await res.json();
    const cr = data.creator;

    const lines: string[] = [];
    lines.push(`# ${cr.name}`);
    if (cr.type) lines.push(`Type: ${cr.type}`);
    if (cr.disambiguation) lines.push(`(${cr.disambiguation})`);

    // Origin
    const origin = [cr.begin_area, cr.area, cr.country].filter(Boolean).join(", ");
    if (origin) lines.push(`From: ${origin}`);

    // Active years
    if (cr.active_years) {
      const { begin, end, ended } = cr.active_years;
      const span = ended
        ? `${begin || "?"} – ${end || "?"}`
        : `${begin || "?"} – present`;
      lines.push(`Active: ${span}`);
    }

    // Genres
    if (cr.genres?.length) {
      lines.push(`Genres: ${cr.genres.join(", ")}`);
    }

    // Highlights (top tracks from Spotify)
    if (cr.highlights?.length) {
      lines.push("\n## Top Tracks");
      for (const h of cr.highlights) {
        lines.push(`• ${h.artist} — "${h.title}" → https://open.spotify.com/track/${h.id}`);
      }
    }

    // Credits
    if (cr.credits?.length) {
      lines.push("\n## Credits");
      for (const credit of cr.credits.slice(0, 8)) {
        const recs = credit.recordings.slice(0, 5);
        const recList = recs
          .map((r) => `"${r.title}"${r.artist ? ` (${r.artist})` : ""}`)
          .join(", ");
        const more = credit.recordings.length > 5 ? ` (+${credit.recordings.length - 5} more)` : "";
        lines.push(`• ${credit.type}: ${recList}${more}`);
      }
    }

    // Links
    if (cr.links?.length) {
      lines.push("\n## Links");
      for (const link of cr.links) {
        lines.push(`• ${link.type}: ${link.url}`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        name: cr.name,
        genres: cr.genres,
        highlightCount: cr.highlights?.length ?? 0,
        creditCount: cr.credits?.length ?? 0,
      },
    };
  },
};
