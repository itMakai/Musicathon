(function () {
  const { createElement: h, useEffect, useMemo, useRef, useState } = React;
  const root = ReactDOM.createRoot(document.getElementById("root"));

  const VIBES = [
    { value: "radio-dj", label: "Radio DJ" },
    { value: "cinematic", label: "Cinematic" },
    { value: "bestie", label: "Bestie" }
  ];

  function formatShowDate(dateISO) {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(new Date(dateISO));
  }

  function ServicePill({ label, status }) {
    return h(
      "span",
      { className: `service-pill ${status}` },
      h("span", { className: "service-dot", "aria-hidden": true }),
      label
    );
  }

  function Meter({ value, color }) {
    return h(
      "div",
      { className: "meter", "aria-label": `${value} percent singalong weight` },
      h("span", {
        style: {
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: color
        }
      })
    );
  }

  function useHypeAudio(episode) {
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);
    const utteranceRef = useRef(null);
    const timerRef = useRef(null);
    const startedAtRef = useRef(0);

    function stopBacking() {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.nodes.forEach((node) => {
        try {
          if (typeof node.stop === "function") {
            node.stop();
          }
        } catch (error) {
          // Oscillators can only be stopped once.
        }
      });
      audioRef.current.gain.gain.setTargetAtTime(0, audioRef.current.context.currentTime, 0.05);
      audioRef.current = null;
    }

    function startBacking() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext || !episode) {
        return;
      }

      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.025;
      master.connect(context.destination);

      const nodes = episode.hooks.slice(0, 3).map((hook, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const base = 110 + index * 47 + (hook.bpm % 32);
        oscillator.type = hook.pattern === "pulse" ? "sawtooth" : "triangle";
        oscillator.frequency.value = base;
        gain.gain.value = index === 0 ? 0.18 : 0.09;
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(context.currentTime + index * 0.04);
        return oscillator;
      });

      audioRef.current = { context, gain: master, nodes };
    }

    function resetTimer() {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    function stop() {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopBacking();
      resetTimer();
      setPlaying(false);
      setPaused(false);
      setProgress(0);
      utteranceRef.current = null;
    }

    function play() {
      if (!episode) {
        return;
      }

      if (playing && paused && window.speechSynthesis) {
        window.speechSynthesis.resume();
        setPaused(false);
        return;
      }

      stop();
      setPlaying(true);
      setPaused(false);
      startedAtRef.current = Date.now();
      startBacking();

      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        timerRef.current = window.setInterval(() => {
          const elapsed = (Date.now() - startedAtRef.current) / 1000;
          setProgress(Math.min(100, (elapsed / 45) * 100));
        }, 300);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(episode.script);
      utterance.rate = 1.02;
      utterance.pitch = 1.08;
      utterance.volume = 0.95;
      utterance.onend = stop;
      utterance.onerror = stop;
      utteranceRef.current = utterance;

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000;
        setProgress(Math.min(100, (elapsed / episode.estimatedDurationSeconds) * 100));
      }, 500);

      window.speechSynthesis.speak(utterance);
    }

    function pause() {
      if (!playing || paused) {
        return;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setPaused(true);
    }

    useEffect(() => stop, []);

    return { pause, paused, play, playing, progress, stop };
  }

  function GeneratorForm({ form, loading, onChange, onSubmit }) {
    return h(
      "form",
      { className: "generator", onSubmit },
      h(
        "div",
        { className: "brand-lockup" },
        h("span", { className: "brand-mark", "aria-hidden": true }, "HC"),
        h("div", null, h("p", { className: "eyebrow" }, "Live Music Prep"), h("h1", null, "HypeCast"))
      ),
      h(
        "label",
        null,
        h("span", null, "City"),
        h("input", {
          name: "city",
          value: form.city,
          onChange,
          placeholder: "Austin",
          autoComplete: "address-level2"
        })
      ),
      h(
        "label",
        null,
        h("span", null, "Favorite artist"),
        h("input", {
          name: "artist",
          value: form.artist,
          onChange,
          placeholder: "Coldplay",
          autoComplete: "off"
        })
      ),
      h(
        "div",
        { className: "field-group" },
        h("span", null, "Voice"),
        h(
          "div",
          { className: "segmented", role: "radiogroup", "aria-label": "Voice style" },
          VIBES.map((vibe) =>
            h(
              "button",
              {
                key: vibe.value,
                type: "button",
                className: form.vibe === vibe.value ? "active" : "",
                onClick: () => onChange({ target: { name: "vibe", value: vibe.value } })
              },
              vibe.label
            )
          )
        )
      ),
      h(
        "button",
        { className: "primary-action", type: "submit", disabled: loading },
        loading ? "Generating..." : "Generate HypeCast"
      )
    );
  }

  function EmptyPlayer() {
    return h(
      "section",
      { className: "player empty-state", "aria-label": "HypeCast player" },
      h("div", { className: "record" }, h("span", null)),
      h("p", null, "Choose a city and artist to build the episode.")
    );
  }

  function EpisodePlayer({ episode }) {
    const audio = useHypeAudio(episode);
    const serviceEntries = [
      ["JamBase", episode.services.jambase],
      ["Musixmatch", episode.services.musixmatch],
      ["LALAL.AI", episode.services.lalal],
      ["ElevenLabs", episode.services.elevenlabs]
    ];

    function playCue(track) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return;
      }
      window.speechSynthesis.cancel();
      const cue = new SpeechSynthesisUtterance(`${track.title}. ${track.cue}`);
      cue.rate = 1.05;
      cue.pitch = 1.1;
      window.speechSynthesis.speak(cue);
    }

    return h(
      "section",
      { className: "player", "aria-label": "HypeCast player" },
      h(
        "div",
        { className: "player-top" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, episode.tourName),
          h("h2", null, `${episode.artist} in ${episode.city}`),
          h("p", { className: "show-line" }, `${formatShowDate(episode.show.dateISO)} · ${episode.show.venue} · ${episode.show.doors}`)
        ),
        h("div", { className: "duration-badge" }, "5:00")
      ),
      h(
        "div",
        { className: "service-row" },
        serviceEntries.map(([label, service]) => h(ServicePill, { key: label, label, status: service.status }))
      ),
      h(
        "div",
        { className: "transport" },
        h("button", { type: "button", onClick: audio.play }, audio.playing && audio.paused ? "Resume" : "Play"),
        h("button", { type: "button", onClick: audio.pause, disabled: !audio.playing || audio.paused }, "Pause"),
        h("button", { type: "button", onClick: audio.stop, disabled: !audio.playing }, "Stop")
      ),
      h(
        "div",
        { className: "progress-track", "aria-label": "Playback progress" },
        h("span", { style: { width: `${audio.progress}%` } })
      ),
      h(
        "div",
        { className: "episode-grid" },
        h(
          "div",
          { className: "chapter-list" },
          h("h3", null, "Run Of Show"),
          episode.chapters.map((chapter) =>
            h(
              "article",
              { key: chapter.title, className: "chapter" },
              h("time", null, chapter.start),
              h("div", null, h("h4", null, chapter.title), h("p", null, chapter.copy))
            )
          )
        ),
        h(
          "div",
          { className: "setlist-panel" },
          h("h3", null, "Chorus Cues"),
          episode.themes.map((track, index) =>
            h(
              "article",
              { key: track.title, className: "track-card" },
              h(
                "div",
                { className: "track-heading" },
                h("strong", null, track.title),
                h("button", { type: "button", onClick: () => playCue(track) }, "Drill")
              ),
              h("p", null, track.theme),
              h(Meter, { value: track.weight, color: episode.palette[index % episode.palette.length] }),
              h("small", null, track.cue)
            )
          )
        )
      )
    );
  }

  function ScriptPanel({ episode }) {
    if (!episode) {
      return null;
    }

    return h(
      "section",
      { className: "script-panel" },
      h("div", { className: "section-heading" }, h("h2", null, "Generated Script"), h("span", null, `${episode.voice.estimatedWords} words`)),
      h("pre", null, episode.script)
    );
  }

  function App() {
    const [form, setForm] = useState({ city: "Austin", artist: "Coldplay", vibe: "radio-dj" });
    const [episode, setEpisode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const backgroundStyle = useMemo(
      () => ({
        backgroundImage: "linear-gradient(90deg, rgba(17, 19, 21, 0.96), rgba(17, 19, 21, 0.72), rgba(17, 19, 21, 0.38)), url('/assets/hypecast-stage.png')"
      }),
      []
    );

    function onChange(event) {
      setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    async function onSubmit(event) {
      event.preventDefault();
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/hypecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to generate HypeCast.");
        }
        setEpisode(payload);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      onSubmit({ preventDefault() {} });
    }, []);

    return h(
      "main",
      null,
      h(
        "section",
        { className: "hero-shell", style: backgroundStyle },
        h(
          "div",
          { className: "hero-inner" },
          h(GeneratorForm, { form, loading, onChange, onSubmit }),
          episode ? h(EpisodePlayer, { episode }) : h(EmptyPlayer, null)
        )
      ),
      error ? h("div", { className: "error-banner", role: "alert" }, error) : null,
      h(ScriptPanel, { episode })
    );
  }

  root.render(h(App));
})();
