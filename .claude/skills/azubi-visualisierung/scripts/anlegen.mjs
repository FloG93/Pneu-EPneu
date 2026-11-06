#!/usr/bin/env node
// Lays out a new learning site for apprentices from this skill's template:
// overview page with tiles, the subject-free figure scaffold (figur/), the
// contrast control (shared/), tests and the Pages workflow.
//
//   node .claude/skills/azubi-visualisierung/scripts/anlegen.mjs <zielordner> <projekt.json>
//
// <projekt.json> describes the subject; scripts/projekt.beispiel.json shows
// every field. Nothing in the target is overwritten: if it already has a
// figur/ folder the script stops, because then the work is "add a component",
// not "start a project".
//
// What it does NOT do: draw any component, write a calculation model, or run
// git. The overview it prepares lists every tile as "geplant" until a page
// exists.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VORLAGE = join(SKILL, "vorlage");
const ANATOMY = resolve(SKILL, "..", "anatomy");

const [zielArg, projektArg] = process.argv.slice(2);
if (!zielArg || !projektArg) {
  console.error("Aufruf: node anlegen.mjs <zielordner> <projekt.json>");
  process.exit(2);
}
const ZIEL = resolve(zielArg);
const P = JSON.parse(readFileSync(resolve(projektArg), "utf8"));

// --- check the description before touching anything ----------------------
const fehler = [];
const pflicht = (wert, was) => { if (!wert || (typeof wert === "string" && !wert.trim())) fehler.push(`${was} fehlt`); };
pflicht(P.titel, "titel");
pflicht(P.beschreibung, "beschreibung");
pflicht(P.lead, "lead");
if (!Array.isArray(P.rubriken) || !P.rubriken.length) fehler.push("rubriken fehlt oder ist leer");
const ids = new Set();
for (const r of P.rubriken ?? []) {
  if (!/^[a-z0-9-]+$/.test(r.id ?? "")) fehler.push(`Rubrik-Kennung "${r.id}" (nur a–z, 0–9, -)`);
  for (const k of r.kacheln ?? []) {
    if (!/^[a-z0-9-]+$/.test(k.id ?? "")) fehler.push(`Kachel-Kennung "${k.id}" (nur a–z, 0–9, -)`);
    if (ids.has(k.id)) fehler.push(`Kachel-Kennung "${k.id}" doppelt`);
    ids.add(k.id);
    if (!/[.!?]$/.test((k.satz ?? "").trim())) fehler.push(`Kachel ${k.id}: der Satz muss ein ganzer Satz sein`);
  }
}
const HEX = /^#[0-9a-f]{6}$/i;
if (P.medium?.toene) {
  for (const m of ["light", "dark"]) {
    for (const t of ["stark", "blass", "rand"]) {
      if (!HEX.test(P.medium.toene[m]?.[t] ?? "")) fehler.push(`medium.toene.${m}.${t} ist keine Farbe #rrggbb`);
    }
  }
}
if (existsSync(join(ZIEL, "figur"))) fehler.push(`${ZIEL}/figur gibt es schon – dort ein Bauteil ergänzen statt neu anlegen`);
if (!existsSync(join(ANATOMY, "kit", "iso-kit.mjs"))) {
  fehler.push(`das Zeichen-Kit fehlt: ${ANATOMY}/kit/iso-kit.mjs – der Skill "anatomy" muss neben diesem Skill liegen`);
}
if (fehler.length) {
  console.error("Nicht angelegt:\n  - " + fehler.join("\n  - "));
  process.exit(1);
}

const paket = P.paket ?? P.titel.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const json = (v) => JSON.stringify(v);

// --- copy the template ----------------------------------------------------
mkdirSync(ZIEL, { recursive: true });
const geschrieben = [];
function kopiere(von, nach) {
  for (const name of readdirSync(von)) {
    const quelle = join(von, name);
    const ziel = join(nach, name === "gitignore" ? ".gitignore" : name);
    if (statSync(quelle).isDirectory()) { mkdirSync(ziel, { recursive: true }); kopiere(quelle, ziel); continue; }
    if (existsSync(ziel)) { console.log(`  behalten  ${ziel.slice(ZIEL.length + 1)} (gab es schon)`); continue; }
    cpSync(quelle, ziel);
    geschrieben.push(ziel.slice(ZIEL.length + 1));
  }
}
kopiere(VORLAGE, ZIEL);

// --- fill the placeholders ------------------------------------------------
const medium = P.medium ?? {};
const mediumAbsatz = medium.name
  ? `Das Medium ist **${medium.name}**. Zwei Töne, zwei Bedeutungen: **kräftig** = ${medium.stark ?? "unter Druck"}, `
    + `**blass** = ${medium.blass ?? "entspannt"}. Sie unterscheiden sich in der **Helligkeit**, nicht im Farbton, `
    + "und sind in `figur/luft.mjs` (`FARBEN`) festgelegt und von `figur/tests/luft.test.mjs` gemessen. "
    + "Die Schlüssel heißen dort `druck` (kräftig) und `abluft` (blass), egal welches Medium."
  : "Dieses Projekt hat (noch) kein strömendes Medium. Kommt eins dazu: Töne nach "
    + "`.claude/skills/azubi-visualisierung/references/farben.md` wählen und messen.";
const festlegungen = (P.festlegungen ?? []).map((f) => `- ${f}`).join("\n")
  || "- (noch keine – beim Klären des Auftrags hier eintragen)";
const bauteile = P.rubriken.flatMap((r) => r.kacheln.map((k) => `| ${r.titel} | ${k.name} | ${k.satz} |`)).join("\n");
const ersetze = (datei, werte) => {
  const pfad = join(ZIEL, datei);
  if (!geschrieben.includes(datei)) return;
  let s = readFileSync(pfad, "utf8");
  for (const [k, v] of Object.entries(werte)) s = s.split(`{{${k}}}`).join(v);
  writeFileSync(pfad, s);
};
const werte = {
  TITEL: P.titel, PAKET: paket, LEAD: P.lead, BAUTEILE: bauteile,
  BESCHREIBUNG: P.beschreibung.replace(/"/g, "'"), MEDIUM_ABSATZ: mediumAbsatz, FESTLEGUNGEN: festlegungen,
};
for (const d of ["CLAUDE.md", "README.md", "package.json"]) ersetze(d, werte);

// --- the medium's two tones ------------------------------------------------
if (medium.toene && geschrieben.includes("figur/luft.mjs")) {
  const pfad = join(ZIEL, "figur", "luft.mjs");
  const s = readFileSync(pfad, "utf8");
  const t = medium.toene;
  const neu = "export const FARBEN = {\n"
    + `  light: { druck: "${t.light.stark}", abluft: "${t.light.blass}", rand: "${t.light.rand}" },\n`
    + `  dark: { druck: "${t.dark.stark}", abluft: "${t.dark.blass}", rand: "${t.dark.rand}" },\n};`;
  const ersetzt = s.replace(/export const FARBEN = \{[\s\S]*?\n\};/, neu);
  if (ersetzt === s) throw new Error("FARBEN in figur/luft.mjs nicht gefunden – Vorlage hat sich geändert");
  writeFileSync(pfad, ersetzt);
}

// --- the tile table ---------------------------------------------------------
const kachel = (k) => {
  const z = [
    `        id: ${json(k.id)},`,
    `        name: ${json(k.name)},`,
    `        satz: ${json(k.satz)},`,
    `        zustand: "geplant",`,
  ];
  if (k.ordner) z.push(`        ordner: ${json(k.ordner)},`);
  if (k.sinnbild) z.push(`        sinnbild: ${json(k.sinnbild)},`);
  if (k.marken?.length) z.push(`        marken: ${json(k.marken)},`);
  return `      {\n${z.join("\n")}\n      },`;
};
const rubrik = (r) => `  {
    id: ${json(r.id)},
    titel: ${json(r.titel)},
    einleitung: ${json(r.einleitung)},
    kacheln: [
${r.kacheln.map(kachel).join("\n")}
    ],
  },`;
writeFileSync(join(ZIEL, "figur", "kacheln.mjs"), `// The overview page's contents as data, not as markup.
//
// Adding a component means adding one entry here and switching its \`zustand\`
// to "fertig" once its page exists. Nothing else on the overview changes.
// A finished tile shows \`<ordner>/vorschau.svg\` as its picture if there is one.
//
// \`sinnbild\` names the symbol a tile will carry once the symbols are drawn;
// the slot is reserved now so adding them later does not disturb the layout.
import { FARBEN } from "./luft.mjs";

/** @typedef {{ id: string, name: string, satz: string, zustand: "fertig" | "geplant", ordner?: string, sinnbild?: string, marken?: string[] }} Kachel */
/** @typedef {{ id: string, titel: string, einleitung: string, kacheln: Kachel[] }} Rubrik */

/**
 * Everything on the overview page that is not a tile. \`toene\` are the two
 * medium tones the previews use, the same measured pair the figures draw with.
 */
export const SEITE = {
  titel: ${json(P.titel)},
  beschreibung: ${json(P.beschreibung)},
  lead: ${json(P.lead)},
  sinnbildName: ${json(P.sinnbildName ?? "Symbol")},
  quelle: ${json(P.quelle ?? "")},
  toene: {
    light: { stark: FARBEN.light.druck, blass: FARBEN.light.abluft },
    dark: { stark: FARBEN.dark.druck, blass: FARBEN.dark.abluft },
  },
};

/** @type {Rubrik[]} */
export const RUBRIKEN = [
${P.rubriken.map(rubrik).join("\n")}
];

/** Every tile, flattened, in the order the page shows them. */
export function alleKacheln() {
  return RUBRIKEN.flatMap((r) => r.kacheln.map((k) => ({ ...k, rubrik: r.id })));
}

/** The tiles whose page exists. */
export function fertige() {
  return alleKacheln().filter((k) => k.zustand === "fertig");
}
`);
geschrieben.push("figur/kacheln.mjs");

// --- the skills travel with the project ------------------------------------
for (const [name, quelle] of [["anatomy", ANATOMY], ["azubi-visualisierung", SKILL]]) {
  const ziel = join(ZIEL, ".claude", "skills", name);
  if (existsSync(ziel)) { console.log(`  behalten  .claude/skills/${name} (gab es schon)`); continue; }
  if (resolve(quelle) === resolve(ziel)) continue;
  mkdirSync(dirname(ziel), { recursive: true });
  cpSync(quelle, ziel, { recursive: true });
  geschrieben.push(`.claude/skills/${name}/`);
}

console.log(`${basename(ZIEL)}: ${geschrieben.length} Dateien angelegt.`);
for (const g of geschrieben) console.log("  neu       " + g);
console.log(`
Weiter:
  cd ${ZIEL}
  npm test                    # Gerüst, Kacheln, Medientöne – muss grün sein
  npm run bau:uebersicht      # schreibt index.html (geht beim Push live!)
Dann das erste Bauteil nach SKILL.md, Abschnitt "Ein Bauteil bauen".`);
