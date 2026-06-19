(function () {
  "use strict";

  const slides = Array.from(document.querySelectorAll(".slide"));
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const currentEl = document.getElementById("current");
  const totalEl = document.getElementById("total");
  const progressEl = document.getElementById("progress");

  let index = 0;
  const last = slides.length - 1;

  totalEl.textContent = String(slides.length);

  function render() {
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
      slide.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    currentEl.textContent = String(index + 1);
    progressEl.style.width = `${((index + 1) / slides.length) * 100}%`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === last;
  }

  function go(to) {
    index = Math.max(0, Math.min(last, to));
    render();
  }

  prevBtn.addEventListener("click", () => go(index - 1));
  nextBtn.addEventListener("click", () => go(index + 1));

  // ── PDF EXPORT ─────────────────────────────────────────
  // Render every slide to a fixed 16:9 canvas and assemble a one-slide-per-page
  // PDF with the dark theme + gradients baked in, so the output never depends on
  // the browser's print settings (paper size, background graphics, scaling).
  const downloadBtn = document.getElementById("download");
  const overlay = document.getElementById("export-overlay");
  const overlaySub = document.getElementById("export-sub");

  // Fixed 16:9 render surface. Slides use vw/vh-based clamp() sizing, so we pin
  // the capture viewport to these dims to get identical layout across browsers.
  const PAGE_W = 1280;
  const PAGE_H = 720;

  function librariesReady() {
    return (
      typeof window.html2canvas === "function" &&
      window.jspdf &&
      typeof window.jspdf.jsPDF === "function"
    );
  }

  function showOverlay(text) {
    if (!overlay) return;
    if (text && overlaySub) overlaySub.textContent = text;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function readCssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  }

  // Split a comma-separated CSS list at the top level only (commas inside
  // rgb()/rgba()/hsl() parentheses are preserved).
  function splitTopLevel(str) {
    const parts = [];
    let depth = 0;
    let cur = "";
    for (const ch of str) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  // Convert a CSS gradient direction keyword (e.g. "to bottom right") to the
  // equivalent angle in degrees (0deg points up, matching CSS conventions).
  function directionToAngle(dir) {
    const d = dir.replace(/^to\s+/, "").trim();
    const map = {
      top: 0,
      "top right": 45,
      "right top": 45,
      right: 90,
      "bottom right": 135,
      "right bottom": 135,
      bottom: 180,
      "bottom left": 225,
      "left bottom": 225,
      left: 270,
      "top left": 315,
      "left top": 315,
    };
    return map[d] != null ? map[d] : 135;
  }

  // Parse a computed `linear-gradient(...)` string into an angle (degrees) and
  // an ordered list of { color, pos } stops (pos in 0..1, or null if implicit).
  function parseLinearGradient(bg) {
    if (!bg) return null;
    const m = bg.match(/linear-gradient\(([\s\S]*)\)/i);
    if (!m) return null;
    const parts = splitTopLevel(m[1]);
    if (!parts.length) return null;

    let angleDeg = 180; // CSS default direction is "to bottom".
    let startIdx = 0;
    const first = parts[0];
    if (/^to\s/i.test(first)) {
      angleDeg = directionToAngle(first);
      startIdx = 1;
    } else if (/deg\s*$/i.test(first)) {
      const a = parseFloat(first);
      if (isFinite(a)) angleDeg = a;
      startIdx = 1;
    }

    const stops = [];
    for (let i = startIdx; i < parts.length; i++) {
      const colorMatch = parts[i].match(
        /(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]+|[a-zA-Z]+)/
      );
      if (!colorMatch) continue;
      const posMatch = parts[i].match(/(-?[\d.]+)%/);
      stops.push({
        color: colorMatch[1],
        pos: posMatch ? parseFloat(posMatch[1]) / 100 : null,
      });
    }
    if (stops.length < 2) return null;

    // Resolve implicit stop positions per the CSS spec: ends default to 0/1 and
    // gaps are distributed evenly between defined positions.
    if (stops[0].pos == null) stops[0].pos = 0;
    if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = 1;
    let lastDefined = 0;
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].pos != null) {
        const gap = i - lastDefined;
        for (let j = lastDefined + 1; j < i; j++) {
          stops[j].pos =
            stops[lastDefined].pos +
            ((stops[i].pos - stops[lastDefined].pos) * (j - lastDefined)) / gap;
        }
        lastDefined = i;
      }
    }
    // Clamp into 0..1 and keep monotonically non-decreasing for the canvas API.
    let prev = 0;
    for (const s of stops) {
      s.pos = Math.min(1, Math.max(0, Math.max(prev, s.pos)));
      prev = s.pos;
    }
    return { angleDeg, stops };
  }

  // Build the .title-word gradient as a CanvasGradient mapped across the text's
  // bounding box. The gradient is derived from the element's computed
  // `background-image` (the single source of truth in deck.css) so any change to
  // the angle, stops, or colors there flows straight into the exported PDF.
  function makeTitleGradient(ctx, backgroundImage, w, h) {
    const parsed = parseLinearGradient(backgroundImage);
    const angleDeg = parsed ? parsed.angleDeg : 135;
    const a = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createLinearGradient(
      cx - (dx * len) / 2,
      cy - (dy * len) / 2,
      cx + (dx * len) / 2,
      cy + (dy * len) / 2
    );
    if (parsed) {
      for (const s of parsed.stops) g.addColorStop(s.pos, s.color);
    } else {
      // Fallback only if the computed gradient couldn't be parsed.
      g.addColorStop(0.25, readCssVar("--text-primary", "#f0ece4"));
      g.addColorStop(0.65, readCssVar("--accent-gold", "#f5c842"));
      g.addColorStop(1, readCssVar("--accent-pink", "#f04e7a"));
    }
    return g;
  }

  // Rasterize gradient text to a PNG data URL. html2canvas can't render a
  // background-clip:text gradient, so we paint it ourselves and substitute an
  // <img> during capture, preserving the on-screen brand gradient in the PDF.
  const TITLE_RENDER_SCALE = 2;
  function buildGradientTextImage(text, font) {
    try {
      const fontStr = `${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
      const measureCtx = document.createElement("canvas").getContext("2d");
      if (!measureCtx) return null;
      measureCtx.font = fontStr;
      if ("letterSpacing" in measureCtx) {
        measureCtx.letterSpacing = `${font.letterSpacing}px`;
      }
      const m = measureCtx.measureText(text);
      const ascent = m.actualBoundingBoxAscent || font.fontSize * 0.8;
      const descent = m.actualBoundingBoxDescent || font.fontSize * 0.25;
      const padX = font.fontSize * 0.14;
      const padY = font.fontSize * 0.1;
      const logicalW = Math.ceil(m.width + padX * 2);
      const logicalH = Math.ceil(ascent + descent + padY * 2);

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(logicalW * TITLE_RENDER_SCALE);
      canvas.height = Math.ceil(logicalH * TITLE_RENDER_SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.scale(TITLE_RENDER_SCALE, TITLE_RENDER_SCALE);
      ctx.font = fontStr;
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = `${font.letterSpacing}px`;
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = makeTitleGradient(ctx, font.backgroundImage, logicalW, logicalH);
      ctx.fillText(text, padX, padY + ascent);

      return { dataUrl: canvas.toDataURL("image/png"), width: logicalW, height: logicalH };
    } catch (err) {
      console.warn("Gradient title rasterization failed:", err);
      return null;
    }
  }

  // Make a single slide visible + freeze motion inside the cloned document that
  // html2canvas renders, without disturbing the live deck the user is viewing.
  function prepareClone(clonedDoc, slideIndex) {
    const clonedSlides = clonedDoc.querySelectorAll(".slide");
    clonedSlides.forEach((slide, i) => {
      if (i === slideIndex) {
        slide.classList.add("is-active");
        slide.style.opacity = "1";
        slide.style.visibility = "visible";
        slide.style.transform = "none";
        slide.style.display = "flex";
      } else {
        slide.style.display = "none";
      }
    });

    const style = clonedDoc.createElement("style");
    style.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important;}" +
      ".hud,.progress-rail,.export-overlay{display:none!important;}";
    clonedDoc.head.appendChild(style);

    // html2canvas can't rasterize background-clip:text gradients, which would
    // leave the title invisible. Paint the gradient ourselves and swap in an
    // <img> so the PDF keeps the on-screen cream→gold→pink title gradient.
    const cloneWin = clonedDoc.defaultView || window;
    clonedDoc.querySelectorAll(".title-word").forEach((el) => {
      const cs = cloneWin.getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize) || 144;
      let letterSpacing = parseFloat(cs.letterSpacing);
      if (!isFinite(letterSpacing)) letterSpacing = -0.03 * fontSize;
      const title = buildGradientTextImage(el.textContent || "", {
        fontSize,
        fontWeight: cs.fontWeight || "800",
        fontFamily: cs.fontFamily || '"Space Grotesk", "Inter", sans-serif',
        letterSpacing,
        backgroundImage: cs.backgroundImage,
      });

      el.style.background = "none";
      if (title) {
        el.textContent = "";
        el.style.webkitTextFillColor = "initial";
        el.style.lineHeight = "0";
        const img = clonedDoc.createElement("img");
        img.src = title.dataUrl;
        img.width = title.width;
        img.height = title.height;
        img.style.display = "block";
        el.appendChild(img);
      } else {
        // Fallback: solid on-brand fill if rasterization is unavailable.
        el.style.webkitTextFillColor = "#f5c842";
        el.style.color = "#f5c842";
      }
    });
  }

  async function renderSlide(slideIndex) {
    const target = slides[slideIndex];
    return window.html2canvas(target, {
      width: PAGE_W,
      height: PAGE_H,
      windowWidth: PAGE_W,
      windowHeight: PAGE_H,
      scale: 2,
      useCORS: true,
      backgroundColor: "#0c0e11",
      onclone: (clonedDoc) => prepareClone(clonedDoc, slideIndex),
    });
  }

  async function exportPdf() {
    if (!librariesReady()) {
      // Graceful fallback: the browser's print-to-PDF still works.
      window.print();
      return;
    }

    downloadBtn.disabled = true;
    showOverlay("Rendering slides");

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await nextFrame();

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [PAGE_W, PAGE_H],
        compress: true,
      });

      for (let i = 0; i < slides.length; i++) {
        if (overlaySub) {
          overlaySub.textContent = `Rendering slide ${i + 1} of ${slides.length}`;
        }
        await nextFrame();

        const canvas = await renderSlide(i);
        const img = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "landscape");
        pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
      }

      pdf.save("HypeCast-Pitch-Deck.pdf");
    } catch (err) {
      console.error("PDF export failed, falling back to print():", err);
      window.print();
    } finally {
      hideOverlay();
      downloadBtn.disabled = false;
    }
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", exportPdf);
  }

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        e.preventDefault();
        go(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        go(index - 1);
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(last);
        break;
    }
  });

  let touchX = null;
  document.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  render();
})();
