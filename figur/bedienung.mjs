// The signal buttons of a valve page, as page runtime. Every valve that is
// operated by pilot signals needs the same behaviour: a signal lasts as long
// as the button is held (pointer or key), a bistable valve gets one pulse per
// press, and an automatic cycle presses on its own. All of it runs on model
// time, so slow motion slows pulses and the cycle too.
//
// This module knows no valve. The page hands in callbacks:
//   namen             signal names, e.g. ["14", "12"]
//   impuls            s of model time one pulse lasts
//   autoTakt          s of model time between two automatic steps
//   autoAn            whether the automatic cycle starts running
//   erster            name the automatic cycle starts with
//   haltenModus()     true: the signal lasts while the button is held;
//                     false: a click is a pulse
//   setzeSignal(n, an)  switch signal n in the model
//   autoSchritt(bed)  one automatic step (press, release or pulse)
//   autoEnde(bed)     the automatic cycle was stopped: release what it holds
//   autoAnzeige(an)   show the state of the automatic button
//   geaendert()       something happened the page must draw and run on
//
// The functions are embedded as text into the page's classic script, so every
// top-level name starts with "bedienung", and the text holds no backtick.

export const LAUFZEIT = String.raw`
function bedienungSignale(opt) {
  const bed = {
    auto: opt.autoAn,
    autoZeit: 0,
    naechstes: opt.erster,
    impulse: {},
    gehalten: {},
  };
  for (const n of opt.namen) { bed.impulse[n] = 0; bed.gehalten[n] = false; }

  bed.autoAus = function () {
    if (bed.auto) opt.autoEnde(bed);
    bed.auto = false;
    opt.autoAnzeige(false);
  };
  bed.autoStart = function (erstes) {
    bed.auto = true;
    bed.autoZeit = 0;
    bed.naechstes = erstes;
    opt.autoAnzeige(true);
  };
  bed.impuls = function (n) {
    opt.setzeSignal(n, true);
    bed.impulse[n] = opt.impuls;
  };
  // Pulses and the automatic cycle run on model time.
  bed.takt = function (dm) {
    for (const n of opt.namen) {
      if (bed.impulse[n] > 0) {
        bed.impulse[n] -= dm;
        if (bed.impulse[n] <= 0) { bed.impulse[n] = 0; if (!bed.gehalten[n]) opt.setzeSignal(n, false); }
      }
    }
    if (!bed.auto) return;
    bed.autoZeit += dm;
    if (bed.autoZeit < opt.autoTakt) return;
    bed.autoZeit = 0;
    opt.autoSchritt(bed);
  };
  // Back to rest: no pulse, no hold, the cycle starts over.
  bed.zuruecksetzen = function () {
    for (const n of opt.namen) { bed.impulse[n] = 0; bed.gehalten[n] = false; }
    bed.autoZeit = 0;
    bed.naechstes = opt.erster;
  };
  /** Held: the signal lasts as long as the button is held. */
  bed.halte = function (n, an) {
    if (bed.gehalten[n] === an) return;
    if (an) bed.autoAus();
    bed.gehalten[n] = an;
    opt.setzeSignal(n, an || bed.impulse[n] > 0);
    opt.geaendert();
  };
  bed.knopf = function (el, n) {
    el.addEventListener("pointerdown", (e) => {
      if (el.disabled || !opt.haltenModus() || e.button > 0) return;
      bed.halte(n, true);
    });
    // Leaving the button, a cancelled touch or losing focus all end the signal.
    for (const typ of ["pointerup", "pointerleave", "pointercancel", "blur"]) {
      el.addEventListener(typ, () => { if (bed.gehalten[n]) bed.halte(n, false); });
    }
    el.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && opt.haltenModus()) {
        e.preventDefault();
        // A held key repeats keydown; only the first one counts.
        if (!e.repeat) bed.halte(n, true);
      }
    });
    el.addEventListener("keyup", (e) => {
      if ((e.key === " " || e.key === "Enter") && bed.gehalten[n]) bed.halte(n, false);
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    // Pulse mode: one press is one pulse.
    el.addEventListener("click", () => {
      if (opt.haltenModus() || el.disabled) return;
      bed.autoAus();
      bed.impuls(n);
      opt.geaendert();
    });
  };
  return bed;
}
`;
