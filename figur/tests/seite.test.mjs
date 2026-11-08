import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { modulQuelle } from "../seite.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("modulQuelle: ventil + pneumatik ergeben gültiges Skript ohne doppelte Namen", () => {
  const code = modulQuelle(WURZEL, ["figur/ventil.mjs", "figur/pneumatik.mjs"]);
  assert.doesNotMatch(code, /^import |^export /m);
  assert.doesNotThrow(() => new Function(code));   // duplicate const/function → SyntaxError
});
