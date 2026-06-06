const {
  extractInstrumentalHooks,
  fetchLyricsInsights,
  fetchUpcomingConcert,
  getArtistProfile,
  prepareVoiceNarration
} = require("./serviceAdapters");

const VIBE_COPY = {
  "radio-dj": {
    label: "Radio DJ",
    opener: "Good evening, lights-up people",
    tone: "big smile, quick pace, no dead air"
  },
  cinematic: {
    label: "Cinematic",
    opener: "The city is already tuning itself",
    tone: "dramatic, warm, and widescreen"
  },
  bestie: {
    label: "Bestie",
    opener: "Okay, tonight is not a drill",
    tone: "close, funny, and emotionally very prepared"
  }
};

function cleanInput(value, fallback) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  return cleaned || fallback;
}

function formatDate(dateISO) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(dateISO));
}

function trackLine(track, index) {
  const slot = index === 0 ? "first" : index === 1 ? "early" : index === 4 ? "late" : "middle";
  return `${track.title} is your ${slot} singalong checkpoint: ${track.theme}. ${track.chorusCue}.`;
}

function buildChapters({ artist, city, show, insights, hooks, vibe }) {
  const tracks = insights.tracks;
  return [
    {
      title: "Cold Open",
      start: "0:00",
      duration: "0:35",
      copy: `${vibe.opener}. ${artist} is headed for ${city}, and the current target is ${show.venue} on ${formatDate(show.dateISO)}.`
    },
    {
      title: "Route Check",
      start: "0:35",
      duration: "0:45",
      copy: `Doors are listed around ${show.doors}. Expect the night to start with ${tracks[0].theme} energy and move toward ${tracks[tracks.length - 1].theme}.`
    },
    {
      title: "Setlist Heart",
      start: "1:20",
      duration: "1:40",
      copy: tracks.slice(0, 4).map(trackLine).join(" ")
    },
    {
      title: "Chorus Drill",
      start: "3:00",
      duration: "1:00",
      copy: `Your memorization focus: ${tracks
        .slice(0, 3)
        .map((track) => `${track.title}: ${track.chorusCue}`)
        .join(". ")}.`
    },
    {
      title: "Walk-In Boost",
      start: "4:00",
      duration: "1:00",
      copy: `The hook bed is built from ${hooks.hooks.map((hook) => hook.track).join(", ")}. Keep your voice loose, hydrate, and save the full send for the finale.`
    }
  ];
}

function buildScript({ artist, city, show, profile, insights, hooks, vibe }) {
  const topTracks = insights.tracks.slice(0, 5);
  const hookNames = hooks.hooks.map((hook) => hook.track).join(", ");
  const date = formatDate(show.dateISO);

  return [
    `${vibe.opener}. This is HypeCast, your five-minute walk-in briefing for ${artist} in ${city}. Current concert signal points to ${show.venue} on ${date}, with doors around ${show.doors}. The room profile tonight is ${profile.stageMood}, and the confidence meter is sitting at ${Math.round(show.confidence * 100)} percent.`,
    `Here is the emotional map. The set should open with motion, then widen into the songs everybody came ready to sing. ${topTracks[0].title} sets the first charge with ${topTracks[0].theme}. ${topTracks[1].title} pulls the room toward ${topTracks[1].theme}. By the time ${topTracks[2].title} appears, the crowd should be fully locked in.`,
    `Chorus prep, no lyric spoilers. For ${topTracks[0].title}, ${topTracks[0].chorusCue}. For ${topTracks[1].title}, ${topTracks[1].chorusCue}. For ${topTracks[2].title}, ${topTracks[2].chorusCue}. Your job is timing, breath, and confidence; the arena will supply the rest.`,
    `Trivia pass. ${topTracks[0].trivia} ${topTracks[1].trivia} ${topTracks[3].trivia} These are the moments to film if you must, but the better move is to learn the entrance and be present when the lights change.`,
    `The background bed uses five-second instrumental-style hook sketches inspired by ${hookNames}. In a live stack, LALAL.AI would isolate those hook moments, Musixmatch would deepen the lyric themes, JamBase would keep the show data current, and ElevenLabs would deliver this in a proper radio-DJ voice. For tonight, breathe in, check your route, warm up the chorus cues, and walk in like the encore already knows your name.`
  ].join("\n\n");
}

async function buildHypecast(payload) {
  const artist = cleanInput(payload.artist, "Coldplay");
  const city = cleanInput(payload.city, "Austin");
  const vibeKey = VIBE_COPY[payload.vibe] ? payload.vibe : "radio-dj";
  const vibe = VIBE_COPY[vibeKey];
  const profile = getArtistProfile(artist);
  const show = await fetchUpcomingConcert({ artist, city });
  const tracks = profile.tracks.map((track, index) => ({
    ...track,
    slot: index + 1,
    color: profile.palette[index % profile.palette.length]
  }));
  const insights = await fetchLyricsInsights({ artist, tracks });
  const hooks = await extractInstrumentalHooks({ tracks });
  const chapters = buildChapters({ artist, city, show, insights, hooks, vibe });
  const script = buildScript({ artist, city, show, profile, insights, hooks, vibe });
  const voice = await prepareVoiceNarration({ script });

  return {
    id: `hype_${Date.now().toString(36)}`,
    artist,
    city,
    vibe: vibe.label,
    generatedAt: new Date().toISOString(),
    estimatedDurationSeconds: 300,
    show,
    tourName: profile.tourName,
    palette: profile.palette,
    setlist: tracks,
    themes: insights.tracks.map((track) => ({
      title: track.title,
      theme: track.theme,
      cue: track.chorusCue,
      trivia: track.trivia,
      weight: track.singalongWeight
    })),
    hooks: hooks.hooks,
    chapters,
    script,
    services: {
      jambase: { source: show.source, status: show.status },
      musixmatch: { source: insights.source, status: insights.status },
      lalal: { source: hooks.source, status: hooks.status },
      elevenlabs: { source: voice.source, status: voice.status }
    },
    voice
  };
}

module.exports = {
  buildHypecast
};
