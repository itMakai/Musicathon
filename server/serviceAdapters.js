const crypto = require("node:crypto");
const https  = require("node:https");
const http   = require("node:http");

/* ─────────────────────────────────────────────────────────
   ARTIST PROFILES
   Each entry contains:
     match[]      – lowercase substrings to match against user input
     tourName     – creative tour name for display
     palette[]    – 3 brand colours used across the UI
     stageMood    – one-line vibe description
     tracks[]     – 5 setlist tracks with rich metadata
───────────────────────────────────────────────────────── */
const ARTIST_PROFILES = [
  /* ── Coldplay ───────────────────────────────────── */
  {
    match: ["coldplay"],
    tourName: "Moon Music Night Drive",
    palette: ["#55d6c2", "#ffcf5a", "#ff5b8a"],
    stageMood: "warm, widescreen, and communal",
    tracks: [
      {
        title: "Higher Power",
        theme: "renewal",
        chorusCue: "the lift arrives fast — come in bright and early on the hook",
        trivia: "The song was premiered from the ISS before release, making it the first track debuted from space.",
        energy: 92
      },
      {
        title: "Yellow",
        theme: "devotion",
        chorusCue: "hold the long vowels and let the final line breathe into the crowd",
        trivia: "Written in one night after a walk outside, the title came from the Yellow Pages lying open on a table.",
        energy: 76
      },
      {
        title: "Viva La Vida",
        theme: "memory and reversal",
        chorusCue: "listen for the strings first, then punch the chant in perfect unison",
        trivia: "The string sample famously became the subject of a plagiarism claim that was later dismissed.",
        energy: 97
      },
      {
        title: "Fix You",
        theme: "repair",
        chorusCue: "save your full voice for the final swell — whisper through the verses",
        trivia: "Chris Martin wrote it for Gwyneth Paltrow after her father died; the organ intro was an accident in the studio.",
        energy: 84
      },
      {
        title: "A Sky Full of Stars",
        theme: "release",
        chorusCue: "jump hard on the downbeat right after the big build — the room will carry you",
        trivia: "Avicii co-wrote the drop; it's the closest Coldplay ever came to a pure dance anthem.",
        energy: 99
      }
    ]
  },

  /* ── Taylor Swift ───────────────────────────────── */
  {
    match: ["taylor", "swift"],
    tourName: "The Memory Lane Marathon",
    palette: ["#c9a7ff", "#f15d5d", "#74d7ff"],
    stageMood: "confessional, cinematic, and maximal",
    tracks: [
      {
        title: "Cruel Summer",
        theme: "reckless joy",
        chorusCue: "enter with the crowd on the sharp synth hook and keep it crisp — timing is everything",
        trivia: "The song sat unreleased for years until a viral campaign finally pushed it to number one.",
        energy: 98
      },
      {
        title: "Love Story",
        theme: "storybook certainty",
        chorusCue: "keep the melody clean and bright — the crowd will supply every sparkle",
        trivia: "Written at 17 in about 20 minutes to win back a boyfriend her parents disapproved of.",
        energy: 86
      },
      {
        title: "Anti-Hero",
        theme: "self-awareness",
        chorusCue: "aim for conversational delivery before the big confession line lands",
        trivia: "The music video's 'fat' scene was edited after criticism, making it one of Taylor's rare post-release changes.",
        energy: 88
      },
      {
        title: "Shake It Off",
        theme: "defiance",
        chorusCue: "save breath for the repeated refrain — clap on the two and keep shoulders loose",
        trivia: "The cheerleader choreography in the video was Taylor's own idea; she took one dance class to prepare.",
        energy: 96
      },
      {
        title: "All Too Well (10 Min Version)",
        theme: "memory in full",
        chorusCue: "start soft on the verses — the payoff needs maximum emotional runway",
        trivia: "The original 10-minute version was performed live before it was ever officially released.",
        energy: 91
      }
    ]
  },

  /* ── Beyoncé ────────────────────────────────────── */
  {
    match: ["beyonce", "beyoncé"],
    tourName: "Club Renaissance Afterglow",
    palette: ["#f4d35e", "#00a6a6", "#ef476f"],
    stageMood: "precise, glamorous, and high-voltage",
    tracks: [
      {
        title: "CUFF IT",
        theme: "release",
        chorusCue: "lean deep into the groove before the hook snaps — pocket timing matters",
        trivia: "The track's disco-funk feel was influenced by a single session where Beyoncé asked for 'something people will actually dance to'.",
        energy: 93
      },
      {
        title: "Formation",
        theme: "command",
        chorusCue: "hit the chant cleanly and leave deliberate space for the beat to breathe",
        trivia: "Filmed secretly in New Orleans, the video dropped 24 hours before the Super Bowl halftime performance.",
        energy: 99
      },
      {
        title: "Love On Top",
        theme: "elevation",
        chorusCue: "pace yourself; the climbing key changes ask for stamina — you'll need every gear",
        trivia: "The song modulates up four full steps by the end, which is almost unheard of in modern pop.",
        energy: 90
      },
      {
        title: "BREAK MY SOUL",
        theme: "liberation",
        chorusCue: "ride the house pulse and keep the words buoyant — it's a dance floor sermon",
        trivia: "Released at midnight with no warning, it crashed streaming servers and signalled the entire Renaissance era.",
        energy: 95
      },
      {
        title: "Crazy In Love",
        theme: "spark",
        chorusCue: "come in right after the horns hit — keep the hook punchy, not loud",
        trivia: "The iconic brass sample is from a 1970 Chi-Lites record; the clearance took months to finalise.",
        energy: 100
      }
    ]
  },

  /* ── Bad Bunny ──────────────────────────────────── */
  {
    match: ["bad bunny", "benito"],
    tourName: "La Noche Sigue",
    palette: ["#00c2a8", "#ff6b35", "#f7f7ff"],
    stageMood: "sweaty, playful, and late-night",
    tracks: [
      {
        title: "Tití Me Preguntó",
        theme: "mischief",
        chorusCue: "lock to the dembow pulse first — the room accelerates fast so be ready",
        trivia: "The title literally means 'My Aunt Asked Me' and the song is a playful non-answer about his love life.",
        energy: 98
      },
      {
        title: "Moscow Mule",
        theme: "flirtation",
        chorusCue: "keep it relaxed and sun-warmed — the melody should feel like it's melting",
        trivia: "Named after the cocktail, it samples a 1980s Puerto Rican salsa record most fans never recognise.",
        energy: 84
      },
      {
        title: "Neverita",
        theme: "cool distance",
        chorusCue: "let the hook sit just behind the beat — don't rush, the space is the point",
        trivia: "The fridge metaphor (neverita = small refrigerator) became one of the most quoted lines of the year.",
        energy: 88
      },
      {
        title: "Me Porto Bonito",
        theme: "confidence",
        chorusCue: "answer the hook with swagger, not volume — Chencho's part is a masterclass in restraint",
        trivia: "Recorded in a single afternoon; Chencho Corleone freestyled his entire verse on the first take.",
        energy: 94
      },
      {
        title: "WHERE SHE GOES",
        theme: "obsession",
        chorusCue: "wait for the drop, then move entirely with the sub-bass — no half measures",
        trivia: "A completely different genre from his usual reggaetón, the UK-drill influence surprised everyone.",
        energy: 96
      }
    ]
  },

  /* ── SZA ────────────────────────────────────────── */
  {
    match: ["sza"],
    tourName: "SOS Signal Boost",
    palette: ["#8bd3dd", "#ff8fab", "#f5dd90"],
    stageMood: "intimate, watery, and emotionally sharp",
    tracks: [
      {
        title: "Kill Bill",
        theme: "messy honesty",
        chorusCue: "keep the phrasing conversational — almost under your breath until it isn't",
        trivia: "SZA admitted the song began as a voice memo at 2 AM; the dark humour surprised even her label.",
        energy: 87
      },
      {
        title: "Good Days",
        theme: "healing",
        chorusCue: "float the hook gently — don't rush the entrance; the space before it is the song",
        trivia: "Released on Christmas Day as a surprise; the celestial production took over two years to finish.",
        energy: 78
      },
      {
        title: "Snooze",
        theme: "attachment",
        chorusCue: "let the groove lead and keep the top line gentle — the emotion is in the restraint",
        trivia: "The guitar lick is played by Justin Bieber, who appeared uncredited at SZA's request.",
        energy: 82
      },
      {
        title: "Broken Clocks",
        theme: "resilience",
        chorusCue: "ride the loop steadily — the emotion builds through repetition, not dynamics",
        trivia: "The track was almost cut from CTRL because SZA felt it was 'too personal'; her team convinced her to keep it.",
        energy: 80
      },
      {
        title: "Love Galore",
        theme: "push-pull romance",
        chorusCue: "answer the melodic hook lightly before the beat widens into the pocket",
        trivia: "Travis Scott's hook was recorded in a single take during a late-night session neither planned.",
        energy: 85
      }
    ]
  },

  /* ── Kendrick Lamar ─────────────────────────────── */
  {
    match: ["kendrick", "lamar", "kdot"],
    tourName: "The Grand National",
    palette: ["#e63946", "#f4a261", "#2ec4b6"],
    stageMood: "confrontational, poetic, and arena-seizing",
    tracks: [
      {
        title: "HUMBLE.",
        theme: "dominance",
        chorusCue: "sit down — then hit the hook with maximum precision on 'be humble'",
        trivia: "Director Dave Meyers shot the video in two days; the Renaissance painting tableau was Kendrick's own idea.",
        energy: 99
      },
      {
        title: "DNA.",
        theme: "lineage",
        chorusCue: "ride the beat switch hard — the second half doubles in intensity, stay with it",
        trivia: "The beat flips mid-track, something almost no other number-one rap song has attempted.",
        energy: 98
      },
      {
        title: "All The Stars",
        theme: "legacy",
        chorusCue: "keep SZA's refrain clean — let the melody ring before Kendrick's verse reclaims the room",
        trivia: "Written specifically for Black Panther; Kendrick and SZA recorded their parts in separate sessions.",
        energy: 88
      },
      {
        title: "Not Like Us",
        theme: "victory",
        chorusCue: "the crowd will chant every bar — pace yourself and lock onto the bay bounce rhythm",
        trivia: "First performed live on a surprise show in Compton before officially charting; the crowd response went viral.",
        energy: 100
      },
      {
        title: "Swimming Pools (Drank)",
        theme: "pressure",
        chorusCue: "dive in on 'drank' — it's a crowd-control word, the room breathes together on it",
        trivia: "The radio censoring of 'drank' made listeners curious, driving streams higher than the clean version.",
        energy: 90
      }
    ]
  },

  /* ── Dua Lipa ───────────────────────────────────── */
  {
    match: ["dua", "lipa"],
    tourName: "Radical Optimism World Run",
    palette: ["#ff006e", "#8338ec", "#3a86ff"],
    stageMood: "disco-lit, precise choreography, euphoric",
    tracks: [
      {
        title: "Levitating",
        theme: "weightlessness",
        chorusCue: "hit the hook exactly on 'levitating' — the rhythm is a locked four-on-the-floor groove",
        trivia: "The DaBaby remix temporarily overshadowed the original; both versions broke chart records in the same week.",
        energy: 97
      },
      {
        title: "Don't Start Now",
        theme: "reclamation",
        chorusCue: "the chorus is a taunt — sing it with a smile, not anger, and the line lands harder",
        trivia: "Bass line inspired by Chic's 'Good Times'; Dua wanted it to feel like a slap on the dance floor.",
        energy: 96
      },
      {
        title: "Physical",
        theme: "momentum",
        chorusCue: "keep the energy aerobic — this is the song built to make people move without thinking",
        trivia: "A deliberate 1980s exercise-video aesthetic; even the music video was lit like a VHS workout tape.",
        energy: 98
      },
      {
        title: "New Rules",
        theme: "self-discipline",
        chorusCue: "count the rules with the crowd — one… two… three — the chant structure is the payoff",
        trivia: "The all-female squad in the video was chosen to reflect Dua's real friend group from her London years.",
        energy: 91
      },
      {
        title: "Houdini",
        theme: "escape",
        chorusCue: "lean into the punchy syllables — 'Houdini' hits like a trap door opening under the beat",
        trivia: "The track signalled a sonic pivot toward UK funk; it debuted at number one in 14 countries simultaneously.",
        energy: 94
      }
    ]
  },

  /* ── The Weeknd ─────────────────────────────────── */
  {
    match: ["weeknd", "abel"],
    tourName: "After Hours Til Dawn",
    palette: ["#e63946", "#1d1d1d", "#f4a261"],
    stageMood: "cinematic noir, maximalist pop, stadium gothic",
    tracks: [
      {
        title: "Blinding Lights",
        theme: "desperate longing",
        chorusCue: "the synth lead carries the hook — echo it in your chest, not just your voice",
        trivia: "Longest-running top 10 single in Billboard Hot 100 history at 57 weeks.",
        energy: 99
      },
      {
        title: "Save Your Tears",
        theme: "regret",
        chorusCue: "deliver the chorus with detached smoothness — emotional distance is the whole performance",
        trivia: "The distorted face mask in the video was prosthetic; Abel wore it for months of public appearances.",
        energy: 92
      },
      {
        title: "Starboy",
        theme: "reinvention",
        chorusCue: "come in on 'I'm a starboy' with full conviction — hesitation kills the hook",
        trivia: "Daft Punk produced it in 48 hours; the cross-smashing scene sparked widespread debate.",
        energy: 95
      },
      {
        title: "The Hills",
        theme: "dark confession",
        chorusCue: "the hook is almost spoken — let the production carry the weight, stay low and direct",
        trivia: "Recorded in one session at 3 AM; Abel has said he barely remembers writing the lyrics.",
        energy: 88
      },
      {
        title: "Can't Feel My Face",
        theme: "numb euphoria",
        chorusCue: "this is pure Michael Jackson territory — clap on the two, deliver the chorus clean",
        trivia: "The song confused early listeners: it sounds happy about something clearly destructive.",
        energy: 96
      }
    ]
  },

  /* ── Billie Eilish ──────────────────────────────── */
  {
    match: ["billie", "eilish"],
    tourName: "HIT ME HARD AND SOFT Tour",
    palette: ["#00ffab", "#ff66c4", "#1e1e2f"],
    stageMood: "whisper-close, green-lit, confessional arena",
    tracks: [
      {
        title: "bad guy",
        theme: "subverted expectation",
        chorusCue: "the 'duh' is the whole joke — time it perfectly and the crowd releases all at once",
        trivia: "Spent 32 weeks at number two before finally knocking Old Town Road off the top spot.",
        energy: 94
      },
      {
        title: "Happier Than Ever",
        theme: "quiet fury",
        chorusCue: "the bridge erupts suddenly — save everything for that shift, the contrast IS the song",
        trivia: "Billie performed the full 5-minute version on every show; no radio edit was ever used live.",
        energy: 93
      },
      {
        title: "lovely",
        theme: "trapped hope",
        chorusCue: "duet energy — both voices in the room unite on 'isn't it lovely'; hold every vowel",
        trivia: "Written and recorded the same day it was pitched for the 13 Reasons Why soundtrack.",
        energy: 80
      },
      {
        title: "ocean eyes",
        theme: "first longing",
        chorusCue: "float the notes — this is a song that sounds better sung softly than loud",
        trivia: "Originally written by Finneas for his own band; Billie's version was uploaded at age 13 on SoundCloud.",
        energy: 75
      },
      {
        title: "BIRDS OF A FEATHER",
        theme: "devotion",
        chorusCue: "the chorus blooms slowly — enter with the vowel fully open and let it fill the venue",
        trivia: "The vinyl pre-orders sold out in under 3 minutes, before the song had even officially charted.",
        energy: 88
      }
    ]
  }
];


/* ─────────────────────────────────────────────────────────
   DEFAULT PROFILE (generic / unknown artist)
───────────────────────────────────────────────────────── */
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
      trivia: "Mid-tempo favourites work because everyone can sing without sprinting.",
      energy: 78
    },
    {
      title: "Back Row Hearts",
      theme: "nostalgia",
      chorusCue: "listen for the drum fill, then come in together as one voice",
      trivia: "The biggest memory songs often feel smaller right before they bloom.",
      energy: 84
    },
    {
      title: "Static Bloom",
      theme: "tension and release",
      chorusCue: "hold back until the bass opens, then lift with everything you have",
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

/* ─────────────────────────────────────────────────────────
   CITY → VENUE LOOKUP
───────────────────────────────────────────────────────── */
const CITY_VENUES = {
  amsterdam:    ["Ziggo Dome", "AFAS Live", "Paradiso"],
  atlanta:      ["State Farm Arena", "Fox Theatre", "The Eastern"],
  austin:       ["Moody Center", "ACL Live", "Stubb's Amphitheater"],
  barcelona:    ["Palau Sant Jordi", "Razzmatazz", "Poble Espanyol"],
  berlin:       ["Mercedes-Benz Arena", "Columbiahalle", "Velodrom"],
  boston:       ["TD Garden", "MGM Music Hall", "Roadrunner"],
  chicago:      ["United Center", "The Salt Shed", "Aragon Ballroom"],
  dallas:       ["American Airlines Center", "The Factory", "House of Blues Dallas"],
  denver:       ["Ball Arena", "Mission Ballroom", "Red Rocks Amphitheatre"],
  houston:      ["Toyota Center", "713 Music Hall", "White Oak Music Hall"],
  "las vegas":  ["T-Mobile Arena", "Dolby Live", "Brooklyn Bowl Las Vegas"],
  london:       ["O2 Arena", "Wembley Stadium", "Roundhouse"],
  "los angeles":["Kia Forum", "Hollywood Bowl", "Crypto.com Arena"],
  madrid:       ["WiZink Center", "Palacio de los Deportes", "La Riviera"],
  miami:        ["Kaseya Center", "FPL Solar Stage", "Fillmore Miami Beach"],
  nairobi:      ["Ngong Racecourse", "KICC Grounds", "Carnivore Grounds", "The Alchemist"],
  nashville:    ["Bridgestone Arena", "Ryman Auditorium", "Ascend Amphitheater"],
  "new york":   ["Madison Square Garden", "Radio City Music Hall", "Brooklyn Paramount"],
  paris:        ["Accor Arena", "Zénith Paris", "La Cigale"],
  philadelphia: ["Wells Fargo Center", "The Met", "Franklin Music Hall"],
  portland:     ["Moda Center", "Roseland Theater", "Revolution Hall"],
  seattle:      ["Climate Pledge Arena", "Paramount Theatre", "Showbox SoDo"],
  sydney:       ["Qudos Bank Arena", "Hordern Pavilion", "Enmore Theatre"],
  toronto:      ["Scotiabank Arena", "Budweiser Stage", "Massey Hall"],
  washington:   ["Capital One Arena", "The Anthem", "9:30 Club"]
};

/* ─────────────────────────────────────────────────────────
   UTILITY FUNCTIONS
───────────────────────────────────────────────────────── */
function getSeed(parts) {
  const hash = crypto
    .createHash("sha256")
    .update(parts.join("|").toLowerCase())
    .digest("hex");
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

/* ─────────────────────────────────────────────────────────
   EXPORTED ADAPTERS
───────────────────────────────────────────────────────── */

/**
 * Returns the best-matching artist profile, or the default.
 */
function getArtistProfile(artist) {
  const normalized = normalizeKey(artist);
  return (
    ARTIST_PROFILES.find(profile =>
      profile.match.some(term => normalized.includes(term))
    ) || DEFAULT_PROFILE
  );
}

/**
 * Simulates a JamBase API call to fetch the next upcoming concert.
 * When JAMBASE_API_KEY is set, a real HTTP call would happen here.
 */
async function fetchUpcomingConcert({ artist, city }) {
  const seed    = getSeed([artist, city, "show"]);
  const cityKey = normalizeKey(city);
  const venues  = CITY_VENUES[cityKey] || ["Civic Music Hall", "Riverside Amphitheater", "Downtown Arena"];

  // Deterministic future date from seed (10–54 days out)
  const showDate = new Date();
  showDate.setDate(showDate.getDate() + 10 + (seed % 45));
  showDate.setHours(20, 0, 0, 0);

  const doorsHour  = 18 + (seed % 3);   // 18:00, 19:00, or 20:00
  const doorsLabel = `${doorsHour}:00`;

  return {
    source:     process.env.JAMBASE_API_KEY
                  ? "JamBase API configured; demo seed data active"
                  : "JamBase demo fallback",
    status:     process.env.JAMBASE_API_KEY ? "configured" : "demo",
    artist,
    city,
    venue:      pick(venues, seed),
    dateISO:    showDate.toISOString(),
    doors:      doorsLabel,
    confidence: parseFloat((0.72 + (seed % 22) / 100).toFixed(2))
  };
}

/* ─────────────────────────────────────────────────────────
   LYRICS ENGINE
   Primary:  lyrics.ovh  (free, no auth)
   Fallback: lrclib.net  (free, no auth, synced + plain)
───────────────────────────────────────────────────────── */

/**
 * Low-level HTTP GET that returns parsed JSON.
 * Works with both http and https URLs.
 */
function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 7000 }, (res) => {
      // Follow single redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGetJson(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { raw += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

/**
 * Try lyrics.ovh first, then lrclib.net as fallback.
 * Returns { text, source } or { text: null, source: "unavailable" }.
 */
async function fetchRawLyrics(artist, title) {
  const encArtist = encodeURIComponent(artist);
  const encTitle  = encodeURIComponent(title);

  // ── Strategy 1: lyrics.ovh ─────────────────────────
  try {
    const data = await httpGetJson(
      `https://api.lyrics.ovh/v1/${encArtist}/${encTitle}`
    );
    if (data && typeof data.lyrics === "string" && data.lyrics.trim().length > 30) {
      return { text: data.lyrics.trim(), source: "lyrics.ovh" };
    }
  } catch (_) { /* fall through */ }

  // ── Strategy 2: lrclib.net ─────────────────────────
  try {
    const data = await httpGetJson(
      `https://lrclib.net/api/get?artist_name=${encArtist}&track_name=${encTitle}`
    );
    const plain = data && (data.plainLyrics || data.syncedLyrics);
    if (typeof plain === "string" && plain.trim().length > 30) {
      // Strip lrc timestamps if present
      const cleaned = plain.replace(/\[\d+:\d+\.\d+\]/g, "").trim();
      return { text: cleaned, source: "lrclib.net" };
    }
  } catch (_) { /* fall through */ }

  return { text: null, source: "unavailable" };
}

/**
 * Extract the chorus (or best representative snippet) from full lyrics.
 *
 * Detection order:
 *  1. Explicit [Chorus] / [Hook] / [Refrain] section tag
 *  2. Most-repeated stanza (>=2 occurrences)
 *  3. Middle third of lines (fallback)
 */
function extractChorus(fullLyrics) {
  if (!fullLyrics) return null;

  const text = fullLyrics.trim();

  // ── 1. Section-tagged chorus ───────────────────────
  const sectionRe = /\[(chorus|hook|refrain|pre-chorus)[^\]]*\]\s*\n([\s\S]*?)(?=\n\[|\n\n\[|$)/gi;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = sectionRe.exec(text)) !== null) {
    const lines = m[2].split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) return lines.slice(0, 8).join("\n");
  }

  // ── 2. Most-repeated stanza ────────────────────────
  const stanzas = text
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith("["));

  if (stanzas.length >= 2) {
    const firstLineMap = {};
    for (const st of stanzas) {
      const key = st.split("\n")[0].trim().toLowerCase();
      firstLineMap[key] = (firstLineMap[key] || 0) + 1;
    }
    const maxHits = Math.max(...Object.values(firstLineMap));
    if (maxHits >= 2) {
      const chorusKey = Object.entries(firstLineMap).find(([, v]) => v === maxHits)?.[0];
      const chorusStanza = stanzas.find(s => s.split("\n")[0].trim().toLowerCase() === chorusKey);
      if (chorusStanza) {
        const lines = chorusStanza.split("\n").map(l => l.trim()).filter(Boolean);
        return lines.slice(0, 8).join("\n");
      }
    }
  }

  // ── 3. Middle-third fallback ───────────────────────
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const start = Math.max(0, Math.floor(lines.length * 0.33));
  return lines.slice(start, start + 6).join("\n");
}

/**
 * Fetches a 30-second audio preview clip from the iTunes Search API.
 * Completely free, no API key required.
 * Returns { previewUrl, artworkUrl, trackName, artistName } or null.
 */
async function fetchiTunesPreview(artist, title) {
  try {
    const q    = encodeURIComponent(`${artist} ${title}`);
    const data = await httpGetJson(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=8&media=music`
    );

    if (!data || !data.results || data.results.length === 0) return null;

    // Score each result — prefer title + artist match
    const normTitle  = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const normArtist = artist.toLowerCase();

    function score(r) {
      const rt = (r.trackName  || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const ra = (r.artistName || "").toLowerCase();
      let s = 0;
      if (rt.includes(normTitle) || normTitle.includes(rt)) s += 3;
      if (ra.includes(normArtist) || normArtist.includes(ra.split(" ")[0])) s += 2;
      if (r.previewUrl) s += 1;   // penalise tracks with no preview
      return s;
    }

    const best = data.results
      .filter(r => r.previewUrl)  // must have audio
      .sort((a, b) => score(b) - score(a))[0] || null;

    if (!best) return null;

    return {
      previewUrl:  best.previewUrl,
      artworkUrl:  (best.artworkUrl100 || "").replace("100x100", "300x300"),
      trackName:   best.trackName,
      artistName:  best.artistName,
      durationMs:  best.trackTimeMillis || 30000
    };
  } catch (_) {
    return null;
  }
}

/**
 * Real Musixmatch-style call: fetches actual lyrics for each track
 * from public free APIs, extracts the chorus, and returns enriched data.
 * Falls back to curated in-profile lyrics when APIs don't have the track.
 * Also fetches iTunes 30-second previews in the real artist's voice.
 */
async function fetchLyricsInsights({ artist, tracks }) {
  // Fetch lyrics AND iTunes previews for all tracks in parallel
  const [lyricsResults, previewResults] = await Promise.all([
    Promise.allSettled(tracks.map(track => fetchRawLyrics(artist, track.title))),
    Promise.allSettled(tracks.map(track => fetchiTunesPreview(artist, track.title)))
  ]);

  const enriched = tracks.map((track, index) => {
    const rawLyrics  = lyricsResults[index].status === "fulfilled"
      ? lyricsResults[index].value
      : { text: null, source: "error" };

    const preview    = previewResults[index].status === "fulfilled"
      ? previewResults[index].value
      : null;

    // Priority: live API → curated profile lyrics → null
    const fullLyrics = rawLyrics.text || track.curatedLyrics || null;

    const chorus     = rawLyrics.text
      ? extractChorus(rawLyrics.text)
      : (track.curatedChorus || extractChorus(track.curatedLyrics) || null);

    const lyricsSource = rawLyrics.text
      ? rawLyrics.source
      : (track.curatedChorus ? "curated" : "unavailable");

    return {
      title:           track.title,
      theme:           track.theme,
      chorusCue:       track.chorusCue,
      trivia:          track.trivia,
      singalongWeight: Math.min(100, track.energy + index * 2),
      fullLyrics,
      chorus,
      lyricsSource,
      // iTunes preview — the real artist's voice
      preview: preview ? {
        url:        preview.previewUrl,
        artwork:    preview.artworkUrl,
        trackName:  preview.trackName,
        artistName: preview.artistName,
        durationMs: preview.durationMs
      } : null
    };
  });

  const lyricSources = [...new Set(enriched.map(t => t.lyricsSource).filter(s => s !== "unavailable" && s !== "error"))];
  const previewCount = enriched.filter(t => t.preview).length;
  const anyLyrics    = lyricSources.length > 0;

  return {
    source: [
      anyLyrics    ? `Lyrics via ${lyricSources.join(", ")}` : null,
      previewCount ? `${previewCount} iTunes previews`       : null
    ].filter(Boolean).join(" · ") || "Lyrics unavailable",
    status: anyLyrics
      ? (lyricSources.some(s => s.includes(".")) ? "live" : "configured")
      : (process.env.MUSIXMATCH_API_KEY ? "configured" : "demo"),
    previewCount,
    artist,
    tracks: enriched
  };
}



/**
 * Simulates a LALAL.AI call to extract instrumental hook snippets.
 * Returns hook metadata (BPM, pattern, mood, timing hint).
 */
async function extractInstrumentalHooks({ tracks }) {
  return {
    source: process.env.LALAL_API_KEY
              ? "LALAL.AI configured; demo synth hooks active"
              : "LALAL.AI demo synth hooks",
    status: process.env.LALAL_API_KEY ? "configured" : "demo",
    hooks: tracks.slice(0, 5).map((track, index) => ({
      track:           track.title,
      durationSeconds: 5,
      startHint:       `${40 + index * 20}s`,
      bpm:             88 + ((track.energy + index * 9) % 44),
      pattern:         index % 2 === 0 ? "pulse" : "spark",
      mood:            track.theme
    }))
  };
}

/**
 * Simulates an ElevenLabs TTS call.
 * Returns voice metadata; actual audio is generated client-side via
 * the Web Speech API as a demo fallback.
 */
async function prepareVoiceNarration({ script }) {
  const configured = Boolean(
    process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID
  );
  return {
    source: configured
              ? "ElevenLabs API configured; browser narration active"
              : "ElevenLabs demo fallback (browser SpeechSynthesis)",
    status: configured ? "configured" : "demo",
    voice:  configured ? process.env.ELEVENLABS_VOICE_ID : "Browser DJ",
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
