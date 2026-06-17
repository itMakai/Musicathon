const {
  extractInstrumentalHooks,
  fetchLyricsInsights,
  fetchUpcomingConcert,
  fetchSongstatsTopTracks,
  getArtistProfile,
  prepareVoiceNarration
} = require("./serviceAdapters");

/* Generic setlist scaffolding used when Songstats supplies real top tracks
   for an artist that has no curated profile. */
const GENERIC_THEMES = ["arrival", "devotion", "momentum", "tension and release", "closure"];
const GENERIC_CUES = [
  "catch the first repeated phrase and answer it with the room",
  "stretch the long notes and leave space after the downbeat",
  "lock onto the hook and ride it with the crowd",
  "hold back until the drop, then lift with everything you have",
  "sing the final refrain cleanly and let the band carry the outro"
];

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatStreams(n) {
  if (!n) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

/* ─────────────────────────────────────────────────────────
   VIBE COPY BANK
   Each vibe defines an opener line and a tone description
   used in the generated podcast script.
───────────────────────────────────────────────────────── */
const VIBE_COPY = {
  "radio-dj": {
    label:   "Radio DJ",
    opener:  "Good evening, lights-up people",
    tone:    "big smile, quick pace, no dead air, classic FM energy",
    sign_off: "This has been HypeCast. You are locked in. Now go be the crowd."
  },
  cinematic: {
    label:   "Cinematic",
    opener:  "The city is already tuning itself to what's coming",
    tone:    "dramatic, warm, widescreen — every sentence earns its space",
    sign_off: "The lights will find you. Walk in like you knew this moment was coming all along."
  },
  bestie: {
    label:   "Bestie",
    opener:  "Okay — tonight is not a drill",
    tone:    "close, conspiratorial, funny, emotionally very prepared",
    sign_off: "You are so ready. Text me after the encore. Go absolutely feral."
  }
};

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function cleanInput(value, fallback) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  return cleaned || fallback;
}

function formatDate(dateISO) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month:   "long",
    day:     "numeric"
  }).format(new Date(dateISO));
}

/** Returns a slot label based on track position */
function slotLabel(index, total) {
  if (index === 0)           return "opener";
  if (index === 1)           return "early-set gem";
  if (index >= total - 1)    return "closing anthem";
  if (index === Math.floor(total / 2)) return "mid-set centerpiece";
  return "deep-cut favourite";
}

/* ─────────────────────────────────────────────────────────
   CHAPTER BUILDER
   Five chapters matching a real podcast run-of-show.
───────────────────────────────────────────────────────── */
function buildChapters({ artist, city, show, insights, hooks, vibe }) {
  const tracks    = insights.tracks;
  const total     = tracks.length;
  const hookNames = hooks.hooks.map(h => h.track).join(", ");
  const date      = formatDate(show.dateISO);

  return [
    {
      title:    "Cold Open",
      start:    "0:00",
      duration: "0:30",
      copy:     `${vibe.opener}. Tonight ${artist} plays ${city} — ${show.venue}, ${date}. Doors at ${show.doors}. You are already inside your head. Let's get you ready.`
    },
    {
      title:    "Show Intel",
      start:    "0:30",
      duration: "0:50",
      copy:     `Venue brief: ${show.venue} is a ${show.confidence >= 0.85 ? "near-certain" : show.confidence >= 0.75 ? "high-probability" : "likely"} pick based on routing data. Stage mood tonight reads as "${show.confidence >= 0.80 ? "confirmed production load-in" : "strong local chatter"}". Confidence sits at ${Math.round(show.confidence * 100)}%. Plan for a packed floor and a long second half.`
    },
    {
      title:    "Setlist Heart",
      start:    "1:20",
      duration: "1:40",
      copy:     tracks.slice(0, Math.min(4, total)).map((t, i) =>
        `${t.title} — the ${slotLabel(i, total)} — carries a theme of ${t.theme}. ${t.chorusCue}.`
      ).join(" ")
    },
    {
      title:    "Chorus Drill",
      start:    "3:00",
      duration: "1:00",
      copy: (() => {
        const lines = [];
        lines.push(`Your three singalong checkpoints:`);

        [0, 1, 2].forEach(i => {
          const t = tracks[i];
          if (!t) return;
          if (t.chorus) {
            // Quote the first two lines of the actual chorus
            const quotedLines = t.chorus.split("\n").slice(0, 2).join(" / ");
            lines.push(`${t.title}: ${t.chorusCue}. The real lyrics open with — "${quotedLines}"`);
          } else {
            lines.push(`${t.title}: ${t.chorusCue}`);
          }
        });

        return lines.join(". ") + ".";
      })()
    },
    {
      title:    "Walk-In Boost",
      start:    "4:00",
      duration: "1:00",
      copy:     `Background bed built from hook sketches of ${hookNames}. Hydrate. Keep the voice loose. ${vibe.sign_off}`
    }
  ];
}

/* ─────────────────────────────────────────────────────────
   SCRIPT BUILDER
   Generates the full narrated podcast script (≈ 300 words).
───────────────────────────────────────────────────────── */
function buildScript({ artist, city, show, profile, insights, hooks, vibe }) {
  const tracks    = insights.tracks;
  const hookNames = hooks.hooks.map(h => h.track).join(", ");
  const date      = formatDate(show.dateISO);
  const pct       = Math.round(show.confidence * 100);

  const paragraphs = [
    // ① Cold open
    `${vibe.opener}. This is HypeCast — your personalised five-minute walk-in briefing for ${artist} in ${city}. ` +
    `Signal points to ${show.venue} on ${date}, doors at ${show.doors}. ` +
    `Stage mood tonight is ${profile.stageMood}. Confidence reading: ${pct} percent. Let's go.`,

    // ② Emotional arc
    `Here is the emotional map. The set opens with ${tracks[0].theme} energy — ${tracks[0].title} sets the first charge. ` +
    `From there the room widens toward ${tracks[1].title}, carrying ${tracks[1].theme} into the mid-set. ` +
    `By the time ${tracks[2] ? tracks[2].title : "the centrepiece"} arrives, ` +
    `the crowd should be fully locked in around ${tracks[2] ? tracks[2].theme : "the peak moment"}. ` +
    `The closing stretch arrives on ${tracks[tracks.length - 1].theme} — that is your surrender moment.`,

    // ③ Chorus prep — inject real lyrics if available
    (() => {
      const intro = `Chorus prep — `;
      const hasRealLyrics = tracks.some(t => t.chorus);

      if (hasRealLyrics) {
        const parts = [intro + `here are the actual opening lines to memorise:`];
        [0, 1, 2].forEach(i => {
          const t = tracks[i];
          if (!t) return;
          if (t.chorus) {
            const firstLines = t.chorus.split("\n").slice(0, 3).join(" / ");
            parts.push(`${t.title} — "${firstLines}" — ${t.chorusCue}`);
          } else {
            parts.push(`${t.title}: ${t.chorusCue}`);
          }
        });
        parts.push(`Breath control and confidence carry the rest.`);
        return parts.join(". ");
      }

      // No live lyrics — use cue-only version
      return `${intro}no lyric spoilers, just the timing cues. ` +
        `For ${tracks[0].title}: ${tracks[0].chorusCue}. ` +
        `For ${tracks[1].title}: ${tracks[1].chorusCue}. ` +
        (tracks[2] ? `For ${tracks[2].title}: ${tracks[2].chorusCue}. ` : "") +
        `Your job is breath control, entry timing, and confidence. The arena supplies the rest.`;
    })(),

    // ④ Trivia pass
    `Quick trivia pass. ${tracks[0].trivia} ${tracks[1].trivia} ` +
    `${tracks[3] ? tracks[3].trivia : ""} ` +
    `These are the moments worth filming — but the better move is to put the phone down and be there when the lights change.`,

    // ⑤ Walk-in boost + tech credits
    `The background bed tonight draws on five-second hook sketches from ${hookNames}. ` +
    `In a full production stack, LALAL.AI strips the instrumentals live, Musixmatch deepens every lyric theme, ` +
    `JamBase keeps the show data current to the hour, and ElevenLabs delivers this in a real radio-DJ voice. ` +
    `Tonight the stack is primed and so are you. Breathe in. Check your route. ` +
    `${vibe.sign_off}`
  ];

  return paragraphs.join("\n\n");
}

/* ─────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────── */
async function buildHypecast(payload) {
  const artist  = cleanInput(payload.artist, "Coldplay");
  const city    = cleanInput(payload.city, "Austin");
  const vibeKey = VIBE_COPY[payload.vibe] ? payload.vibe : "radio-dj";
  const vibe    = VIBE_COPY[vibeKey];

  const profile      = getArtistProfile(artist);
  const isKnownArtist = profile.match.length > 0;

  // Songstats supplies the artist's REAL current top tracks.
  const songstats  = await fetchSongstatsTopTracks({ artist });
  const liveTracks = songstats.topTracks || [];

  // For artists without a curated profile, build the setlist from the real
  // Songstats top tracks; otherwise keep the curated, richly-annotated set.
  let baseTracks;
  if (!isKnownArtist && liveTracks.length >= 3) {
    baseTracks = liveTracks.slice(0, 5).map((t, index) => ({
      title:     t.title,
      theme:     GENERIC_THEMES[index % GENERIC_THEMES.length],
      chorusCue: GENERIC_CUES[index % GENERIC_CUES.length],
      trivia:    t.chartPosition
                   ? `Currently charting around #${t.chartPosition} on Spotify.`
                   : t.streams
                     ? `Has racked up roughly ${formatStreams(t.streams)} Spotify streams.`
                     : "A current fan favourite in the live set.",
      energy:    Math.max(70, 95 - index * 5)
    }));
  } else {
    baseTracks = profile.tracks;
  }

  const tracks = baseTracks.map((track, index) => ({
    ...track,
    slot:  index + 1,
    color: profile.palette[index % profile.palette.length]
  }));

  // Overlay Songstats popularity (chart position / streams) onto any track
  // whose title matches a live top track.
  const statByTitle = {};
  liveTracks.forEach(t => { statByTitle[normalizeTitle(t.title)] = t; });
  tracks.forEach(t => {
    const s = statByTitle[normalizeTitle(t.title)];
    if (s) {
      t.chartPosition = s.chartPosition || null;
      t.streams       = s.streams || null;
      t.songstatsRank = s.rank || null;
    }
  });

  const [show, insights, hooks] = await Promise.all([
    fetchUpcomingConcert({ artist, city }),
    fetchLyricsInsights({ artist, tracks }),
    extractInstrumentalHooks({ tracks })
  ]);

  const chapters = buildChapters({ artist, city, show, insights, hooks, vibe });
  const script   = buildScript({ artist, city, show, profile, insights, hooks, vibe });
  const voice    = await prepareVoiceNarration({ script });

  return {
    id:                     `hype_${Date.now().toString(36)}`,
    artist,
    city,
    vibe:                   vibe.label,
    generatedAt:            new Date().toISOString(),
    estimatedDurationSeconds: 300,
    show,
    tourName:               profile.tourName,
    palette:                profile.palette,
    stageMood:              profile.stageMood,
    setlist:                tracks,
    themes:                 insights.tracks.map(track => {
      const stat = statByTitle[normalizeTitle(track.title)] || null;
      return {
        title:           track.title,
        theme:           track.theme,
        cue:             track.chorusCue,
        trivia:          track.trivia,
        weight:          track.singalongWeight,
        chorus:          track.chorus          || null,
        fullLyrics:      track.fullLyrics      || null,
        lyricsSource:    track.lyricsSource    || "unavailable",
        lyricsCopyright: track.lyricsCopyright || null,
        preview:         track.preview         || null,
        chartPosition:   stat ? stat.chartPosition : null,
        streams:         stat ? stat.streams       : null,
        streamsLabel:    stat ? formatStreams(stat.streams) : null
      };
    }),
    songstats: {
      status:     songstats.status,
      source:     songstats.source,
      artistName: songstats.artistName || artist,
      drivesSetlist: !isKnownArtist && liveTracks.length >= 3,
      topTracks: liveTracks.slice(0, 8).map(t => ({
        title:         t.title,
        rank:          t.rank,
        chartPosition: t.chartPosition || null,
        streams:       t.streams || null,
        streamsLabel:  formatStreams(t.streams)
      }))
    },
    hooks:    hooks.hooks,
    chapters,
    script,
    services: {
      jambase:    { source: show.source,      status: show.status },
      songstats:  { source: songstats.source, status: songstats.status },
      musixmatch: { source: insights.source,  status: insights.status },
      lalal:      { source: hooks.source,     status: hooks.status },
      elevenlabs: { source: voice.source,     status: voice.status }
    },
    voice
  };
}

module.exports = { buildHypecast };
