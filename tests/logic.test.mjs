// Tests de la logique pure : node tests/logic.test.mjs
import assert from "node:assert/strict";
import { DAY, guessRayon, parseInput, slug, cadence, fromRow, toRow, every } from "../logic.js";

const now = Date.UTC(2026, 9, 31);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("rayons", () => {
  const cases = {
    "Lait": "cremerie", "Laitue": "fruits-legumes", "Pommes de terre": "fruits-legumes", "Pommes": "fruits-legumes",
    "Ailes de poulet": "boucherie", "Pâtes": "epicerie-salee", "Pâte à tartiner": "epicerie-sucree",
    "Eau gazeuse": "boissons", "Thé vert": "epicerie-sucree", "Thon": "epicerie-salee", "Papier toilette": "hygiene",
    "Œufs": "cremerie", "Brosse à dents": "hygiene", "Lessive": "entretien", "Pizza": "surgeles", "Bougies": "autre",
  };
  for (const [name, r] of Object.entries(cases)) assert.equal(guessRayon(name), r, name);
});

t("saisie avec quantité", () => {
  assert.deepEqual(parseInput("2 baguettes"), { name: "Baguettes", qty: 2 });
  assert.deepEqual(parseInput("lait x3"), { name: "Lait", qty: 3 });
  assert.deepEqual(parseInput("café"), { name: "Café", qty: null });
  assert.deepEqual(parseInput("1 melon"), { name: "Melon", qty: null });
  assert.equal(parseInput("   "), null);
});

t("identifiants stables", () => {
  assert.equal(slug("Œufs bio"), "oeufs-bio");
  assert.equal(slug("Pâte à tartiner"), "pate-a-tartiner");
  assert.equal(slug("Pâte à tartiner"), slug("pate a tartiner"));
});

t("rythme d'achat", () => {
  const lait = { purchases: [now - 15 * DAY, now - 10 * DAY, now - 5 * DAY] };
  const c = cadence(lait, now);
  assert.equal(c.median, 5);
  assert.equal(c.due, true);
  assert.equal(every(c.median), "tous les 5 j");
  assert.equal(cadence({ purchases: [now - 42 * DAY, now - 21 * DAY, now - 3 * DAY] }, now).due, false);
  assert.equal(cadence({ ...lait, snoozeUntil: now + DAY }, now).due, false);
  assert.equal(cadence({ purchases: [now] }, now), null);
  assert.equal(cadence({ purchases: [now - 1000, now] }, now), null);
});

t("aller-retour base de données", () => {
  const row = { id: "lait", name: "Lait", rayon: "cremerie", on_list: true, in_cart: false, qty: 2, purchases: ["1793404800000"], snooze_until: null, added_at: "1", updated_at: "2" };
  const p = fromRow(row);
  assert.deepEqual(p.purchases, [1793404800000]);
  assert.equal(p.onList, true);
  assert.deepEqual(toRow({ onList: false, snoozeUntil: null, id: "ignoré" }), { on_list: false, snooze_until: null });
});

console.log(`${n} groupes de tests réussis`);
