// Tests de la logique pure : node tests/logic.test.mjs
import assert from "node:assert/strict";
import { DAY, guessRayon, emojiFor, parseInput, slug, cadence, fromRow, toRow, every, pickEmoji, cleanName, EMOJI_CHOICES, allRayons, defaultOrder, orderRows, isBaseRayon, rayonFromRow, cleanLabel, keywordEmoji, COLORS } from "../logic.js";

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

t("emojis", () => {
  const cases = {
    "Lessive": "🧺", "Liquide vaisselle": "🍽️", "Éponges": "🧽", "Lait": "🥛", "Laitue": "🥬", "Pommes de terre": "🥔",
    "Pommes": "🍎", "Pâte à tartiner": "🍫", "Pâtes": "🍝", "Thon": "🐟", "Thé vert": "🍵", "Œufs": "🥚", "Eau gazeuse": "💧",
    "Ailes de poulet": "🍗", "Papier toilette": "🧻", "Café": "☕",
  };
  for (const [name, e] of Object.entries(cases)) assert.equal(emojiFor(name, guessRayon(name)), e, name);
  assert.equal(emojiFor("Bougies", "autre"), "🛒");
  assert.equal(emojiFor("Produit inconnu", "entretien"), "🧽");
});

t("saisie avec quantité", () => {
  assert.deepEqual(parseInput("2 baguettes"), { name: "Baguettes", qty: 2 });
  assert.deepEqual(parseInput("lait x3"), { name: "Lait", qty: 3 });
  assert.deepEqual(parseInput("café"), { name: "Café", qty: null });
  assert.deepEqual(parseInput("1 melon"), { name: "Melon", qty: null });
  assert.deepEqual(parseInput("noisettes ×2"), { name: "Noisettes", qty: 2 });
  assert.deepEqual(parseInput("Noisettes X 4"), { name: "Noisettes", qty: 4 });
  assert.deepEqual(parseInput("3x yaourts"), { name: "Yaourts", qty: 3 });
  assert.equal(parseInput("   "), null);
});

t("fiche produit", () => {
  assert.equal(pickEmoji("🥜"), "🥜");
  assert.equal(pickEmoji("  🍽️ "), "🍽️");
  assert.equal(pickEmoji("👨‍👩‍👧 et plus"), "👨‍👩‍👧");
  assert.equal(pickEmoji("🇫🇷"), "🇫🇷");
  assert.equal(pickEmoji("A"), null);
  assert.equal(pickEmoji(""), null);
  assert.equal(cleanName("  noisettes   grillées "), "Noisettes grillées");
  assert.equal(cleanName("   "), "");
  assert.ok(EMOJI_CHOICES.includes("🧺") && EMOJI_CHOICES.includes("🛒"));
  assert.equal(new Set(EMOJI_CHOICES).size, EMOJI_CHOICES.length);
});

t("rayons créés", () => {
  const ids = allRayons([
    { id: "c-apero", label: "Apéro", emoji: "🥂", color: "pink", position: 1794000000002 },
    { id: "c-bebe", label: "Bébé", emoji: "🍼", color: "sky", position: 1794000000001 },
  ]).map((r) => r.id);
  assert.equal(ids.length, 13);
  assert.deepEqual(ids.slice(-3), ["c-bebe", "c-apero", "autre"]);
  assert.equal(allRayons().length, 11);
  assert.equal(new Set(allRayons().map((r) => r.color)).size, COLORS.length);
  const r = rayonFromRow({ id: "c-x", label: "X", emoji: null, color: "fuchsia", position: "5" });
  assert.equal(r.emoji, "🛒");
  assert.equal(r.color, "grey");
  assert.equal(r.position, 5);
  // Classement enregistré puis relu : l'ordre choisi revient tel quel.
  const start = allRayons([{ id: "c-bebe", label: "Bébé", emoji: "🍼", color: "sky", position: 1794000000001 }]);
  const wanted = [start.at(-1), start.at(-2), ...start.slice(0, -2).reverse()];
  const ordered = allRayons(orderRows(wanted).map(rayonFromRow)).map((x) => x.id);
  assert.deepEqual(ordered, wanted.map((x) => x.id));
  assert.deepEqual(ordered.slice(0, 3), ["autre", "c-bebe", "entretien"]);
  const back = defaultOrder(allRayons([{ id: "autre", position: 1 }, { id: "c-bebe", label: "Bébé", emoji: "🍼", color: "sky", position: 2 }])).map((x) => x.id);
  assert.deepEqual(back.slice(0, 2), ["fruits-legumes", "boulangerie"]);
  assert.deepEqual(back.slice(-2), ["c-bebe", "autre"]);
  const rows = orderRows(allRayons());
  assert.deepEqual(rows[0], { id: "fruits-legumes", label: "Fruits et légumes", emoji: "🥕", color: "green", position: 1 });
  assert.equal(rows.at(-1).id, "autre");
  assert.ok(isBaseRayon("autre") && !isBaseRayon("c-bebe"));
  assert.equal(rayonFromRow({ id: "c-y", label: "Y" }).position < Number.MAX_SAFE_INTEGER, true);
  assert.equal(cleanLabel("  produits   pour le chat et le chien, en vrac "), "Produits pour le chat et le ch");
  assert.equal(keywordEmoji("Couches taille 3"), null);
  assert.equal(keywordEmoji("Lait"), "🥛");
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
  assert.equal(p.emoji, null);
  assert.equal(p.note, null);
  const q = fromRow({ ...row, emoji: "🥜", note: "Grillées, sans sel" });
  assert.equal(q.emoji, "🥜");
  assert.equal(q.note, "Grillées, sans sel");
  assert.deepEqual(toRow({ name: "Noisettes", emoji: null, note: "x", rayon: "epicerie-sucree" }), { name: "Noisettes", emoji: null, note: "x", rayon: "epicerie-sucree" });
});

console.log(`${n} groupes de tests réussis`);
