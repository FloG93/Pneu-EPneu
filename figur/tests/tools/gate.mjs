// One command for every gate of a page: tests, audit, taking apart, line ends, freshness, browser check.
//
//   npm run gate -- <Ordner> [--lauefe 5] [--wackel] [--weiter]
//   npm run gate:alle [-- --lauefe 1] [--weiter]
//
// It finds the page's scripts by name (<Ordner>/tests/tools/build-*.mjs and pruefe-*.mjs) and runs, in this order:
//   npm test (once per call)  ·  build --audit  ·  build --apart  ·  rebuild of the page and of the overview, then
//   git diff --exit-code of both  ·  lines.mjs (line ends)  ·  the browser check × --lauefe against a server it starts
//   on port 8311 and stops again (by PID)  ·  with --wackel 8 more runs and one under `taskset -c 0` with a load.
// It prints ONE line per gate (`ok` / `FEHLT` / `WARN`); everything the commands printed goes to a log file whose path
// stands at the end. It stops at the first red gate (--weiter: runs the rest). Exit code 1 when a gate is red.
// `gate:alle` runs every page and prints a table page × gate (one browser run per page unless --lauefe is given).
//
// It uses the commands of the checking canon (CLAUDE.md), never numbers of its own: the browser count is printed as the
// check reports it; it is only compared with the one in CLAUDE.md, and a difference is a WARN line, not a failure.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const PORT = 8311;

// --- finding the page's scripts --------------------------------------------------------------------
/** The scripts of one page by the naming convention; null when it has none. */
export function erkenne(wurzel, ordner) {
  const dir = join(wurzel, ordner, "tests", "tools");
  if (!existsSync(dir)) return null;
  const dateien = readdirSync(dir);
  const bau = dateien.filter((d) => /^build-.+\.mjs$/.test(d));
  const pruefe = dateien.filter((d) => /^pruefe-.+\.mjs$/.test(d));
  if (bau.length !== 1 || pruefe.length !== 1) return null;
  return { ordner, bau: `${ordner}/tests/tools/${bau[0]}`, pruefe: `${ordner}/tests/tools/${pruefe[0]}` };
}

/** Every folder of the repo that has both a build script and a browser module. */
export function alleSeiten(wurzel) {
  return readdirSync(wurzel).filter((d) => statSync(join(wurzel, d)).isDirectory() && erkenne(wurzel, d)).sort();
}

/**
 * The canon's commands for one page, as arrays: the same strings as the package.json scripts `pruef:<name>` and
 * `pruef:browser:<name>` (a test compares them), so the gate has no second truth.
 */
export function befehle(seite, port = PORT) {
  return {
    audit: ["node", seite.bau, "--audit"],
    apart: ["node", seite.bau, "--apart"],
    bau: ["node", seite.bau],
    uebersicht: ["node", "figur/tests/tools/build-uebersicht.mjs"],
    linien: ["node", ".claude/skills/anatomy/scripts/lines.mjs", `${seite.ordner}/index.html`],
    browser: ["node", "figur/tests/tools/pruefe-figur.mjs", `http://127.0.0.1:${port}/${seite.ordner}/`, seite.pruefe],
  };
}

// --- reading what the commands print ---------------------------------------------------------------------
/** The sum of `# pass N` / `# fail N` over the TAP summaries of an `npm test` (it runs several `node --test`). */
export function tapSumme(ausgabe) {
  const summe = (name) => [...ausgabe.matchAll(new RegExp(`^# ${name} (\\d+)$`, "gm"))].reduce((s, m) => s + Number(m[1]), 0);
  return { pass: summe("pass"), fail: summe("fail") };
}
/** `all checks passed (168)` -> 168; `3 von 172 Prüfungen fehlgeschlagen` -> { fehler: 3, von: 172 }. */
export function browserErgebnis(ausgabe) {
  const gut = ausgabe.match(/all checks passed \((\d+)\)/);
  if (gut) return { ok: true, n: Number(gut[1]) };
  const schlecht = ausgabe.match(/(\d+) von (\d+) Prüfungen fehlgeschlagen/);
  const erste = ausgabe.split("\n").find((z) => /^\s+FEHLT/.test(z));
  return { ok: false, fehler: schlecht ? Number(schlecht[1]) : null, von: schlecht ? Number(schlecht[2]) : null, erste: erste?.trim() ?? null };
}
/** The number the canon in CLAUDE.md names for a script (`npm run pruef:browser:wechsel` … `all checks passed (168)`); null when absent. */
export function kanonZahl(claudeMd, skript) {
  const zeile = claudeMd.split("\n").find((z) => z.includes(`npm run ${skript}`) && /all checks passed \(\d+\)/.test(z));
  return zeile ? Number(zeile.match(/all checks passed \((\d+)\)/)[1]) : null;
}
/** The package.json script that runs the browser check of a folder. */
export function browserSkript(paketJson, ordner) {
  return Object.keys(paketJson.scripts).find((k) => k.startsWith("pruef:browser") && paketJson.scripts[k].includes(`/${ordner}/ `)) ?? null;
}

// --- the server, stopped by PID ------------------------------------------------------------------------------
const antwortet = (port) => new Promise((fertig) => {
  const r = request({ host: "127.0.0.1", port, path: "/", method: "HEAD", timeout: 800 }, (res) => { res.resume(); fertig(true); });
  r.on("error", () => fertig(false));
  r.on("timeout", () => { r.destroy(); fertig(false); });
  r.end();
});
/**
 * Start a static server on `port` in `wurzel` (or use the one that already answers) and give back its PID and a `stoppe()`
 * that ends exactly this process. `befehl` is replaceable for tests.
 */
export async function starteServer({ wurzel = WURZEL, port = PORT, versuche = 60, befehl = ["python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"]] } = {}) {
  if (await antwortet(port)) return { pid: null, vorhanden: true, stoppe: async () => {} };
  const kind = spawn(befehl[0], befehl[1], { cwd: wurzel, stdio: "ignore", detached: false });
  const aus = new Promise((fertig) => kind.once("exit", fertig));
  const stoppe = async () => {
    if (kind.exitCode === null && kind.signalCode === null) { kind.kill("SIGTERM"); await Promise.race([aus, new Promise((f) => setTimeout(f, 3000))]); }
    if (kind.exitCode === null && kind.signalCode === null) { kind.kill("SIGKILL"); await aus; }
  };
  for (let i = 0; i < versuche; i += 1) {
    if (await antwortet(port)) return { pid: kind.pid, vorhanden: false, stoppe };
    if (kind.exitCode !== null) break;
    await new Promise((f) => setTimeout(f, 100));
  }
  await stoppe();
  throw new Error(`Der Server auf Port ${port} kam nicht hoch`);
}

// --- running the gates ----------------------------------------------------------------------------------
export class Log {
  constructor(pfad) { this.pfad = pfad; mkdirSync(join(pfad, ".."), { recursive: true }); writeFileSync(pfad, ""); }
  kopf(text) { appendFileSync(this.pfad, `\n===== ${text} =====\n`); }
  text(t) { appendFileSync(this.pfad, t.endsWith("\n") ? t : t + "\n"); }
}

/** Run one command, write everything to the log, return { status, ausgabe }. */
export function lauf(befehl, { cwd = WURZEL, env = {}, log = null, titel = null, timeout = 900000 } = {}) {
  const r = spawnSync(befehl[0] === "node" ? process.execPath : befehl[0], befehl.slice(1), { cwd, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout });
  const ausgabe = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (log) { log.kopf(`${titel ?? befehl.join(" ")} (Exit ${r.status})`); log.text(`$ ${befehl.join(" ")}`); log.text(ausgabe); }
  return { status: r.status ?? 1, ausgabe };
}

/**
 * The gates of one page as a list of { id, name, lauf }: `lauf()` returns { ok, text } (and `warn`). `opt`:
 * lauefe, wackel, ohneTest. Nothing is run here.
 */
export function tore(wurzel, seite, opt, { log = null, claudeMd = null, paketJson = null } = {}) {
  const { ordner } = seite;
  const B = befehle(seite);
  const ausfuehren = (befehl, extra = {}) => lauf(befehl, { cwd: wurzel, log, ...extra });
  const liste = [];
  if (!opt.ohneTest) {
    liste.push({ id: "test", name: "npm test", lauf: () => {
      const r = ausfuehren(["npm", "test"], { titel: "npm test" });
      const t = tapSumme(r.ausgabe);
      return { ok: r.status === 0 && t.fail === 0, text: `${t.pass} Tests${t.fail ? `, ${t.fail} fehlgeschlagen` : ""}` };
    } });
  }
  liste.push({ id: "audit", name: "audit", lauf: () => {
    const r = ausfuehren(B.audit, { titel: `${ordner}: audit` });
    return { ok: r.status === 0 && /audit passed/.test(r.ausgabe), text: /audit passed/.test(r.ausgabe) ? "audit passed" : "kein „audit passed“" };
  } });
  liste.push({ id: "apart", name: "apart", lauf: () => {
    const r = ausfuehren(B.apart, { titel: `${ordner}: apart` });
    const z = r.ausgabe.split("\n").find((l) => l.startsWith("auseinandergefahren:")) ?? "kein Ergebnis";
    return { ok: r.status === 0 && /sauber/.test(z), text: z };
  } });
  liste.push({ id: "frisch", name: "frisch", lauf: () => {
    const a = ausfuehren(B.bau, { titel: `${ordner}: Neubau` });
    const u = ausfuehren(B.uebersicht, { titel: "Neubau der Übersicht" });
    if (a.status !== 0 || u.status !== 0) return { ok: false, text: "der Neubau schlug fehl" };
    if (!existsSync(join(wurzel, ".git"))) return { ok: true, text: "kein .git, nicht verglichen" };
    const verfolgt = ausfuehren(["git", "ls-files", "--error-unmatch", `${ordner}/index.html`], { titel: "git ls-files" }).status === 0;
    const pfade = verfolgt ? [`${ordner}/index.html`, "index.html"] : ["index.html"];
    const d = ausfuehren(["git", "diff", "--exit-code", "--stat", "--", ...pfade], { titel: "git diff" });
    return { ok: d.status === 0, text: d.status === 0 ? `${verfolgt ? "Seite und " : ""}Übersicht gleich dem Commit${verfolgt ? "" : " (Seite noch nicht in git)"}` : `weicht vom Commit ab: ${d.ausgabe.split("\n").filter(Boolean).slice(0, 2).join(" | ")}` };
  } });
  liste.push({ id: "linien", name: "linien", lauf: () => {
    const r = ausfuehren(B.linien, { titel: `${ordner}: Linienenden`, env: { CHROME_PATH: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium" } });
    const z = r.ausgabe.match(/line ends: \d+ of \d+/)?.[0];
    return { ok: r.status === 0 && /^line ends: 0 of/.test(z ?? ""), text: z ?? "kein Ergebnis" };
  } });
  const browserLauf = (titel, zusatz = {}) => {
    const befehl = [...(zusatz.davor ?? []), ...B.browser];
    return lauf(befehl, { cwd: wurzel, log, titel, env: { CHROME_PATH: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium" } });
  };
  /** n runs; all must pass with the same count. */
  const mehrfach = (n, name, titel, zusatz) => () => {
    const zahlen = [];
    for (let i = 1; i <= n; i += 1) {
      const r = browserLauf(`${ordner}: ${titel} ${i}/${n}`, zusatz);
      const e = browserErgebnis(r.ausgabe);
      if (!e.ok || r.status !== 0) return { ok: false, text: `Lauf ${i}/${n}: ${e.fehler ?? "?"} von ${e.von ?? "?"} fehlgeschlagen${e.erste ? " – " + e.erste.slice(0, 110) : ""}` };
      zahlen.push(e.n);
    }
    if (new Set(zahlen).size > 1) return { ok: false, text: `die Zahl der Prüfungen schwankt: ${[...new Set(zahlen)].join(", ")}` };
    const res = { ok: true, text: `${zahlen[0]} ×${n}` };
    if (name === "browser" && claudeMd && paketJson) {
      const skript = browserSkript(paketJson, ordner);
      const kanon = skript ? kanonZahl(claudeMd, skript) : null;
      if (kanon !== null && kanon !== zahlen[0]) res.warn = `CLAUDE.md nennt ${kanon} für ${skript}, gefunden ${zahlen[0]}`;
    }
    return res;
  };
  liste.push({ id: "browser", name: "browser", braucht: "server", lauf: mehrfach(opt.lauefe, "browser", "Browserprüfung") });
  if (opt.wackel) {
    liste.push({ id: "wackel", name: "wackel", braucht: "server", lauf: mehrfach(8, "wackel", "Wackelprüfung") });
    liste.push({ id: "last", name: "last", braucht: "server", lauf: () => {
      if (spawnSync("taskset", ["--version"]).error) return { ok: false, text: "taskset fehlt" };
      const last = spawn("taskset", ["-c", "0", "yes"], { stdio: "ignore" });
      try { return mehrfach(1, "last", "Lauf unter Last (taskset -c 0 + yes)", { davor: ["taskset", "-c", "0"] })(); }
      finally { last.kill("SIGKILL"); }
    } });
  }
  return liste;
}

/**
 * Run the gates in order. `zeile(status, name, text)` prints one line per gate. Stops at the first red one unless
 * `weiter`. Returns [{ id, name, status: "ok" | "FEHLT" | "-", text, warn }].
 */
export async function fuehreTore(liste, { weiter = false, zeile = () => {}, mitServer = null } = {}) {
  const ergebnis = [];
  let rot = false;
  let server = null;
  try {
    for (const t of liste) {
      if (rot && !weiter) { ergebnis.push({ id: t.id, name: t.name, status: "-", text: "nicht gelaufen" }); continue; }
      if (t.braucht === "server" && !server && mitServer) server = await mitServer();
      let r;
      try { r = await t.lauf(); } catch (e) { r = { ok: false, text: `Ausnahme: ${e.message}` }; }
      ergebnis.push({ id: t.id, name: t.name, status: r.ok ? "ok" : "FEHLT", text: r.text, warn: r.warn });
      zeile(r.ok ? "ok" : "FEHLT", t.name, r.text);
      if (r.warn) zeile("WARN", t.name, r.warn);
      if (!r.ok) rot = true;
    }
  } finally {
    if (server) await server.stoppe();
  }
  return ergebnis;
}

/** One printed line. */
export const formatiere = (status, name, text, log = null) =>
  `${status.padEnd(5)} ${name.padEnd(8)} ${text}${status === "FEHLT" && log ? ` – Details: ${log}` : ""}`;

/** The table page × gate. */
export function tabelle(zeilen) {
  const ids = [...new Set(zeilen.flatMap((z) => z.tore.map((t) => t.name)))];
  const kopf = ["Seite", ...ids];
  const reihen = zeilen.map((z) => [z.ordner, ...ids.map((id) => { const t = z.tore.find((x) => x.name === id); return !t ? "" : t.status === "ok" ? (id === "browser" ? `ok ${t.text.split(" ")[0]}` : "ok") : t.status === "FEHLT" ? "FEHLT" : "-"; })]);
  const breiten = kopf.map((_, i) => Math.max(...[kopf, ...reihen].map((r) => String(r[i]).length)));
  const zl = (r) => r.map((c, i) => String(c).padEnd(breiten[i])).join("  ").trimEnd();
  return [zl(kopf), zl(breiten.map((b) => "-".repeat(b))), ...reihen.map(zl)].join("\n");
}

// --- main ------------------------------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const nimm = (name, mitWert) => { const i = args.indexOf(name); if (i < 0) return null; if (!mitWert) { args.splice(i, 1); return true; } const w = args[i + 1]; args.splice(i, 2); return w; };
  const alle = nimm("--alle", false);
  const wackel = Boolean(nimm("--wackel", false));
  const weiter = Boolean(nimm("--weiter", false));
  const laeufeArg = nimm("--lauefe", true);
  const ordner = args[0];
  if (!alle && !ordner) {
    console.error("Aufruf: npm run gate -- <Ordner> [--lauefe 5] [--wackel] [--weiter]\n        npm run gate:alle [-- --lauefe 1] [--weiter]");
    process.exit(2);
  }
  const seiten = alle ? alleSeiten(WURZEL).map((o) => erkenne(WURZEL, o)) : [erkenne(WURZEL, ordner)];
  if (!seiten[0]) {
    console.error(`${ordner}: keine Skripte tests/tools/build-*.mjs und pruefe-*.mjs gefunden`);
    process.exit(2);
  }
  const lauefe = Number(laeufeArg ?? (alle ? 1 : 5));
  const logPfad = join(process.env.GATE_LOG_DIR ?? tmpdir(), `gate-${alle ? "alle" : ordner}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
  const log = new Log(logPfad);
  const claudeMd = existsSync(join(WURZEL, "CLAUDE.md")) ? readFileSync(join(WURZEL, "CLAUDE.md"), "utf8") : null;
  const paketJson = JSON.parse(readFileSync(join(WURZEL, "package.json"), "utf8"));
  const start = Date.now();
  let server = null;
  const aufraeumen = async () => { if (server) { await server.stoppe(); server = null; } };
  for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, async () => { await aufraeumen(); process.exit(130); });
  const mitServer = async () => {
    if (!server) { server = await starteServer({}); log.text(server.vorhanden ? "Server: ein vorhandener antwortet auf Port 8311" : `Server: python3 http.server, PID ${server.pid}`); }
    return { stoppe: async () => {} };
  };
  const zeilen = [];
  let rot = false;
  try {
    let npmTest = null;
    if (alle) {
      const r = lauf(["npm", "test"], { cwd: WURZEL, log, titel: "npm test" });
      const t = tapSumme(r.ausgabe);
      const ok = r.status === 0 && t.fail === 0;
      console.log(formatiere(ok ? "ok" : "FEHLT", "npm test", `${t.pass} Tests`, logPfad));
      if (!ok) rot = true;
      npmTest = { name: "npm test", status: ok ? "ok" : "FEHLT", text: `${t.pass}` };
    }
    if (!(alle && rot && !weiter)) {
      for (const seite of seiten) {
        if (alle) console.log(`\n== ${seite.ordner}`);
        const liste = tore(WURZEL, seite, { lauefe, wackel, ohneTest: alle }, { log, claudeMd, paketJson });
        const ergebnis = await fuehreTore(liste, { weiter, mitServer, zeile: (s, n, t) => console.log(formatiere(s, n, t, logPfad)) });
        zeilen.push({ ordner: seite.ordner, tore: npmTest ? [npmTest, ...ergebnis] : ergebnis });
        if (ergebnis.some((e) => e.status === "FEHLT")) rot = true;
      }
    }
  } finally {
    await aufraeumen();
  }
  if (alle) console.log(`\n${tabelle(zeilen)}`);
  const sek = Math.round((Date.now() - start) / 1000);
  console.log(`\n${rot ? "ROT" : "grün"} – Dauer ${Math.floor(sek / 60)} min ${sek % 60} s – Log: ${logPfad}`);
  process.exit(rot ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
