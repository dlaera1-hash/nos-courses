// Écran et synchronisation avec Supabase.
import { DAY, COLORS, EMOJI_CHOICES, allRayons, rayonFromRow, cleanLabel, guessRayon, keywordEmoji, pickEmoji, cleanName, norm, slug, parseInput, cadence, every, fromRow, toRow } from "./logic.js?v=20261107202825";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js?v=20261107202825";

const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const qtyTag = (p) => (p.qty ? `<span class="qty">×${p.qty}</span>` : "");
// À 1, seul le + s'affiche : le nom du produit garde la place.
const stepper = (p) => {
  const q = p.qty || 1;
  const plus = `<button data-act="inc" data-id="${esc(p.id)}" type="button" aria-label="Augmenter la quantité de ${esc(p.name)}">+</button>`;
  if (q <= 1) return `<span class="step one">${plus}</span>`;
  return `<span class="step"><button data-act="dec" data-id="${esc(p.id)}" type="button" aria-label="Diminuer la quantité de ${esc(p.name)}">−</button><b aria-label="Quantité">${q}</b>${plus}</span>`;
};
const PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
// Rayons de base et rayons créés, dans l'ordre de la liste. Un rayon inconnu (supprimé ailleurs) devient "Autre".
const rayons = () => allRayons(state.rayons.values());
const rayonOf = (id) => rayons().find((r) => r.id === id) || rayons().find((r) => r.id === "autre");
const autoEmoji = (name, rayonId) => keywordEmoji(name) || rayonOf(rayonId).emoji;
const emojiOf = (p) => p.emoji || autoEmoji(p.name, p.rayon);
const emo = (p) => `<span class="emo" aria-hidden="true">${emojiOf(p)}</span>`;
const note = (p) => (p.note ? `<small class="note">${esc(p.note)}</small>` : "");
const byKey = (name) => { const k = slug(name); return [...state.items.values()].find((p) => slug(p.name) === k); };
const byName = (a, b) => a.name.localeCompare(b.name, "fr");

const state = { items: new Map(), rayons: new Map(), loaded: false, channel: null, started: false };

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
  const [{ data, error }, rays] = await Promise.all([sb.from("items").select("*"), sb.from("rayons").select("*")]);
  if (error) { setStatus("La liste ne répond pas. Vérifie ta connexion.", true); return; }
  state.items = new Map(data.map((r) => { const p = fromRow(r); return [p.id, p]; }));
  // Sans la table des rayons, l'appli garde simplement les rayons de base.
  if (!rays.error) state.rayons = new Map(rays.data.map((r) => { const x = rayonFromRow(r); return [x.id, x]; }));
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
    .on("postgres_changes", { event: "*", schema: "public", table: "rayons" }, (payload) => {
      if (payload.eventType === "DELETE") state.rayons.delete(payload.old.id);
      else { const r = rayonFromRow(payload.new); state.rayons.set(r.id, r); }
      render(); if ($("editor").open) renderPills(checkedRayon());
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
  const fields = { onList: true, inCart: false, qty: parsed.qty, snoozeUntil: null };
  // On cherche par nom : un produit renommé garde son ancien identifiant.
  const known = byKey(parsed.name);
  if (known) { setFields(known.id, fields); return; }
  const key = slug(parsed.name);
  let id = key;
  while (state.items.has(id)) id = `${key}-${Math.random().toString(36).slice(2, 6)}`;
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

function removeFromList(p) {
  setFields(p.id, { onList: false, inCart: false, qty: null });
  toast(`${p.name} retiré`, () => setFields(p.id, { onList: true, qty: p.qty || null }));
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
function render() {
  const now = Date.now();
  const all = [...state.items.values()];
  const onList = all.filter((p) => p.onList && !p.inCart);
  const inCart = all.filter((p) => p.onList && p.inCart);
  const off = all.filter((p) => !p.onList);

  $("date").textContent = new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("badge").hidden = !(state.loaded && onList.length);
  $("count").textContent = `${onList.length} à acheter`;

  const soon = off.map((p) => ({ p, c: cadence(p, now) })).filter((x) => x.c && x.c.due).sort((a, b) => a.c.next - b.c.next);
  $("soon").hidden = !soon.length;
  $("soonchips").innerHTML = soon.map(({ p, c }) => `<span class="chip"><span>${emo(p)}${esc(p.name)}<span class="why">${every(c.median)}</span></span><button class="add" data-act="add" data-id="${esc(p.id)}" type="button">Ajouter</button><button class="skip" data-act="snooze" data-id="${esc(p.id)}" type="button" aria-label="Pas besoin pour ${esc(p.name)}">Pas besoin</button></span>`).join("");

  if (!state.loaded) $("list").innerHTML = "";
  else if (!all.length) {
    $("list").innerHTML = `<section class="block empty"><h2>La liste est vide</h2><p>Tape un produit en haut : il se range tout seul dans son rayon. Au fil des courses, l'appli retient votre rythme et vous rappelle quoi racheter.</p></section>`;
  } else if (!onList.length) {
    $("list").innerHTML = `<section class="block empty calm"><h2>Rien à acheter</h2><p>Ajoute un produit en haut. Tes anciens produits gardent leur rayon, leur emoji et leurs détails.</p></section>`;
  } else {
    $("list").innerHTML = rayons().map((r) => {
      const items = onList.filter((p) => rayonOf(p.rayon).id === r.id).sort(byName);
      if (!items.length) return "";
      const tools = r.custom ? `<button class="edit head" data-rid="${esc(r.id)}" type="button" aria-label="Modifier le rayon ${esc(r.label)}">${PEN}</button>` : "";
      return `<section class="block col-${r.color}"><div class="block-head"><h2><span class="emo" aria-hidden="true">${esc(r.emoji)}</span>${esc(r.label)}</h2><span class="tools">${tools}<span class="n">${items.length}</span></span></div><ul>${items.map((p) => `<li class="swipe" data-id="${esc(p.id)}"><div class="row"><button class="tick" data-act="cart" data-id="${esc(p.id)}" type="button"><span class="box">${CHECK}</span><span class="label">${emo(p)}<span class="txt">${esc(p.name)}${note(p)}</span></span></button><button class="edit" data-act="edit" data-id="${esc(p.id)}" type="button" aria-label="Modifier ${esc(p.name)}">${PEN}</button>${stepper(p)}</div></li>`).join("")}</ul></section>`;
    }).join("");
  }

  $("cartsec").hidden = !inCart.length;
  $("cartcount").textContent = inCart.length;
  $("cart").innerHTML = inCart.sort(byName).map((p) => `<li class="row"><button class="tick" data-act="uncart" data-id="${esc(p.id)}" type="button"><span class="box">${CHECK}</span><span class="label">${emo(p)}<span class="txt">${esc(p.name)}${qtyTag(p)}${note(p)}</span></span></button></li>`).join("");
  $("dock").hidden = !inCart.length;
  $("docknum").textContent = inCart.length;
}

function setStatus(msg, warn) { const s = $("status"); s.textContent = msg || ""; s.classList.toggle("warn", !!warn); }

let undoFn = null, toastTimer = null;
function toast(msg, undo) {
  $("toastmsg").textContent = msg; undoFn = undo || null; $("toastundo").hidden = !undo; $("toast").hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
}
$("toastundo").addEventListener("click", () => { if (undoFn) undoFn(); $("toast").hidden = true; undoFn = null; });

// ---------- Interactions ----------
document.addEventListener("click", (e) => {
  const rb = e.target.closest("[data-rid]");
  if (rb) { const r = state.rayons.get(rb.dataset.rid); if (r) openRayon(r); return; }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const { id, act } = b.dataset;
  const p = id && state.items.get(id);
  if (!p) return;
  if (act === "cart") setFields(id, { inCart: true });
  else if (act === "uncart") setFields(id, { inCart: false });
  else if (act === "add") setFields(id, { onList: true, inCart: false, snoozeUntil: null });
  else if (act === "edit") openEditor(p);
  else if (act === "inc") setFields(id, { qty: Math.min(99, (p.qty || 1) + 1) });
  else if (act === "dec") { const q = (p.qty || 1) - 1; setFields(id, { qty: q > 1 ? q : null }); }
  else if (act === "snooze") {
    const c = cadence(p, Date.now());
    setFields(id, { snoozeUntil: Date.now() + Math.max(2, (c ? c.median : 7) / 2) * DAY });
  }
});
$("addform").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("addinput").value;
  if (!v.trim()) return;
  addByName(v); $("addinput").value = ""; $("addinput").focus();
});
$("finish").addEventListener("click", finishShopping);

// ---------- Glisser une ligne vers la gauche pour la retirer ----------
let drag = null, swallowClick = false;
const SWIPE = 0.35; // part de la largeur à dépasser pour retirer
$("list").addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const li = e.target.closest("li.swipe");
  if (!li) return;
  drag = { li, row: li.firstElementChild, id: li.dataset.id, x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId };
});
$("list").addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { drag = null; return; } // on fait défiler la page
    if (dx > -12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    drag.on = true;
    drag.li.classList.add("swiping");
    try { drag.li.setPointerCapture(e.pointerId); } catch {}
  }
  drag.dx = Math.min(0, dx);
  drag.row.style.transform = `translateX(${drag.dx}px)`;
  drag.li.classList.toggle("armed", drag.dx < -drag.li.offsetWidth * SWIPE);
});
function endDrag(cancel) {
  const d = drag; drag = null;
  if (!d || !d.on) return;
  swallowClick = true; setTimeout(() => { swallowClick = false; }, 350);
  const go = !cancel && d.dx < -d.li.offsetWidth * SWIPE;
  d.row.style.transition = "transform .18s ease-out";
  d.row.style.transform = go ? "translateX(-110%)" : "";
  setTimeout(() => {
    if (go) { const p = state.items.get(d.id); if (p) removeFromList(p); }
    else { d.row.style.transition = ""; d.li.classList.remove("swiping", "armed"); }
  }, 180);
}
$("list").addEventListener("pointerup", () => endDrag(false));
$("list").addEventListener("pointercancel", () => endDrag(true));
// Le doigt qui vient de glisser ne doit pas aussi cocher le produit.
document.addEventListener("click", (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);

// ---------- Fiches : hauteur calée sur la partie visible de l'écran (barres de Safari, clavier) ----------
const vv = window.visualViewport;
function fitSheets() {
  if (!vv) return;
  const root = document.documentElement.style;
  root.setProperty("--vvh", `${vv.height}px`);
  root.setProperty("--kb", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
}
if (vv) { vv.addEventListener("resize", fitSheets); vv.addEventListener("scroll", fitSheets); fitSheets(); }
function openSheet(d) { fitSheets(); d.showModal(); const body = d.querySelector(".sheet-body"); if (body) body.scrollTop = 0; }
// Fermer seulement sur le fond grisé, pas dans les marges de la fiche.
function closeOnBackdrop(d, close) {
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) close();
  });
}

// ---------- Fiche produit : nom, emoji, rayon, détails ----------
let editingId = null;
const edform = $("editform");
const checkedRayon = () => { const c = edform.querySelector('input[name="rayon"]:checked'); return c ? c.value : "autre"; };

function renderPills(selected) {
  const sel = rayonOf(selected).id;
  $("edrayons").innerHTML = rayons().map((r) => `<label class="pill col-${r.color}"><input type="radio" name="rayon" value="${esc(r.id)}"${r.id === sel ? " checked" : ""}><span class="emo" aria-hidden="true">${esc(r.emoji)}</span>${esc(r.label)}</label>`).join("");
  syncRayonTools();
}
function syncRayonTools() {
  const r = state.rayons.get(checkedRayon());
  $("editrayon").hidden = !r;
  if (r) $("editrayon").textContent = `Modifier « ${r.label} »`;
}

function openEditor(p) {
  editingId = p.id;
  $("edname").value = p.name;
  $("ednote").value = p.note || "";
  const custom = p.emoji && !EMOJI_CHOICES.includes(p.emoji) ? p.emoji : "";
  $("edemoji").value = custom;
  renderPills(p.rayon);
  const choice = (e, v, label) => `<label class="emochoice"><input type="radio" name="emoji" value="${v}"${(p.emoji || "") === v && !custom ? " checked" : ""}><span aria-label="${label}">${e}</span></label>`;
  $("edemojis").innerHTML = choice(`<i id="edauto">${autoEmoji(p.name, p.rayon)}</i><b>auto</b>`, "", "Emoji automatique")
    + EMOJI_CHOICES.map((e) => choice(e, e, e)).join("");
  $("edremove").hidden = !p.onList;
  edStatus("");
  openSheet($("editor"));
}
function closeEditor() { editingId = null; $("editor").close(); }
function edStatus(msg) { const s = $("edstatus"); s.textContent = msg; s.classList.toggle("warn", !!msg); }
function refreshAuto() { const a = $("edauto"); if (a) a.textContent = autoEmoji($("edname").value, checkedRayon()); }

$("edclose").addEventListener("click", closeEditor);
closeOnBackdrop($("editor"), closeEditor);
$("editor").addEventListener("close", () => { editingId = null; });
edform.addEventListener("input", (e) => {
  if (e.target.id === "edemoji" && e.target.value) for (const r of edform.querySelectorAll('input[name="emoji"]')) r.checked = false;
  if (e.target.name === "emoji") $("edemoji").value = "";
  if (e.target.name === "rayon") syncRayonTools();
  if (e.target.id === "edname" || e.target.name === "rayon") refreshAuto();
});
$("edremove").addEventListener("click", () => {
  const p = editingId && state.items.get(editingId);
  closeEditor();
  if (p) removeFromList(p);
});
$("newrayon").addEventListener("click", () => openRayon(null));
$("editrayon").addEventListener("click", () => { const r = state.rayons.get(checkedRayon()); if (r) openRayon(r); });
edform.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = editingId && state.items.get(editingId);
  if (!p) { closeEditor(); return; }
  const name = cleanName($("edname").value);
  if (!name) { edStatus("Donne un nom au produit."); return; }
  const twin = byKey(name);
  if (twin && twin.id !== p.id) { edStatus(`« ${twin.name} » existe déjà.`); return; }
  const typed = $("edemoji").value.trim();
  const custom = pickEmoji(typed);
  if (typed && !custom) { edStatus("Tape un emoji, pas une lettre."); return; }
  const emoji = custom || edform.elements.namedItem("emoji").value || null;
  const rayon = checkedRayon();
  const detail = $("ednote").value.replace(/\s+/g, " ").trim().slice(0, 200) || null;
  setFields(p.id, { name, emoji, rayon, note: detail });
  closeEditor();
});

// ---------- Rayons créés à la main : nom, emoji, couleur ----------
const QUICK = ["🍼", "🐾", "🥂", "🌱", "💊", "🎁", "🧸", "🍷", "🏠", "🌍", "🍣", "🥗", "🧁", "🔋", "✏️", "🌸"];
let rayonEditing = null; // null = création
let deleteArmed = false;
const ryform = $("rayform");

function openRayon(r) {
  rayonEditing = r ? r.id : null;
  deleteArmed = false;
  $("rytitle").textContent = r ? "Modifier le rayon" : "Nouveau rayon";
  $("rysave").textContent = r ? "Enregistrer" : "Créer le rayon";
  $("rydelete").hidden = !r;
  $("rydelete").textContent = "Supprimer ce rayon";
  $("ryname").value = r ? r.label : "";
  $("ryemoji").value = r ? r.emoji : "";
  $("ryquick").innerHTML = QUICK.map((e) => `<button type="button" data-emoji="${e}" aria-label="Choisir ${e}">${e}</button>`).join("");
  // Couleur proposée : une que les autres rayons créés n'ont pas encore.
  const used = new Set([...state.rayons.values()].map((x) => x.color));
  const color = r ? r.color : COLORS.find((c) => !used.has(c)) || COLORS[state.rayons.size % COLORS.length];
  $("rycolors").innerHTML = COLORS.map((c) => `<label class="swatch col-${c}"><input type="radio" name="color" value="${c}"${c === color ? " checked" : ""} aria-label="Couleur ${c}"></label>`).join("");
  ryStatus("");
  openSheet($("rayoned"));
}
function closeRayon() { $("rayoned").close(); }
function ryStatus(msg) { const s = $("rystatus"); s.textContent = msg; s.classList.toggle("warn", !!msg); }

$("ryclose").addEventListener("click", closeRayon);
closeOnBackdrop($("rayoned"), closeRayon);
$("ryquick").addEventListener("click", (e) => { const b = e.target.closest("[data-emoji]"); if (b) $("ryemoji").value = b.dataset.emoji; });

ryform.addEventListener("submit", (e) => {
  e.preventDefault();
  const label = cleanLabel($("ryname").value);
  if (!label) { ryStatus("Donne un nom au rayon."); return; }
  const same = rayons().find((x) => norm(x.label) === norm(label) && x.id !== rayonEditing);
  if (same) { ryStatus(`Le rayon « ${same.label} » existe déjà.`); return; }
  const typed = $("ryemoji").value.trim();
  const emoji = pickEmoji(typed);
  if (typed && !emoji) { ryStatus("Tape un emoji, pas une lettre."); return; }
  const color = ryform.elements.namedItem("color").value || "grey";
  let id = rayonEditing;
  if (id) {
    const fields = { label, emoji: emoji || "🛒", color };
    state.rayons.set(id, { ...state.rayons.get(id), ...fields });
    write(`rayon:${id}`, () => sb.from("rayons").update(fields).eq("id", id));
  } else {
    const key = "c-" + slug(label).slice(0, 40);
    id = key;
    while (rayons().some((x) => x.id === id)) id = `${key}-${Math.random().toString(36).slice(2, 6)}`;
    const row = { id, label, emoji: emoji || "🛒", color, position: Date.now() };
    state.rayons.set(id, rayonFromRow(row));
    write(`rayon:${id}`, () => sb.from("rayons").insert(row));
  }
  closeRayon();
  render();
  // La fiche produit reste ouverte dessous : le rayon créé ou modifié y est sélectionné.
  if ($("editor").open) { renderPills(id); refreshAuto(); }
});

// Suppression en 2 temps. Les produits du rayon passent dans "Autre", rien n'est perdu.
$("rydelete").addEventListener("click", () => {
  const id = rayonEditing;
  if (!id) return;
  if (!deleteArmed) {
    deleteArmed = true;
    $("rydelete").textContent = "Confirmer : les produits iront dans « Autre »";
    return;
  }
  const now = Date.now();
  for (const p of state.items.values()) if (p.rayon === id) state.items.set(p.id, { ...p, rayon: "autre", updatedAt: now });
  state.rayons.delete(id);
  write(`rayon:${id}`, async () => {
    const moved = await sb.from("items").update({ rayon: "autre", updated_at: now }).eq("rayon", id);
    if (moved.error) return moved;
    return sb.from("rayons").delete().eq("id", id);
  });
  closeRayon();
  render();
  if ($("editor").open) { renderPills(checkedRayon()); refreshAuto(); }
});

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
