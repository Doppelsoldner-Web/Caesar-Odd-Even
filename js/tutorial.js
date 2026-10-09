/* =========================================================================
   TUTORIAL TABS ("How do I use this?")
   Fully isolated from the encoder / decoder tabs:
   - it only looks at .tutorial-* elements and data-tutorial-tab,
   - it never reads or toggles .tab-btn, .panel or .active,
   - everything lives inside this IIFE, so it creates no globals.
   Motion rules (SKILL.md): a mouse press switches instantly and animates,
   keyboard changes are instant (no motion on keyboard-driven actions), and
   reduced motion keeps only a short fade.
   ========================================================================= */
(() => {
  const root = document.getElementById("tutorial");
  if (!root) return;

  const bar = root.querySelector(".tutorial-tabs");
  const tabs = [...root.querySelectorAll(".tutorial-tab-btn")];
  const faces = [...root.querySelectorAll(".tutorial-tab-face")];
  const windowEl = root.querySelector(".tutorial-tabs-active");
  const stage = root.querySelector(".tutorial-panels");
  const panelOf = (tab) =>
    document.getElementById("tutorial-panel-" + tab.dataset.tutorialTab);
  const reduced = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Same strong ease-out token the CSS uses (--ease-out), read once for WAAPI. */
  const EASE_OUT =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-out")
      .trim() || "cubic-bezier(0.23, 1, 0.32, 1)";

  let current = Math.max(
    0,
    tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"),
  );
  let tween = null; // the running height animation, if any

  /* Clips the "selected" copy of the tab list to the selected tab.
     Measured on the copy's own faces: they never carry the press scale,
     and getBoundingClientRect keeps sub-pixel widths. */
  function placeWindow(snap) {
    const box = windowEl.getBoundingClientRect();
    if (!box.width) return;
    const f = faces[current].getBoundingClientRect();
    const left = (f.left - box.left).toFixed(2);
    const right = (box.right - f.right).toFixed(2);
    if (snap) windowEl.style.transition = "none";
    windowEl.style.clipPath = `inset(0 ${right}px 0 ${left}px)`;
    if (snap) {
      void windowEl.offsetWidth; // commit the new clip before transitions come back
      windowEl.style.transition = "";
    }
  }

  /* Switches tab. animate = false for the keyboard and for reduced motion. */
  function select(next, animate) {
    if (next === current) return;
    const motion = animate && !reduced();

    /* Start the height tween from what is on screen right now, even mid-tween. */
    const from = stage.getBoundingClientRect().height;
    if (tween) {
      const old = tween;
      tween = null;
      old.cancel();
    }
    stage.classList.remove("is-resizing");

    panelOf(tabs[current]).hidden = true;
    panelOf(tabs[next]).hidden = false;
    tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", String(i === next));
      t.tabIndex = i === next ? 0 : -1;
    });
    current = next;
    placeWindow(!motion);

    if (!motion) return;
    /* The panels differ a lot in height; tween the box so the footer glides instead of jumping. */
    const to = stage.getBoundingClientRect().height;
    if (Math.abs(to - from) < 2) return;
    stage.classList.add("is-resizing");
    const anim = stage.animate(
      [{ height: from + "px" }, { height: to + "px" }],
      { duration: 200, easing: EASE_OUT },
    );
    tween = anim;
    anim.onfinish = anim.oncancel = () => {
      if (tween !== anim) return;
      tween = null;
      stage.classList.remove("is-resizing");
    };
  }

  tabs.forEach((tab, i) => {
    /* A mouse acts on press, not on release (instant response). */
    tab.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button === 0) select(i, true);
    });
    /* Touch, pen and keyboard act on click. detail === 0 means Enter / Space (no motion). */
    tab.addEventListener("click", (e) => select(i, e.detail !== 0));
  });

  /* Roving tabindex: arrows, Home and End move focus and select (automatic activation). */
  bar.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const last = tabs.length - 1;
    const target = {
      ArrowRight: i === last ? 0 : i + 1,
      ArrowLeft: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    tabs[target].focus();
    select(target, false);
  });

  /* Keep the window glued to the tab when the layout or the font changes. */
  const resync = () => placeWindow(true);
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(resync);
    ro.observe(bar);
    faces.forEach((f) => ro.observe(f));
  } else {
    addEventListener("resize", resync);
  }
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(resync);
  resync();

  /* Entrance transitions arm only after the first paint, so the visible
     panel does not replay on load. */
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.setAttribute("data-ready", "")),
  );
})();
