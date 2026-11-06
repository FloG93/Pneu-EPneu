// Writes the overview page (index.html) from the tile table in figur/kacheln.mjs.
//
//   node figur/tests/tools/build-uebersicht.mjs
//
// The page itself stays plain HTML with no build step at run time; this script
// only spares us from keeping twenty near-identical cards in sync by hand.
// It knows no subject: titles, texts, the two medium tones and the optional
// logo all come from SEITE in kacheln.mjs, each tile picture from
// <ordner>/vorschau.svg.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUBRIKEN, SEITE } from "../../kacheln.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..", "..");
const ZIEL = join(WURZEL, "index.html");

/** HTML-escape. Every string from the table goes through this. */
const e = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The logo: an orange tile with a dark line drawing on it. SEITE.marke may
// replace the drawing (SVG elements in a 32 x 32 box); the default is a
// cylinder with its rod, which reads as "technical component" in any trade.
const ZEICHEN = SEITE.marke
  ?? '<rect x="5.5" y="11" width="13" height="10" rx="1.5"/><path d="M11.5 11v10M18.5 16h8M24 13.5 26.5 16 24 18.5"/>';
const LOGO =
  '<rect x="2" y="2" width="28" height="28" rx="7" fill="#ff9f43"/>'
  + `<g fill="none" stroke="#1a1206" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ZEICHEN}</g>`;
const MARKE = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true">${LOGO}</svg>`;
const FAVICON = "data:image/svg+xml,"
  + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${LOGO}</svg>`);

const SONNE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'
  + ' stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/>'
  + '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'
  + ' stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';

/** A finished component: preview, text, tags and the buttons. */
function fertigeKachel(k) {
  const marken = (k.marken ?? [])
    .map((m) => `<li>${e(m)}</li>`)
    .join("");
  return `        <li class="kachel fertig">
          <a class="kachel-bild" href="${e(k.ordner)}/" tabindex="-1" aria-hidden="true">${vorschau(k)}</a>
          <div class="kachel-text">
            <h3><a href="${e(k.ordner)}/">${e(k.name)}</a></h3>
            <p>${e(k.satz)}</p>
            ${marken ? `<ul class="marken" aria-label="Eckdaten">${marken}</ul>` : ""}
            ${k.sinnbild ? `<p class="sinnbild">${e(SEITE.sinnbildName ?? "Symbol")}: ${e(k.sinnbild)}</p>` : ""}
            <div class="knoepfe">
              <a class="knopf wichtig" href="${e(k.ordner)}/">Ansehen</a>
            </div>
          </div>
        </li>`;
}

/**
 * A component that is not drawn yet: named and described, but not a link.
 * The symbol its tile will carry stays in the table (`k.sinnbild`) and is
 * deliberately not written out here — on most tiles it would only repeat the
 * heading, and a name is not a symbol.
 */
function geplanteKachel(k) {
  return `        <li class="kachel geplant">
          <h3>${e(k.name)}</h3>
          <p>${e(k.satz)}</p>
          <span class="chip">in Arbeit</span>
        </li>`;
}

/**
 * The tile picture: <ordner>/vorschau.svg, drawn per component as a schematic
 * rather than a miniature — at 240 x 135 the real figure would be a grey
 * smudge. It is inlined, so it can use the page's classes (see STIL: v-wand,
 * v-teil, v-stark, v-blass …) and follows light and dark with the page.
 */
function vorschau(k) {
  const datei = join(WURZEL, k.ordner, "vorschau.svg");
  if (!existsSync(datei)) return "";
  return readFileSync(datei, "utf8").trim().replace(/\n/g, "\n          ");
}

function rubrikAbschnitt(r) {
  const fertig = r.kacheln.filter((k) => k.zustand === "fertig");
  const geplant = r.kacheln.filter((k) => k.zustand !== "fertig");
  const teile = [];
  if (fertig.length) {
    teile.push(`      <ul class="raster weit">\n${fertig.map(fertigeKachel).join("\n")}\n      </ul>`);
  }
  if (geplant.length) {
    teile.push(`      <ul class="raster eng">\n${geplant.map(geplanteKachel).join("\n")}\n      </ul>`);
  }
  return `    <section class="rubrik" id="${e(r.id)}" aria-labelledby="${e(r.id)}-titel">
      <div class="rubrik-kopf">
        <h2 id="${e(r.id)}-titel">${e(r.titel)}</h2>
        <span class="zaehler">${fertig.length} von ${r.kacheln.length} fertig</span>
      </div>
      <p class="rubrik-text">${e(r.einleitung)}</p>
${teile.join("\n")}
    </section>`;
}

const STIL = `
    :root {
      color-scheme: dark;
      --bg: #0e0f12;
      --stage-bg: #131519;
      --card: #1b1e24;
      --chip: #262a31;
      --line: #2c3038;
      --line-strong: #3a3f49;
      --text: #e7e9ec;
      --text-muted: #a3aab4;
      --text-faint: #7c848f;
      --accent: #ff9f43;
      --accent-ink: #1a1206;
      --link: #ffb870;
      --focus: #ffb870;
      --plate: #2a2e36;
      --plate-edge: #4d535e;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px rgba(0, 0, 0, 0.35);
    }
    :root[data-theme="light"] {
      color-scheme: light;
      --bg: #eef0f3;
      --stage-bg: #e4e7ec;
      --card: #ffffff;
      --chip: #f1f3f6;
      --line: #e1e4e9;
      --line-strong: #cbd1d9;
      --text: #1c1f24;
      --text-muted: #555d68;
      --text-faint: #6f7782;
      --accent: #f28c1b;
      --link: #a85600;
      --focus: #c96d06;
      --plate: #fdfdfe;
      --plate-edge: #9aa3ae;
      --shadow: 0 1px 2px rgba(20, 30, 50, 0.06), 0 10px 28px rgba(20, 30, 50, 0.1);
    }

    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    a { color: var(--link); }
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

    .wrap { width: 100%; max-width: 1500px; margin: 0 auto; padding: 0 16px; }
    @media (min-width: 640px) { .wrap { padding: 0 28px; } }

    .site-head { padding: 32px 0 20px; }
    .head { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px 14px; }
    .mark { width: 40px; height: 40px; display: block; }
    h1 { margin: 0; font-size: clamp(23px, 4.2vw, 34px); line-height: 1.15; letter-spacing: -0.3px; }
    .lead { grid-column: 1 / -1; margin: 0; max-width: 64ch; color: var(--text-muted); font-size: 17px; }
    @media (min-width: 640px) {
      .site-head { padding: 44px 0 24px; }
      .head { gap: 6px 16px; }
      .mark { width: 48px; height: 48px; }
      .lead { grid-column: 2 / -1; }
    }

    .knopf {
      display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px;
      border: 1px solid var(--line-strong); border-radius: 9px;
      color: var(--text); font-weight: 600; font-size: 15px; text-decoration: none;
    }
    .knopf:hover { background: var(--chip); }
    .knopf.wichtig { background: var(--accent); border-color: transparent; color: var(--accent-ink); }
    .knopf.wichtig:hover { filter: brightness(1.07); }
    .knopf.thema { gap: 8px; font-weight: 500; background: none; cursor: pointer; font-family: inherit; }
    .knopf.thema svg { width: 18px; height: 18px; flex: none; }
    :root[data-theme="dark"] .wenn-hell, :root:not([data-theme="dark"]) .wenn-dunkel { display: none; }
    @media (max-width: 560px) {
      .knopf.thema { padding: 0 11px; }
      .knopf.thema .themaname { display: none; }
    }

    .rubrik { margin: 0 0 40px; }
    .rubrik-kopf {
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 14px;
      padding-bottom: 8px; border-bottom: 1px solid var(--line);
    }
    h2 { margin: 0; font-size: 21px; line-height: 1.25; letter-spacing: -0.2px; }
    .zaehler {
      padding: 2px 9px; border-radius: 999px; background: var(--chip);
      color: var(--text-faint); font-size: 12.5px; font-variant-numeric: tabular-nums;
    }
    .rubrik-text { margin: 10px 0 18px; max-width: 72ch; color: var(--text-muted); }

    .raster { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 18px; }
    .raster.weit { grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
    .raster.eng { grid-template-columns: repeat(auto-fill, minmax(min(100%, 268px), 1fr)); }
    .raster:last-child { margin-bottom: 0; }

    .kachel {
      display: flex; flex-direction: column;
      border: 1px solid var(--line); border-radius: 14px;
    }
    .kachel h3 { margin: 0; font-size: 18px; line-height: 1.3; }
    .kachel h3 a { color: inherit; text-decoration: none; }
    .kachel h3 a:hover { color: var(--accent); }
    .kachel p { margin: 0; color: var(--text-muted); }

    .kachel.fertig { background: var(--card); box-shadow: var(--shadow); overflow: hidden; }
    .kachel-bild {
      display: block; aspect-ratio: 16 / 9; padding: 14px 16px;
      background: var(--stage-bg); border-bottom: 1px solid var(--line);
    }
    .kachel-bild svg { display: block; width: 100%; height: 100%; transition: transform 0.25s ease; }
    .kachel-bild:hover svg { transform: scale(1.02); }
    .kachel-text { display: flex; flex: 1; flex-direction: column; gap: 11px; padding: 17px 19px 19px; }
    .marken { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .marken li {
      padding: 2px 9px; border: 1px solid var(--line); border-radius: 999px;
      background: var(--chip); color: var(--text-muted); font-size: 13px;
    }
    .knoepfe { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 3px; }

    /* Tile pictures (vorschau.svg). The two medium tones are the measured pair
       the figures draw with, taken from SEITE.toene. */
    .kachel-bild { --ton-stark: ${SEITE.toene.light.stark}; --ton-blass: ${SEITE.toene.light.blass}; }
    :root[data-theme="dark"] .kachel-bild { --ton-stark: ${SEITE.toene.dark.stark}; --ton-blass: ${SEITE.toene.dark.blass}; }
    .kachel-bild .v-wand { fill: var(--plate); stroke: var(--plate-edge); stroke-width: 1; stroke-linejoin: round; }
    .kachel-bild .v-teil { fill: var(--chip); stroke: var(--plate-edge); stroke-width: 1; }
    .kachel-bild .v-geraet { stroke-width: 1.2; }
    .kachel-bild .v-leitung, .kachel-bild .v-hilfslinie { fill: none; stroke: var(--plate-edge); stroke-width: 1.4; stroke-linecap: round; }
    .kachel-bild .v-hilfslinie { stroke-width: 0.8; opacity: 0.55; }
    .kachel-bild .v-stark { fill: var(--ton-stark); }
    .kachel-bild .v-blass { fill: var(--ton-blass); }

    .kachel.geplant {
      gap: 9px; padding: 16px 18px 18px;
      background: transparent; border-style: dashed; border-color: var(--line-strong);
    }
    .kachel.geplant h3 { font-size: 16.5px; color: var(--text-muted); }
    .kachel.geplant p { font-size: 14.5px; color: var(--text-faint); }
    .chip {
      align-self: flex-start; margin-top: auto; padding: 2px 10px;
      border-radius: 999px; background: var(--chip);
      color: var(--text-muted); font-size: 12.5px; font-weight: 600;
    }
    .sinnbild { font-size: 13px; color: var(--text-faint); font-style: italic; }

    .site-foot { margin-top: 10px; padding-top: 20px; padding-bottom: 40px; color: var(--text-faint); font-size: 14px; }
    .site-foot p { margin: 0 0 10px; border-top: 1px solid var(--line); padding-top: 18px; max-width: 80ch; }
    .site-foot p + p { border-top: 0; padding-top: 0; }

    @media (prefers-reduced-motion: reduce) {
      .kachel-bild svg, .kachel-bild:hover svg { transition: none; transform: none; }
    }`;

const seite = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${e(SEITE.titel)}</title>
  <meta name="description" content="${e(SEITE.beschreibung)}">
  <meta name="theme-color" content="#0e0f12">
  <link rel="icon" type="image/svg+xml" href="${FAVICON}">
  <script>
    // Hell ist der Grundzustand: ein dunkel eingestellter Rechner am Beamer
    // zeigte sonst eine Seite, die im hellen Raum niemand lesen kann.
    // Derselbe Schlüssel wie alle Seiten aus shared/ – sie sollen sich gleich anfühlen.
    try {
      const t = localStorage.getItem('3d-druck.theme');
      document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
    } catch (e) { /* ignore */ }
  </script>
  <style>${STIL}
  </style>
  <link rel="stylesheet" href="shared/css/kontrast.css">
  <script type="module" src="shared/js/kontrast.js"></script>
</head>
<body>
  <header class="site-head">
    <div class="wrap head">
      ${MARKE}
      <h1>${e(SEITE.titel)}</h1>
      <button type="button" class="knopf thema" id="btn-theme" title="Hell/Dunkel umschalten">
        <span class="wenn-dunkel">${SONNE}</span>
        <span class="wenn-hell">${MOND}</span>
        <span class="wenn-dunkel themaname">Hell</span><span class="wenn-hell themaname">Dunkel</span>
      </button>
      <p class="lead">${e(SEITE.lead)}</p>
    </div>
  </header>

  <main class="wrap">
${RUBRIKEN.map(rubrikAbschnitt).join("\n\n")}
  </main>

  <footer class="wrap site-foot">
    <p>Die Sammlung wächst: die gestrichelten Kacheln sind die Bauteile, die als Nächstes dazukommen. Jede angezeigte Zahl wird gerechnet, nicht behauptet; wo ein Maß nicht aus Norm oder Katalog stammt, steht es in der Anleitung der Figur als Annahme.</p>
    <p>Alles läuft lokal im Browser.${SEITE.quelle ? ` Quelltext: <a href="${e(SEITE.quelle)}">${e(SEITE.quelle.replace(/^https?:\/\//, ""))}</a>` : ""}</p>
  </footer>
  <script>
    document.getElementById('btn-theme').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('3d-druck.theme', next); } catch (e) { /* ignore */ }
    });
  </script>
</body>
</html>
`;

writeFileSync(ZIEL, seite);
const zahl = RUBRIKEN.reduce((n, r) => n + r.kacheln.length, 0);
const fertig = RUBRIKEN.reduce((n, r) => n + r.kacheln.filter((k) => k.zustand === "fertig").length, 0);
console.log(`index.html geschrieben: ${RUBRIKEN.length} Rubriken, ${zahl} Kacheln, davon ${fertig} fertig.`);
