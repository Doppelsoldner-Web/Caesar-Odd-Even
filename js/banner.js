/* =========================================================================
   BANNER TITLE + BACKGROUND VIDEOS (v1.16.0): GFVDYNO -> WELCOME
   GFVDYNO is "WELCOME" encoded with this site's own cipher (shift 10 on odd letters, shift 1 on even
   letters), so the banner decodes itself: every letter rolls backward through the alphabet like an
   odometer, the odd ones ten steps and the even ones one step, until the word reads WELCOME.
   Click or press Enter on the title to play it again (it rolls forward, back to GFVDYNO, and so on).

   Motion rules (see the project's SKILL.md / RECIPES.md): only transform is animated, the curve is
   a custom ease-in-out because the letters travel across their own window, a tap during the roll
   re-aims the letters from where they are instead of waiting, and reduced motion swaps the word
   with a short cross-fade instead of moving it.
   ========================================================================= */
(() => {
  "use strict";

  const FROM = "GFVDYNO";
  const TO = "WELCOME";
  const A = 65; // "A"
  const EASE = "cubic-bezier(0.77, 0, 0.175, 1)"; // --ease-in-out of RECIPES.md
  const STAGGER = 70; // ms between neighbouring letters
  const FIRST_DELAY = 650; // ms the page shows GFVDYNO before it starts to decode itself

  const button = document.getElementById("bannerRoll");
  const host = button && button.querySelector(".roll");
  if (!host) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const slots = [];

  /* Build one slot per letter. A slot holds the letters from the target up to the start, in alphabet order,
     and slides so that the right one is in its window (index 0 = WELCOME's letter, last = GFVDYNO's). */
  host.textContent = "";
  for (let i = 0; i < TO.length; i++) {
    const to = TO.charCodeAt(i) - A;
    const from = FROM.charCodeAt(i) - A;
    const steps = (from - to + 26) % 26;

    const slot = document.createElement("span");
    slot.className = "slot";
    slot.setAttribute("aria-hidden", "true");
    const strip = document.createElement("span");
    strip.className = "strip";
    for (let k = 0; k <= steps; k++) {
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.textContent = String.fromCharCode(A + ((to + k) % 26));
      strip.appendChild(ch);
    }
    slot.appendChild(strip);
    host.appendChild(slot);
    slots.push({ strip, steps });
  }

  const offset = (steps, atFrom) => (atFrom ? -steps * 1.1 : 0); // em; the letter box is 1.1em tall
  const at = (steps, atFrom) => `translateY(${offset(steps, atFrom)}em)`;

  let atFrom = true; // true: the title reads GFVDYNO
  slots.forEach((s) => (s.strip.style.transform = at(s.steps, true)));
  host.classList.add("is-ready");

  let running = [];
  function settle() {
    running.forEach((a) => {
      try {
        a.commitStyles(); // keeps the letters where they are, so a new roll starts from there
      } catch (e) {}
      a.cancel();
    });
    running = [];
  }

  function roll(toFrom) {
    settle();
    atFrom = toFrom;

    if (reduceMotion.matches) {
      // A cross-fade of the whole word: no letter travels.
      host
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" })
        .finished.then(() => {
          slots.forEach((s) => (s.strip.style.transform = at(s.steps, toFrom)));
          return host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out", fill: "forwards" })
            .finished;
        })
        .then(() => host.getAnimations().forEach((a) => a.cancel()))
        .catch(() => {});
      return;
    }

    slots.forEach((s, i) => {
      if (!s.steps) return; // same letter in both words: nothing to roll
      const anim = s.strip.animate(
        { transform: at(s.steps, toFrom) },
        { duration: 620 + s.steps * 62, delay: i * STAGGER, easing: EASE, fill: "forwards" },
      );
      running.push(anim);
      anim.finished
        .then(() => {
          if (!running.includes(anim)) return;
          s.strip.style.transform = at(s.steps, toFrom);
          anim.cancel();
          running = running.filter((a) => a !== anim);
        })
        .catch(() => {}); // cancelled by a newer roll
    });
  }

  button.addEventListener("click", () => roll(!atFrom));

  /* First play: after the font is in (the letters would jump if the font swapped mid-roll) and
     while the tab is visible. */
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    const go = () => setTimeout(() => roll(false), FIRST_DELAY);
    if (document.hidden) {
      const onShow = () => {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", onShow);
        go();
      };
      document.addEventListener("visibilitychange", onShow);
    } else go();
  });
})();

/* =========================================================================
   BACKGROUND VIDEOS (day and night)
   Two fixed <video> elements sit behind the page: #bgVideo (light theme) and #bgVideoNight (dark theme).
   Only the one that matches the theme is loaded and played; the other waits with preload="none" until the
   theme changes. CSS cross-fades the two (opacity only), and this script then pauses the one that is
   hidden, so it costs no battery.

   Motion and data rules: with "reduce motion" on, or with Data Saver on, nothing plays and the still
   poster stays (reduced motion still loads the first frame of the video that shows); a tap on the theme
   button never waits for a video, because the poster is already on screen while it loads.
   ========================================================================= */
(() => {
  "use strict";
  const root = document.documentElement;
  const videos = { light: document.getElementById("bgVideo"), dark: document.getElementById("bgVideoNight") };
  if (!videos.light && !videos.dark) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = () => !!(conn && conn.saveData);
  const FADE_MS = 900; // keep in step with the opacity transition in glass.css

  const themeNow = () => (root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  let hideTimer = 0;

  function show(video) {
    if (!video) return;
    if (saveData()) return; // poster only
    if (reduce.matches) {
      // first frame only: load the video, do not play it
      if (video.preload !== "auto") video.preload = "auto";
      video.pause();
      return;
    }
    if (video.preload !== "auto") video.preload = "auto";
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
  }

  function sync() {
    const now = themeNow();
    const other = now === "dark" ? "light" : "dark";
    show(videos[now]);
    clearTimeout(hideTimer);
    // Pause the other one only after it has faded out.
    hideTimer = setTimeout(() => {
      if (themeNow() !== other && videos[other]) videos[other].pause();
    }, reduce.matches ? 0 : FADE_MS);
  }

  sync();
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  if (reduce.addEventListener) reduce.addEventListener("change", sync);
  if (conn && conn.addEventListener) conn.addEventListener("change", sync);
})();
