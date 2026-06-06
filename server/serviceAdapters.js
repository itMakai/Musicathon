const crypto = require("node:crypto");

const ARTIST_PROFILES = [
  {
    match: ["coldplay"],
    tourName: "Moon Music Night Drive",
    palette: ["#55d6c2", "#ffcf5a", "#ff5b8a"],
    stageMood: "warm, widescreen, and communal",
    tracks: [
      {
        title: "Higher Power",
        theme: "renewal",
        chorusCue: "the lift arrives fast, so come in bright and early",
        trivia: "A classic opener shape: bright synths, quick claps, then the crowd carries the first giant refrain.",
        energy: 92
      },
      {
        title: "Yellow",
        theme: "devotion",
        chorusCue: "hold the long vowels and let the final line breathe",
        trivia: "This is usually the first full-audience glow moment, built for phones in the air.",
        energy: 76
      },
      {
        title: "Viva La Vida",
        theme: "memory and reversal",
        chorusCue: "listen for the strings, then punch the chant in unison",
        trivia: "The chorus works because it feels ceremonial before it turns explosive.",
        energy: 97
      },
      {
        title: "Fix You",
        theme: "repair",
        chorusCue: "save your voice for the final swell",
        trivia: "The emotional payoff is the climb from near-whisper to stadium catharsis.",
        energy: 84
      },
      {
        title: "A Sky Full of Stars",
        theme: "release",
        chorusCue: "jump on the downbeat after the build",
        trivia: "The arrangement turns a singalong into a dance break without losing the melody.",
        energy: 99
      }
    ]
  },
  {
    match: ["taylor", "swift"],
    tourName: "The Memory Lane Marathon",
    palette: ["#c9a7ff", "#f15d5d", "#74d7ff"],
    stageMood: "confessional, cinematic, and maximal",
    tracks: [
      {
        title: "Cruel Summer",
        theme: "reckless joy",
        chorusCue: "enter with the crowd on the sharp hook and keep it crisp",
        trivia: "The song turns tension into release, which is why the room usually erupts before the chorus even lands.",
        energy: 98
      },
      {
        title: "Love Story",
        theme: "storybook certainty",
        chorusCue: "keep the melody clean; the crowd will handle the sparkle",
        trivia: "It is a nostalgia anchor that makes the arena feel like one shared flashback.",
        energy: 86
      },
      {
        title: "Anti-Hero",
        theme: "self-awareness",
        chorusCue: "aim for conversational timing before the big line",
        trivia: "Its hook works because the joke and the confession arrive at the same time.",
        energy: 88
      },
      {
        title: "Shake It Off",
        theme: "defiance",
        chorusCue: "save breath for the repeated refrain and clap on the two",
        trivia: "This is the reset button: loose shoulders, bright lights, no overthinking.",
        energy: 96
      },
      {
        title: "All Too Well",
        theme: "memory",
        chorusCue: "start soft; the payoff needs space",
        trivia: "The drama is in the detail, so the room usually gets quieter before it gets huge.",
        energy: 81
      }
    ]
  },
  {
    match: ["beyonce", "beyoncé"],
    tourName: "Club Renaissance Afterglow",
    palette: ["#f4d35e", "#00a6a6", "#ef476f"],
    stageMood: "precise, glamorous, and high-voltage",
    tracks: [
      {
        title: "CUFF IT",
        theme: "release",
        chorusCue: "lean into the groove before the hook pops",
        trivia: "The rhythm makes the chorus feel effortless, but the pocket is everything.",
        energy: 93
      },
      {
        title: "Formation",
        theme: "command",
        chorusCue: "hit the chant cleanly and leave room for the beat",
        trivia: "The audience response is part of the arrangement, almost like percussion.",
        energy: 99
      },
      {
        title: "Love On Top",
        theme: "elevation",
        chorusCue: "pace yourself; the key-change climb asks for stamina",
        trivia: "Every repeat raises the emotional ceiling and tests the room's range.",
        energy: 90
      },
      {
        title: "BREAK MY SOUL",
        theme: "liberation",
        chorusCue: "ride the house pulse and keep the words buoyant",
        trivia: "It is built like a runway walk and a group exhale at once.",
        energy: 95
      },
      {
        title: "Crazy In Love",
        theme: "spark",
        chorusCue: "come in after the horns and keep the hook punchy",
        trivia: "That brass blast still functions like an instant crowd ignition switch.",
        energy: 100
      }
    ]
  },
  {
    match: ["bad bunny", "benito"],
    tourName: "La Noche Sigue",
    palette: ["#00c2a8", "#ff6b35", "#f7f7ff"],
    stageMood: "sweaty, playful, and late-night",
    tracks: [
      {
        title: "Tití Me Preguntó",
        theme: "mischief",
        chorusCue: "lock to the dembow pulse before the room accelerates",
        trivia: "The live power comes from quick rhythmic switches and crowd call-backs.",
        energy: 98
      },
      {
        title: "Moscow Mule",
        theme: "flirtation",
        chorusCue: "keep it relaxed; the melody should feel sun-warmed",
        trivia: "It opens space in the set before the harder hits return.",
        energy: 84
      },
      {
        title: "Neverita",
        theme: "cool distance",
        chorusCue: "let the hook sit behind the beat",
        trivia: "The minimal production makes the crowd's timing more noticeable.",
        energy: 88
      },
      {
        title: "Me Porto Bonito",
        theme: "confidence",
        chorusCue: "answer the hook with swagger, not volume",
        trivia: "The song turns a simple melodic idea into a giant social moment.",
        energy: 94
      },
      {
        title: "WHERE SHE GOES",
        theme: "obsession",
        chorusCue: "wait for the drop, then move with the low end",
        trivia: "It is designed for a darker lighting shift and bigger sub-bass.",
        energy: 96
      }
    ]
  },
  {
    match: ["sza"],
    tourName: "SOS Signal Boost",
    palette: ["#8bd3dd", "#ff8fab", "#f5dd90"],
    stageMood: "intimate, watery, and emotionally sharp",
    tracks: [
      {
        title: "Kill Bill",
        theme: "messy honesty",
        chorusCue: "keep the phrasing conversational, almost under your breath",
        trivia: "The sweetness of the melody is what makes the dark humor land.",
        energy: 87
      },
      {
        title: "Good Days",
        theme: "healing",
        chorusCue: "float the hook; do not rush the entrance",
        trivia: "This is the set's collective inhale, usually softer but deeply loud in feeling.",
        energy: 78
      },
      {
        title: "Snooze",
        theme: "attachment",
        chorusCue: "let the groove lead and keep the top line gentle",
        trivia: "The track is all about warmth, restraint, and tiny melodic turns.",
        energy: 82
      },
      {
        title: "Broken Clocks",
        theme: "resilience",
        chorusCue: "ride the loop steadily; the emotion is in the repetition",
        trivia: "It often lands like a diary page turning into an anthem.",
        energy: 80
      },
      {
        title: "Love Galore",
        theme: "push-pull romance",
        chorusCue: "answer the melodic hook lightly before the beat widens",
        trivia: "The crowd usually knows exactly when to lean back into the pocket.",
        energy: 85
      }
    ]
  }
];

const DEFAULT_PROFILE = {
  match: [],
  tourName: "The City Lights Warm-Up",
  palette: ["#2dd4bf", "#ffb703", "#ef476f"],
  stageMood: "electric, close, and celebratory",
  tracks: [
    {
      title: "Opening Signal",
      theme: "arrival",
      chorusCue: "catch the first repeated phrase and answer it with the room",
      trivia: "Openers usually teach the audience the night's tempo in less than thirty seconds.",
      energy: 90
    },
    {
      title: "Golden Hour",
      theme: "devotion",
      chorusCue: "stretch the long notes and leave space after the downbeat",
      trivia: "Mid-tempo favorites work because everyone can sing without sprinting.",
      energy: 78
    },
    {
      title: "Back Row Hearts",
      theme: "nostalgia",
      chorusCue: "listen for the drum fill, then come in together",
      trivia: "The biggest memory songs often feel smaller right before they bloom.",
      energy: 84
    },
    {
      title: "Static Bloom",
      theme: "tension and release",
      chorusCue: "hold back until the bass opens, then lift",
      trivia: "A good live arrangement saves one surprise for the final chorus.",
      energy: 88
    },
    {
      title: "Last Train Home",
      theme: "closure",
      chorusCue: "sing the final refrain cleanly and let the band carry the outro",
      trivia: "Encore closers usually trade complexity for one unforgettable crowd shape.",
      energy: 91
    }
  ]
};

const CITY_VENUES = {
  atlanta: ["State Farm Arena", "Fox Theatre", "The Eastern"],
  austin: ["Moody Center", "ACL Live", "Stubb's"],
  boston: ["TD Garden", "MGM Music Hall", "Roadrunner"],
  chicago: ["United Center", "The Salt Shed", "Aragon Ballroom"],
  dallas: ["American Airlines Center", "The Factory", "House of Blues Dallas"],
  denver: ["Ball Arena", "Mission Ballroom", "Red Rocks Amphitheatre"],
  houston: ["Toyota Center", "713 Music Hall", "White Oak Music Hall"],
  "las vegas": ["T-Mobile Arena", "Dolby Live", "Brooklyn Bowl"],
  london: ["O2 Arena", "Wembley Stadium", "Roundhouse"],
  "los angeles": ["Kia Forum", "Hollywood Bowl", "Crypto.com Arena"],
  miami: ["Kaseya Center", "FPL Solar Stage", "Fillmore Miami Beach"],
  nashville: ["Bridgestone Arena", "Ryman Auditorium", "Ascend Amphitheater"],
  "new york": ["Madison Square Garden", "Radio City Music Hall", "Brooklyn Paramount"],
  philadelphia: ["Wells Fargo Center", "The Met", "Franklin Music Hall"],
  portland: ["Moda Center", "Roseland Theater", "Revolution Hall"],
  seattle: ["Climate Pledge Arena", "Paramount Theatre", "Showbox SoDo"],
  toronto: ["Scotiabank Arena", "Budweiser Stage", "Massey Hall"],
  washington: ["Capital One Arena", "The Anthem", "9:30 Club"]
};

function getSeed(parts) {
  const hash = crypto.createHash("sha256").update(parts.join("|").toLowerCase()).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16);
}

function pick(items, seed, offset = 0) {
  return items[(seed + offset) % items.length];
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getArtistProfile(artist) {
  const normalized = normalizeKey(artist);
  return ARTIST_PROFILES.find((profile) => profile.match.some((term) => normalized.includes(term))) || DEFAULT_PROFILE;
}

async function fetchUpcomingConcert({ artist, city }) {
  const seed = getSeed([artist, city, "show"]);
  const cityKey = normalizeKey(city);
  const venues = CITY_VENUES[cityKey] || ["Civic Music Hall", "Riverside Amphitheater", "Downtown Arena"];
  const showDate = new Date();
  showDate.setDate(showDate.getDate() + 10 + (seed % 45));
  showDate.setHours(20, 0, 0, 0);

  return {
    source: process.env.JAMBASE_API_KEY ? "JamBase adapter configured; demo fallback active" : "JamBase demo fallback",
    status: process.env.JAMBASE_API_KEY ? "configured" : "demo",
    artist,
    city,
    venue: pick(venues, seed),
    dateISO: showDate.toISOString(),
    doors: "7:00 PM",
    confidence: 0.74 + ((seed % 20) / 100)
  };
}

async function fetchLyricsInsights({ artist, tracks }) {
  return {
    source: process.env.MUSIXMATCH_API_KEY ? "Musixmatch adapter configured; demo fallback active" : "Musixmatch demo fallback",
    status: process.env.MUSIXMATCH_API_KEY ? "configured" : "demo",
    artist,
    tracks: tracks.map((track, index) => ({
      title: track.title,
      theme: track.theme,
      chorusCue: track.chorusCue,
      trivia: track.trivia,
      singalongWeight: Math.min(100, track.energy + index * 2)
    }))
  };
}

async function extractInstrumentalHooks({ tracks }) {
  return {
    source: process.env.LALAL_API_KEY ? "LALAL.AI adapter configured; demo synth hook active" : "LALAL.AI demo synth hook",
    status: process.env.LALAL_API_KEY ? "configured" : "demo",
    hooks: tracks.slice(0, 4).map((track, index) => ({
      track: track.title,
      durationSeconds: 5,
      startHint: `${45 + index * 18}s`,
      bpm: 92 + ((track.energy + index * 7) % 38),
      pattern: index % 2 === 0 ? "pulse" : "spark",
      mood: track.theme
    }))
  };
}

async function prepareVoiceNarration({ script }) {
  const configured = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
  return {
    source: configured ? "ElevenLabs adapter configured; browser narration active" : "ElevenLabs demo fallback via browser speech",
    status: configured ? "configured" : "demo",
    voice: configured ? process.env.ELEVENLABS_VOICE_ID : "Browser DJ voice",
    estimatedWords: script.split(/\s+/).filter(Boolean).length
  };
}

module.exports = {
  getArtistProfile,
  fetchUpcomingConcert,
  fetchLyricsInsights,
  extractInstrumentalHooks,
  prepareVoiceNarration
};
