/* =========================================================================
   STATE & CONFIG
   ========================================================================= */
/* 
   'let' creates a variable whose value can be changed later.
   localStorage lets us store things permanently in the browser.
   JSON.parse converts a saved JSON-formatted text back into a usable Array.
*/
/* localStorage can throw (blocked, private mode, quota): it must never break the app. */
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
let historyData = (() => {
  try {
    const v = JSON.parse(store.get("cipherHistory"));
    /* Older versions stored whole phrases: cap every field so one huge entry can never
       fill the storage quota again. Only the first characters are ever displayed. */
    return Array.isArray(v)
      ? v
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            type: String(x.type ?? "").slice(0, 20),
            input: String(x.input ?? "").slice(0, 200),
            output: String(x.output ?? "").slice(0, 200),
          }))
      : [];
  } catch {
    return [];
  }
})();

/* 'const' creates a constant whose value will not change. (Maximum number of history items) */
const MAX_HISTORY = 5;
historyData = historyData.slice(0, MAX_HISTORY);

/*
   Theme management (light, dark)
   document.getElementById looks for the element on the page that has that exact "id" set in the HTML, and saves it in the const variable.
*/
const themeBtn = document.getElementById("themeBtn");

/* Array (list) with the theme options. */
const themes = ["light", "dark"];

/*
   v1.12.0: the theme follows the system (prefers-color-scheme) until the user presses the toggle.
   Pressing it saves the choice, and from then on the saved theme wins over the system.
   The head script already applied the right theme before the first paint; this code only has to
   agree with it, so both use the same rule.
*/
const systemDark =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
/* Browser UI color (mobile address bar) for each theme: the banner. */
const THEME_COLOR = { light: "#ffffff", dark: "#000000" };
const themeMeta = document.querySelector('meta[name="theme-color"]');

function savedTheme() {
  const v = store.get("cipherTheme");
  return themes.includes(v) ? v : null; /* rejects empty or unexpected values */
}
function preferredTheme() {
  return savedTheme() || (systemDark && systemDark.matches ? "dark" : "light");
}
let currentTheme = preferredTheme();

/* DOM manipulation: sets the detected mode on the main HTML element. */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  if (themeMeta) themeMeta.setAttribute("content", THEME_COLOR[theme]);
  updateThemeIcon(theme);
}
function animateThemeChange() {
  document.documentElement.classList.add("theme-anim");
  clearTimeout(window._themeT);
  window._themeT = setTimeout(
    () => document.documentElement.classList.remove("theme-anim"),
    360,
  );
}
applyTheme(currentTheme);

/* The system switched (for example, automatic dark mode at sunset) and the user never chose: follow it. */
if (systemDark) {
  const onSystemChange = () => {
    if (savedTheme()) return;
    const next = preferredTheme();
    if (next === currentTheme) return;
    animateThemeChange();
    applyTheme(next);
  };
  if (systemDark.addEventListener)
    systemDark.addEventListener("change", onSystemChange);
  else if (systemDark.addListener) systemDark.addListener(onSystemChange);
}

/*
   Function that updates the button
   Purpose: Changes the visual text of the theme button.
   Parameters: 'theme' holds the text "light" or "dark".
*/
function updateThemeIcon(theme) {
  if (theme === "light") {
    themeBtn.textContent = "🌙";
    themeBtn.title = "Switch to dark mode";
    themeBtn.setAttribute("aria-label", themeBtn.title);
  } else {
    themeBtn.textContent = "☀️️";
    themeBtn.title = "Switch to light mode";
    themeBtn.setAttribute("aria-label", themeBtn.title);
  }
}

/* 
   THEME INTERACTION FLOW:
   1. The user clicks the Moon/Sun button.
   2. addEventListener captures the 'click' event and runs an "arrow function" (=>).
   3. The function finds the current theme in the array through its index (indexOf).
   4. Using modular arithmetic (%), it picks the next index (0 or 1).
   5. Applies the change to the HTML document by changing the "data-theme" string.
   6. The browser sees the change, triggers the [data-theme="dark"] CSS selector and updates the CSS Variables.
*/
themeBtn.addEventListener("click", () => {
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextTheme = themes[nextIndex];
  animateThemeChange();
  applyTheme(nextTheme);
  store.set("cipherTheme", nextTheme);
});

/* =========================================================================
   CIPHER LOGIC (CIPHER ALGORITHM)
   ========================================================================= */

/* 
   Name: normalizeText
   Purpose: Sanitizes (cleans) the user's text when requested.
   What it does: Removes accents using Unicode manipulation and Regex (regular expression), also stripping numbers and symbols.
*/
function normalizeText(text, keepSpecial) {
  if (keepSpecial) return text;
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "");
}

/* 
   Name: splitWords
   Purpose: Splits a whole phrase into an Array of words.
   What it does: trim() cuts empty spaces at the edges. split(/\s+/) breaks wherever it finds spaces (1 or more). filter removes accidental empty entries.
*/
function splitWords(phrase, keepSpecial) {
  return normalizeText(phrase, keepSpecial)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/*
   Name: processLetter
   Purpose: Applies the Caesar Cipher style cryptographic math to a single letter.
   What it does, step by step:
   1. Checks whether the letter is uppercase or lowercase (based on the ASCII code, where A=65 and a=97).
   2. Extracts the "original code" (e.g. A becomes 0, B becomes 1).
   3. Applies the mathematical 'shift' (positive, or negative if reverse is true).
   4. The magic of "% 26" makes the alphabet wrap around perfectly (past 'z', it goes back to 'a').
   5. String.fromCharCode turns the plain number back into a letter and returns it.
*/
function processLetter(char, shift, reverse = false) {
  const isUpper = char >= "A" && char <= "Z";
  const isLower = char >= "a" && char <= "z";
  if (!isUpper && !isLower) return char;

  const base = isUpper ? 65 : 97;
  const originalCode = char.charCodeAt(0) - base;
  const effect = reverse ? -shift : shift;
  const resultCode = (((originalCode + effect) % 26) + 26) % 26;
  return String.fromCharCode(resultCode + base);
}

/*
   MAIN LOGIC OF THE PROJECT - CIPHER WITH INDIVIDUAL SHIFTS:
   This function encrypts the whole text.
   The "shift" is the offset (how many places in the alphabet the letter moves).
   The central rule of this HTML file is to apply a shift X to the letters in Odd positions, and a shift Y to the letters in Even positions of a specific word.
*/
function customCipher(phrase, shifts, keepSpecial) {
  const words = splitWords(phrase, keepSpecial);

  // Maps over all the words. For each word, generates the ciphered word.
  const cipheredWords = words.map((word, idx) => {
    // Array destructuring: extracts the values inside the shifts array at the matching position (idx)
    const [oddShift, evenShift] = shifts[idx];
    let validLetterCount = 0;
    return word
      .split("")
      .map((char) => {
        const isLetter =
          (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
        if (isLetter) validLetterCount++;
        // Uses modulo arithmetic (%) to determine whether the current character falls on an odd validLetter index
        const isOdd = validLetterCount % 2 !== 0;
        const shiftVal = isOdd ? oddShift : evenShift;
        return processLetter(char, shiftVal);
      })
      .join(""); // Joins the letters of that word back together
  });

  // This part joins the words keeping the original spaces if desired, but
  // it interleaves them into one continuous visual block depending on the original version of the script.
  const maxLength = Math.max(...cipheredWords.map((p) => p.length));
  let result = "";
  for (let pos = 0; pos < maxLength; pos++) {
    for (const word of cipheredWords) {
      if (pos < word.length) result += word[pos];
    }
  }
  return result;
}

/*
   Decoder - Runs the gears backwards, recovering the original structure.
   It needs to know the size of each word ("Lengths") and which shifts were used, to split
   that big block of continuous text back into distinct words.
*/
function customDecipher(cipheredString, shifts, lengths) {
  // Initializes the results array with empty strings
  const cipheredWords = lengths.map(() => "");
  let cursor = 0;
  const maxLength = Math.max(...lengths);

  // Un-interleaves the letters
  for (let pos = 0; pos < maxLength; pos++) {
    for (let i = 0; i < lengths.length; i++) {
      if (pos < lengths[i]) {
        cipheredWords[i] += cipheredString[cursor];
        cursor++;
      }
    }
  }

  const originalWords = cipheredWords.map((word, idx) => {
    const [oddShift, evenShift] = shifts[idx];
    let validLetterCount = 0;
    return word
      .split("")
      .map((char) => {
        const isLetter =
          (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
        if (isLetter) validLetterCount++;
        const isOdd = validLetterCount % 2 !== 0;
        const shiftVal = isOdd ? oddShift : evenShift;
        // processLetter receives 'true' at the end to indicate reversal (-shift)
        return processLetter(char, shiftVal, true);
      })
      .join("");
  });
  return originalWords.join(" ");
}

/* =========================================================================
   HISTORY
   ========================================================================= */

/*
   Purpose: Builds the HTML code to render the user's saved history items in the little menu box.
   "innerHTML" takes a String and makes the browser treat it as if it were HTML code inserted directly into the DOM.
*/
function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  if (historyData.length === 0) {
    list.innerHTML = `<li class="history-empty">No recent operations.</li>`;
    return;
  }
  historyData.forEach((item, idx) => {
    const li = document.createElement("li"); // Creates the tag dynamically with JS
    li.className = "history-item";
    li.style.setProperty("--i", idx); // Drives the open stagger in CSS
    // Uses 'Template Literals' (backticks) to inject variables into the text dynamically using ${}.
    // '.substring' cuts the text to prevent a huge history from taking up space.
    const a = document.createElement("span"),
      s = document.createElement("strong");
    s.textContent = item.type + ":";
    a.append(s, " " + String(item.input).substring(0, 20) + "...");
    const b = document.createElement("span");
    b.style.color = "var(--muted)";
    b.textContent =
      "Res: " + String(item.output).substring(0, 20) + "...";
    li.append(a, b);
    list.appendChild(li); // Actually adds it to the page
  });
}

/* Function that pushes a new operation into the history (unshift puts it at the top of the Array). */
function addHistory(type, input, output) {
  /* Only the first characters are ever displayed, so never store more (quota-safe). */
  historyData.unshift({
    type,
    input: String(input).slice(0, 200),
    output: String(output).slice(0, 200),
  });
  if (historyData.length > MAX_HISTORY) historyData.pop(); // Removes the oldest one if the limit is exceeded
  // Converts to a String so localStorage can store it
  store.set("cipherHistory", JSON.stringify(historyData));
  renderHistory();
}
renderHistory(); // Runs the rendering as soon as the script starts for the first time.

/* =========================================================================
   UI HELPERS & COPY FUNCTIONALITY
   ========================================================================= */

/* 
   Essential protection against code injection (XSS).
   Turns symbols into 'HTML entities', so if the user tries to type code into the cipher it is shown as plain text instead of taking over the page.
*/
function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

/* CSS class manipulation to show red (error) or green (success) boxes. */
const MOTION = {
  reduced: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  ease: () =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--anim-ease")
      .trim() || "ease-out",
};
/* Marks fields invalid (visual + aria) and focuses the first one in document order. */
function flagInvalid(target) {
  const list = (Array.isArray(target) ? target : [target])
    .filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));
  list.forEach((el) => {
    el.classList.add("invalid");
    el.setAttribute("aria-invalid", "true");
    /* Short decaying shake: error feedback that is not color-only. Skipped under reduced motion. */
    if (!MOTION.reduced()) {
      if (el._shake) el._shake.cancel();
      el._shake = el.animate(
        [0, -4, 3.5, -2.5, 1.5, 0].map((x) => ({
          transform: `translateX(${x}px)`,
        })),
        { duration: 280, easing: "linear" },
      );
    }
  });
  if (list[0]) list[0].focus();
}
/* "empty" = any blank shift; "range" = not a whole number 0-25; null = all good. */
function checkShifts(odd, even) {
  const all = [...odd, ...even];
  const empty = all.filter((i) => i.value.trim() === "");
  if (empty.length) {
    flagInvalid(empty);
    return "empty";
  }
  const bad = all.filter(
    (i) => !/^\d+$/.test(i.value.trim()) || Number(i.value) > 25,
  );
  if (bad.length) {
    flagInvalid(bad);
    return "range";
  }
  return null;
}
function showAlert(el, type, msg, field) {
  el.className = "alert alert-" + type;
  el.textContent = msg;
  el.hidden = false;
  if (!MOTION.reduced())
    el.animate(
      [
        { opacity: 0, transform: "translateY(-4px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 260, easing: MOTION.ease() },
    );
  if (type === "error" && field) flagInvalid(field);
}
function clearAlert(el) {
  el.hidden = true;
  el.textContent = "";
}

/* Uses the browser's modern "Web APIs" to read/write the clipboard. The return is asynchronous (Promise). */
const copyTimers = new WeakMap();
function copyToClipboard(text, btnEl) {
  if (!text) return;
  const done = (ok) => {
    btnEl.dataset.label ||= btnEl.textContent;
    btnEl.textContent = ok ? "copied!" : "copy failed";
    btnEl.classList.toggle("is-done", ok);
    clearTimeout(copyTimers.get(btnEl));
    copyTimers.set(
      btnEl,
      setTimeout(() => {
        btnEl.textContent = btnEl.dataset.label;
        btnEl.classList.remove("is-done");
      }, 1500),
    );
  };
  return Promise.resolve()
    .then(() => navigator.clipboard.writeText(text))
    .then(
    () => (done(true), true),
    () => (done(false), false),
  );
}

/*
   Controller of the visual bounce of the CSS feedback.
   It makes the element "forget" the copy-bounce class,
   triggers a 'reflow' with offsetWidth and adds it again. This restarts the keyframe.
*/
function bounceText(id) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.getElementById(id);
  el.classList.remove("copy-bounce");
  void el.offsetWidth;
  el.classList.add("copy-bounce");
}

["animationend", "animationcancel"].forEach((type) =>
  document.addEventListener(type, (e) => {
    const el = e.target;
    if (!el.classList.contains("copy-bounce")) return;
    const running = el
      .getAnimations()
      .some((a) => a.animationName === "anim-copy-bounce");
    if (!running) el.classList.remove("copy-bounce");
  }),
);

/* =========================================================================
   USER COPY EVENTS
   Where we connect the HTML interface to JavaScript.
   Example of the interaction flow:
   1. The user clicks the button. -> 2. "click" event listener. -> 3. Plays the bounce animation and calls the clipboard copy API.
   ========================================================================= */
document.getElementById("encCopyBtn").addEventListener("click", (e) => {
  bounceText("encResult");
  copyToClipboard(
    document.getElementById("encResult").textContent,
    e.target,
  );
});
document
  .getElementById("encSizesCopyBtn")
  .addEventListener("click", (e) => {
    bounceText("encSizes");
    copyToClipboard(
      document.getElementById("encSizes").textContent,
      e.target,
    );
  });
document
  .getElementById("encShiftsCopyBtn")
  .addEventListener("click", (e) => {
    bounceText("encShiftsResult");
    copyToClipboard(
      document.getElementById("encShiftsResult").textContent,
      e.target,
    );
  });
document.getElementById("decCopyBtn").addEventListener("click", (e) => {
  bounceText("decResult");
  copyToClipboard(
    document.getElementById("decResult").textContent,
    e.target,
  );
});

/* Fills the decoder shift inputs from [[odd, even], ...] pairs.
   onlyEmpty = true only touches blank inputs (used for the post-animation re-check).
   Returns how many inputs were filled or confirmed. */
function applyDecoderShifts(pairs, onlyEmpty) {
  const oddInputs = document.querySelectorAll(".dec-odd");
  const evenInputs = document.querySelectorAll(".dec-even");
  let count = 0;
  pairs.forEach(([o, e], idx) => {
    [
      [oddInputs[idx], o],
      [evenInputs[idx], e],
    ].forEach(([input, val]) => {
      if (!input) return;
      if (!onlyEmpty || input.value === "") input.value = String(val);
      input.toggleAttribute("data-filled", Number(input.value) > 0);
      count++;
    });
  });
  return count;
}

/* Safety net once the row animation has settled. It only touches the very same rows
   that were just filled, so a later Configure / Clear / new paste is never affected. */
function applyDecoderShiftsLater(pairs) {
  const row = document.querySelector("#decShiftsContainer .shift-row");
  if (!row) return;
  setTimeout(() => {
    if (
      row.isConnected &&
      document.querySelector("#decShiftsContainer .shift-row") === row
    )
      applyDecoderShifts(pairs, true);
  }, 450);
}

// Copy All button (builds the formatted payload by joining strings).
document
  .getElementById("encCopyAllBtn")
  .addEventListener("click", (e) => {
    const msg = document.getElementById("encResult").textContent;
    const sizes = document.getElementById("encSizes").textContent;
    const shifts = document.getElementById("encShiftsResult").textContent;

    const payload = `Message: ${msg}\nLengths: ${sizes}\nShifts: ${shifts}`;
    copyToClipboard(payload, e.target);
  });

// Paste All button (uses "async/await" because the Clipboard API does not answer immediately, and "try/catch" because the browser may deny clipboard-read permission.)
document
  .getElementById("decPasteAllBtn")
  .addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();

      // Regular expressions that look for "Message: ..." style patterns in the pasted text
      const msgMatch = text.match(/Message:\s*(.+)/i);
      const lenMatch = text.match(/Lengths:\s*(.+)/i);
      const shfMatch = text.match(/Shifts:\s*(.+)/i);

      if (!msgMatch && !lenMatch && !shfMatch) {
        showAlert(
          document.getElementById("decAlert"),
          "error",
          "No valid cipher data found in clipboard.",
        );
        return;
      }

      // Update the form inputs (.value) when the data exists
      if (msgMatch)
        document.getElementById("decMessage").value = msgMatch[1].trim();
      if (lenMatch)
        document.getElementById("decSizes").value = lenMatch[1].trim();

      // Parse the "[odd, even]" shift pairs (clamped to the 0-25 range)
      const shiftPairs = shfMatch
        ? [...shfMatch[1].matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map(
            (m) => [Math.min(25, +m[1]), Math.min(25, +m[2])],
          )
        : [];

      // Hand the shifts to the Configure handler so the rows are built pre-filled
      pendingDecShifts = shiftPairs.length ? shiftPairs : null;

      if (msgMatch && lenMatch) {
        clearAlert(document.getElementById("decAlert"));
        document.getElementById("decConfigBtn").click();
        pendingDecShifts = null;
        if (
          document
            .getElementById("decAlert")
            .classList.contains("alert-error")
        )
          return;
      }
      /* Shifts are consumed only by the Configure click above; never keep them for later. */
      pendingDecShifts = null;

      if (shiftPairs.length) {
        // Apply now, then double-check once the row animation has settled
        const applied = applyDecoderShifts(shiftPairs, false);
        if (applied) applyDecoderShiftsLater(shiftPairs);
        if (!applied) {
          showAlert(
            document.getElementById("decAlert"),
            "error",
            "Shifts found, but no fields to fill. Paste the message and lengths too.",
          );
          return;
        }
      }

      showAlert(
        document.getElementById("decAlert"),
        "success",
        "Data pasted and configured automatically!",
      );
    } catch (err) {
      showAlert(
        document.getElementById("decAlert"),
        "error",
        "Failed to read clipboard. Please check permissions.",
      );
    }
  });

/* =========================================================================
   SHIFT INPUT VALIDATION & SMART AUTO-ADVANCE
   Enables an advanced keyboard flow.
   ========================================================================= */
function setupShiftInputsContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // On key press (keydown), blocks 'e', '-', '+' (number inputs allow them, but we only want clean digits from 0 to 25)
  container.addEventListener("keydown", (e) => {
    if (e.target.matches("input[type='number']")) {
      if (["e", "E", "+", "-", "."].includes(e.key)) {
        e.preventDefault(); // Stops the browser from typing the key
        return;
      }
      // If Enter was pressed, moves on to the next one.
      if (e.key === "Enter") {
        e.preventDefault();
        focusNextInput(e.target, container);
      }
    }
  });

  // On change (input): if the number goes above 25, it is forced down to 25.
  container.addEventListener("input", (e) => {
    const input = e.target;
    if (input.matches("input[type='number']")) {
      let val = input.value.replace(/\D/g, "");
      if (val !== "") {
        let num = parseInt(val, 10);
        if (num > 25) num = 25;
        input.value = num;
      }

      evaluateStrength();

      // Automatically jumps to the next box when the user has filled in 2 digits
      if (input.value.length >= 2 && !e.fromScrub) {
        focusNextInput(input, container);
      }
    }
  });
}

function focusNextInput(currentInput, container) {
  // Finds everything and turns the DOM NodeLists into native JavaScript Arrays.
  const inputs = Array.from(
    container.querySelectorAll("input[type='number']"),
  );
  const index = inputs.indexOf(currentInput);
  if (index >= 0 && index < inputs.length - 1) {
    inputs[index + 1].focus(); // Focus moves the typing cursor there
    inputs[index + 1].select(); // Selects the existing text
  }
}

setupShiftInputsContainer("encShiftsContainer");
setupShiftInputsContainer("decShiftsContainer");

/* =========================================================================
   STRENGTH CALCULATOR
   Mathematically evaluates how strong your encoding is.
   ========================================================================= */
function evaluateStrength() {
  const oddInputs = [...document.querySelectorAll(".enc-odd")].map(
    (i) => Number(i.value) || 0,
  );
  const evenInputs = [...document.querySelectorAll(".enc-even")].map(
    (i) => Number(i.value) || 0,
  );
  if (oddInputs.length === 0) return;

  // The 'Set' removes duplicate values, so this counts the unique shift numbers.
  const uniqueShifts = new Set([...oddInputs, ...evenInputs]).size;
  const totalFields = oddInputs.length + evenInputs.length;

  // A rule of thumb: the more varied shifts out of all the possible ones, the more complex it is.
  let score = (uniqueShifts / totalFields) * 100;
  const bar = document.getElementById("encStrengthBar");
  const text = document.getElementById("encStrengthText");

  // Interface update (HTML -> Style) in the DOM using conditional If/Else logic
  if (score <= 20) {
    bar.style.setProperty("--fill", "0.33");
    bar.style.background = "var(--error)";
    text.textContent = "Weak";
  } else if (score <= 60) {
    bar.style.setProperty("--fill", "0.66");
    bar.style.background = "var(--warn)";
    text.textContent = "Medium";
  } else {
    bar.style.setProperty("--fill", "1");
    bar.style.background = "var(--success)";
    text.textContent = "Strong";
  }
}

/*
   INTERACTION FLOW (TABS):
   For each button, attaches an event. If the user clicks, it first clears the 'active' class
   from everyone, then adds 'active' only to the button that was clicked, and to its
   matching HTML panel section using the "dataset" (id = panel-encode, for example).
*/
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .getElementById("panel-" + btn.dataset.tab)
      .classList.add("active");
  });
});

/* =========================================================================
   ENCODER LOGIC & INTERFACE CONTROL
   ========================================================================= */
let encConfigSig = null,
  decConfigSig = null;
const sigOf = (words, keep) => JSON.stringify([words, !!keep]);
/* Strict: every token must be a whole number >= 1 (one trailing comma tolerated). */
function parseSizes(str) {
  const n = str
    .trim()
    .replace(/,\s*$/, "")
    .split(",")
    .map((t) => (/^\d+$/.test(t.trim()) ? Number(t) : NaN));
  return n.length && n.every((v) => v >= 1) ? n : null;
}
const encKeepSpecial = document.getElementById("encKeepSpecial");

/* This function builds the HTML block (input rows), injecting the current word index with Template Literals. */
function buildEncShiftRow(index, word) {
  const letters = word
    .split("")
    .map(
      (ch, i) =>
        `<span class="letter ${i % 2 === 0 ? "odd" : "even"}">${escapeHtml(ch)}</span>`,
    )
    .join("");
  return `
  <div class="shift-row">
    <span class="row-num">${index + 1}</span>
    <span class="row-word">${letters}</span>
    <div class="row-inputs">
      <label class="shift-field odd"><input type="number" min="0" max="25" class="enc-odd" placeholder="0-25" inputmode="numeric" aria-label="Word ${index + 1}, odd-position shift"></label>
      <label class="shift-field even"><input type="number" min="0" max="25" class="enc-even" placeholder="0-25" inputmode="numeric" aria-label="Word ${index + 1}, even-position shift"></label>
    </div>
  </div>`;
}

document.getElementById("encConfigBtn").addEventListener("click", () => {
  const words = splitWords(encPhrase.value, encKeepSpecial.checked);
  if (words.length === 0)
    return showAlert(encAlert, "error", "Enter a phrase.", encPhrase);
  // "map" goes through the Array of words and runs the HTML row builder, "join" merges the pieces, and "innerHTML" replaces the empty div in the HTML with the freshly generated visual list.
  document.getElementById("encShiftsContainer").innerHTML = words
    .map((w, i) => buildEncShiftRow(i, w))
    .join("");
  encConfigSig = sigOf(words, encKeepSpecial.checked);
  document.getElementById("encWordsInfo").hidden = false;
  document.getElementById("encLegend").hidden = false;
  document.getElementById("encFastFill").hidden = false;
  document.getElementById("encStrengthContainer").hidden = false;
  document.getElementById("encWordsInfo").textContent =
    `${words.length} words detected.`;
  evaluateStrength();
});

// UI cleanup: resets the visible variables, hiding them again to restore the original default
document.getElementById("encClearBtn").addEventListener("click", () => {
  document.getElementById("encPhrase").value = "";
  document.getElementById("encShiftsContainer").innerHTML = "";
  encConfigSig = null;
  document.getElementById("encWordsInfo").hidden = true;
  document.getElementById("encLegend").hidden = true;
  document.getElementById("encFastFill").hidden = true;
  document.getElementById("encStrengthContainer").hidden = true;
  document.getElementById("encResultWrap").hidden = true;
  document.getElementById("swapBtn").hidden = true;
  clearAlert(document.getElementById("encAlert"));
});

// Fast/Quick Fill tool logic: DOM manipulation that sweeps through the input fields with forEach().
document
  .getElementById("encFastApplyBtn")
  .addEventListener("click", () => {
    const oddVal = document.getElementById("encFastOdd").value.trim();
    const evenVal = document.getElementById("encFastEven").value.trim();

    const oddArray = oddVal
      ? oddVal
          .split(",")
          .map((n) => Math.min(25, Math.max(0, Number(n.trim()) || 0)))
      : null;
    const evenArray = evenVal
      ? evenVal
          .split(",")
          .map((n) => Math.min(25, Math.max(0, Number(n.trim()) || 0)))
      : null;

    if (oddArray) {
      document.querySelectorAll(".enc-odd").forEach((inp, idx) => {
        if (!inp.value || inp.value === "0") {
          inp.value = oddArray[idx % oddArray.length];
        }
      });
    }

    if (evenArray) {
      document.querySelectorAll(".enc-even").forEach((inp, idx) => {
        if (!inp.value || inp.value === "0") {
          inp.value = evenArray[idx % evenArray.length];
        }
      });
    }

    evaluateStrength();
  });

document.getElementById("presetRot13").addEventListener("click", () => {
  document
    .querySelectorAll(".enc-odd, .enc-even")
    .forEach((i) => (i.value = 13));
  evaluateStrength();
});

document
  .getElementById("presetFibonacci")
  .addEventListener("click", () => {
    const fib = [1, 2, 3, 5, 8, 13, 21];
    document
      .querySelectorAll(".enc-odd")
      .forEach((inp, idx) => (inp.value = fib[idx % fib.length]));
    document
      .querySelectorAll(".enc-even")
      .forEach((inp, idx) => (inp.value = fib[(idx + 1) % fib.length]));
    evaluateStrength();
  });

document
  .getElementById("presetProgressive")
  .addEventListener("click", () => {
    document
      .querySelectorAll(".enc-odd")
      .forEach((inp, idx) => (inp.value = (idx + 1) % 26));
    document
      .querySelectorAll(".enc-even")
      .forEach((inp, idx) => (inp.value = (idx + 2) % 26));
    evaluateStrength();
  });

// Generates randomness (Math.random() goes from 0 to 0.99..., it is multiplied by 26 and rounded down with Math.floor, resulting in 0 to 25)
document.getElementById("encRandomBtn").addEventListener("click", () => {
  document
    .querySelectorAll(".enc-odd, .enc-even")
    .forEach((i) => (i.value = Math.floor(Math.random() * 26)));
  evaluateStrength();
});

/* 
   ENCODER INTERACTION FLOW (ENCODE BUTTON):
   1. The user clicks 'Encode'.
   2. The listener runs the callback function and checks that all required fields were filled in.
   3. The function goes through the .enc-odd and .enc-even fields, requiring every shift to be filled in.
   4. If any field is empty or invalid, it shows an error alert.
   5. customCipher returns the scrambled characters and the results are displayed.
*/
document.getElementById("encSubmitBtn").addEventListener("click", () => {
  const phrase = encPhrase.value.trim();
  if (!phrase) {
    return showAlert(
      encAlert,
      "error",
      "Please enter the original phrase.",
      encPhrase,
    );
  }

  const words = splitWords(phrase, encKeepSpecial.checked);
  if (words.length === 0) {
    return showAlert(
      encAlert,
      "error",
      "Please enter a valid phrase with letters.",
      encPhrase,
    );
  }

  const oddInputs = document.querySelectorAll(".enc-odd");
  const evenInputs = document.querySelectorAll(".enc-even");

  if (oddInputs.length === 0) {
    return showAlert(encAlert, "error", "Please configure shifts first.");
  }

  if (
    oddInputs.length !== words.length ||
    encConfigSig !== sigOf(words, encKeepSpecial.checked)
  ) {
    return showAlert(
      encAlert,
      "error",
      "Phrase changed. Please click 'Configure shifts' again.",
      encConfigBtn,
    );
  }

  const shiftIssue = checkShifts(oddInputs, evenInputs);
  const hasEmptyShift = shiftIssue === "empty";

  if (hasEmptyShift) {
    return showAlert(
      encAlert,
      "error",
      "Please fill in all shift fields before encoding.",
    );
  }

  if (shiftIssue)
    return showAlert(
      encAlert,
      "error",
      "Shifts must be whole numbers from 0 to 25.",
    );
  const shifts = [];
  for (let i = 0; i < words.length; i++) {
    shifts.push([
      Number(oddInputs[i].value),
      Number(evenInputs[i].value),
    ]);
  }

  const result = customCipher(phrase, shifts, encKeepSpecial.checked);
  const lengths = words.map((w) => w.length).join(", ");
  const formattedShifts = shifts
    .map((s) => `[${s[0]}, ${s[1]}]`)
    .join(", ");

  document.getElementById("encResult").textContent = result;
  document.getElementById("encSizes").textContent = lengths;
  document.getElementById("encShiftsResult").textContent =
    formattedShifts;
  document.getElementById("encResultWrap").hidden = false;
  revealResult("encResultWrap");
  document.getElementById("swapBtn").hidden = false;
  showAlert(encAlert, "success", "Encoded successfully.");
  addHistory("Encode", phrase, result); // Saves to persistent memory
});

// SWAP / FLIP (button that automatically transfers from the Encode panel to the Decode panel with JavaScript via .value + click())
document.getElementById("swapBtn").addEventListener("click", () => {
  document.getElementById("decMessage").value =
    document.getElementById("encResult").textContent;
  document.getElementById("decSizes").value =
    document.getElementById("encSizes").textContent;
  document.getElementById("tab-decode").click();
});

/* =========================================================================
   DECODER LOGIC
   ========================================================================= */
// Shifts parsed from "Paste Data"; consumed by the Configure handler so the
// rows are created already filled (no dependence on later DOM timing).
let pendingDecShifts = null;

document.getElementById("decConfigBtn").addEventListener("click", () => {
  const rawSizes = document.getElementById("decSizes").value.trim();
  if (!rawSizes)
    return showAlert(decAlert, "error", "Enter the lengths.", decSizes);
  const sizes = parseSizes(rawSizes);
  if (!sizes)
    return showAlert(
      decAlert,
      "error",
      "Please enter valid word lengths separated by commas.",
      decSizes,
    );
  decConfigSig = sizes.join(",");
  const preset = pendingDecShifts;
  pendingDecShifts = null;
  const presetVal = (i, k) => (preset && preset[i] ? preset[i][k] : "");
  const html = sizes
    .map(
      (s, i) => `
    <div class="shift-row">
      <span class="row-num">${i + 1}</span>
      <div class="row-inputs">
        <label class="shift-field odd"><input type="number" min="0" max="25" class="dec-odd" placeholder="0-25" inputmode="numeric" value="${presetVal(i, 0)}" aria-label="Word ${i + 1}, odd-position shift"></label>
        <label class="shift-field even"><input type="number" min="0" max="25" class="dec-even" placeholder="0-25" inputmode="numeric" value="${presetVal(i, 1)}" aria-label="Word ${i + 1}, even-position shift"></label>
      </div>
    </div>
  `,
    )
    .join("");
  document.getElementById("decShiftsContainer").innerHTML = html;
  document.getElementById("decWordsInfo").hidden = false;
  document.getElementById("decWordsInfo").textContent =
    `${sizes.length} words expected.`;
});

// Clear Decoder
document.getElementById("decClearBtn").addEventListener("click", () => {
  document.getElementById("decMessage").value = "";
  document.getElementById("decSizes").value = "";
  document.getElementById("decShiftsContainer").innerHTML = "";
  decConfigSig = null;
  document.getElementById("decWordsInfo").hidden = true;
  document.getElementById("decResultWrap").hidden = true;
  clearAlert(document.getElementById("decAlert"));
});

// Clicking Decode, with validation that everything is filled in
document.getElementById("decSubmitBtn").addEventListener("click", () => {
  const rawMsg = document.getElementById("decMessage").value;
  const msg = rawMsg.replace(/\s+/g, "");

  if (!rawMsg.trim()) {
    return showAlert(
      decAlert,
      "error",
      "Please enter the encoded message.",
      decMessage,
    );
  }

  const sizesInput = document.getElementById("decSizes").value.trim();
  if (!sizesInput) {
    return showAlert(
      decAlert,
      "error",
      "Please enter the original word lengths.",
      decSizes,
    );
  }

  const sizes = parseSizes(sizesInput) || [];

  if (sizes.length === 0) {
    return showAlert(
      decAlert,
      "error",
      "Please enter valid word lengths separated by commas.",
      decSizes,
    );
  }

  const oddInputs = document.querySelectorAll(".dec-odd");
  const evenInputs = document.querySelectorAll(".dec-even");

  if (oddInputs.length === 0) {
    return showAlert(decAlert, "error", "Please configure shifts first.");
  }

  if (
    oddInputs.length !== sizes.length ||
    decConfigSig !== sizes.join(",")
  ) {
    return showAlert(
      decAlert,
      "error",
      "Word lengths changed. Please click 'Configure shifts' again.",
      decConfigBtn,
    );
  }

  const shiftIssue = checkShifts(oddInputs, evenInputs);
  const hasEmptyShift = shiftIssue === "empty";

  if (hasEmptyShift) {
    return showAlert(
      decAlert,
      "error",
      "Please fill in all shift fields before decoding.",
    );
  }

  if (shiftIssue)
    return showAlert(
      decAlert,
      "error",
      "Shifts must be whole numbers from 0 to 25.",
    );
  const shifts = [];
  for (let i = 0; i < sizes.length; i++) {
    shifts.push([
      Number(oddInputs[i].value),
      Number(evenInputs[i].value),
    ]);
  }

  const total = sizes.reduce((a, b) => a + b, 0);
  if (msg.length !== total)
    return showAlert(
      decAlert,
      "error",
      `The message has ${msg.length} characters, but the word lengths add up to ${total}.`,
      decMessage,
    );
  const res = customDecipher(msg, shifts, sizes);
  document.getElementById("decResult").textContent = res;
  document.getElementById("decResultWrap").hidden = false;
  revealResult("decResultWrap");
  showAlert(decAlert, "success", "Decoded successfully.");
  addHistory("Decode", msg, res);
});

/* =========================================================================
   POPUP MENUS (Updates & History)
   ========================================================================= */

/*
   Modular function that attaches the 'open option box' behavior to a button.
   Parameters: the button ID and the ID of the HTML box on which to toggle the 'show' class (which makes it display as a block).
*/
function toggleBox(btnId, boxId) {
  const btn = document.getElementById(btnId);
  const box = document.getElementById(boxId);
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevents the event from bubbling up so the document does not treat it as a global click and close it.
    document.querySelectorAll(".floating-box").forEach((b) => {
      if (b !== box) b.classList.remove("show"); // Closes any other open box.
    });
    box.classList.toggle("show"); // Adds .show if it is not there, or removes it if it is.
  });
}
toggleBox("updateLogBtn", "updateLogBox");
toggleBox("historyBtn", "historyBox");

// Clicking anywhere on the screen (global document.addEventListener) hides the floating menus and boxes
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".floating-box") &&
    !e.target.closest(".update-btn") &&
    !e.target.closest(".history-toggle")
  ) {
    document
      .querySelectorAll(".floating-box")
      .forEach((b) => b.classList.remove("show"));
  }
});
