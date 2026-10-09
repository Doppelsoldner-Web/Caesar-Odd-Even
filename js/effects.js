/* =========================================================================
   ANIMATION LAYER + UX ENHANCEMENTS (Advanced Animation Layer)
   This script is wrapped in an IIFE (Immediately Invoked Function Expression) (() => { ... })();
   It means this complex function runs itself as soon as the page opens, and the variables
   inside it ('$', 'app') stay protected and do not "leak" and interfere with other general scripts.
   ========================================================================= */
(() => {
  // Creating shortcuts with Arrow Functions to simplify the code, the famous '$' of UI libraries.
  const $ = (id) => document.getElementById(id);
  const app = document.querySelector(".app");
  // matchMedia checks the Windows/phone settings to see whether the user chose "Reduced Motion" in the system.
  const reduced = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Pulls the final computed CSS property of the page for the transition timing
  const EASE =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--anim-ease")
      .trim() || "ease-out";
  const px = parseFloat; // Converts a pixel string ("200px") into a floating-point number.
  const heightOf = (el) => el.getBoundingClientRect().height; // Browser API that finds the exact height of a block as drawn on the screen

  /* 
     Builder function for the Web Animation API (a very powerful browser feature that needs no fixed CSS).
     el: the element, from: starting CSS state, to: ending CSS state, duration: time, done: callback (function called when it finishes).
  */
  function play(el, from, to, duration, done) {
    el.style.overflow = "hidden";
    el.style.overflow = "clip"; // Makes sure borders do not leak (used in Edge/Chrome)
    const anim = el.animate([from, to], { duration, easing: EASE });
    el._anim = anim;
    anim.onfinish = anim.oncancel = () => {
      if (el._anim !== anim) return;
      el.style.overflow = "";
      if (done) done();
    };
  }

  /* --- 1. Encoder <-> Decoder (animated tab switching) ---------------- */
  document.querySelector(".tabs").addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".tab-btn");
      const out = document.querySelector(".panel.active");
      const into = btn && $("panel-" + btn.dataset.tab);
      if (!into || into === out || reduced()) return;

      const from = heightOf(app);
      out.style.top = out.offsetTop + "px";
      out.classList.remove("is-entering");
      out.classList.add("is-leaving");
      into.classList.remove("is-leaving");
      into.style.top = "";
      into.classList.add("is-entering");

      // requestAnimationFrame makes sure the browser has rendered the previous mess before we calculate the new frame.
      requestAnimationFrame(() => {
        app.getAnimations().forEach((a) => a.cancel());
        const to = heightOf(app);
        if (Math.abs(to - from) > 1)
          play(app, { height: from + "px" }, { height: to + "px" }, 300);
      });
    },
    true,
  );
  app.addEventListener("animationend", (e) => {
    if (e.target.classList.contains("panel")) {
      e.target.classList.remove("is-entering", "is-leaving");
      e.target.style.top = "";
    }
    rowSettled(e.target);
  });
  app.addEventListener("animationcancel", (e) => rowSettled(e.target));
  function rowSettled(el) {
    if (!el.classList.contains("row-enter")) return;
    el.classList.remove("row-enter");
    el.style.removeProperty("--i");
  }

  /* --- 2 & 3. "Configure shifts": expand, collapse, regenerate -------- */
  const BLOCKS = {
    enc: [
      "encWordsInfo",
      "encLegend",
      "encStrengthContainer",
      "encFastFill",
    ],
    dec: ["decWordsInfo"],
  };
  // Collapsed state, fully at zero.
  const SHUT = {
    height: "0px",
    marginTop: "0px",
    marginBottom: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
    opacity: 0,
    transform: "translateY(-6px)",
  };
  const ROW_MS = 260,
    STAGGER_MS = 40,
    STAGGER_MAX = 8;

  const rendered = (el) => el.getClientRects().length > 0;
  const boxOf = (el) => {
    const s = getComputedStyle(el);
    return {
      height: heightOf(el) + "px",
      marginTop: s.marginTop,
      marginBottom: s.marginBottom,
      paddingTop: s.paddingTop,
      paddingBottom: s.paddingBottom,
      borderTopWidth: s.borderTopWidth,
      borderBottomWidth: s.borderBottomWidth,
      opacity: s.opacity,
      transform: s.transform,
    };
  };

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(
        "#encConfigBtn, #encClearBtn, #decConfigBtn, #decClearBtn",
      );
      if (!btn) return;
      const side = btn.id.slice(0, 3); // "enc" or "dec"
      const rows = $(side + "ShiftsContainer");
      const firstBefore = rows.firstElementChild;
      const wantFocus = e.isTrusted && btn.id.endsWith("ConfigBtn");
      const motion = !reduced();
      const snap = motion && {
        rows,
        h0: heightOf(rows),
        old: [...rows.children],
        blocks: BLOCKS[side].map((id) => {
          const el = $(id);
          return { el, from: rendered(el) ? boxOf(el) : null };
        }),
      };
      requestAnimationFrame(() => {
        const settle = snap ? animateConfig(snap) : null;
        if (
          wantFocus &&
          rows.firstElementChild &&
          rows.firstElementChild !== firstBefore
        )
          focusFirstShift(rows, settle);
      });
    },
    true, // Capture phase (the third boolean parameter says whether the event starts in the Capture phase of the DOM tree)
  );

  function animateConfig({ rows, h0, old, blocks }) {
    const plans = [];
    let rowsMs = 0;

    blocks.forEach(({ el, from }) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.classList.remove("cfg-leaving");
      if (rendered(el)) {
        const to = boxOf(el);
        if (
          !from ||
          Math.abs(px(from.height) - px(to.height)) > 0.5 ||
          from.opacity != 1
        )
          plans.push({ el, from: from || SHUT, to });
      } else if (from) {
        el.classList.add("cfg-leaving");
        plans.push({
          el,
          from,
          to: SHUT,
          done: () => el.classList.remove("cfg-leaving"),
        });
      }
    });

    rows.getAnimations().forEach((a) => a.cancel());
    if (old.length && !rows.children.length) {
      old.forEach((r) => {
        r.inert = true;
        r.classList.remove("row-enter");
        r.querySelectorAll("input").forEach((i) =>
          i.removeAttribute("class"),
        );
        rows.append(r);
      });
      plans.push({
        el: rows,
        from: { height: h0 + "px", opacity: 1 },
        to: { height: "0px", opacity: 0 },
        done: () => old.forEach((r) => r.remove()),
      });
    } else if (
      rows.children.length &&
      rows.firstElementChild !== old[0]
    ) {
      const fresh = [...rows.children];
      fresh.forEach((r, i) => {
        r.style.setProperty("--i", i);
        r.classList.add("row-enter");
      });
      rowsMs =
        ROW_MS + Math.min(fresh.length - 1, STAGGER_MAX) * STAGGER_MS;
      plans.push({
        el: rows,
        from: { height: h0 + "px" },
        to: { height: heightOf(rows) + "px" },
      });
    }

    const total = plans.reduce(
      (sum, p) => sum + Math.abs(px(p.to.height) - px(p.from.height)),
      0,
    );
    const duration = Math.round(Math.min(460, 220 + total * 0.2));
    plans.forEach((p) => play(p.el, p.from, p.to, duration, p.done));
    return Math.max(duration, rowsMs);
  }

  /* --- Smart auto-focus: focuses the first field of the word when Configure is clicked ---------------- */
  function focusFirstShift(rows, settleMs) {
    const first = rows.querySelector("input[type='number']");
    if (!first) return;
    if (settleMs == null) return first.focus();
    first.focus({ preventScroll: true }); // Focuses so the user can start typing right away
    // Waits with setTimeout for the animation to settle so the screen can be centered, if needed
    setTimeout(() => {
      if (document.activeElement !== first) return;
      const r = first.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight)
        first.scrollIntoView({ block: "center", behavior: "smooth" }); // scrollIntoView makes the browser scroll natively
    }, settleMs + 30);
  }

  /* --- Arrow-key navigation between the generated number inputs ---------------------- */
  // We use a JS Object to map shortcuts: pressing Right moves one field forward, Left one back, Down two forward and Up two back.
  const ARROW_STEP = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: 2,
    ArrowUp: -2,
  };
  ["encShiftsContainer", "decShiftsContainer"].forEach((id) => {
    const container = $(id);
    container.addEventListener("keydown", (e) => {
      const step = ARROW_STEP[e.key];
      if (!step || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
        return;
      if (!e.target.matches("input[type='number']")) return;
      e.preventDefault();
      const inputs = [
        ...container.querySelectorAll("input[type='number']"),
      ];
      const next = inputs[inputs.indexOf(e.target) + step];
      if (next) {
        next.focus();
        next.select(); // Selects everything so that future typing replaces the previous value instead of adding to the end.
      }
    });
  });

  /* --- Instant visual validation -------------------------------------- */
  const SHIFT_INPUTS = ".enc-odd, .enc-even, .dec-odd, .dec-even";
  function syncFilled(input) {
    const filled = input.value !== "" && Number(input.value) > 0;
    // toggleAttribute adds a "data-filled" attribute to the HTML element if the filled condition is true
    if (filled !== input.hasAttribute("data-filled"))
      input.toggleAttribute("data-filled", filled);
  }
  const syncAllFilled = () =>
    document.querySelectorAll(SHIFT_INPUTS).forEach(syncFilled);

  // The "input" event is fired when the user types something, in real time.
  ["encShiftsContainer", "decShiftsContainer"].forEach((id) =>
    $(id).addEventListener("input", (e) => {
      if (e.target.matches(SHIFT_INPUTS)) syncFilled(e.target);
    }),
  );

  document.addEventListener("click", syncAllFilled);

  // MutationObserver is an advanced API that "watches" for changes in the HTML tree. Here it checks whether the alert box reported success after a paste.
  new MutationObserver(syncAllFilled).observe($("decAlert"), {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  });

  /* --- Restore function ------------------------------------------- */
  // Interactive event listener mapped to the interface
  $("encResetBtn").addEventListener("click", () => {
    document
      .querySelectorAll(".enc-odd, .enc-even")
      .forEach((i) => (i.value = 0));
    evaluateStrength();
  });

  /* --- Refinement layer: tabs, popovers, stale/invalid hints, result reveal --- */
  const tabsEl = document.querySelector(".tabs");
  const tabs = [...tabsEl.querySelectorAll(".tab-btn")];
  const ind = document.createElement("span");
  ind.className = "tab-indicator";
  ind.setAttribute("aria-hidden", "true");
  tabsEl.append(ind);
  tabs.forEach((t) => {
    const p = $("panel-" + t.dataset.tab);
    t.setAttribute("aria-controls", p.id);
    p.setAttribute("aria-labelledby", t.id);
  });
  function syncTabs(snap) {
    tabs.forEach((t) => {
      const on = t.classList.contains("active");
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
    });
    const a = tabs.find((t) => t.classList.contains("active"));
    if (snap) ind.style.transition = "none";
    ind.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth})`;
    if (snap) {
      void ind.offsetWidth;
      ind.style.transition = "";
    }
  }
  syncTabs(true);
  tabsEl.addEventListener("click", () => syncTabs());
  addEventListener("resize", () => syncTabs(true));
  document.fonts && document.fonts.ready.then(() => syncTabs(true));
  tabsEl.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    const n = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    }[e.key];
    if (i < 0 || n == null) return;
    e.preventDefault();
    const t = tabs[(n + tabs.length) % tabs.length];
    t.focus();
    t.click();
  });

  /* Popovers grow from their trigger; aria-expanded + Escape for keyboard users */
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target.closest("#updateLogBtn, #historyBtn");
      if (!t) return;
      const box = $(
        t.id === "historyBtn" ? "historyBox" : "updateLogBox",
      );
      const b = box.getBoundingClientRect(),
        r = t.getBoundingClientRect();
      box.style.transformOrigin = `${r.left + r.width / 2 - b.left}px 0`;
    },
    true,
  );
  [
    ["updateLogBox", "updateLogBtn"],
    ["historyBox", "historyBtn"],
  ].forEach(([b, t]) => {
    const box = $(b),
      btn = $(t);
    new MutationObserver(() =>
      btn.setAttribute("aria-expanded", box.classList.contains("show")),
    ).observe(box, { attributes: true, attributeFilter: ["class"] });
  });
  document.addEventListener("keydown", (e) => {
    const open =
      e.key === "Escape" && document.querySelector(".floating-box.show");
    if (!open) return;
    open.classList.remove("show");
    $(open.id === "historyBox" ? "historyBtn" : "updateLogBtn").focus();
  });

  $("themeBtn").addEventListener("click", () => {
    if (!reduced())
      $("themeBtn").animate(
        [
          { transform: "rotate(-70deg) scale(.5)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: EASE },
      );
  });

  /* Shifts go stale the moment the phrase / lengths change after Configure */
  const watch = (inputs, current, saved, box, btn) => {
    const f = () => {
      const s = saved(),
        st = !!s && s !== current();
      box.classList.toggle("is-stale", st);
      btn.classList.toggle("needs-config", st);
    };
    inputs.forEach(([el, ev]) => el.addEventListener(ev, f));
    btn.addEventListener("click", f);
    $(btn.id.slice(0, 3) + "ClearBtn").addEventListener("click", f);
  };
  watch(
    [
      [encPhrase, "input"],
      [encKeepSpecial, "change"],
    ],
    () =>
      sigOf(
        splitWords(encPhrase.value, encKeepSpecial.checked),
        encKeepSpecial.checked,
      ),
    () => encConfigSig,
    $("encShiftsContainer"),
    $("encConfigBtn"),
  );
  watch(
    [[$("decSizes"), "input"]],
    () => (parseSizes($("decSizes").value) || []).join(","),
    () => decConfigSig,
    $("decShiftsContainer"),
    $("decConfigBtn"),
  );

  /* Invalid markers clear as soon as the user acts on the field */
  const unflag = (el) => {
    el.classList.remove("invalid");
    el.removeAttribute("aria-invalid");
  };
  document.addEventListener("input", (e) => {
    if (e.target.classList && e.target.classList.contains("invalid"))
      unflag(e.target);
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn.invalid");
    if (b) unflag(b);
  });

  /* Results arrive as a staggered reveal, then scroll into view if needed */
  window.revealResult = (id) => {
    const wrap = $(id);
    if (!reduced())
      [...wrap.children].forEach((c, i) =>
        c.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 300,
            delay: i * 45,
            easing: EASE,
            fill: "backwards",
          },
        ),
      );
    requestAnimationFrame(() => {
      const r = wrap.getBoundingClientRect();
      if (r.bottom > innerHeight || r.top < 0)
        wrap.scrollIntoView({
          block: "nearest",
          behavior: reduced() ? "auto" : "smooth",
        });
    });
  };
})(); // End of the Self-Executing Function (IIFE)
