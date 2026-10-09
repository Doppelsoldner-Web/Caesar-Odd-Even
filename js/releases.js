/* =========================================================================
   RELEASE HISTORY (v1.12.0)
   One list feeds everything that shows a version:
     - the "UPDATE Vx.y.z" box that opens from the version button,
     - the Update Log in the "How do I use this?" guide,
     - the button label, the guide's version chip and the footer.
   TO PUBLISH A NEW VERSION: add one object at the TOP of RELEASES. Nothing else needs editing.

   Each release:  version  "1.16.0"          (shown as v1.16.0)
                  name     "Guided Tour"     (short release name)
                  date     "2026-10-06"      (optional; leave it out to hide it)
                  summary  one sentence      (what the release is about)
                  items    [{ tag, title, text }]
                           tag is "new", "improved" or "fix"; wrap words in *stars* to italicize them.
   The script builds the DOM with createElement/textContent, so none of this text is parsed as HTML.
   ========================================================================= */
(() => {
  "use strict";

  const RELEASES = [
    {
      version: "1.16.0",
      name: "Night Beach",
      date: "2026-10-09",
      summary:
        "The dark theme now has its own background: a looping beach at night, cross-faded with the daytime one.",
      items: [
        {
          tag: "new",
          title: "Night Beach Video",
          text: "In the dark theme the page sits on a looping night beach. The light theme keeps the daytime beach. Each video comes as a light MP4 and WebM with a poster image that shows while it loads.",
        },
        {
          tag: "improved",
          title: "Cross-Fade Between Themes",
          text: "Switching the theme fades one video into the other instead of cutting, so the screen never jumps from bright to dark in a single frame.",
        },
        {
          tag: "improved",
          title: "Only One Video Plays",
          text: "The video you are not looking at is not downloaded and is paused once hidden. Data Saver and reduced motion keep the still poster instead of playing the loop.",
        },
        {
          tag: "improved",
          title: "Smoother Theme Change",
          text: "Cards, the tab bar, the banner and the pop-ups ease between their light and dark colors, and the high contrast setting now gets near-solid surfaces with a clear border.",
        },
      ],
    },
    {
      version: "1.15.0",
      name: "Beach Backdrop",
      date: "2026-10-08",
      summary:
        "A banner that decodes itself, a beach video behind the page, and clean translucent surfaces with a soft blur.",
      items: [
        {
          tag: "new",
          title: "Decoding Banner",
          text: "The title starts as GFVDYNO, the word WELCOME encoded with this site's own cipher, and its letters roll backward like an odometer until it reads WELCOME. Click the title to play it again.",
        },
        {
          tag: "new",
          title: "Beach Video",
          text: "A looping beach video is fixed behind the page. Scroll down and only the beach is left behind the cards.",
        },
        {
          tag: "improved",
          title: "Soft Blur Surfaces",
          text: "Cards, the tab bar, fields, buttons, letter tiles, the update box and the history drawer are plain semi-transparent surfaces, white in the light theme and dark in the dark theme. The cards and pop-ups add a light blur, and nothing is recalculated while you scroll.",
        },
        {
          tag: "improved",
          title: "White and Black Banner",
          text: "The banner is white in the light theme and black in the dark one. The version, theme and history buttons sit in its top right corner.",
        },
        {
          tag: "improved",
          title: "Accessible Fallbacks",
          text: "With reduced transparency the surfaces turn nearly solid and the blur is dropped. With reduced motion the video pauses on its first frame and the title cross-fades instead of rolling.",
        },
      ],
    },
    {
      version: "1.14.0",
      name: "Split Files",
      date: "2026-10-06",
      summary:
        "The single page is now three parts, HTML, CSS and JavaScript, ready for GitHub Pages.",
      items: [
        {
          tag: "improved",
          title: "Separate Files",
          text: "The markup stays in index.html, the styling moved to css/style.css and the code to five files in js/. Nothing changes on screen.",
        },
        {
          tag: "improved",
          title: "Relative Paths",
          text: "Every file is linked without a leading slash, so the site works the same from a project page on GitHub Pages, from a custom domain or from a local folder.",
        },
        {
          tag: "improved",
          title: "Cache Busting",
          text: "Each stylesheet and script link ends in a version tag, so visitors get the new files right after an update instead of an old cached copy.",
        },
        {
          tag: "fix",
          title: "Font Path In The Stylesheet",
          text: "The font files are now reached with ../Assets/ from inside css/, because a path in a stylesheet is resolved from the stylesheet and not from the page.",
        },
      ],
    },
    {
      version: "1.13.0",
      name: "Block Type",
      summary:
        "The whole interface switches to the Minecraft Default font, with credit to its creator.",
      items: [
        {
          tag: "new",
          title: "Minecraft Font",
          text: "Every piece of text now uses Minecraft Default, in Regular, Bold, Italic and Bold Italic, loaded from the Assets folder.",
        },
        {
          tag: "new",
          title: "Font Credits",
          text: "The footer credits tryashtar, creator of the Minecraft TTF v1.6 files, and links to the release page. The same credit sits in the page source.",
        },
        {
          tag: "improved",
          title: "Pixel-Friendly Sizing",
          text: "The font is drawn small, so all text is scaled up to the x-height of a regular interface font. Buttons, fields and code tags follow it, and headings no longer squeeze letters together.",
        },
        {
          tag: "improved",
          title: "Early Font Loading",
          text: "On a web server the two main font files start downloading before the stylesheet asks for them, which avoids a visible swap from the fallback font.",
        },
      ],
    },
    {
      version: "1.12.0",
      name: "Guided Tour",
      summary:
        "A built-in guide, sharper light and dark themes, and a theme that follows your system.",
      items: [
        {
          tag: "new",
          title: "How-to Guide",
          text: "A new “How do I use this?” box sits under the app. It explains encoding and decoding step by step, with a worked example, the advanced tools, every way to export and share, and four ways to fill in the decoder.",
        },
        {
          tag: "improved",
          title: "Refined Light Theme",
          text: "A warmer off-white with two surface levels, firmer field outlines and tuned accent colors. Every text and accent pair passes WCAG AA (4.5:1), and field outlines pass 3:1.",
        },
        {
          tag: "improved",
          title: "Refined Dark Theme",
          text: "A true-black page for OLED screens with lifted slate cards, a lit top edge instead of shadows that vanish on black, and brighter accents that carry dark text.",
        },
        {
          tag: "new",
          title: "Automatic Theme",
          text: "The first visit follows your system’s light or dark setting, and keeps following it until you press the toggle, which saves your choice. Dark mode no longer flashes white while the page loads, and the mobile browser bar takes the theme color.",
        },
        {
          tag: "improved",
          title: "Motion Pass",
          text: "The Transfer button, the share-link field and the strength bar ease in, the drag handle glides to new values, history entries stagger in, and everything softens with reduced motion.",
        },
        {
          tag: "improved",
          title: "Cleaner Live Preview",
          text: "The “// live preview” label stays hidden until Configure shifts reveals the tiles, in both the encoder and the decoder.",
        },
        {
          tag: "improved",
          title: "Release History",
          text: "This log now keeps every version with a name, a summary and new, improved or fix tags. The version button and the guide read from the same list.",
        },
        {
          tag: "fix",
          title: "Fixes",
          text: "Top-bar buttons choose a readable text color in both themes, and the version notes scroll when the history grows.",
        },
      ],
    },
    {
      version: "1.11.0",
      name: "Cipher as Instrument",
      summary:
        "Live letter tiles, drag-to-set shifts and share-by-link, in a two-pane layout.",
      items: [
        {
          tag: "new",
          title: "Live Letter Tiles",
          text: "A preview shows every letter turning into its ciphered (or decoded) letter as you type.",
        },
        {
          tag: "new",
          title: "Drag-to-set Shifts",
          text: "Drag the thin track under any shift field to change it. The number fields work as before.",
        },
        {
          tag: "new",
          title: "Share by Link",
          text: "Copy a link that re-opens the message and lengths (optionally the shifts) in the Decoder.",
        },
        {
          tag: "improved",
          title: "Two-pane Layout",
          text: "On wide screens the output stays visible beside the form.",
        },
        {
          tag: "improved",
          title: "History Drawer",
          text: "A side drawer on wide screens, a popover on phones.",
        },
        {
          tag: "fix",
          title: "Fixes",
          text: "Paste Data now applies the shifts, and hint text meets contrast guidelines.",
        },
      ],
    },
    {
      version: "1.10.1",
      name: "Keys & Flow",
      summary:
        "Keyboard navigation, smoother motion and better accessibility.",
      items: [
        {
          tag: "new",
          title: "Keyboard Navigation",
          text: "Switch tabs with the Arrow keys, Home and End, and move through the shift fields with the Enter key.",
        },
        {
          tag: "new",
          title: "Smart Auto-focus",
          text: "Opening a panel automatically moves focus to the first field.",
        },
        {
          tag: "improved",
          title: "Smooth Animations (WAAPI)",
          text: "Improved transitions with physics-based spring damping curves for tabs and modals.",
        },
        {
          tag: "improved",
          title: "Dynamic Indicator",
          text: "High-precision tab marker positioning.",
        },
        {
          tag: "improved",
          title: "Accessibility & Contrast",
          text: "Improved support for *prefers-reduced-transparency* and *prefers-contrast*.",
        },
        {
          tag: "improved",
          title: "Form Validation",
          text: "Error messages now clear automatically as you type.",
        },
      ],
    },
  ];

  /* ---- tiny DOM helpers ---- */
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  /* Text with *italic* parts, built from nodes (never innerHTML). */
  const rich = (parent, text) => {
    text.split("*").forEach((part, i) => {
      if (!part) return;
      if (i % 2) parent.appendChild(el("i", "", part));
      else parent.appendChild(document.createTextNode(part));
    });
  };
  const TAGS = ["new", "improved", "fix"];
  const tagOf = (t) => (TAGS.includes(t) ? t : "improved");
  const countOf = (r) =>
    r.items.length + (r.items.length === 1 ? " change" : " changes");
  const latest = RELEASES[0];
  const label = "v" + latest.version;

  /* ---- 1. version button, footer and every "current version" chip ---- */
  const btn = document.getElementById("updateLogBtn");
  if (btn) {
    btn.textContent = label;
    btn.setAttribute("aria-label", "Version notes, " + label);
    btn.title = "What’s new in " + label + ": " + latest.name;
  }
  document
    .querySelectorAll("[data-release-version]")
    .forEach((n) => (n.textContent = label));
  document
    .querySelectorAll("[data-release-footer]")
    .forEach((n) => (n.textContent = "Odd/Even Cipher " + label));

  /* ---- 2. the popover: compact, one block per release ---- */
  const popHost = document.getElementById("updateLogList");
  if (popHost) {
    RELEASES.forEach((r, i) => {
      const sec = el("section", "rel");
      const h = el("h3", "rel-h", "UPDATE V" + r.version);
      h.appendChild(el("span", "rel-name", r.name));
      if (i === 0) h.appendChild(el("span", "rel-badge", "latest"));
      if (r.date) h.appendChild(el("span", "rel-date", r.date));
      sec.appendChild(h);
      if (r.summary) sec.appendChild(el("p", "rel-blurb", r.summary));
      sec.appendChild(el("hr", "rel-hr"));

      const ul = el("ul", "rel-list");
      ul.setAttribute("role", "list");
      r.items.forEach((it) => {
        const t = tagOf(it.tag);
        const li = el("li");
        li.appendChild(el("span", "rel-tag is-" + t, t));
        li.appendChild(el("strong", "", it.title + ":"));
        li.appendChild(document.createTextNode(" "));
        rich(li, it.text);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      popHost.appendChild(sec);
    });
  }

  /* ---- 3. the guide: a <details> per release, only the newest starts open ---- */
  const tutHost = document.getElementById("tutorialReleases");
  if (tutHost) {
    RELEASES.forEach((r, i) => {
      const d = el("details", "tutorial-release");
      d.open = i === 0;

      const sum = el("summary", "tutorial-release-sum");
      sum.appendChild(el("span", "tutorial-release-ver", "v" + r.version));
      sum.appendChild(el("span", "tutorial-release-name", r.name));
      if (i === 0)
        sum.appendChild(el("span", "tutorial-release-badge", "latest"));
      if (r.date)
        sum.appendChild(el("span", "tutorial-release-date", r.date));
      sum.appendChild(el("span", "tutorial-release-count", countOf(r)));
      const chev = el("span", "tutorial-release-chev");
      chev.setAttribute("aria-hidden", "true");
      sum.appendChild(chev);
      d.appendChild(sum);

      if (r.summary)
        d.appendChild(el("p", "tutorial-release-blurb", r.summary));

      const ul = el("ul", "tutorial-log");
      ul.setAttribute("role", "list");
      r.items.forEach((it, n) => {
        const t = tagOf(it.tag);
        const li = el(
          "li",
          "tutorial-log-item" + (t === "fix" ? " is-fix" : ""),
        );
        const meta = el("span", "tutorial-log-meta");
        const num = el("span", "", String(n + 1).padStart(2, "0"));
        num.setAttribute("aria-hidden", "true");
        meta.appendChild(num);
        meta.appendChild(el("span", "tutorial-tag is-" + t, t));
        li.appendChild(meta);
        li.appendChild(el("strong", "tutorial-log-title", it.title));
        const desc = el("span", "tutorial-log-desc");
        rich(desc, it.text);
        li.appendChild(desc);
        ul.appendChild(li);
      });
      d.appendChild(ul);
      tutHost.appendChild(d);
    });
  }
})();
