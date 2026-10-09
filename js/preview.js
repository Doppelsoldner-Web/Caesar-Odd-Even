/* =========================================================================
   PREVIEW LAYER: live letter tiles, drag-to-set shifts, share-by-link.
   The tiles only READ the inputs; they never change shifts, lengths or
   messages. Cipher math is reused (processLetter / splitWords / parseSizes).
   ========================================================================= */
(() => {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const MAX_TILES = 360;
  const isAlpha = (c) => (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
  const reduced = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* A shift counts only if it is a whole number 0-25; anything else is "unset". */
  const shiftOf = (el) => {
    const v = el.value.trim();
    return /^\d{1,2}$/.test(v) && +v <= 25 ? +v : null;
  };
  const vis = (ch) => (/[\ud800-\udfff]/.test(ch) ? "·" : ch);
  /* Same strong ease-out token the CSS uses (--ease-out), read once for WAAPI. */
  const EASE_OUT =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-out")
      .trim() || "cubic-bezier(0.23, 1, 0.32, 1)";

  /* One word -> tiles. Same odd/even rule as customCipher/customDecipher. */
  function tileWord(word, odd, even, reverse, limit) {
    const out = [];
    let n = 0;
    for (let k = 0; k < word.length && out.length < limit; k++) {
      const ch = word[k];
      if (!isAlpha(ch)) {
        out.push({ src: ch, dst: ch, kind: "plain" });
        continue;
      }
      n++;
      const isOdd = n % 2 !== 0;
      const sh = isOdd ? odd : even;
      out.push({
        src: ch,
        dst: processLetter(ch, sh ?? 0, reverse),
        kind: isOdd ? "odd" : "even",
        unset: sh === null,
      });
    }
    return out;
  }
  /* Builds rows lazily so huge inputs never create more than MAX_TILES tiles. */
  function collect(words, make) {
    const rows = [];
    let used = 0,
      total = 0;
    words.forEach((w, i) => {
      total += w.length;
      if (used < MAX_TILES) {
        const t = make(w, i, MAX_TILES - used);
        rows.push(t);
        used += t.length;
      }
    });
    return { rows, more: Math.max(0, total - used) };
  }

  function encModel() {
    const keep = $("encKeepSpecial").checked;
    const words = splitWords($("encPhrase").value, keep);
    const odd = $$(".enc-odd"),
      even = $$(".enc-even");
    if (!words.length || !odd.length)
      return { hint: "Configure shifts to watch every letter move." };
    if (odd.length !== words.length || encConfigSig !== sigOf(words, keep))
      return {
        hint: "Phrase changed. Click Configure shifts to refresh the preview.",
      };
    return collect(words, (w, i, lim) =>
      tileWord(w, shiftOf(odd[i]), shiftOf(even[i]), false, lim),
    );
  }
  function decModel() {
    const sizes = parseSizes($("decSizes").value);
    const odd = $$(".dec-odd"),
      even = $$(".dec-even");
    if (!sizes || !odd.length)
      return { hint: "Configure shifts to preview the decoding." };
    if (odd.length !== sizes.length || decConfigSig !== sizes.join(","))
      return {
        hint: "Lengths changed. Click Configure shifts to refresh the preview.",
      };
    /* Same normalisation the Decode button applies: all whitespace removed. */
    const msg = $("decMessage").value.replace(/\s+/g, "");
    const total = sizes.reduce((a, b) => a + b, 0);
    if (msg.length !== total)
      return {
        hint: `The message has ${msg.length} characters, but the lengths add up to ${total}.`,
      };
    let max = 0;
    sizes.forEach((v) => (max = Math.max(max, v)));
    if (max * sizes.length > 2e6)
      return { hint: "Too large to preview. Decoding still works." };
    const words = sizes.map(() => "");
    let cur = 0;
    for (let pos = 0; pos < max; pos++)
      for (let i = 0; i < sizes.length; i++)
        if (pos < sizes[i]) words[i] += msg[cur++];
    return collect(words, (w, i, lim) =>
      tileWord(w, shiftOf(odd[i]), shiftOf(even[i]), true, lim),
    );
  }

  const mk = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };
  function flip(list) {
    if (reduced() || list.length > 60) return;
    list.forEach((b) => {
      b.getAnimations().forEach((a) => a.cancel());
      b.animate(
        [
          { transform: "rotateX(90deg)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 220, easing: EASE_OUT },
      );
    });
  }
  /* First appearance of the preview: rows rise in with a short, capped stagger
     (opacity only under reduced motion). */
  function enterRows(rows) {
    const calm = reduced();
    rows.forEach((r, i) =>
      r.animate(
        calm
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: calm ? 150 : 260,
          delay: calm ? 0 : Math.min(i, 8) * 35,
          easing: calm ? "ease" : EASE_OUT,
          fill: "backwards",
        },
      ),
    );
  }
  function render(side) {
    const m = side === "enc" ? encModel() : decModel();
    const box = $(side + "Tiles"),
      hint = $(side + "TilesHint");
    if (!m.rows) {
      box.replaceChildren();
      box.dataset.sig = "";
      box.hidden = true;
      hint.textContent = m.hint;
      hint.hidden = false;
      return;
    }
    const wasHidden = box.hidden;
    box.hidden = false;
    hint.hidden = true;
    const sig =
      m.rows.map((r) => r.map((t) => t.kind[0] + t.src).join("")).join("|") +
      "#" + m.more;
    if (box.dataset.sig === sig) {
      const bs = box.querySelectorAll("b"),
        changed = [];
      m.rows.flat().forEach((t, k) => {
        const txt = vis(t.dst);
        if (bs[k].textContent !== txt) {
          bs[k].textContent = txt;
          changed.push(bs[k]);
        }
        bs[k].parentNode.classList.toggle("unset", !!t.unset);
      });
      flip(changed);
      return;
    }
    const frag = document.createDocumentFragment();
    m.rows.forEach((tiles, wi) => {
      const row = mk("div", "tile-word");
      const num = mk("span", "tile-num");
      num.textContent = wi + 1;
      row.append(num);
      tiles.forEach((t) => {
        const tile = mk(
          "span",
          "tile " + t.kind + (t.unset ? " unset" : ""),
        );
        const i = mk("i"),
          b = mk("b");
        i.textContent = vis(t.src);
        b.textContent = vis(t.dst);
        tile.append(i, b);
        row.append(tile);
      });
      frag.append(row);
    });
    if (m.more) {
      const more = mk("p", "tiles-more");
      more.textContent = `+${m.more} more letters`;
      frag.append(more);
    }
    box.replaceChildren(frag);
    box.dataset.sig = sig;
    if (wasHidden) enterRows([...box.children]);
  }
  function syncScrubs() {
    $$(".scrub").forEach((s) => {
      const inp = s.parentNode.querySelector("input");
      const v = inp ? shiftOf(inp) : null;
      s.style.setProperty("--p", (v ?? 0) / 25);
      s.classList.toggle("unset", v === null);
    });
  }
  /* Keep --tabs-h in sync with the sticky tab bar so the right pane never hides under it. */
  const tabsEl = document.querySelector(".tabs");
  const syncTabsH = () =>
    document.documentElement.style.setProperty(
      "--tabs-h",
      Math.round(tabsEl.getBoundingClientRect().height) + "px",
    );
  syncTabsH();
  if (window.ResizeObserver) new ResizeObserver(syncTabsH).observe(tabsEl);
  else addEventListener("resize", syncTabsH);

  let pending = false;
  function refresh() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render("enc");
      render("dec");
      syncScrubs();
    });
  }
  window.refreshPreview = refresh;

  /* Everything that can change a value goes through input/change/click/mutations. */
  ["input", "change"].forEach((ev) =>
    document.addEventListener(ev, refresh, true),
  );
  document.addEventListener("click", (e) => {
    refresh();
    if (e.target.closest && e.target.closest("#decPasteAllBtn"))
      [150, 600].forEach((t) => setTimeout(refresh, t));
  });
  [
    "encShiftsContainer",
    "decShiftsContainer",
    "decAlert",
    "encAlert",
  ].forEach((id) =>
    new MutationObserver(refresh).observe($(id), {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    }),
  );

  /* ---- drag-to-set: a thin track under every shift field ---- */
  function decorate(root) {
    root
      .querySelectorAll(".shift-field:not([data-scrub])")
      .forEach((f) => {
        f.dataset.scrub = "1";
        const s = mk("span", "scrub");
        s.setAttribute("aria-hidden", "true");
        s.append(mk("i"));
        f.append(s);
      });
  }
  function startScrub(e, s) {
    const input = s.parentNode.querySelector("input");
    if (!input || e.button !== 0) return;
    const STEP = 6; /* px of travel per shift step */
    let x0 = e.clientX;
    const v0 = shiftOf(input) ?? 0;
    try {
      s.setPointerCapture(e.pointerId);
    } catch {
      return; /* pointer already gone: nothing to drag */
    }
    s.classList.add("dragging");
    e.preventDefault();
    const move = (ev) => {
      let raw = v0 + (ev.clientX - x0) / STEP;
      /* Re-anchor at the limits so reversing direction responds at once. */
      if (raw > 25) {
        x0 = ev.clientX - (25 - v0) * STEP;
        raw = 25;
      } else if (raw < 0) {
        x0 = ev.clientX + v0 * STEP;
        raw = 0;
      }
      const v = String(Math.round(raw));
      if (input.value !== v) {
        input.value = v;
        const evt = new Event("input", { bubbles: true });
        evt.fromScrub = true; /* skip the auto-advance-to-next-field rule */
        input.dispatchEvent(evt);
      }
    };
    const end = () => {
      s.classList.remove("dragging");
      ["pointermove", "pointerup", "pointercancel", "lostpointercapture"].forEach(
        (t) => s.removeEventListener(t, t === "pointermove" ? move : end),
      );
    };
    s.addEventListener("pointermove", move);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) =>
      s.addEventListener(t, end),
    );
  }
  ["encShiftsContainer", "decShiftsContainer"].forEach((id) => {
    const c = $(id);
    decorate(c);
    new MutationObserver(() => decorate(c)).observe(c, { childList: true });
    c.addEventListener("pointerdown", (e) => {
      const s = e.target.closest(".scrub");
      if (s) startScrub(e, s);
    });
    /* The track sits inside a <label>; stop a click from focusing the input. */
    c.addEventListener("click", (e) => {
      if (e.target.closest(".scrub")) e.preventDefault();
    });
  });

  /* ---- share by link (works without clipboard access) ---- */
  const MAX_HASH = 200000;
  const baseUrl = () => location.href.split("#")[0];
  function buildLink(msg, lengths, shiftsText, withShifts) {
    const p = new URLSearchParams();
    /* Interleaving can split an emoji's UTF-16 halves; those cannot survive URL/UTF-8
       encoding, so such messages travel as hex code units ("x") instead of text ("m"). */
    try {
      encodeURIComponent(msg);
      p.set("m", msg);
    } catch {
      p.set(
        "x",
        msg
          .split("")
          .map((c) => c.charCodeAt(0).toString(16).padStart(4, "0"))
          .join(""),
      );
    }
    p.set(
      "l",
      lengths
        .split(",")
        .map((x) => x.trim())
        .join("-"),
    );
    if (withShifts) {
      const pairs = [...shiftsText.matchAll(/\[(\d+),\s*(\d+)\]/g)];
      p.set("s", pairs.map((m) => m[1] + "." + m[2]).join("-"));
    }
    return baseUrl() + "#" + p.toString();
  }
  $("encLinkBtn").addEventListener("click", async (e) => {
    const msg = $("encResult").textContent;
    if (!msg) return;
    const link = buildLink(
      msg,
      $("encSizes").textContent,
      $("encShiftsResult").textContent,
      $("encLinkShifts").checked,
    );
    const f = $("encLinkField");
    if (link.length > MAX_HASH) {
      f.hidden = true;
      f.value = "";
      return showAlert(
        $("encAlert"),
        "error",
        "The result is too long for a link. Use Copy All Data instead.",
      );
    }
    f.value = link;
    f.hidden = false;
    /* A link only works if the page itself has a real address (opened as a file or hosted). */
    if (!/^(https?|file):/i.test(location.href)) {
      f.focus();
      f.select();
      return showAlert(
        $("encAlert"),
        "error",
        "This preview has no real address, so the link won't open. Open index.html in a browser (or host it) and copy the link again.",
      );
    }
    let ok = false;
    try {
      ok = await copyToClipboard(link, e.currentTarget);
    } catch {}
    if (!ok) {
      f.focus();
      f.select();
    }
  });

  function importHash() {
    const raw = location.hash.slice(1);
    if (!raw || raw.length > MAX_HASH) return;
    const p = new URLSearchParams(raw);
    if (!["m", "x", "l", "s"].some((k) => p.has(k))) return;
    let rawMsg = p.get("m") || "";
    const hex = p.get("x");
    const badX = hex !== null && !/^(?:[0-9a-fA-F]{4})+$/.test(hex);
    if (hex !== null)
      rawMsg = badX
        ? ""
        : hex
            .match(/.{4}/g)
            .map((q) => String.fromCharCode(parseInt(q, 16)))
            .join("");
    const msg = rawMsg.replace(/[\u0000-\u001f\u007f\s]/g, "");
    let sizes = parseSizes((p.get("l") || "").replace(/-/g, ","));
    const tooMany = !!sizes && sizes.length > 1000;
    if (tooMany) sizes = null; /* same path as invalid lengths */
    let pairs = null;
    if (sizes && p.has("s")) {
      const t = p.get("s").split("-");
      const ok =
        t.length === sizes.length &&
        t.every((x) => /^\d{1,2}\.\d{1,2}$/.test(x) && x.split(".").every((n) => +n <= 25));
      pairs = ok ? t.map((x) => x.split(".").map(Number)) : false;
    }
    $("decMessage").value = msg;
    $("decSizes").value = sizes ? sizes.join(", ") : (p.get("l") || "").slice(0, 200);
    $("tab-decode").click();
    const alertEl = $("decAlert");
    if (!sizes) {
      showAlert(
        alertEl,
        "error",
        tooMany
          ? "The link has too many words (limit: 1000)."
          : "The link has missing or invalid word lengths.",
        $("decSizes"),
      );
    } else {
      pendingDecShifts = pairs || null;
      $("decConfigBtn").click();
      pendingDecShifts = null;
      if (pairs) {
        applyDecoderShifts(pairs, false);
        applyDecoderShiftsLater(pairs);
        showAlert(alertEl, "success", "Link loaded. Press Decode.");
      } else if (pairs === false) {
        showAlert(alertEl, "error", "The link's shifts are invalid, so they were ignored. Fill them in manually.");
      } else {
        showAlert(alertEl, "success", "Link loaded. Fill in the shifts to decode.");
      }
    }
    if (badX)
      showAlert(alertEl, "error", "The link's message data is invalid.", $("decMessage"));
    history.replaceState(null, "", baseUrl());
    refresh();
  }
  $("historyCloseBtn").addEventListener("click", () => {
    if ($("historyBox").classList.contains("show")) $("historyBtn").click();
    $("historyBtn").focus();
  });
  const bp = matchMedia("(min-width: 1000px)");
  const pauseAnim = () => {
    document.documentElement.classList.add("no-bp-anim");
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.documentElement.classList.remove("no-bp-anim"),
      ),
    );
  };
  if (bp.addEventListener) bp.addEventListener("change", pauseAnim);
  else if (bp.addListener) bp.addListener(pauseAnim);
  addEventListener("hashchange", importHash);
  importHash();
  refresh();
})();
