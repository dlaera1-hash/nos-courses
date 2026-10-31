// Écran et synchronisation avec Supabase.
import { DAY, RAYONS, STARTER, guessRayon, slug, parseInput, cadence, ago, every, fromRow, toRow } from "./logic.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const RAYON_COLOR = {
  "fruits-legumes": "var(--green)", "boulangerie": "var(--yellow)", "cremerie": "var(--lavender)", "boucherie": "var(--pink)",
  "epicerie-salee": "var(--orange)", "epicerie-sucree": "var(--sky)", "surgeles": "var(--blue)", "boissons": "var(--teal)",
  "hygiene": "var(--lime)", "entretien": "var(--lilac)", "autre": "var(--grey)",
};
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const WEEK_COLORS = ["var(--green)", "var(--orange)", "var(--pink)", "var(--yellow)", "var(--lavender)", "var(--sky)", "var(--lime)"];
const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>';
const BASKET = '<svg viewBox="0 0 24 24" fill="none" stroke="#141414" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-2 10H6z"/><path d="M9 9l3-5 3 5"/></svg>';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const qtyTag = (p) => (p.qty ? `<span class="qty">×${p.qty}</span>` : "");
const byName = (a, b) => a.name.localeCompare(b.name, "fr");

const state = { items: new Map(), loaded: false, channel: null, started: false };

// ---------- Supabase ----------
const sb = SUPABASE_URL && SUPABASE_KEY && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// ---------- Connexion ----------
// Mode "signup" : première connexion, la personne choisit son mot de passe.
let mode = "signin";

function showLogin(msg) {
  $("app").hidden = true; $("dock").hidden = true; $("login").hidden = false;
  setMode("signin");
  setLoginStatus(msg || "");
}
function setMode(m) {
  mode = m;
  const signup = m === "signup";
  $("loginbtn").textContent = signup ? "Créer mon mot de passe" : "Se connecter";
  $("togglemode").textContent = signup ? "J'ai déjà un mot de passe" : "Première fois ? Créer mon mot de passe";
  $("password").autocomplete = signup ? "new-password" : "current-password";
  setLoginStatus("");
}
function setLoginStatus(msg, warn = true) { const s = $("loginstatus"); s.textContent = msg; s.classList.toggle("warn", warn && !!msg); }

$("togglemode").addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

$("loginform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  if (!email || !password) return;
  $("loginbtn").disabled = true;
  setLoginStatus(mode === "signup" ? "Création du compte…" : "Connexion…", false);
  const { data, error } = mode === "signup"
    ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
    : await sb.auth.signInWithPassword({ email, password });
  $("loginbtn").disabled = false;
  if (error) {
    const m = error.message || "";
    if (/not confirmed/i.test(m)) setLoginStatus("Confirme d'abord ton adresse : touche le lien de l'e-mail reçu à la création du compte.");
    else if (/invalid login credentials/i.test(m)) setLoginStatus("Adresse ou mot de passe incorrect. Première fois ? Crée d'abord ton mot de passe.");
    else if (/already registered|already exists/i.test(m)) { setMode("signin"); setLoginStatus("Ce compte existe déjà : connecte-toi avec ton mot de passe."); }
    else if (/signups? not allowed|disabled/i.test(m)) setLoginStatus("Les inscriptions sont fermées. Demande à David d'ajouter ton adresse.");
    else if (/password/i.test(m)) setLoginStatus("Mot de passe trop faible : 8 caractères minimum.");
    else if (/rate|seconds/i.test(m)) setLoginStatus("Trop de tentatives, patiente une minute puis réessaie.");
    else setLoginStatus("Connexion impossible pour l'instant, réessaie.");
    return;
  }
  if (mode === "signup" && !data.session) {
    setMode("signin");
    setLoginStatus("Compte créé. Ouvre l'e-mail de confirmation reçu, touche le lien, puis reviens ici te connecter avec ton mot de passe.", false);
  }
});
$("logout").addEventListener("click", async () => { await sb.auth.signOut(); });

// ---------- Données ----------
async function loadAll() {
  const { data, error } = await sb.from("items").select("*");
  if (error) { setStatus("La liste ne répond pas. Vérifie ta connexion.", true); return; }
  state.items = new Map(data.map((r) => { const p = fromRow(r); return [p.id, p]; }));
  state.loaded = true;
  if (!data.length) checkAccessHint();
  render();
}

// Une liste vide peut aussi vouloir dire "adresse non autorisée" : on demande à la base.
async function checkAccessHint() {
  const { data, error } = await sb.rpc("is_member");
  if (!error && data === false) setStatus("Ton adresse n'est pas dans la liste des membres. Ajoute-la dans Supabase (table members).", true);
}

function subscribe() {
  if (state.channel) sb.removeChannel(state.channel);
  state.channel = sb.channel("items-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "items" }, (payload) => {
      if (payload.eventType === "DELETE") state.items.delete(payload.old.id);
      else { const p = fromRow(payload.new); state.items.set(p.id, p); }
      render();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setStatus("Mise à jour en direct coupée. La liste se recharge quand tu reviens sur l'appli.", true);
    });
}

// Sur iPhone, la connexion en direct se coupe quand l'appli passe en arrière-plan : on recharge au retour.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.started) { loadAll(); subscribe(); }
});

// ---------- Écritures : une à la fois par produit ----------
const queues = new Map();
function write(id, fn) {
  const prev = queues.get(id) || Promise.resolve();
  const p = prev.then(async () => {
    const { error } = await fn();
    if (error) throw error;
  }).catch((e) => {
    if (e && e.code === "42501") setStatus("Ton adresse n'a pas le droit de modifier la liste.", true);
    else setStatus("Modification non enregistrée. La liste a été rechargée.", true);
    loadAll();
  });
  queues.set(id, p);
  return p;
}
function patchLocal(id, fields) { const cur = state.items.get(id); if (cur) state.items.set(id, { ...cur, ...fields }); render(); }
function setFields(id, fields) {
  fields.updatedAt = Date.now();
  patchLocal(id, fields);
  return write(id, () => sb.from("items").update(toRow(fields)).eq("id", id));
}

function addByName(raw) {
  const parsed = parseInput(raw); if (!parsed) return;
  const id = slug(parsed.name);
  const fields = { onList: true, inCart: false, qty: parsed.qty, snoozeUntil: null };
  if (state.items.has(id)) { setFields(id, fields); return; }
  const now = Date.now();
  const doc = { name: parsed.name, rayon: guessRayon(parsed.name), ...fields, purchases: [], addedAt: now, updatedAt: now };
  state.items.set(id, { id, ...doc }); render();
  write(id, async () => {
    const res = await sb.from("items").insert({ id, ...toRow(doc) });
    // Ajouté entre-temps depuis l'autre téléphone : on le remet simplement sur la liste.
    if (res.error && res.error.code === "23505") return sb.from("items").update(toRow({ ...fields, updatedAt: now })).eq("id", id);
    return res;
  });
}

function addStarter() {
  const now = Date.now();
  const rows = STARTER.map((name) => ({ id: slug(name), ...toRow({ name, rayon: guessRayon(name), onList: false, inCart: false, qty: null, purchases: [], addedAt: now, updatedAt: now }) }))
    .filter((r) => !state.items.has(r.id));
  for (const r of rows) state.items.set(r.id, fromRow(r));
  render(); $("catsec").open = true;
  write("__starter", () => sb.from("items").upsert(rows, { onConflict: "id", ignoreDuplicates: true }));
}

function finishShopping() {
  const now = Date.now();
  const bought = [...state.items.values()].filter((p) => p.onList && p.inCart);
  if (!bought.length) return;
  const before = bought.map((p) => ({ id: p.id, purchases: p.purchases || [], qty: p.qty }));
  for (const p of bought) {
    const purchases = [...(p.purchases || []), now].slice(-12);
    setFields(p.id, { onList: false, inCart: false, qty: null, purchases, snoozeUntil: null });
  }
  toast(`${bought.length} produit${bought.length > 1 ? "s" : ""} enregistré${bought.length > 1 ? "s" : ""}`, () => {
    for (const b of before) setFields(b.id, { onList: true, inCart: true, purchases: b.purchases, qty: b.qty });
  });
}

// ---------- Rendu ----------
function renderWeek(all, now) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const dow = (d0.getDay() + 6) % 7;
  const monday = new Date(d0); monday.setDate(d0.getDate() - dow);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const hits = new Set();
  for (const p of all) for (const t of p.purchases || []) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const i = days.findIndex((x) => x.getTime() === d.getTime());
    if (i >= 0) hits.add(i);
  }
  $("week").innerHTML = days.map((d, i) => {
    const hit = hits.has(i);
    return `<div class="day${hit ? " hit" : ""}${i === dow ? " today" : ""}"><span class="c" style="${hit ? `background:${WEEK_COLORS[i]}` : ""}">${hit ? BASKET : ""}</span>${DAYS[d.getDay()]}<b>${d.getDate()}</b></div>`;
  }).join("");
}

function render() {
  const now = Date.now();
  const all = [...state.items.values()];
  const onList = all.filter((p) => p.onList && !p.inCart);
  const inCart = all.filter((p) => p.onList && p.inCart);
  const off = all.filter((p) => !p.onList);

  $("date").textContent = new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("badge").hidden = !(state.loaded && onList.length);
  $("count").textContent = `${onList.length} à acheter`;
  $("known").innerHTML = all.map((p) => `<option value="${esc(p.name)}">`).join("");
  renderWeek(all, now);

  const soon = off.map((p) => ({ p, c: cadence(p, now) })).filter((x) => x.c && x.c.due).sort((a, b) => a.c.next - b.c.next);
  $("soon").hidden = !soon.length;
  $("soonchips").innerHTML = soon.map(({ p, c }) => `<span class="chip"><span>${esc(p.name)}<span class="why">${every(c.median)}</span></span><button class="add" data-act="add" data-id="${esc(p.id)}" type="button">Ajouter</button><button class="skip" data-act="snooze" data-id="${esc(p.id)}" type="button" aria-label="Pas besoin pour ${esc(p.name)}">Pas besoin</button></span>`).join("");

  if (!state.loaded) $("list").innerHTML = "";
  else if (!all.length) {
    $("list").innerHTML = `<section class="block empty"><h2>La liste est vide</h2><p>Tape un produit en haut : il se range tout seul dans son rayon. Au fil des courses, l'appli retient votre rythme et vous rappelle quoi racheter.</p><button class="btn" data-act="starter" type="button">Démarrer avec des produits courants</button></section>`;
  } else if (!onList.length) {
    $("list").innerHTML = `<section class="block empty calm"><h2>Rien à acheter</h2><p>Ajoute un produit en haut, ou pioche dans vos produits habituels plus bas.</p></section>`;
  } else {
    $("list").innerHTML = RAYONS.map(([r, label]) => {
      const items = onList.filter((p) => (p.rayon || "autre") === r).sort(byName);
      if (!items.length) return "";
      return `<section class="block r-${r}"><div class="block-head"><h2>${label}</h2><span class="n">${items.length}</span></div><ul>${items.map((p) => `<li class="row"><button class="tick" data-act="cart" data-id="${esc(p.id)}" type="button"><span class="box">${CHECK}</span><span class="label">${esc(p.name)}${qtyTag(p)}</span></button><button class="x" data-act="remove" data-id="${esc(p.id)}" type="button" aria-label="Retirer ${esc(p.name)} de la liste">×</button></li>`).join("")}</ul></section>`;
    }).join("");
  }

  $("cartsec").hidden = !inCart.length;
  $("cartcount").textContent = inCart.length;
  $("cart").innerHTML = inCart.sort(byName).map((p) => `<li class="row"><button class="tick" data-act="uncart" data-id="${esc(p.id)}" type="button"><span class="box">${CHECK}</span><span class="label">${esc(p.name)}${qtyTag(p)}</span></button></li>`).join("");
  $("dock").hidden = !inCart.length;
  $("docknum").textContent = inCart.length;

  $("catcount").textContent = off.length;
  $("cat").innerHTML = off.length ? RAYONS.map(([r, label]) => {
    const items = off.filter((p) => (p.rayon || "autre") === r).sort(byName);
    if (!items.length) return "";
    return `<div><div class="cat-head"><i style="background:${RAYON_COLOR[r]}"></i>${label}</div><ul>${items.map((p) => {
      const c = cadence(p, now);
      const last = (p.purchases || []).length ? Math.max(...p.purchases) : null;
      const sub = [last ? `acheté ${ago(last, now)}` : "jamais acheté", c ? every(c.median) : ""].filter(Boolean).join(" · ");
      const opts = RAYONS.map(([v, l]) => `<option value="${v}"${v === (p.rayon || "autre") ? " selected" : ""}>${l}</option>`).join("");
      return `<li class="row"><div class="meta"><div class="label">${esc(p.name)}</div><div class="s">${sub}</div></div><select data-act="rayon" data-id="${esc(p.id)}" aria-label="Rayon de ${esc(p.name)}">${opts}</select><button class="plus" data-act="add" data-id="${esc(p.id)}" type="button">Ajouter</button><button class="del" data-act="del" data-id="${esc(p.id)}" type="button">Supprimer</button></li>`;
    }).join("")}</ul></div>`;
  }).join("") : `<p class="cat-empty">Les produits achetés ou retirés de la liste se retrouvent ici.</p>`;
}

function setStatus(msg, warn) { const s = $("status"); s.textContent = msg || ""; s.classList.toggle("warn", !!warn); }

let undoFn = null, toastTimer = null;
function toast(msg, undo) {
  $("toastmsg").textContent = msg; undoFn = undo || null; $("toastundo").hidden = !undo; $("toast").hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
}
$("toastundo").addEventListener("click", () => { if (undoFn) undoFn(); $("toast").hidden = true; undoFn = null; });

// ---------- Interactions ----------
const armed = new Set();
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "SELECT") return;
  const { id, act } = b.dataset;
  if (act === "starter") { addStarter(); return; }
  const p = id && state.items.get(id);
  if (!p) return;
  if (act === "cart") setFields(id, { inCart: true });
  else if (act === "uncart") setFields(id, { inCart: false });
  else if (act === "add") setFields(id, { onList: true, inCart: false, snoozeUntil: null });
  else if (act === "remove") {
    setFields(id, { onList: false, inCart: false, qty: null });
    toast(`${p.name} retiré`, () => setFields(id, { onList: true, qty: p.qty || null }));
  } else if (act === "snooze") {
    const c = cadence(p, Date.now());
    setFields(id, { snoozeUntil: Date.now() + Math.max(2, (c ? c.median : 7) / 2) * DAY });
  } else if (act === "del") {
    if (!armed.has(id)) {
      armed.add(id); b.textContent = "Confirmer ?"; b.classList.add("armed");
      setTimeout(() => { armed.delete(id); if (b.isConnected) { b.textContent = "Supprimer"; b.classList.remove("armed"); } }, 3000);
      return;
    }
    armed.delete(id); state.items.delete(id); render();
    write(id, () => sb.from("items").delete().eq("id", id));
  }
});
document.addEventListener("change", (e) => {
  const s = e.target.closest('select[data-act="rayon"]');
  if (s) setFields(s.dataset.id, { rayon: s.value });
});
$("addform").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("addinput").value;
  if (!v.trim()) return;
  addByName(v); $("addinput").value = ""; $("addinput").focus();
});
$("finish").addEventListener("click", finishShopping);

// ---------- Démarrage ----------
function startApp() {
  if (state.started) return;
  state.started = true;
  $("login").hidden = true; $("app").hidden = false;
  render(); loadAll(); subscribe();
}
function stopApp() {
  state.started = false; state.loaded = false; state.items = new Map();
  if (state.channel) { sb.removeChannel(state.channel); state.channel = null; }
}

if (!sb) {
  $("login").hidden = false; $("loginform").hidden = true;
  setLoginStatus(window.supabase ? "Il manque l'adresse ou la clé Supabase dans config.js." : "Impossible de charger Supabase. Vérifie ta connexion.");
} else {
  sb.auth.onAuthStateChange((_event, session) => {
    // Pas d'appel Supabase directement ici (recommandation Supabase) : on laisse finir l'événement.
    setTimeout(() => { if (session) startApp(); else { stopApp(); showLogin(); } }, 0);
  });
}
