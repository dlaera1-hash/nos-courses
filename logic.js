// Logique pure de l'appli : rayons, saisie, rythme d'achat. Aucun accès au réseau ni à l'écran.

export const DAY = 86400000;

export const RAYONS = [
  ["fruits-legumes", "Fruits et légumes"], ["boulangerie", "Boulangerie"], ["cremerie", "Crèmerie et œufs"],
  ["boucherie", "Viande et poisson"], ["epicerie-salee", "Épicerie salée"], ["epicerie-sucree", "Épicerie sucrée"],
  ["surgeles", "Surgelés"], ["boissons", "Boissons"], ["hygiene", "Hygiène"], ["entretien", "Entretien"], ["autre", "Autre"],
];

const KEYWORDS = {
  "fruits-legumes": ["pomme","poire","banane","orange","citron","clementine","mandarine","kiwi","fraise","framboise","raisin","avocat","tomate","salade","laitue","mache","roquette","carotte","courgette","aubergine","poivron","oignon","ail","echalote","pomme de terre","patate","concombre","champignon","brocoli","chou","epinard","haricot vert","poireau","radis","melon","pasteque","mangue","ananas","persil","basilic","coriandre","menthe","peche","abricot","prune","cerise","courge","potiron","betterave","fruit","legume"],
  "boulangerie": ["pain","baguette","croissant","brioche","pain de mie","viennoiserie","pain au chocolat","chocolatine"],
  "cremerie": ["lait","yaourt","yogourt","beurre","creme","fromage","oeuf","emmental","comte","mozzarella","parmesan","skyr","fromage blanc","kefir","chevre","feta","ricotta"],
  "boucherie": ["poulet","boeuf","steak","viande","jambon","lardon","saucisse","saucisson","porc","dinde","veau","agneau","canard","poisson","saumon","cabillaud","crevette","charcuterie","chorizo","merguez"],
  "epicerie-salee": ["pate","riz","semoule","quinoa","lentille","pois chiche","conserve","sauce","huile","vinaigre","sel","poivre","epice","moutarde","mayonnaise","ketchup","farine","bouillon","thon","sardine","chips","olive","soupe","coulis","cornichon","haricot rouge","mais","crackers"],
  "epicerie-sucree": ["cafe","the","sucre","cereale","muesli","flocon","chocolat","confiture","miel","biscuit","gateau","compote","pate a tartiner","nutella","tisane","madeleine","levure"],
  "surgeles": ["surgele","glace","pizza","frites","petits pois surgeles"],
  "boissons": ["eau","jus","soda","biere","vin","sirop","coca","limonade","champagne","cidre"],
  "hygiene": ["papier toilette","dentifrice","brosse a dent","shampoing","shampooing","apres-shampoing","gel douche","savon","deodorant","coton","rasoir","mouchoir","creme hydratante","serviette hygienique","tampon"],
  "entretien": ["lessive","liquide vaisselle","pastille","lave-vaisselle","eponge","sac poubelle","essuie-tout","sopalin","javel","nettoyant","adoucissant","papier alu","papier aluminium","film alimentaire","vinaigre blanc","sel regenerant"],
};

// Mots-clés triés du plus long au plus court : "pomme de terre" passe avant "pomme".
const KW_LIST = Object.entries(KEYWORDS)
  .flatMap(([rayon, words]) => words.map((w) => [w, rayon]))
  .sort((a, b) => b[0].length - a[0].length);

// Emojis : d'abord celui du produit, sinon celui de son rayon.
export const RAYON_EMOJI = {
  "fruits-legumes": "🥕", "boulangerie": "🥖", "cremerie": "🧀", "boucherie": "🥩", "epicerie-salee": "🍝",
  "epicerie-sucree": "🍫", "surgeles": "🧊", "boissons": "🥤", "hygiene": "🧴", "entretien": "🧽", "autre": "🛒",
};

const EMOJIS = {
  "🍎": ["pomme","compote"], "🍐": ["poire"], "🍌": ["banane"], "🍊": ["orange","clementine","mandarine"], "🍋": ["citron"],
  "🥝": ["kiwi"], "🍓": ["fraise","framboise"], "🍇": ["raisin"], "🥑": ["avocat"], "🍅": ["tomate","coulis"],
  "🥬": ["salade","laitue","mache","roquette","chou","epinard","poireau"], "🥕": ["carotte"], "🥒": ["courgette","concombre","cornichon"],
  "🍆": ["aubergine"], "🫑": ["poivron"], "🧅": ["oignon","echalote"], "🧄": ["ail"], "🥔": ["pomme de terre","pommes de terre","patate","chips"],
  "🍄": ["champignon"], "🥦": ["brocoli"], "🫛": ["haricot vert","petits pois"], "🍈": ["melon"], "🍉": ["pasteque"],
  "🥭": ["mangue"], "🍍": ["ananas"], "🍑": ["peche","abricot"], "🍒": ["cerise"], "🎃": ["courge","potiron"],
  "🌿": ["persil","basilic","coriandre","menthe"], "🌽": ["mais"],
  "🍞": ["pain","brioche","pain de mie"], "🥖": ["baguette"], "🥐": ["croissant","pain au chocolat","chocolatine","viennoiserie"],
  "🥛": ["lait","creme"], "🥣": ["yaourt","yogourt","skyr","fromage blanc","cereale","muesli","flocon"], "🧈": ["beurre"],
  "🧀": ["fromage","emmental","comte","mozzarella","parmesan","chevre","feta","ricotta"], "🥚": ["oeuf"],
  "🍗": ["poulet","dinde","canard"], "🥩": ["boeuf","steak","viande","porc","veau","agneau"], "🍖": ["jambon","saucisson","charcuterie","chorizo"],
  "🥓": ["lardon"], "🌭": ["saucisse","merguez"], "🐟": ["poisson","saumon","cabillaud","thon","sardine"], "🍤": ["crevette"],
  "🍝": ["pate"], "🍚": ["riz"], "🫒": ["huile","olive"], "🧂": ["sel","poivre","epice"], "🌾": ["farine","semoule","quinoa"],
  "🍲": ["soupe","bouillon"], "🥫": ["conserve","sauce","ketchup","moutarde","mayonnaise"], "🫘": ["lentille","pois chiche","haricot rouge"],
  "☕": ["cafe"], "🍵": ["the","tisane"], "🍬": ["sucre"], "🍫": ["chocolat","pate a tartiner","nutella"], "🍯": ["confiture","miel"],
  "🍪": ["biscuit","madeleine","crackers"], "🍰": ["gateau"], "🍦": ["glace"], "🍕": ["pizza"], "🍟": ["frites"],
  "💧": ["eau"], "🧃": ["jus","sirop"], "🥤": ["soda","coca","limonade"], "🍺": ["biere","cidre"], "🍷": ["vin"], "🍾": ["champagne"],
  "🧻": ["papier toilette","mouchoir","essuie-tout","sopalin"], "🪥": ["dentifrice","brosse a dent"], "🧼": ["savon"],
  "🧴": ["shampoing","shampooing","gel douche","deodorant","creme hydratante","javel","vinaigre blanc"], "🪒": ["rasoir"],
  "🧺": ["lessive","adoucissant"], "🍽️": ["liquide vaisselle","pastille","lave-vaisselle"], "🧽": ["eponge","nettoyant"],
  "🗑️": ["sac poubelle"],
};
const EMOJI_LIST = Object.entries(EMOJIS)
  .flatMap(([emoji, words]) => words.map((w) => [w, emoji]))
  .sort((a, b) => b[0].length - a[0].length);

// Tous les emojis connus, pour le choix manuel dans la fiche produit.
export const EMOJI_CHOICES = [...new Set([...Object.keys(EMOJIS), ...Object.values(RAYON_EMOJI)])];

// Emoji tapé à la main : on garde le premier, et seulement si c'est bien un emoji.
export function pickEmoji(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const first = typeof Intl !== "undefined" && Intl.Segmenter
    ? [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(s)][0].segment
    : Array.from(s)[0];
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first) ? first : null;
}

// Nom propre : espaces resserrés, majuscule au début, 60 caractères au plus.
export function cleanName(raw) {
  const t = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

// Emoji reconnu d'après le nom du produit, ou null.
export function keywordEmoji(name) {
  const n = " " + norm(name).replace(/[^a-z0-9 -]/g, " ") + " ";
  for (const [kw, emoji] of EMOJI_LIST) if (n.includes(" " + kw)) return emoji;
  return null;
}

export function emojiFor(name, rayon) {
  return keywordEmoji(name) || RAYON_EMOJI[rayon] || RAYON_EMOJI.autre;
}

// ---------- Rayons créés à la main ----------
// 11 couleurs, une par rayon de base, réutilisables pour les rayons créés.
export const COLORS = ["green", "yellow", "lavender", "pink", "orange", "sky", "blue", "teal", "lime", "lilac", "grey"];
const BASE_COLOR = {
  "fruits-legumes": "green", "boulangerie": "yellow", "cremerie": "lavender", "boucherie": "pink", "epicerie-salee": "orange",
  "epicerie-sucree": "sky", "surgeles": "blue", "boissons": "teal", "hygiene": "lime", "entretien": "lilac", "autre": "grey",
};

// Ordre d'affichage : rayons de base, puis rayons créés (du plus ancien au plus récent), puis "Autre".
export function allRayons(custom = []) {
  const base = RAYONS.map(([id, label]) => ({ id, label, emoji: RAYON_EMOJI[id], color: BASE_COLOR[id], custom: false }));
  const extra = [...custom]
    .sort((a, b) => (a.position || 0) - (b.position || 0) || a.label.localeCompare(b.label, "fr"))
    .map((r) => ({ ...r, custom: true }));
  return [...base.slice(0, -1), ...extra, base[base.length - 1]];
}

export function rayonFromRow(r) {
  return {
    id: r.id, label: r.label, emoji: r.emoji || RAYON_EMOJI.autre,
    color: COLORS.includes(r.color) ? r.color : "grey", position: r.position == null ? 0 : Number(r.position),
  };
}

export function cleanLabel(raw) {
  return cleanName(raw).slice(0, 30).trim();
}

export function norm(s) {
  return s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

export function guessRayon(name) {
  const n = " " + norm(name).replace(/[^a-z0-9 -]/g, " ") + " ";
  for (const [kw, rayon] of KW_LIST) if (n.includes(" " + kw)) return rayon;
  return "autre";
}

export function slug(name) {
  return norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
    || "p-" + Math.random().toString(36).slice(2, 8);
}

// "2 baguettes", "lait x3", "noisettes ×2" ou "café" -> { name, qty }
export function parseInput(raw) {
  let t = raw.trim();
  let qty = null;
  const m = t.match(/^(\d{1,3})\s*([x×*]\s*)?(.+)$/i) || t.match(/^(.+?)\s*[x×*]\s*(\d{1,3})$/i);
  if (m) {
    if (/^\d/.test(m[1])) { qty = +m[1]; t = m[3]; } else { qty = +m[2]; t = m[1]; }
  }
  const name = cleanName(t);
  if (!name) return null;
  return { name, qty: qty && qty > 1 ? qty : null };
}

// Rythme d'achat : intervalle médian entre les 7 derniers achats.
// Un produit est proposé quand on approche de la date habituelle de rachat.
export function cadence(p, now) {
  const t = [...(p.purchases || [])].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < t.length; i++) {
    const g = (t[i] - t[i - 1]) / DAY;
    if (g >= 0.5) gaps.push(g); // deux achats le même jour comptent pour un
  }
  const recent = gaps.slice(-6);
  if (!recent.length) return null;
  const s = [...recent].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const last = t[t.length - 1];
  const next = last + median * DAY;
  const lead = Math.max(1, median * 0.15) * DAY;
  const snoozed = p.snoozeUntil && now < p.snoozeUntil;
  return { median, last, next, due: now >= next - lead && !snoozed };
}

export function ago(ts, now) {
  const d = Math.floor((now - ts) / DAY);
  return d <= 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
}

export function every(m) {
  return m < 1.5 ? "tous les jours" : `tous les ${Math.round(m)} j`;
}

// Conversion entre la base (snake_case) et l'appli (camelCase)
export function fromRow(r) {
  return {
    id: r.id, name: r.name, rayon: r.rayon, emoji: r.emoji || null, note: r.note || null, onList: r.on_list, inCart: r.in_cart, qty: r.qty,
    purchases: (r.purchases || []).map(Number), snoozeUntil: r.snooze_until == null ? null : Number(r.snooze_until),
    addedAt: r.added_at == null ? null : Number(r.added_at), updatedAt: r.updated_at == null ? null : Number(r.updated_at),
  };
}

const COLS = { name: "name", rayon: "rayon", emoji: "emoji", note: "note", onList: "on_list", inCart: "in_cart", qty: "qty", purchases: "purchases", snoozeUntil: "snooze_until", addedAt: "added_at", updatedAt: "updated_at" };

export function toRow(fields) {
  const row = {};
  for (const [k, v] of Object.entries(fields)) if (k in COLS) row[COLS[k]] = v;
  return row;
}
