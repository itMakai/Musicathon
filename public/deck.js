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

  // Build the .title-word gradient (mirrors deck.css: 135deg cream→gold→pink)
  // as a CanvasGradient mapped across the text's bounding box.
  function makeTitleGradient(ctx, angleDeg, w, h) {
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
    g.addColorStop(0.25, "#f0ece4");
    g.addColorStop(0.65, readCssVar("--accent-gold", "#f5c842"));
    g.addColorStop(1, readCssVar("--accent-pink", "#f04e7a"));
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
      ctx.fillStyle = makeTitleGradient(ctx, 135, logicalW, logicalH);
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
