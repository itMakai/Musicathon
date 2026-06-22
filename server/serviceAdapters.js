const crypto = require("node:crypto");
const https  = require("node:https");
const http   = require("node:http");
const { spawn } = require("node:child_process");

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
function buildDemoConcert({ artist, city }) {
  const seed    = getSeed([artist, city, "show"]);
  const cityKey = normalizeKey(city);
  const venues  = CITY_VENUES[cityKey] || ["Civic Music Hall", "Riverside Amphitheater", "Downtown Arena"];

  // Deterministic future date from seed (10–54 days out)
  const showDate = new Date();
  showDate.setDate(showDate.getDate() + 10 + (seed % 45));
  showDate.setHours(20, 0, 0, 0);

  const doorsHour  = 18 + (seed % 3);   // 18:00, 19:00, or 20:00

  return {
    source:     process.env.JAMBASE_API_KEY
                  ? "JamBase reachable; demo seed data active"
                  : "JamBase demo fallback",
    status:     process.env.JAMBASE_API_KEY ? "configured" : "demo",
    artist,
    city,
    venue:      pick(venues, seed),
    dateISO:    showDate.toISOString(),
    doors:      `${doorsHour}:00`,
    confidence: parseFloat((0.72 + (seed % 22) / 100).toFixed(2))
  };
}

/**
 * Fetches the next upcoming concert for an artist from the JamBase Data API.
 * Falls back to deterministic demo data when no key is set or no event is found.
 */
async function fetchUpcomingConcert({ artist, city }) {
  if (!process.env.JAMBASE_API_KEY) return buildDemoConcert({ artist, city });

  try {
    const params = new URLSearchParams({
      artistName: artist,
      apikey:     process.env.JAMBASE_API_KEY
    });
    if (city) params.set("geoCityName", city);

    const data   = await requestJson(`https://www.jambase.com/jb-api/v1/events?${params.toString()}`);
    const events = (data && (data.events || data.data)) || [];

    // Choose the soonest event that is still in the future
    const now    = Date.now();
    const upcoming = events
      .map((e) => {
        const venue =
          (e.location && (e.location.name || (e.location.address && e.location.address.name))) ||
          (e._embedded && e._embedded.venue && e._embedded.venue.name) ||
          e.venueName || "Venue TBA";
        const dateISO = e.startDate || e.date || e.eventDate;
        return dateISO ? { dateISO: new Date(dateISO).toISOString(), venue } : null;
      })
      .filter((e) => e && new Date(e.dateISO).getTime() > now)
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

    if (!upcoming.length) {
      const demo = buildDemoConcert({ artist, city });
      demo.source = "JamBase: no upcoming event found; demo data active";
      return demo;
    }

    const next = upcoming[0];
    return {
      source:     "JamBase live event data",
      status:     "live",
      artist,
      city,
      venue:      next.venue,
      dateISO:    next.dateISO,
      doors:      "Doors TBA",
      confidence: 1
    };
  } catch (e) {
    // Never surface the upstream body — it can echo the API key. Log the
    // detail server-side and return a generic, safe status to the client.
    console.warn("JamBase request failed:", e.message);
    const demo = buildDemoConcert({ artist, city });
    demo.source = "JamBase unavailable (check API key); demo data active";
    return demo;
  }
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
 * Generic JSON GET that supports custom request headers (needed for
 * authenticated APIs such as Songstats). Follows a single redirect.
 */
function requestJson(url, { headers = {}, timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        requestJson(res.headers.location, { headers, timeout }).then(resolve, reject);
        return;
      }
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 180)}`));
          return;
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

/**
 * JSON POST that resolves to a binary Buffer (used for ElevenLabs audio).
 * Returns { buffer, contentType }.
 */
function postForBuffer(url, { headers = {}, body, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const u       = new URL(url);
    const lib     = u.protocol === "https:" ? https : http;
    const payload = typeof body === "string" ? body : JSON.stringify(body || {});
    const req = lib.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      },
      timeout
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${buf.toString("utf8").slice(0, 180)}`));
          return;
        }
        resolve({ buffer: buf, contentType: res.headers["content-type"] || "audio/mpeg" });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(payload);
    req.end();
  });
}

/**
 * HTTP GET that resolves to a binary Buffer (used to download audio).
 * Follows redirects. Returns { buffer, contentType }.
 */
function downloadBuffer(url, { timeout = 20000, redirects = 3 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        downloadBuffer(res.headers.location, { timeout, redirects: redirects - 1 }).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({
        buffer:      Buffer.concat(chunks),
        contentType: res.headers["content-type"] || "application/octet-stream"
      }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Download timeout")); });
  });
}

/* ─────────────────────────────────────────────────────────
   SONGSTATS  (real artist analytics → current top tracks)
   Docs: https://docs.songstats.com  ·  apikey header auth
───────────────────────────────────────────────────────── */
const SONGSTATS_BASE = "https://api.songstats.com/enterprise/v1";

function songstatsHeaders() {
  return { apikey: process.env.SONGSTATS_API_KEY || "", Accept: "application/json" };
}

/**
 * Walk an arbitrary JSON object and return the first array whose items
 * satisfy `predicate`. Songstats response envelopes are loosely typed,
 * so this keeps parsing resilient to shape changes.
 */
function findArray(obj, predicate) {
  const seen  = new Set();
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur)) {
      const hits = cur.filter(predicate);
      if (hits.length) return hits;
    }
    for (const v of Object.values(cur)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

function pickStat(obj, names) {
  if (!obj || typeof obj !== "object") return null;
  for (const n of names) {
    if (obj[n] != null && !Number.isNaN(Number(obj[n]))) return Number(obj[n]);
  }
  // dive one level into a nested stats container
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = pickStat(v, names);
      if (found != null) return found;
    }
  }
  return null;
}

async function songstatsFindArtist(artist) {
  const url  = `${SONGSTATS_BASE}/artists/search?q=${encodeURIComponent(artist)}`;
  const data = await requestJson(url, { headers: songstatsHeaders() });
  const arr  = findArray(data, (x) =>
    x && typeof x === "object" && (x.songstats_artist_id || x.name)
  );
  if (!arr || !arr.length) return null;

  const norm = normalizeKey(artist);
  const best =
    arr.find((a) => normalizeKey(a.name) === norm) ||
    arr.find((a) => normalizeKey(a.name).includes(norm)) ||
    arr[0];

  if (!best) return null;
  return {
    id:       best.songstats_artist_id || best.id || null,
    name:     best.name || artist,
    imageUrl: best.avatar || best.image_url || null,
    genres:   Array.isArray(best.genres) ? best.genres : []
  };
}

/**
 * Fetches an artist's current top tracks from Songstats.
 * Returns { status, source, artistName, imageUrl, genres, topTracks[] }.
 * Always resolves — degrades to a demo/empty payload on any failure so
 * the caller can fall back to the curated profile.
 */
async function fetchSongstatsTopTracks({ artist }) {
  if (!process.env.SONGSTATS_API_KEY) {
    return { status: "demo", source: "Songstats demo fallback", topTracks: [] };
  }
  try {
    const found = await songstatsFindArtist(artist);
    if (!found || !found.id) {
      return { status: "configured", source: "Songstats: no artist match", topTracks: [], artistName: artist };
    }

    // top_tracks requires source + metric + scope; track records live under
    // data[].top_tracks with track_name + rank_value (the metric's value).
    const url  = `${SONGSTATS_BASE}/artists/top_tracks?songstats_artist_id=${encodeURIComponent(found.id)}&source=spotify&metric=streams&scope=total`;
    const data = await requestJson(url, { headers: songstatsHeaders() });
    const arr  = findArray(data, (x) =>
      x && typeof x === "object" && (x.track_name || x.title || x.track_title)
    ) || [];

    const topTracks = arr.slice(0, 8).map((t, i) => ({
      title:         t.track_name || t.title || t.track_title,
      isrc:          t.isrc || null,
      rank:          i + 1,
      streams:       Number(t.rank_value) || pickStat(t, ["streams_total", "streams", "value"]),
      chartPosition: pickStat(t, ["chart_position", "charts_current"])
    })).filter((t) => t.title);

    return {
      status:            topTracks.length ? "live" : "configured",
      source:            topTracks.length ? "Songstats live top tracks" : "Songstats: no track data",
      artistName:        found.name || artist,
      imageUrl:          found.imageUrl,
      genres:            found.genres,
      songstatsArtistId: found.id,
      topTracks
    };
  } catch (e) {
    return { status: "error", source: `Songstats error: ${e.message}`, topTracks: [] };
  }
}

/* ─────────────────────────────────────────────────────────
   MUSIXMATCH
   Docs: https://api.musixmatch.com/ws/1.1  ·  apikey query param
   Surfaces used:
     • Catalog      — matcher.track.get  → canonical track id + metadata
     • Lyrics       — track.lyrics.get   → plain lyrics by commontrack_id
     • Lyrics-Sync  — track.subtitle.get → time-aligned lyrics (commercial
                      plan; degrades silently to plain lyrics otherwise)
───────────────────────────────────────────────────────── */

const MUSIXMATCH_BASE = "https://api.musixmatch.com/ws/1.1";

/** Build a Musixmatch request URL with the api key + format appended. */
function musixmatchUrl(method, params = {}) {
  const usp = new URLSearchParams({
    format: "json",
    ...params,
    apikey: process.env.MUSIXMATCH_API_KEY || ""
  });
  return `${MUSIXMATCH_BASE}/${method}?${usp.toString()}`;
}

/** Pull the Musixmatch status_code out of an envelope (or null). */
function musixmatchStatus(data) {
  return data && data.message && data.message.header
    ? data.message.header.status_code
    : null;
}

/** Strip the free-tier disclaimer / "(30%)" markers from a lyrics body. */
function cleanMusixmatchLyrics(raw) {
  return String(raw || "")
    .replace(/\*{3,}[\s\S]*?\*{3,}/g, "")  // strip "*** NOT for Commercial use ***"
    .replace(/^\s*\(\d+%\)\s*$/gm, "")      // strip stray "(30%)" markers
    .trim();
}

/**
 * CATALOG — resolve a text query to the canonical Musixmatch track.
 * Returns { commontrackId, trackId, album, releaseDate, explicit,
 * hasLyrics, hasSubtitles } or null.
 */
async function musixmatchMatchTrack(artist, title) {
  const data   = await requestJson(
    musixmatchUrl("matcher.track.get", { q_track: title, q_artist: artist })
  );
  if (musixmatchStatus(data) !== 200) return null;

  const t = data.message.body && data.message.body.track;
  if (!t || !t.commontrack_id) return null;

  return {
    commontrackId: t.commontrack_id,
    trackId:       t.track_id || null,
    album:         t.album_name || null,
    releaseDate:   t.first_release_date || null,
    explicit:      t.explicit === 1,
    hasLyrics:     t.has_lyrics === 1,
    hasSubtitles:  t.has_subtitles === 1
  };
}

/** LYRICS — plain lyrics by commontrack_id. Returns { text, copyright } or null. */
async function musixmatchLyricsById(commontrackId) {
  const data = await requestJson(
    musixmatchUrl("track.lyrics.get", { commontrack_id: String(commontrackId) })
  );
  if (musixmatchStatus(data) !== 200) return null;

  const lyr = data.message.body && data.message.body.lyrics;
  if (!lyr || !lyr.lyrics_body) return null;

  const text = cleanMusixmatchLyrics(lyr.lyrics_body);
  if (text.length < 20) return null;
  return { text, copyright: lyr.lyrics_copyright || null };
}

/**
 * LYRICS-SYNC — time-aligned subtitle by commontrack_id.
 * Requires a Musixmatch plan that includes synced lyrics; any non-200
 * (e.g. 401/402/403 on the free tier) returns null so callers fall back
 * to plain lyrics. Returns [{ time, text }] sorted by time, or null.
 */
async function musixmatchSubtitle(commontrackId) {
  const data = await requestJson(
    musixmatchUrl("track.subtitle.get", { commontrack_id: String(commontrackId) })
  );
  if (musixmatchStatus(data) !== 200) return null;

  const sub = data.message.body && data.message.body.subtitle;
  if (!sub || !sub.subtitle_body) return null;

  let rows;
  try { rows = JSON.parse(sub.subtitle_body); } catch (_) { return null; }
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const lines = rows
    .map(r => ({
      time: r && r.time && typeof r.time.total === "number" ? r.time.total : null,
      text: cleanMusixmatchLyrics(r && r.text)
    }))
    .filter(r => r.time !== null && r.text)
    .sort((a, b) => a.time - b.time);

  return lines.length ? lines : null;
}

/**
 * Fetch lyrics for a title+artist from Musixmatch using the Catalog,
 * Lyrics, and Lyrics-Sync surfaces.
 *
 * Flow: matcher.track.get (catalog) → track.lyrics.get (plain by id) →
 * track.subtitle.get (synced, optional). Falls back to the legacy
 * matcher.lyrics.get when the catalog lookup can't be resolved.
 *
 * Returns { text, source, copyright, synced, meta } or null.
 */
async function fetchMusixmatchLyrics(artist, title) {
  if (!process.env.MUSIXMATCH_API_KEY) return null;

  let text = null, copyright = null, synced = null, meta = null;

  // ── 1. CATALOG — resolve canonical track + metadata ──
  let match = null;
  try { match = await musixmatchMatchTrack(artist, title); } catch (_) { /* ignore */ }

  if (match) {
    meta = {
      album:        match.album,
      releaseDate:  match.releaseDate,
      explicit:     match.explicit,
      hasSubtitles: match.hasSubtitles
    };

    // ── 2. LYRICS — plain lyrics by canonical id ──
    if (match.hasLyrics) {
      try {
        const byId = await musixmatchLyricsById(match.commontrackId);
        if (byId) { text = byId.text; copyright = byId.copyright; }
      } catch (_) { /* ignore */ }
    }

    // ── 3. LYRICS-SYNC — time-aligned subtitle (optional) ──
    if (match.hasSubtitles) {
      try { synced = await musixmatchSubtitle(match.commontrackId); } catch (_) { /* ignore */ }
    }
  }

  // ── Fallback: legacy matcher.lyrics.get when catalog lookup failed ──
  if (!text) {
    try {
      const data = await requestJson(
        musixmatchUrl("matcher.lyrics.get", { q_track: title, q_artist: artist })
      );
      if (musixmatchStatus(data) === 200) {
        const lyr = data.message.body && data.message.body.lyrics;
        if (lyr && lyr.lyrics_body) {
          const body = cleanMusixmatchLyrics(lyr.lyrics_body);
          if (body.length >= 20) { text = body; copyright = lyr.lyrics_copyright || null; }
        }
      }
    } catch (_) { /* ignore */ }
  }

  // Synced lyrics can stand in for plain text when only sync is available.
  if (!text && synced) text = synced.map(l => l.text).filter(Boolean).join("\n");

  if (!text) return null;

  return {
    text,
    source:      synced ? "Musixmatch (synced)" : "Musixmatch",
    copyright,
    synced:      synced || null,
    syncedSource: synced ? "Musixmatch" : null,
    meta
  };
}

/**
 * Try lyrics.ovh first, then lrclib.net as fallback.
 * Returns { text, source } or { text: null, source: "unavailable" }.
 */
async function fetchRawLyrics(artist, title) {
  const encArtist = encodeURIComponent(artist);
  const encTitle  = encodeURIComponent(title);

  let result = null;

  // ── Strategy 0: Musixmatch (Catalog + Lyrics + Lyrics-Sync) ──
  try {
    const mm = await fetchMusixmatchLyrics(artist, title);
    if (mm) result = mm;
  } catch (_) { /* fall through */ }

  // ── Strategy 1: lyrics.ovh ─────────────────────────
  if (!result) {
    try {
      const data = await httpGetJson(
        `https://api.lyrics.ovh/v1/${encArtist}/${encTitle}`
      );
      if (data && typeof data.lyrics === "string" && data.lyrics.trim().length > 30) {
        result = { text: data.lyrics.trim(), source: "lyrics.ovh" };
      }
    } catch (_) { /* fall through */ }
  }

  // ── Strategy 2: lrclib.net (also returns free synced lyrics) ──
  if (!result) {
    try {
      const data = await httpGetJson(
        `https://lrclib.net/api/get?artist_name=${encArtist}&track_name=${encTitle}`
      );
      const synced = data && typeof data.syncedLyrics === "string"
        ? parseLrc(data.syncedLyrics)
        : null;
      const plain = data && (data.plainLyrics || data.syncedLyrics);
      if (typeof plain === "string" && plain.trim().length > 30) {
        const cleaned = plain.replace(/\[\d+:\d+\.\d+\]/g, "").trim();
        result = {
          text:   cleaned,
          source: synced && synced.length ? "lrclib.net (synced)" : "lrclib.net",
          synced: synced && synced.length ? synced : null,
          syncedSource: synced && synced.length ? "lrclib" : null
        };
      }
    } catch (_) { /* fall through */ }
  }

  if (!result) return { text: null, source: "unavailable" };

  // ── Lyrics-Sync supplement ─────────────────────────
  // Musixmatch synced subtitles need a commercial plan; when the chosen
  // source has plain text but no time-alignment, borrow lrclib's free
  // synced lyrics so the karaoke view still works.
  if (!result.synced) {
    try {
      const syn = await fetchLrclibSynced(artist, title);
      if (syn && syn.length) {
        result.synced = syn;
        result.syncedSource = "lrclib";
        if (!/synced/i.test(result.source)) result.source = `${result.source} + lrclib sync`;
      }
    } catch (_) { /* ignore — plain lyrics still returned */ }
  }

  return result;
}

/**
 * Fetch only the time-aligned (LRC) lyrics for a track from lrclib.net.
 * Returns [{ time, text }] sorted by time, or null.
 */
async function fetchLrclibSynced(artist, title) {
  const data = await httpGetJson(
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
  );
  if (!data || typeof data.syncedLyrics !== "string") return null;
  const lines = parseLrc(data.syncedLyrics);
  return lines.length ? lines : null;
}

/**
 * Parse LRC-format synced lyrics ("[mm:ss.xx] text") into [{ time, text }]
 * sorted by time. Returns [] when nothing parses.
 */
function parseLrc(lrc) {
  const out = [];
  for (const line of String(lrc).split("\n")) {
    const m = /^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s?(.*)$/.exec(line);
    if (!m) continue;
    const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
    const text = m[3].trim();
    if (text) out.push({ time, text });
  }
  return out.sort((a, b) => a.time - b.time);
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
      lyricsCopyright: rawLyrics.copyright || null,
      // Lyrics-Sync: time-aligned [{ time, text }] when available
      syncedLyrics:    rawLyrics.synced || null,
      syncedSource:    rawLyrics.syncedSource || null,
      // Catalog metadata: { album, releaseDate, explicit, hasSubtitles }
      lyricsMeta:      rawLyrics.meta || null,
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
      ? (lyricSources.some(s => s !== "curated") ? "live" : "configured")
      : (process.env.MUSIXMATCH_API_KEY ? "configured" : "demo"),
    previewCount,
    artist,
    tracks: enriched
  };
}



/* ─────────────────────────────────────────────────────────
   LALAL.AI  (real instrumental stem separation)
   Flow: upload preview → split (vocals/phoenix) → poll → download
   the "no_vocals" back_track. Auth: `Authorization: license <key>`.
───────────────────────────────────────────────────────── */
const LALAL_BASE = "https://www.lalal.ai";

function lalalPost(path, { extraHeaders = {}, body, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const u       = new URL(LALAL_BASE + path);
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   "POST",
      headers: {
        "Authorization":  `license ${process.env.LALAL_API_KEY || ""}`,
        "Content-Length": payload.length,
        ...extraHeaders
      },
      timeout
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`LALAL invalid JSON: ${raw.slice(0, 120)}`)); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("LALAL timeout")); });
    req.write(payload);
    req.end();
  });
}

// In-memory cache of finished hook beds (LALAL processing is paid + slow).
const hookBedCache    = new Map();
const HOOK_BED_CACHE_MAX = 30;

/**
 * Real LALAL.AI pipeline: takes a track's iTunes preview, separates the
 * vocals, and returns the instrumental ("no_vocals") stem as audio.
 * Resolves to { buffer, contentType, track, artist } or null when no key.
 * Cached per artist|title so repeat plays don't re-spend the LALAL quota.
 */
async function extractHookBed({ artist, title }) {
  if (!process.env.LALAL_API_KEY) return null;

  const cacheKey = `${normalizeKey(artist)}|${normalizeKey(title)}`;
  if (hookBedCache.has(cacheKey)) return hookBedCache.get(cacheKey);

  // 1. Real audio source — the artist's own iTunes preview.
  const preview = await fetchiTunesPreview(artist, title);
  if (!preview || !preview.previewUrl) return null;
  const audio = await downloadBuffer(preview.previewUrl, { timeout: 20000 });

  // 2. Upload the preview to LALAL.
  const up = await lalalPost("/api/upload/", {
    extraHeaders: {
      "Content-Disposition": 'attachment; filename="hook.mp4"',
      "Content-Type":        "application/octet-stream"
    },
    body: audio.buffer
  });
  if (!up || up.status !== "success" || !up.id) {
    throw new Error(up && up.error ? up.error : "LALAL upload failed");
  }
  const id = up.id;

  // 3. Split: separating "vocals" leaves the instrumental as back_track.
  const params = encodeURIComponent(JSON.stringify([{ id, stem: "vocals", splitter: "phoenix" }]));
  const sp = await lalalPost("/api/split/", {
    extraHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `params=${params}`
  });
  if (!sp || sp.status !== "success") {
    throw new Error(sp && sp.error ? sp.error : "LALAL split failed");
  }

  // 4. Poll until the stem is ready (typically ~5-10s for a 30s preview).
  let backTrack = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const ck = await lalalPost("/api/check/", {
      extraHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `id=${id}`
    });
    const r = ck && ck.result && ck.result[id];
    if (!r) continue;
    const state = r.task && r.task.state;
    if (state === "success" && r.split && (r.split.back_track || r.split.stem_track)) {
      backTrack = r.split.back_track || r.split.stem_track;
      break;
    }
    if (state === "error" || state === "cancelled") {
      throw new Error("LALAL processing failed");
    }
  }
  if (!backTrack) throw new Error("LALAL timed out");

  // 5. Download the instrumental stem.
  const stem   = await downloadBuffer(backTrack, { timeout: 30000 });
  const result = {
    buffer:      stem.buffer,
    contentType: (stem.contentType && stem.contentType.startsWith("audio")) ? stem.contentType : "audio/mpeg",
    track:       preview.trackName  || title,
    artist:      preview.artistName || artist
  };

  if (hookBedCache.size >= HOOK_BED_CACHE_MAX) {
    hookBedCache.delete(hookBedCache.keys().next().value);
  }
  hookBedCache.set(cacheKey, result);
  return result;
}

/**
 * Hook metadata for the episode payload (BPM/pattern/mood + service status).
 * The actual instrumental bed is produced on demand by extractHookBed via
 * the /api/hookbed endpoint; this reports availability and per-track hints.
 */
async function extractInstrumentalHooks({ tracks }) {
  return {
    source: process.env.LALAL_API_KEY
              ? "LALAL.AI live stem separation"
              : "LALAL.AI demo synth hooks",
    status: process.env.LALAL_API_KEY ? "live" : "demo",
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

// Default ElevenLabs voice ("Adam") used when ELEVENLABS_VOICE_ID is unset.
const DEFAULT_ELEVENLABS_VOICE = "pNInz6obpgDQGcFmaJgB";

/**
 * Reports ElevenLabs narration availability. Real audio is synthesized
 * on demand via the /api/narration endpoint; the browser Web Speech API
 * is used as the fallback when no key is configured.
 */
async function prepareVoiceNarration({ script }) {
  const live = Boolean(process.env.ELEVENLABS_API_KEY);
  return {
    source: live
              ? "ElevenLabs live narration available"
              : "ElevenLabs demo fallback (browser SpeechSynthesis)",
    status: live ? "live" : "demo",
    available: live,
    voice:  process.env.ELEVENLABS_VOICE_ID || (live ? DEFAULT_ELEVENLABS_VOICE : "Browser DJ"),
    estimatedWords: script.split(/\s+/).filter(Boolean).length
  };
}

/**
 * Synthesizes narration audio with ElevenLabs text-to-speech.
 * Resolves to { buffer, contentType } or null when no key is configured.
 */
async function synthesizeNarration({ script, voiceId }) {
  if (!process.env.ELEVENLABS_API_KEY) return null;
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE;
  const url   = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`;
  return postForBuffer(url, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, Accept: "audio/mpeg" },
    body: {
      text:     script,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true }
    },
    timeout: 60000
  });
}

/* ─────────────────────────────────────────────────────────
   CYANITE.AI  (real AI music analysis → mood / genre / energy /
   BPM / key / positivity). GraphQL endpoint, Bearer auth.
   Flow: fileUploadRequest → PUT the mp3 to the presigned uploadUrl
   → libraryTrackCreate (auto-enqueues analysis) → poll
   libraryTrack.audioAnalysisV7 until Finished → read result tags.
   Docs: https://api-docs.cyanite.ai
───────────────────────────────────────────────────────── */
const CYANITE_ENDPOINT = "https://api.cyanite.ai/graphql";

/**
 * One GraphQL round-trip to Cyanite. Resolves `data`, or rejects with an
 * Error tagged `.transient = true` for retryable upstream failures (HTTP
 * 5xx, non-JSON bodies, network/timeout). GraphQL-level errors reject
 * without the transient flag. Never echoes the access token.
 */
function cyaniteGraphqlOnce(query, variables, timeout) {
  return new Promise((resolve, reject) => {
    const transient = (msg) => Object.assign(new Error(msg), { transient: true });
    const payload = JSON.stringify({ query, variables });
    const u = new URL(CYANITE_ENDPOINT);
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "Authorization":  `Bearer ${process.env.CYANITE_API_KEY || ""}`
      },
      timeout
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        if (res.statusCode >= 500) { reject(transient(`Cyanite HTTP ${res.statusCode}`)); return; }
        let json;
        try { json = JSON.parse(raw); }
        catch (e) { reject(transient(`Cyanite invalid JSON: ${raw.slice(0, 120)}`)); return; }
        if (json.errors && json.errors.length) {
          reject(new Error(json.errors[0].message || "Cyanite GraphQL error"));
          return;
        }
        resolve(json.data);
      });
    });
    req.on("error", (e) => reject(transient(e.message)));
    req.on("timeout", () => { req.destroy(); reject(transient("Cyanite timeout")); });
    req.write(payload);
    req.end();
  });
}

/**
 * Sends a GraphQL operation to Cyanite, retrying transient upstream
 * failures (Cyanite's `fileUploadRequest` intermittently 500s) with
 * backoff. Resolves to `data` or rejects with a safe error message.
 */
async function cyaniteGraphql(query, variables = {}, { timeout = 20000, retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await cyaniteGraphqlOnce(query, variables, timeout);
    } catch (err) {
      lastErr = err;
      if (!err.transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * PUTs a binary buffer to a presigned URL (Cyanite's S3 upload slot).
 * Resolves on any 2xx response.
 */
function putBuffer(url, buffer, { contentType = "audio/mpeg", timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port:     u.port || undefined,
      path:     u.pathname + u.search,
      method:   "PUT",
      headers:  { "Content-Type": contentType, "Content-Length": buffer.length },
      timeout
    }, (res) => {
      res.resume();
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(true);
        else reject(new Error(`Cyanite upload HTTP ${res.statusCode}`));
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Cyanite upload timeout")); });
    req.write(buffer);
    req.end();
  });
}

/**
 * Transcodes an arbitrary audio buffer to a real MP3 via ffmpeg (piped,
 * no temp files). iTunes previews are AAC/.m4a, but Cyanite ingests MP3,
 * so this guarantees the uploaded bytes match the forced audio/mpeg type.
 */
function transcodeToMp3(inputBuffer, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-i", "pipe:0", "-vn", "-f", "mp3", "-ab", "192k", "pipe:1"], {
      stdio: ["pipe", "pipe", "ignore"]
    });
    const chunks = [];
    let settled = false;
    const finish = (fn, arg) => { if (!settled) { settled = true; clearTimeout(timer); fn(arg); } };
    const timer = setTimeout(() => {
      try { ff.kill("SIGKILL"); } catch (_) {}
      finish(reject, new Error("Audio transcode timed out"));
    }, timeout);

    ff.stdout.on("data", (c) => chunks.push(c));
    ff.on("error", (e) => finish(reject, new Error(`ffmpeg unavailable: ${e.message}`)));
    ff.on("close", (code) => {
      if (code === 0 && chunks.length) finish(resolve, Buffer.concat(chunks));
      else finish(reject, new Error(`Audio transcode failed (ffmpeg exit ${code})`));
    });
    ff.stdin.on("error", () => {});   // ignore EPIPE if ffmpeg exits early
    ff.stdin.write(inputBuffer);
    ff.stdin.end();
  });
}

/** Pretty-print an enum tag, e.g. "hip_hop" / "uplifting" → "Hip Hop". */
function prettyTag(tag) {
  return String(tag || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Format a MusicalKey enum (e.g. "cSharpMinor") into "C♯ Minor". */
function formatMusicalKey(key) {
  if (!key) return null;
  const m = String(key).match(/^([a-g])(sharp|flat)?(major|minor)?$/i);
  if (!m) return prettyTag(key);
  const note = m[1].toUpperCase();
  const acc  = m[2] ? (m[2].toLowerCase() === "sharp" ? "♯" : "♭") : "";
  const mode = m[3] ? (m[3].toLowerCase() === "minor" ? " Minor" : " Major") : "";
  return `${note}${acc}${mode}`;
}

// In-memory cache of finished analyses (Cyanite is paid + slow per track).
const vibeCache    = new Map();
const VIBE_CACHE_MAX = 60;

/**
 * Real Cyanite.ai pipeline: takes a track's iTunes preview, uploads it,
 * runs AudioAnalysisV7, and returns the AI-derived musical "vibe".
 * Resolves to a vibe object, or null when no key is configured.
 * Throws (with a safe message) when no preview exists or analysis fails.
 * Cached per artist|title so repeat requests don't re-spend the quota.
 */
async function analyzeTrackVibe({ artist, title }) {
  if (!process.env.CYANITE_API_KEY) return null;

  const cacheKey = `${normalizeKey(artist)}|${normalizeKey(title)}`;
  if (vibeCache.has(cacheKey)) return vibeCache.get(cacheKey);

  // 1. Real audio source — the artist's own iTunes preview.
  const preview = await fetchiTunesPreview(artist, title);
  if (!preview || !preview.previewUrl) {
    throw new Error("No audio preview is available for this track.");
  }
  const audio = await downloadBuffer(preview.previewUrl, { timeout: 20000 });

  // 1b. iTunes previews are AAC/.m4a — transcode to real MP3 for Cyanite.
  const mp3 = await transcodeToMp3(audio.buffer);

  // 2. Request an upload slot.
  const reqData   = await cyaniteGraphql(`mutation { fileUploadRequest { id uploadUrl } }`);
  const uploadId  = reqData && reqData.fileUploadRequest && reqData.fileUploadRequest.id;
  const uploadUrl = reqData && reqData.fileUploadRequest && reqData.fileUploadRequest.uploadUrl;
  if (!uploadId || !uploadUrl) throw new Error("Cyanite upload request failed");

  // 3. Upload the mp3 bytes to the presigned URL.
  await putBuffer(uploadUrl, mp3, { contentType: "audio/mpeg" });

  // 4. Create the library track (this auto-enqueues all analyses).
  const created = await cyaniteGraphql(
    `mutation CreateTrack($input: LibraryTrackCreateInput!) {
       libraryTrackCreate(input: $input) {
         __typename
         ... on LibraryTrackCreateSuccess { createdLibraryTrack { id } }
         ... on LibraryTrackCreateError { code message }
       }
     }`,
    { input: { uploadId, title: `${preview.artistName || artist} - ${preview.trackName || title}`.slice(0, 150) } }
  );
  const cr = created && created.libraryTrackCreate;
  if (!cr || cr.__typename !== "LibraryTrackCreateSuccess") {
    throw new Error(cr && cr.message ? cr.message : "Cyanite track creation failed");
  }
  const trackId = cr.createdLibraryTrack.id;

  // 5. Poll until the AudioAnalysisV7 result is ready.
  const resultQuery =
    `query Analysis($id: ID!) {
       libraryTrack(id: $id) {
         __typename
         ... on LibraryTrack {
           audioAnalysisV7 {
             __typename
             ... on AudioAnalysisV7Finished {
               result {
                 moodTags
                 genreTags
                 subgenreTags
                 energyLevel
                 valence
                 bpmPrediction { value }
                 keyPrediction { value }
               }
             }
           }
         }
       }
     }`;

  let result = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const data = await cyaniteGraphql(resultQuery, { id: trackId });
    const lt   = data && data.libraryTrack;
    const aa   = lt && lt.audioAnalysisV7;
    if (!aa) continue;
    if (aa.__typename === "AudioAnalysisV7Finished") { result = aa.result; break; }
    if (aa.__typename === "AudioAnalysisV7Failed")   throw new Error("Cyanite analysis failed");
  }
  if (!result) throw new Error("Cyanite analysis timed out");

  const vibe = {
    status:    "live",
    source:    "Cyanite.ai AI music analysis",
    track:     preview.trackName  || title,
    artist:    preview.artistName || artist,
    moods:     (result.moodTags     || []).slice(0, 4).map(prettyTag),
    genres:    (result.genreTags    || []).slice(0, 3).map(prettyTag),
    subgenres: (result.subgenreTags || []).slice(0, 2).map(prettyTag),
    energy:    result.energyLevel ? prettyTag(result.energyLevel) : null,
    valence:   typeof result.valence === "number" ? Math.round(result.valence * 100) : null,
    bpm:       result.bpmPrediction && result.bpmPrediction.value ? Math.round(result.bpmPrediction.value) : null,
    key:       result.keyPrediction && result.keyPrediction.value ? formatMusicalKey(result.keyPrediction.value) : null
  };

  if (vibeCache.size >= VIBE_CACHE_MAX) vibeCache.delete(vibeCache.keys().next().value);
  vibeCache.set(cacheKey, vibe);
  return vibe;
}

/**
 * Reports Cyanite availability for the episode payload. The actual
 * per-track analysis is produced on demand via the /api/track-analysis
 * endpoint; this just surfaces the service status pill.
 */
async function describeMusicAnalysis() {
  const live = Boolean(process.env.CYANITE_API_KEY);
  return {
    source:    live ? "Cyanite.ai live AI music analysis" : "Cyanite.ai demo fallback",
    status:    live ? "live" : "demo",
    available: live
  };
}

module.exports = {
  getArtistProfile,
  fetchUpcomingConcert,
  fetchLyricsInsights,
  fetchSongstatsTopTracks,
  extractInstrumentalHooks,
  extractHookBed,
  prepareVoiceNarration,
  synthesizeNarration,
  analyzeTrackVibe,
  describeMusicAnalysis
};
