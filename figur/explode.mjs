// The exploded view, shared by every figure: escape paths, springs, staggered
// timing, the field of view when everything is out, and the per-frame depth
// sorting that a fixed key cannot provide.
//
// Taking apart runs outside-in; closing walks the same order backwards, so the
// machine builds itself from the inside out without a second table.

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";

export const SPRING = { stagger: 0.16, stiffness: 52, damping: 13.6, substeps: 4 };
/** Milliseconds between assemblies. Half a second made the sentence unreadable. */
export const TAKT = { auseinander: 300, zusammen: 950 };

/**
 * What the page needs to know, measured at build time.
 *
 *  - `KEYS`   the solved resting order, one per drawn group
 *  - `LIFT`   how much depth an assembly gains on its way out
 *  - `VIEW0`  the viewBox at rest, `VIEW1` the one with everything out
 *  - `MITTE`  where each assembly's number hangs: on the part nearest to the
 *             assembly's centroid. The centroid alone lies in empty space as
 *             soon as an assembly is made of parts that sit apart (two screws
 *             at both ends, two silencers), and a leader line into nothing
 *             explains nothing.
 *
 * `anker(item)` may rule items out as a number's hold (default: all may hold
 * it), for instance parts that are hidden in some state of the figure.
 */
export function vorbereiten(R, P, MOVE, W, H, { anker = () => true } = {}) {
  const KEYS = R.items.map((it) => it.key);

  const ursprung = k.depthOf([0, 0, 0], P);
  const LIFT = Object.fromEntries(
    Object.entries(MOVE).map(([id, m]) => [id, Math.round((k.depthOf(m, P) - ursprung) * 100) / 100]),
  );

  const kandidaten = {};
  for (const it of R.items) {
    if (!it.pos) continue;
    const k2 = (kandidaten[it.label] ??= { alle: [], halten: [] });
    k2.alle.push(it.pos);
    if (anker(it)) k2.halten.push(it.pos);
  }
  const MITTE = Object.fromEntries(Object.entries(kandidaten).map(([id, k2]) => {
    const orte = k2.halten.length ? k2.halten : k2.alle;
    const c = [0, 1, 2].map((i) => orte.reduce((s, p) => s + p[i], 0) / orte.length);
    let best = orte[0], bestD = Infinity;
    for (const p of orte) {
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return [id, best.slice()];
  }));

  // The field of view with everything out: the hull of all parts at the end of
  // their travel, keeping the margin the resting drawing has. A rough guess let
  // the machine shrink into a lot of empty space.
  const hier = [];
  const dort = [];
  for (const it of R.items) {
    if (!it.pos) continue;
    const m = MOVE[it.piece] || [0, 0, 0];
    hier.push(k.iso(it.pos, P));
    dort.push(k.iso([it.pos[0] + m[0], it.pos[1] + m[1], it.pos[2] + m[2]], P));
  }
  const spanne = (pts, i) => [Math.min(...pts.map((q) => q[i])), Math.max(...pts.map((q) => q[i]))];
  const [ax0, ax1] = spanne(hier, 0);
  const [ay0, ay1] = spanne(hier, 1);
  const [ox0, ox1] = spanne(dort, 0);
  const [oy0, oy1] = spanne(dort, 1);
  const padL = ax0;
  const padR = W - ax1;
  const padO = ay0;
  const padU = H - ay1;
  const x0 = ox0 - padL;
  const y0 = oy0 - padO;
  let w = ox1 + padR - x0;
  let h = oy1 + padU - y0;
  // Pin the aspect ratio. Otherwise the drawing grows taller while zooming out,
  // the legend below slides, and a click lands one row too high.
  if (w / h > W / H) h = (w * H) / W;
  else w = (h * W) / H;
  const VIEW1 = [
    x0 - (w - (ox1 + padR - x0)) / 2,
    y0 - (h - (oy1 + padU - y0)) / 2,
    w,
    h,
  ];
  return { KEYS, LIFT, VIEW0: [0, 0, W, H], VIEW1, MITTE };
}

/**
 * The runtime. Expects these to be defined before it: `P`, `MOVE`, `ORDER`,
 * `SPR`, `KEYS`, `LIFT`, `VIEW0`, `VIEW1`, `MITTE`, `STEP` (the legend table),
 * `TAKT`, plus the elements `svg`, `stage` and the array `groups`.
 */
export const LAUFZEIT = String.raw`
const byPiece = {};
for (const el of groups) (byPiece[el.dataset.piece] = byPiece[el.dataset.piece] || []).push(el);
const spr = {};
for (const id in MOVE) spr[id] = { x: 0, v: 0, target: 0, pending: null };
let eclock = 0;

function schedule(on, gap) {
  let i = 0;
  const step = (gap === undefined ? SPR.stagger * 1000 : gap) / 1000;
  for (const id of on ? ORDER : ORDER.slice().reverse()) {
    const ziel = on ? 1 : 0;
    if (spr[id].target === ziel) spr[id].pending = null;
    else spr[id].pending = { value: ziel, at: eclock + i++ * step };
  }
}
function springStep(dt) {
  eclock += dt;
  let bewegt = false;
  for (const id in spr) {
    const p = spr[id];
    if (p.pending && eclock >= p.pending.at) { p.target = p.pending.value; p.pending = null; }
    for (let i = 0; i < SPR.substeps; i++) {
      const h = dt / SPR.substeps;
      p.v += ((p.target - p.x) * SPR.stiffness - p.v * SPR.damping) * h;
      p.x += p.v * h;
    }
    if (p.pending || Math.abs(p.x - p.target) > 1e-3 || Math.abs(p.v) > 1e-3) bewegt = true;
  }
  return bewegt;
}
const offenAnteil = () => { let o = 0; for (const id in spr) if (spr[id].x > o) o = spr[id].x; return o; };

// Numbers with leader lines, hung on each assembly's centroid and stepping
// aside along its escape direction so they do not cover one another.
const NS = "http://www.w3.org/2000/svg";
const nums = {}, weg = {};
let numLayer = null;
{
  const o = iso([0, 0, 0], P);
  const layer = document.createElementNS(NS, "g");
  layer.setAttribute("class", "iso-nums");
  layer.setAttribute("aria-hidden", "true");
  for (const id in STEP) {
    const q = iso(MOVE[id] || [0, 0, 0], P);
    const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy);
    weg[id] = len < 1 ? [-0.72, -0.69] : [dx / len, dy / len];
    const g = document.createElementNS(NS, "g");
    g.setAttribute("opacity", "0");
    const line = document.createElementNS(NS, "line");
    const label = document.createElementNS(NS, "text");
    label.textContent = STEP[id].nr;
    g.append(line, label);
    layer.append(g);
    nums[id] = { g, line, label };
  }
  svg.append(layer);
  numLayer = layer;
}

// Drawing units per screen pixel. Without it the numbers are six pixels tall
// on a phone and twice the size they need on a big screen.
let unitPerPx = VIEW0[2] / 900, numHide = false, svgWidth = 900;
function measure() {
  const box = svg.getBoundingClientRect();
  if (!box.width) return;
  const vb = svg.getAttribute("viewBox").split(" ").map(Number);
  svgWidth = box.width;
  unitPerPx = vb[2] / box.width;
  // Under about 430 px of drawing width the numbers stand closer than they can
  // be read; the legend underneath carries them anyway.
  numHide = box.width < 430;
  if (numLayer) numLayer.style.display = numHide ? "none" : "";
}
new ResizeObserver(measure).observe(stage);
measure();

// Drawing order per frame. One fixed key cannot order a machine whose
// assemblies sweep past each other; measured depth can.
const sortParent = groups[0].parentNode;
const sortAfter = groups[groups.length - 1].nextSibling;
let drawn = groups.map((_, i) => i);
function resort() {
  const rang = groups.map((el, i) => KEYS[i] + (LIFT[el.dataset.piece] || 0) * (spr[el.dataset.piece] ? spr[el.dataset.piece].x : 0));
  const next = drawn.slice().sort((a, b) => rang[a] - rang[b]);
  for (let i = 0; i < next.length; i++) if (next[i] !== drawn[i]) {
    drawn = next;
    const frag = document.createDocumentFragment();
    for (const j of next) frag.append(groups[j]);
    sortParent.insertBefore(frag, sortAfter);
    return;
  }
}

function poseExplode() {
  const offen = offenAnteil();
  for (const id in byPiece) {
    const anteil = spr[id] ? spr[id].x : 0;
    const m = MOVE[id] || [0, 0, 0];
    for (const el of byPiece[id]) {
      if (Math.abs(anteil) < 1e-4) el.removeAttribute("transform");
      else el.setAttribute("transform", translateAlong(P, [m[0] * anteil, m[1] * anteil, m[2] * anteil]));
      // A part seen through a window has to leave that window when it flies
      // out, or it is clipped away to nothing on the way. The clip sits on an
      // inner group, so that the window does not travel with the part.
      for (const c of el.querySelectorAll("[data-clip]")) c.style.clipPath = anteil > 1e-3 ? "none" : "";
    }
  }
  resort();
  const box = VIEW0.map((v, i) => v + (VIEW1[i] - v) * offen);
  svg.setAttribute("viewBox", box.map((v) => Math.round(v * 10) / 10).join(" "));
  unitPerPx = box[2] / Math.max(1, svgWidth);
  if (numHide) return offen;
  const zoom = unitPerPx;
  for (const id in nums) {
    const n = nums[id];
    const anteil = spr[id] ? spr[id].x : 0;
    if (anteil < 0.02 || !MITTE[id]) { n.g.setAttribute("opacity", "0"); continue; }
    const m = MOVE[id] || [0, 0, 0];
    const c = MITTE[id];
    const p = iso([c[0] + m[0] * anteil, c[1] + m[1] * anteil, c[2] + m[2] * anteil], P);
    const [ux, uy] = weg[id];
    const nah = 16 * zoom, fern = 46 * zoom;
    n.line.setAttribute("x1", (p[0] + ux * nah).toFixed(1));
    n.line.setAttribute("y1", (p[1] + uy * nah).toFixed(1));
    n.line.setAttribute("x2", (p[0] + ux * fern).toFixed(1));
    n.line.setAttribute("y2", (p[1] + uy * fern).toFixed(1));
    n.line.setAttribute("stroke-width", (1 * zoom).toFixed(2));
    n.label.setAttribute("x", (p[0] + ux * (fern + 7 * zoom)).toFixed(1));
    n.label.setAttribute("y", (p[1] + uy * (fern + 7 * zoom) + 7 * zoom).toFixed(1));
    n.label.setAttribute("font-size", (20 * zoom).toFixed(1));
    n.label.setAttribute("stroke-width", (4 * zoom).toFixed(1));
    n.label.setAttribute("text-anchor", ux < -0.3 ? "end" : ux > 0.3 ? "start" : "middle");
    n.g.setAttribute("opacity", Math.min(1, (anteil - 0.02) * 4).toFixed(2));
  }
  return offen;
}
`;
