(function () {
  "use strict";

  const { createElement: h, useCallback, useEffect, useMemo, useRef, useState } = React;
  const root = ReactDOM.createRoot(document.getElementById("root"));

  /* ─── Constants ──────────────────────────────────────── */
  const VIBES = [
    { value: "radio-dj",  label: "📻 Radio DJ"  },
    { value: "cinematic", label: "🎬 Cinematic" },
    { value: "bestie",    label: "🤝 Bestie"    }
  ];
  const WAVEFORM_BARS = 28;

  /* ─── Helpers ────────────────────────────────────────── */
  function formatShowDate(dateISO) {
    return new Intl.DateTimeFormat("en", {
      weekday: "short", month: "short", day: "numeric"
    }).format(new Date(dateISO));
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function cssGradient(palette) {
    if (!palette || palette.length === 0) return "#38d9c0";
    return `linear-gradient(135deg, ${palette.join(", ")})`;
  }

  /* ─── useHypeAudio ───────────────────────────────────── */
  function useHypeAudio(episode) {
    const [playing,       setPlaying]       = useState(false);
    const [paused,        setPaused]        = useState(false);
    const [progress,      setProgress]      = useState(0);
    const [speed,         setSpeedState]    = useState(1.0);
    const [activeChapter, setActiveChapter] = useState(-1);

    const audioRef       = useRef(null);
    const utteranceRef   = useRef(null);
    const narrationRef    = useRef(null);   // ElevenLabs HTMLAudioElement
    const narrationUrlRef = useRef(null);   // object URL to revoke
    const timerRef       = useRef(null);
    const startedAtRef   = useRef(0);
    const pausedAtRef    = useRef(0);
    const speedRef       = useRef(1.0);

    speedRef.current = speed;

    // Elapsed/duration come from the ElevenLabs audio element when present,
    // otherwise from the wall-clock estimate used by Web Speech narration.
    function currentDuration() {
      const n = narrationRef.current;
      if (n && n.duration && isFinite(n.duration) && n.duration > 0) return n.duration;
      return episode ? episode.estimatedDurationSeconds : 300;
    }
    function currentElapsed() {
      if (narrationRef.current) return narrationRef.current.currentTime;
      return (Date.now() - startedAtRef.current) / 1000;
    }
    function clearNarration() {
      if (narrationRef.current) {
        try { narrationRef.current.pause(); } catch (_) {}
        narrationRef.current.onended = null;
        narrationRef.current.onerror = null;
        narrationRef.current = null;
      }
      if (narrationUrlRef.current) {
        URL.revokeObjectURL(narrationUrlRef.current);
        narrationUrlRef.current = null;
      }
    }

    function stopBacking() {
      if (!audioRef.current) return;
      const { context, gain, nodes } = audioRef.current;
      nodes.forEach(n => { try { if (n.stop) n.stop(); } catch (_) {} });
      gain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      audioRef.current = null;
    }

    function startBacking() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !episode) return;
      const ctx    = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.016;
      master.connect(ctx.destination);

      const delay = ctx.createDelay(0.3);
      delay.delayTime.value = 0.08;
      const fbGain = ctx.createGain();
      fbGain.gain.value = 0.2;
      delay.connect(fbGain);
      fbGain.connect(delay);
      delay.connect(master);

      const nodes = (episode.hooks || []).slice(0, 4).map((hook, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = 110 + i * 55 + (hook.bpm % 28);
        osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
        osc.frequency.value = freq;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.4 + i * 0.15;
        lfoGain.gain.value  = freq * 0.006;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        gain.gain.value = i === 0 ? 0.2 : 0.09;
        osc.connect(gain);
        gain.connect(master);
        osc.start(ctx.currentTime + i * 0.05);
        return [osc, lfo];
      }).flat();

      audioRef.current = { context: ctx, gain: master, nodes };
    }

    function resetTimer() { window.clearInterval(timerRef.current); timerRef.current = null; }

    function stop() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      clearNarration();
      stopBacking(); resetTimer();
      setPlaying(false); setPaused(false); setProgress(0); setActiveChapter(-1);
      utteranceRef.current = null; startedAtRef.current = 0; pausedAtRef.current = 0;
    }

    function updateProgress() {
      resetTimer();
      timerRef.current = window.setInterval(() => {
        const elapsed = currentElapsed();
        const pct = Math.min(100, (elapsed / currentDuration()) * 100);
        setProgress(pct);
        if (episode && episode.chapters) {
          let found = -1;
          episode.chapters.forEach((ch, idx) => {
            const [m, s] = ch.start.split(":").map(Number);
            if (elapsed >= m * 60 + s) found = idx;
          });
          setActiveChapter(found);
        }
        if (pct >= 100 && !narrationRef.current) { resetTimer(); setPlaying(false); }
      }, 250);
    }

    function startSpeech(text) {
      startBacking();
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        updateProgress(); return;
      }
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate  = speedRef.current * 1.02;
      utt.pitch = 1.08; utt.volume = 0.95;
      utt.onend = stop; utt.onerror = stop;
      utteranceRef.current = utt;
      updateProgress();
      window.speechSynthesis.speak(utt);
    }

    // Try ElevenLabs narration audio; resolves true on success, false to
    // signal the caller to fall back to browser speech synthesis.
    async function startNarrationAudio() {
      if (!episode || !episode.voice || !episode.voice.available) return false;
      try {
        const res = await fetch("/api/narration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: episode.script })
        });
        if (!res.ok) return false;
        const blob = await res.blob();
        if (!blob || blob.size === 0) return false;
        const url = URL.createObjectURL(blob);
        narrationUrlRef.current = url;
        const audio = new Audio(url);
        audio.playbackRate = speedRef.current;
        audio.onended = stop;
        audio.onerror = stop;
        narrationRef.current = audio;
        startBacking();
        updateProgress();
        await audio.play();
        return true;
      } catch (_) {
        clearNarration();
        return false;
      }
    }

    function play() {
      if (!episode) return;
      // Resume from pause
      if (playing && paused) {
        if (narrationRef.current) {
          narrationRef.current.play().catch(() => {});
          setPaused(false);
          updateProgress();
          return;
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.resume();
          setPaused(false);
          startedAtRef.current = Date.now() - pausedAtRef.current * 1000;
          updateProgress();
          return;
        }
      }
      stop();
      setPlaying(true); setPaused(false);
      startedAtRef.current = Date.now();
      // Prefer ElevenLabs narration; fall back to Web Speech.
      startNarrationAudio().then(ok => { if (!ok) startSpeech(episode.script); });
    }

    function pause() {
      if (!playing || paused) return;
      if (narrationRef.current) {
        narrationRef.current.pause();
      } else if (window.speechSynthesis) {
        window.speechSynthesis.pause();
        pausedAtRef.current = (Date.now() - startedAtRef.current) / 1000;
      }
      resetTimer();
      setPaused(true);
    }

    function setSpeed(v) {
      setSpeedState(v);
      if (narrationRef.current) narrationRef.current.playbackRate = v;
      if (utteranceRef.current && window.speechSynthesis) utteranceRef.current.rate = v * 1.02;
    }

    function jumpToChapter(i) {
      if (!episode || !episode.chapters) return;
      const ch = episode.chapters[i];
      if (!ch) return;
      const [m, s] = ch.start.split(":").map(Number);
      const targetSecs = m * 60 + s;
      setActiveChapter(i);

      // ElevenLabs audio: seek within the single rendered narration.
      if (narrationRef.current) {
        const dur = currentDuration();
        narrationRef.current.currentTime = Math.min(targetSecs, Math.max(0, dur - 0.5));
        narrationRef.current.play().catch(() => {});
        setProgress(Math.min(100, (targetSecs / dur) * 100));
        updateProgress();
        return;
      }

      startedAtRef.current = Date.now() - targetSecs * 1000;
      setProgress(Math.min(100, (targetSecs / episode.estimatedDurationSeconds) * 100));
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const partial = episode.chapters.slice(i).map(c => c.copy).join(" ... ");
        const utt = new SpeechSynthesisUtterance(partial);
        utt.rate = speedRef.current * 1.02; utt.pitch = 1.08; utt.volume = 0.95;
        utt.onend = stop; utt.onerror = stop;
        utteranceRef.current = utt;
        window.speechSynthesis.speak(utt);
      }
    }

    useEffect(() => () => stop(), []);
    return { pause, paused, play, playing, progress, speed, setSpeed, stop, activeChapter, jumpToChapter };
  }

  /* ─── LoadingOverlay ─────────────────────────────────── */
  function LoadingOverlay({ artist, fadeOut }) {
    return h("div", { className: `loading-overlay${fadeOut ? " fade-out" : ""}` },
      h("div", { className: "loading-bars" },
        ...Array.from({ length: 6 }, (_, i) => h("span", { key: i }))
      ),
      h("div", { className: "loading-artist-name" }, artist || "…"),
      h("div", { className: "loading-label" }, "Building your HypeCast")
    );
  }

  /* ─── ServicePill ────────────────────────────────────── */
  function ServicePill({ label, status, source }) {
    return h("span", { className: `service-pill ${status}`, title: source || "" },
      h("span", { className: "service-dot", "aria-hidden": true }),
      label
    );
  }

  /* ─── WaveformViz ────────────────────────────────────── */
  function WaveformViz({ active, palette }) {
    const heights = useMemo(() => Array.from({ length: WAVEFORM_BARS }, () => Math.max(15, Math.floor(Math.random() * 85))), []);
    const color = palette && palette.length ? palette[0] : "#38d9c0";
    return h("div", { className: `waveform-viz${active ? " active" : ""}` },
      heights.map((hh, i) =>
        h("div", {
          key: i, className: "wave-bar",
          style: {
            height: `${active ? Math.max(12, Math.floor(Math.random() * hh + 8)) : Math.max(4, hh * 0.2)}%`,
            background: active ? color : undefined,
            animationDelay: `${(i * 0.03).toFixed(3)}s`
          }
        })
      )
    );
  }

  /* ─── TriviaTicker ───────────────────────────────────── */
  function TriviaTicker({ themes, playing }) {
    const [idx, setIdx] = useState(0);
    const trivias = useMemo(() => (themes || []).map(t => t.trivia).filter(Boolean), [themes]);
    useEffect(() => {
      if (!playing || trivias.length === 0) return;
      const id = window.setInterval(() => setIdx(n => (n + 1) % trivias.length), 7000);
      return () => window.clearInterval(id);
    }, [playing, trivias.length]);
    if (trivias.length === 0) return null;
    return h("div", { className: "trivia-ticker" },
      h("span", { className: "trivia-icon" }, "💡"),
      h("p",    { className: "trivia-text", key: idx }, trivias[idx])
    );
  }

  /* ─── GeneratorForm ──────────────────────────────────── */
  function GeneratorForm({ form, loading, onChange, onSubmit }) {
    return h("form", { className: "generator", onSubmit, id: "hypecast-form" },
      h("div", { className: "brand-lockup" },
        h("span", { className: "brand-mark", "aria-hidden": true }, "HC"),
        h("div", null,
          h("p", { className: "eyebrow" }, "Live Music Prep"),
          h("h1", null, "HypeCast")
        )
      ),
      h("label", { htmlFor: "input-city" },
        h("span", null, "🏙 City"),
        h("input", { id: "input-city", name: "city", value: form.city, onChange, placeholder: "Nairobi", autoComplete: "address-level2", required: true })
      ),
      h("label", { htmlFor: "input-artist" },
        h("span", null, "🎤 Artist"),
        h("input", { id: "input-artist", name: "artist", value: form.artist, onChange, placeholder: "Bien", autoComplete: "off", required: true })
      ),
      h("div", { className: "field-group" },
        h("span", null, "🎙 Vibe"),
        h("div", { className: "segmented", role: "radiogroup", "aria-label": "Voice style" },
          VIBES.map(v => h("button", {
            key: v.value, type: "button", id: `vibe-${v.value}`,
            className: form.vibe === v.value ? "active" : "",
            "aria-pressed": form.vibe === v.value,
            onClick: () => onChange({ target: { name: "vibe", value: v.value } })
          }, v.label))
        )
      ),
      h("button", { className: "primary-action", type: "submit", id: "generate-btn", disabled: loading },
        loading ? "✨ Building…" : "🎧 Generate HypeCast"
      ),
      h("p", { className: "form-hint" }, "Try: Beyoncé · Coldplay · Taylor Swift · The Weeknd · Billie Eilish · SZA · Dua Lipa · Kendrick Lamar")
    );
  }

  /* ─── EmptyPlayer ────────────────────────────────────── */
  function EmptyPlayer() {
    return h("section", { className: "player empty-state", "aria-label": "HypeCast player" },
      h("div", { className: "record" }, h("span", null)),
      h("p", null, "Enter a city and artist to build your episode.")
    );
  }

  /* ─── EpisodePlayer  (SLIM — no lyrics here) ─────────── */
  function EpisodePlayer({ episode }) {
    const audio = useHypeAudio(episode);
    const [copied, setCopied] = useState(false);

    const serviceEntries = [
      ["JamBase",    episode.services.jambase],
      ["Songstats",  episode.services.songstats],
      ["Musixmatch", episode.services.musixmatch],
      ["LALAL.AI",   episode.services.lalal],
      ["ElevenLabs", episode.services.elevenlabs]
    ].filter(([, svc]) => svc);

    const moodGradient = useMemo(() => cssGradient(episode.palette), [episode.palette]);
    const elapsedSecs  = useMemo(
      () => Math.round((audio.progress / 100) * episode.estimatedDurationSeconds),
      [audio.progress, episode.estimatedDurationSeconds]
    );

    function copyScript() {
      navigator.clipboard.writeText(episode.script).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2500);
      });
    }

    return h("section", { className: "player", "aria-label": "HypeCast player" },

      // Header
      h("div", { className: "player-top" },
        h("div", null,
          h("p", { className: "eyebrow" }, episode.tourName),
          h("h2", null,
            `${episode.artist} in ${episode.city}`,
            h("span", { className: "confidence-badge" }, `${Math.round(episode.show.confidence * 100)}% confidence`)
          ),
          h("p", { className: "show-line" },
            `${formatShowDate(episode.show.dateISO)} · ${episode.show.venue} · Doors ${episode.show.doors}`
          )
        ),
        h("div", { className: "duration-badge" }, "5:00")
      ),

      // Palette strip
      h("div", { className: "mood-board", style: { backgroundImage: moodGradient } }),

      // Service pills
      h("div", { className: "service-row" },
        serviceEntries.map(([label, svc]) => h(ServicePill, { key: label, label, status: svc.status, source: svc.source }))
      ),

      // Trivia (only while playing)
      h(TriviaTicker, { themes: episode.themes, playing: audio.playing }),

      // Waveform
      h(WaveformViz, { active: audio.playing && !audio.paused, palette: episode.palette }),

      // Transport
      h("div", { className: "transport" },
        h("button", { type: "button", className: "play-btn", id: "play-btn", onClick: audio.play },
          audio.playing && !audio.paused ? "⏸ Pause" : audio.paused ? "▶ Resume" : "▶ Play"
        ),
        h("button", { type: "button", id: "stop-btn", onClick: audio.stop, disabled: !audio.playing }, "⏹ Stop"),
        h("button", { type: "button", id: "replay-btn", onClick: () => { audio.stop(); setTimeout(audio.play, 120); }, disabled: audio.playing }, "↺ Replay")
      ),

      // Speed
      h("div", { className: "speed-control" },
        h("label", { htmlFor: "speed-range" },
          "Speed",
          h("input", {
            id: "speed-range", type: "range", min: 0.5, max: 2.0, step: 0.1,
            value: audio.speed,
            onChange: e => audio.setSpeed(parseFloat(e.target.value))
          }),
          h("span", { className: "speed-value" }, `${audio.speed.toFixed(1)}×`)
        )
      ),

      // Progress
      h("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
        h("div", { className: "progress-track", style: { flex: 1, margin: 0 }, "aria-label": "Playback progress" },
          h("span", { style: { width: `${audio.progress}%` } })
        ),
        h("span", { style: { fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", fontWeight: 700 } },
          `${formatTime(elapsedSecs)} / 5:00`
        )
      ),

      // Run of Show (chapters only — clean, single column)
      h("div", null,
        h("h3", null, "Run Of Show"),
        episode.chapters.map((ch, i) =>
          h("article", {
            key: ch.title,
            className: `chapter${audio.activeChapter === i ? " active-chapter" : ""}`,
            onClick: () => { if (!audio.playing) audio.play(); audio.jumpToChapter(i); },
            title: "Click to jump here"
          },
            h("time", null, ch.start),
            h("div", null, h("h4", null, ch.title), h("p", null, ch.copy))
          )
        )
      ),

      // Copy script
      h("div", { style: { marginTop: 18, textAlign: "right" } },
        h("button", { type: "button", className: `copy-btn${copied ? " copied" : ""}`, id: "copy-script-btn", onClick: copyScript },
          copied ? "✅ Copied!" : "📋 Copy Script"
        )
      )
    );
  }

  /* ─── PreviewPlayer ──────────────────────────────── */
  function PreviewPlayer({ preview, color, trackTitle }) {
    const [state,    setState]    = useState("idle");   // idle | loading | playing | paused | ended
    const [progress, setProgress] = useState(0);        // 0–100
    const [elapsed,  setElapsed]  = useState(0);        // seconds
    const audioRef   = useRef(null);
    const timerRef   = useRef(null);

    if (!preview || !preview.url) return null;

    const durationSec = (preview.durationMs || 30000) / 1000;

    function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }

    function startTimer() {
      clearTimer();
      timerRef.current = setInterval(() => {
        const el = audioRef.current;
        if (!el) return;
        const e = el.currentTime;
        const d = el.duration || durationSec;
        setElapsed(Math.floor(e));
        setProgress(Math.min(100, (e / d) * 100));
      }, 200);
    }

    function handlePlay() {
      if (!audioRef.current) {
        const a = new Audio(preview.url);
        a.crossOrigin = "anonymous";
        audioRef.current = a;
        a.addEventListener("ended",  () => { clearTimer(); setState("ended");  setProgress(100); });
        a.addEventListener("error",  () => { clearTimer(); setState("idle"); });
        a.addEventListener("playing",() => { setState("playing"); startTimer(); });
        a.addEventListener("waiting",() => setState("loading"));
        a.addEventListener("canplay",() => { if (state === "loading") setState("playing"); });
      }

      if (state === "playing") {
        audioRef.current.pause();
        clearTimer();
        setState("paused");
      } else if (state === "paused") {
        audioRef.current.play();
        setState("loading");
        startTimer();
      } else {
        // idle / ended — start fresh
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        setState("loading");
        setProgress(0);
        setElapsed(0);
        audioRef.current.play().catch(() => setState("idle"));
      }
    }

    // Clean up on unmount
    useEffect(() => () => {
      clearTimer();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    }, []);

    const isPlaying = state === "playing";
    const isLoading = state === "loading";
    const bars      = 14;

    return h("div", { className: `preview-player${isPlaying ? " playing" : ""}`, style: { "--pp-color": color } },

      // Artwork
      preview.artwork && h("img", {
        src: preview.artwork, alt: `${trackTitle} artwork`,
        className: "pp-artwork"
      }),

      // Main content
      h("div", { className: "pp-body" },

        // Artist + track from iTunes (confirms it's the right match)
        h("div", { className: "pp-meta" },
          h("span", { className: "pp-track" }, preview.trackName  || trackTitle),
          h("span", { className: "pp-artist" }, preview.artistName || ""),
          h("span", { className: "pp-itunes-badge" }, "🎵 iTunes Preview")
        ),

        // Mini waveform bars (animated while playing)
        h("div", { className: "pp-wave" },
          Array.from({ length: bars }, (_, i) =>
            h("div", {
              key: i,
              className: `pp-bar${isPlaying ? " active" : ""}`,
              style: { animationDelay: `${(i * 0.06).toFixed(2)}s`, background: color }
            })
          )
        ),

        // Progress bar
        h("div", { className: "pp-progress-track" },
          h("div", { className: "pp-progress-fill", style: { width: `${progress}%`, background: color } })
        ),

        // Time
        h("div", { className: "pp-time" },
          h("span", null, `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`),
          h("span", null, `${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, "0")}`)
        )
      ),

      // Play / Pause button
      h("button", {
        type: "button",
        className: "pp-play-btn",
        style: { background: color },
        onClick: handlePlay,
        "aria-label": isPlaying ? "Pause preview" : "Play preview"
      },
        isLoading ? h("span", { className: "pp-spinner" }) :
        isPlaying  ? "⏸️" : "▶️"
      )
    );
  }

  /* ─── LyricCard  (one per track, full-width) ───────── */
  function LyricCard({ track, index, palette, onDrill }) {
    const [view, setView] = useState(track.chorus ? "chorus" : "none"); // none | chorus | full
    const color = palette ? palette[index % palette.length] : "#38d9c0";
    const isLive = track.lyricsSource && track.lyricsSource !== "unavailable" && track.lyricsSource !== "error";
    const hasLyrics = Boolean(track.chorus || track.fullLyrics);

    const displayedLyrics =
      view === "full"   ? track.fullLyrics :
      view === "chorus" ? track.chorus     : null;

    return h("div", { className: "lyric-card", style: { "--card-accent": color } },

      // iTunes preview player — REAL artist voice, at the top of each card
      h(PreviewPlayer, { preview: track.preview, color, trackTitle: track.title }),

      // Card header row
      h("div", { className: "lyric-card-header" },
        h("div", { className: "lyric-card-meta" },
          h("span", { className: "lyric-track-number", style: { background: color } }, `${index + 1}`),
          h("div", null,
            h("h3", { className: "lyric-track-title" }, track.title),
            h("p",  { className: "lyric-track-theme" },  track.theme)
          )
        ),
        h("div", { className: "lyric-card-actions" },
          hasLyrics && h("button", {
            type: "button", className: `lyric-view-btn${view === "chorus" ? " active" : ""}`,
            style: view === "chorus" ? { borderColor: color, color } : {},
            onClick: () => setView(v => v === "chorus" ? "none" : "chorus")
          }, view === "chorus" ? "▲ Chorus" : "▼ Chorus"),
          hasLyrics && h("button", {
            type: "button", className: `lyric-view-btn${view === "full" ? " active" : ""}`,
            style: view === "full" ? { borderColor: color, color } : {},
            onClick: () => setView(v => v === "full" ? "none" : "full")
          }, view === "full" ? "▲ Full Lyrics" : "▼ Full Lyrics"),
          h("button", {
            type: "button", className: "lyric-drill-btn",
            style: { background: color },
            id: `drill-${index}`,
            onClick: () => onDrill(track)
          }, "🎵 Drill")
        )
      ),

      // Chorus cue bar
      h("div", { className: "lyric-cue-bar", style: { borderLeftColor: color } },
        h("span", { className: "lyric-cue-label" }, "Cue"),
        h("span", { className: "lyric-cue-text" }, track.cue)
      ),

      // Energy meter + source badge
      h("div", { className: "lyric-meta-row" },
        h("div", { className: "lyric-energy-wrap" },
          h("span", { className: "lyric-energy-label" }, "Energy"),
          h("div",  { className: "lyric-energy-bar" },
            h("div", { className: "lyric-energy-fill", style: { width: `${track.weight}%`, background: color } })
          ),
          h("span", { className: "lyric-energy-val" }, `${track.weight}`)
        ),
        isLive && h("span", { className: "lyrics-source-badge" }, `📍 ${track.lyricsSource}`),
        track.chartPosition && h("span", { className: "lyrics-source-badge" }, `📈 #${track.chartPosition} Spotify`),
        !track.chartPosition && track.streamsLabel && h("span", { className: "lyrics-source-badge" }, `▶ ${track.streamsLabel} streams`)
      ),

      // Lyrics display
      displayedLyrics && h("div", { className: "lyric-body" },
        h("div", { className: "lyric-body-inner" },
          h("pre", { className: "lyric-text" }, displayedLyrics)
        ),
        track.lyricsCopyright && h("p", { className: "lyric-copyright" }, track.lyricsCopyright)
      ),

      // No lyrics notice
      !hasLyrics && h("p", { className: "lyric-unavailable" }, "Lyrics not yet indexed for this track."),

      // Trivia callout
      track.trivia && h("p", { className: "lyric-trivia" },
        h("span", { className: "lyric-trivia-icon" }, "💡"),
        track.trivia
      )
    );
  }

  /* ─── LyricsSection (dedicated full-width area) ──────── */
  function LyricsSection({ episode }) {
    if (!episode) return null;

    function playCue(track) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(`${track.title}. ${track.cue}`);
      utt.rate = 1.06; utt.pitch = 1.12;
      window.speechSynthesis.speak(utt);
    }

    const lyricsFound = episode.themes.filter(t => t.chorus || t.fullLyrics).length;

    return h("section", { className: "lyrics-section" },

      // Section header
      h("div", { className: "lyrics-section-header" },
        h("div", null,
          h("p", { className: "eyebrow" }, "Tonight's Setlist"),
          h("h2", { className: "lyrics-section-title" },
            `${episode.artist} · ${episode.city}`
          ),
          h("p", { className: "lyrics-section-sub" },
            `${episode.show.venue} · ${formatShowDate(episode.show.dateISO)} · Doors ${episode.show.doors}`
          )
        ),
        h("div", { className: "lyrics-header-badges" },
          episode.songstats && episode.songstats.drivesSetlist && h("span", { className: "lyrics-found-badge trending" },
            "🔥 Live top tracks via Songstats"
          ),
          lyricsFound > 0 && h("span", { className: "lyrics-found-badge" },
            `${lyricsFound}/${episode.themes.length} lyrics fetched`
          )
        )
      ),

      // Card grid
      h("div", { className: "lyrics-card-grid" },
        episode.themes.map((track, i) =>
          h(LyricCard, {
            key: track.title,
            track,
            index:  i,
            palette: episode.palette,
            onDrill: playCue
          })
        )
      )
    );
  }

  /* ─── ScriptPanel ────────────────────────────────────── */
  function ScriptPanel({ episode }) {
    const [copied, setCopied] = useState(false);
    if (!episode) return null;
    function copyScript() {
      navigator.clipboard.writeText(episode.script).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2500);
      });
    }
    return h("section", { className: "script-panel" },
      h("div", { className: "section-heading" },
        h("h2", null, "Generated Script"),
        h("div", { className: "script-actions" },
          h("span", null, `${episode.voice.estimatedWords} words`),
          h("button", { type: "button", className: `copy-btn${copied ? " copied" : ""}`, id: "copy-script-bottom", onClick: copyScript },
            copied ? "✅ Copied!" : "📋 Copy"
          )
        )
      ),
      h("pre", null, episode.script)
    );
  }

  /* ─── AppFooter ──────────────────────────────────────── */
  function AppFooter() {
    return h("footer", { className: "app-footer" },
      h("span", null, "Powered by"),
      ["JamBase", "Songstats", "Musixmatch", "LALAL.AI", "ElevenLabs"].map(t =>
        h("span", { key: t, className: "tech-tag" }, t)
      ),
      h("span", null, "· HypeCast © 2026")
    );
  }

  /* ─── App ────────────────────────────────────────────── */
  function App() {
    const [form, setForm] = useState({ city: "Los Angeles", artist: "Beyoncé", vibe: "radio-dj" });
    const [episode,    setEpisode]    = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState("");
    const [showLoader, setShowLoader] = useState(false);
    const [loaderFade, setLoaderFade] = useState(false);

    const bgStyle = useMemo(() => ({
      backgroundImage:
        "linear-gradient(90deg, rgba(12,14,17,0.97), rgba(12,14,17,0.78), rgba(12,14,17,0.42)), url('/assets/hypecast-stage.png')"
    }), []);

    function onChange(e) { setForm(cur => ({ ...cur, [e.target.name]: e.target.value })); }

    async function onSubmit(e) {
      e.preventDefault();
      setLoading(true); setError(""); setShowLoader(true); setLoaderFade(false);
      try {
        const res = await fetch("/api/hypecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Unable to generate HypeCast.");
        await new Promise(r => setTimeout(r, 500));
        setLoaderFade(true);
        await new Promise(r => setTimeout(r, 450));
        setShowLoader(false);
        setEpisode(payload);
      } catch (err) {
        setShowLoader(false); setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => { onSubmit({ preventDefault() {} }); }, []);

    return h("main", null,
      showLoader && h(LoadingOverlay, { artist: form.artist, fadeOut: loaderFade }),

      // Hero (form + player)
      h("section", { className: "hero-shell", style: bgStyle },
        h("div", { className: "hero-inner" },
          h(GeneratorForm, { form, loading, onChange, onSubmit }),
          episode && !showLoader
            ? h(EpisodePlayer, { episode })
            : (!showLoader ? h(EmptyPlayer, null) : null)
        )
      ),

      // Error
      error ? h("div", { className: "error-banner", role: "alert" }, "⚠ " + error) : null,

      // ── DEDICATED LYRICS SECTION ──
      !showLoader && h(LyricsSection, { episode }),

      // Script
      !showLoader && h(ScriptPanel, { episode }),

      h(AppFooter, null)
    );
  }

  root.render(h(App));
})();
