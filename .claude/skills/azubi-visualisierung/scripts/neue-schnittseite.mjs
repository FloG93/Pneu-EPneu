#!/usr/bin/env node
// Lays out a new section page (family "Schnitt": figur/schnittteile.mjs, figur/schnittseite.mjs) that builds and passes
// every gate at once, so the work on the next valve is replacing what is specific to it, not writing the frame.
//
//   node .claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs <Ordner> <id> "<Name>" [--rubrik <rubrik-id>]
//   node .claude/skills/azubi-visualisierung/scripts/neue-schnittseite.mjs <Ordner> --entfernen
//
//   e.g. neue-schnittseite.mjs Rueckschlagventil rueckschlagventil "Rückschlagventil" --rubrik sperr-und-stromventile
//
// The page is DERIVED from the shuttle valve (Wechselventil/), which is the reference for the family: its build script,
// legend, browser module, page test, model and model test are copied under the new names, so the new page draws, runs and
// passes like the shuttle valve until the parts are replaced. Everything that has to be replaced is marked
//   TODO(<id>): …
// in the copies (a comment before it, and the name of every check of the page's own browser module and test), so a
// check cannot be green without anybody noticing that it still checks the shuttle valve. The generator knows the
// places by anchors in the shuttle valve's sources: when one is gone (the shuttle valve changed), it stops and says
// which, instead of writing a page without that mark.
//
// It writes, and records in <Ordner>/.generiert.json (so that --entfernen can take exactly this back):
//   <Ordner>/tests/tools/build-<id>.mjs, legende-<id>.mjs, pruefe-<id>.mjs   geometry + tables, legend, browser module
//   <Ordner>/tests/seite.test.mjs, README.md (scaffold), favicon.svg, vorschau.svg
//   figur/<id>.mjs (model, the API of the shuttle valve's), figur/tests/<id>.test.mjs
//   package.json: test:<id> (and in "test"), bau:<id>, pruef:<id>, pruef:browser:<id>
//   .github/workflows/tests.yml: the geometry step; figur/tests/schnitt-seiten.test.mjs: the page's name in the list
//   the clone's info/exclude: <Ordner>/index.html and the record (pitfall: a folder with an index.html is published by pages.yml —
//   create it only when the page is presentable, then `git add -f <Ordner>/index.html`)
// A draft is never published by accident: its hint says ENTWURF and carries `TODO(<id>)` into index.html; pages.yml refuses to
// deploy a page whose index.html has `TODO(`, and figur/tests/publish-wachter.test.mjs fails for a committed one.
// Nothing existing is overwritten: when the folder, the model or a script name exists, nothing is written.
// It draws nothing new, writes no texts of its own and runs no git. The overview tile (figur/kacheln.mjs) stays "geplant".
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const BEZUG = "Wechselventil";
const MARKE = ".generiert.json";
const sha = (text) => createHash("sha256").update(text).digest("hex");
const lies = (pfad) => readFileSync(join(WURZEL, pfad), "utf8");

/** The exclude file of THIS clone (also under a git worktree, where .git is a file); null when there is no repository. */
function ausschlussDatei() {
  const r = spawnSync("git", ["rev-parse", "--git-path", "info/exclude"], { cwd: WURZEL, encoding: "utf8" });
  if (r.status !== 0 || !r.stdout.trim()) return null;
  return resolve(WURZEL, r.stdout.trim());
}

// --- arguments ----------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const w = args[i + 1]; args.splice(i, w && !w.startsWith("--") ? 2 : 1); return w ?? true; };
const entfernen = flag("--entfernen") === true;
const rubrik = flag("--rubrik");
const [ORDNER, ID, NAME] = args;
const hilfe = () => {
  console.error('Aufruf: node neue-schnittseite.mjs <Ordner> <id> "<Name>" [--rubrik <rubrik-id>]\n        node neue-schnittseite.mjs <Ordner> --entfernen');
  process.exit(2);
};
if (!ORDNER || (!entfernen && (!ID || !NAME))) hilfe();

// --- remove a page that was only generated -------------------------------------------------------------
if (entfernen) {
  const marke = join(WURZEL, ORDNER, MARKE);
  if (!existsSync(marke)) { console.error(`Nicht entfernt: ${ORDNER}/${MARKE} fehlt – das ist keine (oder keine unveränderte) generierte Seite.`); process.exit(1); }
  const M = JSON.parse(readFileSync(marke, "utf8"));
  const probleme = [];
  for (const [pfad, hash] of Object.entries(M.dateien)) {
    const voll = join(WURZEL, pfad);
    if (!existsSync(voll)) probleme.push(`${pfad} fehlt`);
    else if (sha(readFileSync(voll, "utf8")) !== hash) probleme.push(`${pfad} ist verändert`);
  }
  const bekannt = new Set([...Object.keys(M.dateien).map((p) => p.slice(ORDNER.length + 1)), MARKE, "index.html"]);
  const fremd = [];
  const suche = (rel) => { for (const n of readdirSync(join(WURZEL, ORDNER, rel))) { const r = rel ? `${rel}/${n}` : n; if (statSync(join(WURZEL, ORDNER, r)).isDirectory()) suche(r); else if (!bekannt.has(r)) fremd.push(r); } };
  suche("");
  if (fremd.length) probleme.push(`fremde Dateien: ${fremd.join(", ")}`);
  const pj = JSON.parse(lies("package.json"));
  for (const [k, v] of Object.entries(M.skripte)) if (pj.scripts[k] !== v) probleme.push(`package.json: ${k} ist verändert`);
  if (!pj.scripts.test.endsWith(M.testSuffix)) probleme.push("package.json: der Eintrag in \"test\" ist verändert");
  for (const e of M.einfuegungen) if (!lies(e.datei).includes(e.text)) probleme.push(`${e.datei}: die eingefügte Stelle ist verändert`);
  if (probleme.length) {
    console.error(`Nicht entfernt – die Seite ist nicht mehr nur generiert:\n  - ${probleme.join("\n  - ")}`);
    process.exit(1);
  }
  for (const pfad of Object.keys(M.dateien)) rmSync(join(WURZEL, pfad));
  for (const extra of ["index.html", MARKE]) rmSync(join(WURZEL, ORDNER, extra), { force: true });
  const leere = (rel) => { const d = join(WURZEL, rel); if (!existsSync(d)) return; for (const n of readdirSync(d)) if (statSync(join(d, n)).isDirectory()) leere(`${rel}/${n}`); if (!readdirSync(d).length) rmdirSync(d); };
  leere(ORDNER);
  for (const k of Object.keys(M.skripte)) delete pj.scripts[k];
  pj.scripts.test = pj.scripts.test.slice(0, -M.testSuffix.length);
  writeFileSync(join(WURZEL, "package.json"), JSON.stringify(pj, null, 2) + "\n");
  for (const e of M.einfuegungen) writeFileSync(join(WURZEL, e.datei), lies(e.datei).replace(e.text, () => ""));
  const ausschluss = ausschlussDatei();
  if (ausschluss && existsSync(ausschluss)) {
    const zeilen = readFileSync(ausschluss, "utf8").split("\n").filter((z) => !M.ausschluss.includes(z));
    writeFileSync(ausschluss, zeilen.join("\n"));
  }
  console.log(`Entfernt: ${ORDNER} (${Object.keys(M.dateien).length} Dateien, ${Object.keys(M.skripte).length} Skripte, ${M.einfuegungen.length} Einfügungen).`);
  process.exit(0);
}

// --- check everything before writing anything -----------------------------------------------------
const fehler = [];
if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(ORDNER)) fehler.push(`Ordner "${ORDNER}": nur Buchstaben, Ziffern und - (ohne Umlaute)`);
if (!/^[a-z0-9][a-z0-9-]*$/.test(ID)) fehler.push(`Kennung "${ID}": nur a–z, 0–9 und -`);
if (!NAME.trim()) fehler.push("Name fehlt");
if (existsSync(join(WURZEL, ORDNER))) fehler.push(`${ORDNER} gibt es schon – nichts überschrieben`);
if (existsSync(join(WURZEL, "figur", `${ID}.mjs`))) fehler.push(`figur/${ID}.mjs gibt es schon – nichts überschrieben`);
if (existsSync(join(WURZEL, "figur", "tests", `${ID}.test.mjs`))) fehler.push(`figur/tests/${ID}.test.mjs gibt es schon – nichts überschrieben`);
const paket = JSON.parse(lies("package.json"));
for (const k of [`test:${ID}`, `bau:${ID}`, `pruef:${ID}`, `pruef:browser:${ID}`]) if (paket.scripts[k]) fehler.push(`package.json hat schon ${k}`);
if (rubrik) {
  const kacheln = lies("figur/kacheln.mjs");
  if (!kacheln.includes(`id: "${rubrik}"`)) fehler.push(`Rubrik "${rubrik}" steht nicht in figur/kacheln.mjs`);
}
const KURZ = ID.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());   // rueckschlag-ventil -> RueckschlagVentil
if (fehler.length) { console.error("Nicht angelegt:\n  - " + fehler.join("\n  - ")); process.exit(1); }

// --- the sources of the reference page ------------------------------------------------------------------
const QUELLEN = {
  build: "Wechselventil/tests/tools/build-wechsel.mjs",
  legende: "Wechselventil/tests/tools/legende-wechsel.mjs",
  pruefe: "Wechselventil/tests/tools/pruefe-wechsel.mjs",
  seiteTest: "Wechselventil/tests/seite.test.mjs",
  modell: "figur/wechselventil.mjs",
  modellTest: "figur/tests/wechselventil.test.mjs",
  favicon: "Wechselventil/favicon.svg",
  vorschau: "Wechselventil/vorschau.svg",
};
for (const q of Object.values(QUELLEN)) if (!existsSync(join(WURZEL, q))) { console.error(`Die Bezugsseite ${BEZUG} ist unvollständig: ${q} fehlt.`); process.exit(1); }

/** Names: paths and file names take the folder and the id, the valve's name in prose takes the name. */
function umbenennen(text) {
  return text
    // the symbol's own label is said by figur/schaltzeichen.mjs, not by this page: the test keeps the neutral part
    .replaceAll('aria-label="Schaltzeichen Wechselventil', 'aria-label="Schaltzeichen ')
    .replaceAll("figur/wechselventil.mjs", `figur/${ID}.mjs`)
    .replaceAll("../wechselventil.mjs", `../${ID}.mjs`)
    .replaceAll("build-wechsel.mjs", `build-${ID}.mjs`)
    .replaceAll("legende-wechsel.mjs", `legende-${ID}.mjs`)
    .replaceAll("pruefe-wechsel.mjs", `pruefe-${ID}.mjs`)
    .replaceAll("pruefeWechsel", `pruefe${KURZ}`)
    .replace(/\/Wechselventil\//g, `/${ORDNER}/`)
    .replace(/Wechselventil\/tests/g, `${ORDNER}/tests`)
    .replace(/join\(WURZEL, "Wechselventil"/g, `join(WURZEL, "${ORDNER}"`)
    .replace(/Wechselventil/g, NAME);
}

/** A comment line `// TODO(<id>): …` before the first line that contains `anker`; stops when the anchor is gone. */
function markiere(quelle, datei, anker, hinweis) {
  const zeilen = quelle.split("\n");
  const i = zeilen.findIndex((z) => z.includes(anker));
  if (i < 0) { console.error(`Nicht angelegt: der Anker „${anker}“ fehlt in ${datei} – der Generator muss an die geänderte Bezugsseite angepasst werden.`); process.exit(1); }
  const einzug = zeilen[i].match(/^\s*/)[0];
  zeilen.splice(i, 0, `${einzug}// TODO(${ID}): ${hinweis}`);
  return zeilen.join("\n");
}
const markiereAlle = (quelle, datei, liste) => liste.reduce((q, [anker, hinweis]) => markiere(q, datei, anker, hinweis), quelle);
/** Every check of a page's own browser module / test names the TODO, so none is green unnoticed. */
const benenne = (text, muster) => text.replace(muster, (m) => `${m}TODO(${ID}): `);

const dateien = {};     // path (relative to the root) -> content
const baue = lies(QUELLEN.build);
// The draft shows itself on the card (the hint under the figure) AND carries `TODO(` into index.html, where the publish guards look.
const hinweisAlt = 'hinweis: "Eingänge, Automatik, Zeitlupe, zerlegen",';
if (!baue.includes(hinweisAlt)) { console.error("Nicht angelegt: der Anker der Hinweiszeile fehlt in " + QUELLEN.build + " – der Generator muss angepasst werden."); process.exit(1); }
const baueText = umbenennen(baue).replace(hinweisAlt, () => `hinweis: "ENTWURF – nicht veröffentlichen (TODO(${ID})) · Eingänge, Automatik, Zeitlupe, zerlegen",`);
dateien[`${ORDNER}/tests/tools/build-${ID}.mjs`] = markiereAlle(baueText, QUELLEN.build, [
  ["hinweis: \"ENTWURF", "der Hinweis der Karte; ENTWURF und die Aufgabenmarke in der Klammer erst entfernen, wenn die Seite vorzeigbar ist (die Wächter in pages.yml und im Test sehen daran, dass sie nicht veröffentlicht werden darf)"],
  ["// A shuttle valve", "Kopfkommentar: Bauform, Quelle (Quellenkarte), Maße, was überhöht ist"],
  ["// --- Dimensions", "Maße des Gehäuses, der Sitze und der Teile aus dem Schnittbild; Annahmen kennzeichnen"],
  ["const STOPFEN =", "die Drehteile (Profile, Nuten) des Bauteils"],
  ["const ANSCHLUESSE = {", "die Anschlüsse: Lage, Richtung, Name der Baugruppe, Raum"],
  ["const STAGGER =", "Reihenfolge des Zerlegens (außen zuerst) und die Fluchtwege MOVE, je Baugruppe der Legende"],
  ["const HOHLRAUM = [", "die Hohlräume des Gehäuses im Schnitt"],
  ["const RAUM_RECHTECKE = [", "die Lufträume, die nach Druck gefärbt werden"],
  ["function stopfen()", "die Teile des Bauteils (Verschlussstück, O-Ring, Körper) durch die eigenen ersetzen"],
  ["const ROUTEN = {", "die Wege der Teilchen in der Schnittebene (nur durch freie Luft)"],
  ["const ANZEIGE =", "Bedienung und Automatik des Bauteils: Konstanten, Schritte"],
  ["const LUFTWEGE = [", "wo Luft ist (die Browserprüfung liest es)"],
  ["const MESSPUNKTE = {", "je ein Punkt Luft in jedem Raum für die gemessene Kontrastprüfung"],
  ["const eigenes = `", "Laufzeit des Bauteils: Zustand, Hub, Raumtöne, Strom, Anzeige"],
  ["svg: wechselventilSymbol", "das Schaltzeichen des Bauteils (figur/schaltzeichen.mjs) statt des Symbols der Bezugsseite"],
  ["const LESETEXT =", "der Erklärtext: Lehrer-Sprache, nur belegte Zahlen, Annahmen als solche"],
  ["const INFO =", "der Hinweistext der Karte"],
  ["caption:", "Bildunterschrift"],
]);
dateien[`${ORDNER}/tests/tools/legende-${ID}.mjs`] = markiereAlle(umbenennen(lies(QUELLEN.legende)), QUELLEN.legende, [
  ["export const LEGENDE", "die Legende: jedes sichtbare Teil der Quelle, je Eintrag mindestens zwei Sätze, Zahlen aus dem Modell"],
]);
{
  let q = umbenennen(lies(QUELLEN.pruefe));
  q = benenne(q, /\bV\((?:"|`)/g);
  q = markiere(q, QUELLEN.pruefe, "export default async function", "die Prüfungen dieser Datei prüfen noch die Bezugsseite (daher TODO im Namen); durch die des Bauteils ersetzen, jede mit RED-Probe");
  dateien[`${ORDNER}/tests/tools/pruefe-${ID}.mjs`] = q;
}
{
  let q = umbenennen(lies(QUELLEN.seiteTest));
  q = benenne(q, /\btest\(["`]/g);
  q = markiere(q, QUELLEN.seiteTest, 'aria-label="Schaltzeichen', "das Schaltzeichen des Bauteils nennt seinen Namen im aria-label (figur/schaltzeichen.mjs); hier den Namen eintragen");
  q = markiere(q, QUELLEN.seiteTest, "execFileSync(process.execPath", "die Erwartungen dieses Tests (Legende, Zahlen, Texte) gelten noch der Bezugsseite; durch die des Bauteils ersetzen");
  dateien[`${ORDNER}/tests/seite.test.mjs`] = q;
}
dateien[`figur/${ID}.mjs`] = markiereAlle(umbenennen(lies(QUELLEN.modell)), QUELLEN.modell, [
  ["export const OS_1_4", "die Katalogwerte des Bauteils (mit Herkunft: Katalog / abgeleitet / Annahme); den Namen der Konstante anpassen"],
  ["export function schritt", "die Physik des Bauteils; jede Zahl von Hand nachrechnen und im Test belegen"],
]);
{
  let q = umbenennen(lies(QUELLEN.modellTest));
  q = benenne(q, /\btest\(["`]/g);
  q = markiere(q, QUELLEN.modellTest, "import test from", "dieser Test gilt noch dem Modell der Bezugsseite; neue Erwartungen von Hand nachgerechnet");
  dateien[`figur/tests/${ID}.test.mjs`] = q;
}
dateien[`${ORDNER}/favicon.svg`] = lies(QUELLEN.favicon);
dateien[`${ORDNER}/vorschau.svg`] = lies(QUELLEN.vorschau);
dateien[`${ORDNER}/README.md`] = `# ${NAME}

TODO(${ID}): Ein Satz, was die Figur zeigt, und die Quelle (Datenblatt, Schnittbild, Schaltzeichen) mit Teilenummer.

## Wie das Bauteil gebaut ist

TODO(${ID}): Die Baugruppen der Legende, Werkstoffe, Anschlüsse. Belegt, abgeleitet und angenommen getrennt nennen.

## Was die Figur zeigt

TODO(${ID}): Bedienung (Regler, Automatik, Zeitlupe, Zerlegen), die Farben (kräftiges Blau = unter Druck, blasses Blau = drucklos), das Schaltzeichen.

## Was die Figur nicht zeigt

TODO(${ID}): Jedes Maß, das nicht aus Katalog oder Norm stammt, steht hier als Annahme; ebenso Überhöhungen (Hub, Spalt).

## Prüfen

\`\`\`sh
npm run test:${ID}            # nur die Tests dieser Seite
npm run bau:${ID}             # erzeugt ${ORDNER}/index.html neu
npm run pruef:${ID}           # Geometrie in Ruhe und zerlegt
npm run pruef:browser:${ID}   # Browserprüfung, Server auf Port 8311 nötig
npm run gate -- ${ORDNER}     # alle Tore auf einmal, eine Zeile je Tor
\`\`\`

## Dateien

\`\`\`
${ORDNER}/
  tests/tools/build-${ID}.mjs     Geometrie + vier Datentabellen
  tests/tools/legende-${ID}.mjs   Legende
  tests/tools/pruefe-${ID}.mjs    nur Bauteilspezifisches der Browserprüfung (das Gemeinsame: figur/tests/tools/pruefe-schnitt.mjs)
  tests/seite.test.mjs            Tests der gebauten Seite
figur/${ID}.mjs                   Rechenmodell
figur/tests/${ID}.test.mjs        Tests des Modells
\`\`\`

## Noch zu tun (vor der Veröffentlichung)

- [ ] Quellenkarte: Schnittbild, Datenblatt, Schaltzeichen angesehen (references/schnittseite.md, Phase 0)
- [ ] Alle \`TODO(${ID})\` ersetzt: \`grep -rn "TODO(${ID})" ${ORDNER} figur\`
- [ ] Schaltzeichen des Bauteils in \`figur/schaltzeichen.mjs\` (Test dort)
- [ ] Kachel in \`figur/kacheln.mjs\` auf \`fertig\` mit \`ordner: "${ORDNER}"\`, Übersicht neu bauen
- [ ] Wurzel-\`README.md\` und \`CLAUDE.md\` (Prüfkanon, Zahl der Browserprüfung) ergänzen
- [ ] \`${ORDNER}/${MARKE}\` löschen (die Marke des Generators), \`git add -f ${ORDNER}/index.html\`
`;

// --- the edits of existing files ---------------------------------------------------------------------------
const skripte = {
  [`test:${ID}`]: `node --test "${ORDNER}/tests/*.test.mjs"`,
  [`bau:${ID}`]: `node ${ORDNER}/tests/tools/build-${ID}.mjs`,
  [`pruef:${ID}`]: `node ${ORDNER}/tests/tools/build-${ID}.mjs --audit && node ${ORDNER}/tests/tools/build-${ID}.mjs --apart`,
  [`pruef:browser:${ID}`]: `node figur/tests/tools/pruefe-figur.mjs http://127.0.0.1:8311/${ORDNER}/ ${ORDNER}/tests/tools/pruefe-${ID}.mjs`,
};
const testSuffix = ` && npm run test:${ID}`;
const einfuegungen = [];

const workflow = lies(".github/workflows/tests.yml");
const ankerCI = "      - name: Erzeugte Seiten sind aktuell";
if (!workflow.includes(ankerCI)) { console.error("Nicht angelegt: .github/workflows/tests.yml hat den Schritt „Erzeugte Seiten sind aktuell“ nicht mehr."); process.exit(1); }
const schritt = `      - name: Geometrie des ${NAME} prüfen\n        run: npm run pruef:${ID}\n`;
einfuegungen.push({ datei: ".github/workflows/tests.yml", text: schritt, vor: ankerCI });

const liste = lies("figur/tests/schnitt-seiten.test.mjs");
const ankerListe = "];\n\nfor (const [ordner, modul] of SEITEN)";
if (!liste.includes(ankerListe)) { console.error("Nicht angelegt: figur/tests/schnitt-seiten.test.mjs hat die Liste SEITEN nicht mehr."); process.exit(1); }
const eintrag = `  ["${ORDNER}", "pruefe-${ID}.mjs"],\n`;
einfuegungen.push({ datei: "figur/tests/schnitt-seiten.test.mjs", text: eintrag, vor: ankerListe });

// --- write -----------------------------------------------------------------------------------------------
for (const [pfad, inhalt] of Object.entries(dateien)) {
  mkdirSync(dirname(join(WURZEL, pfad)), { recursive: true });
  writeFileSync(join(WURZEL, pfad), inhalt);
}
paket.scripts = Object.fromEntries(Object.entries(paket.scripts).flatMap(([k, v]) => {
  const eintraege = [[k, k === "test" ? v + testSuffix : v]];
  if (k === "test:wechsel") eintraege.push([`test:${ID}`, skripte[`test:${ID}`]]);
  if (k === "pruef:browser:wechsel") for (const n of [`bau:${ID}`, `pruef:${ID}`, `pruef:browser:${ID}`]) eintraege.push([n, skripte[n]]);
  return eintraege;
}));
for (const k of Object.keys(skripte)) if (!paket.scripts[k]) { console.error(`Nicht vollständig angelegt: package.json hat den Bezugsschlüssel für ${k} nicht – bitte von Hand eintragen.`); }
writeFileSync(join(WURZEL, "package.json"), JSON.stringify(paket, null, 2) + "\n");
for (const e of einfuegungen) writeFileSync(join(WURZEL, e.datei), lies(e.datei).replace(e.vor, () => e.text + e.vor));

const ausschluss = [`${ORDNER}/index.html`, `${ORDNER}/${MARKE}`];
const ausschlussPfad = ausschlussDatei();
if (ausschlussPfad) {
  mkdirSync(dirname(ausschlussPfad), { recursive: true });
  const alt = existsSync(ausschlussPfad) ? readFileSync(ausschlussPfad, "utf8") : "";
  writeFileSync(ausschlussPfad, alt + (alt && !alt.endsWith("\n") ? "\n" : "") + ausschluss.join("\n") + "\n");
} else {
  console.log("Hinweis: kein Git-Repository – die Ausschlusszeilen für index.html wurden nicht eingetragen.");
}
writeFileSync(join(WURZEL, ORDNER, MARKE), JSON.stringify({
  id: ID, ordner: ORDNER, name: NAME, rubrik: rubrik ?? null,
  dateien: Object.fromEntries(Object.entries(dateien).map(([p, t]) => [p, sha(t)])),
  skripte, testSuffix, einfuegungen: einfuegungen.map(({ datei, text }) => ({ datei, text })), ausschluss,
}, null, 2) + "\n");

console.log(`Angelegt: ${ORDNER} („${NAME}“, Kennung ${ID}), abgeleitet von ${BEZUG}.`);
for (const p of Object.keys(dateien)) console.log(`  ${p}`);
console.log(`  package.json: ${Object.keys(skripte).join(", ")}; .github/workflows/tests.yml; figur/tests/schnitt-seiten.test.mjs`);
console.log(`Bauen und prüfen:\n  npm run bau:${ID} && npm run pruef:${ID}\nStellen, die noch zu ersetzen sind:\n  grep -rn "TODO(${ID})" ${ORDNER} figur`);
if (rubrik) console.log(`Kachel: in der Rubrik „${rubrik}“ von figur/kacheln.mjs bleibt sie „geplant“, bis die Seite vorzeigbar ist.`);
