// Shared UI layer: icons, chart components, status chips, theme switch and a DOM enhancer that
// upgrades markup produced by the modules (label association, collapsible info cards, page header).
// Loaded before every module. Pure presentation: no business logic and no state.
(function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kr = (n) => { const r = Math.round(n); return (r === 0 ? 0 : r).toLocaleString("sv-SE").replace(/−/g, "-") + " kr"; };


  // ---------- data helpers shared by all modules ----------
  // Ids end up in HTML attributes, so they are restricted to a safe alphabet.
  const safeId = (v) => (/^[\w-]{1,40}$/.test(String(v == null ? "" : v)) ? String(v) : "i" + Math.random().toString(36).slice(2, 9));
  const objs = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === "object" && !Array.isArray(x)) : []);
  // Fill missing or wrongly typed keys from defaults, recursively. Mutates and returns the object.
  function fill(obj, def) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) obj = {};
    for (const k of Object.keys(def)) {
      const d = def[k];
      const v = obj[k];
      if (d && typeof d === "object" && !Array.isArray(d)) obj[k] = fill(v, d);
      else if (Array.isArray(d)) { if (!Array.isArray(v)) obj[k] = []; }
      else if (v === undefined) obj[k] = d;
    }
    return obj;
  }
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  // An empty field means "use the default shown as placeholder"; an explicit 0 stays 0.
  const parse = (raw, def) => (String(raw).trim() === "" && def !== undefined ? def : toNum(raw));
  // Fields where 0 is a real, visible value (not "empty"): shown as "0" instead of the placeholder.
  const ZERO = new Set(["years", "loanMonths", "tireLife", "taxOverride", "endValue", "waitHours", "months", "lossIncome", "loanRate", "returnRate", "iskReturn", "bankRate", "people", "buffer", "ownA"]);
  const fv = (v, key) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    const k = (/="(\w+)"/.exec(String(key)) || [0, key])[1];
    return n === 0 && !ZERO.has(k) ? "" : String(n);
  };
  // Local calendar dates (toISOString would shift them to UTC and a day off in Sweden).
  const pad = (n) => String(n).padStart(2, "0");
  const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function addMonths(d, n) {
    const y = d.getFullYear() + Math.floor((d.getMonth() + n) / 12);
    const m = (d.getMonth() + n + 1200) % 12;
    const last = new Date(y, m + 1, 0).getDate();
    return localISO(new Date(y, m, Math.min(d.getDate(), last)));
  }
  function toast(msg, bad) {
    const el = document.createElement("div");
    el.className = "toast" + (bad ? " toast-bad" : "");
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }

  // ---------- icons (24px grid, 1.8 stroke) ----------
  const PATHS = {
    overview: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5 4.3"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r="1"/><circle cx="4.8" cy="12" r="1"/><circle cx="4.8" cy="17" r="1"/>',
    house: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    car: '<path d="M4 15l1.6-5a2 2 0 0 1 1.9-1.4h9a2 2 0 0 1 1.9 1.4L20 15"/><rect x="3" y="15" width="18" height="4" rx="1.5"/><circle cx="7.5" cy="17" r=".8"/><circle cx="16.5" cy="17" r=".8"/>',
    child: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><circle cx="9.3" cy="10" r=".7"/><circle cx="14.7" cy="10" r=".7"/>',
    cart: '<path d="M3 5h2.5l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 14.5l2 2 3.5-4"/>',
    plane: '<path d="M21 4L3 11l7 3 3 7 8-17z"/>',
    paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="16" cy="7.5" r="1.8"/><circle cx="19" cy="12" r="1.8"/><path d="M8 17c0-2.6 2-4.5 4.5-4.5S17 14.4 17 17c0 2-1.7 2.8-4.5 2.8S8 19 8 17z"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>',
    alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.2"/><circle cx="12" cy="16.8" r=".6"/>',
    stop: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    phone: '<path d="M6 4h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2L15 12.5l4 1.5v3a2 2 0 0 1-2 2C10.4 19 5 13.6 5 7a2 2 0 0 1 1-1.7z"/>',
  };
  const icon = (name, size) =>
    `<svg class="ico" width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;

  // Route theme: icon and hue (CSS custom property --hue) per module.
  const ROUTES = {
    "": { icon: "overview", hue: "var(--accent)", title: "Översikt" },
    mer: { icon: "grid", hue: "var(--accent)", title: "Mer" },
    hushall: { icon: "people", hue: "var(--accent)", title: "Hushåll" },
    utgifter: { icon: "list", hue: "var(--accent)", title: "Utgifter" },
    bostad: { icon: "house", hue: "#2a78d6", title: "Bostad", desc: "Köpekalkyl, bolån och BRF-granskning" },
    sambo: { icon: "heart", hue: "#a8477d", title: "Sambo och juridik", desc: "Samboavtal, testamente, separation" },
    sparande: { icon: "coins", hue: "#1b8f66", title: "Buffert och sparande", desc: "Buffert, sparmål, ISK" },
    bil: { icon: "car", hue: "#d9622b", title: "Bil", desc: "Månadskostnad och finansiering" },
    barn: { icon: "child", hue: "#c2527a", title: "Barn", desc: "Föräldrapenning, maxtaxa, bidrag" },
    kopbeslut: { icon: "cart", hue: "#b7791f", title: "Köpbeslut", desc: "Köpregler, kredit, reklamation" },
    overenskommelser: { icon: "doc", hue: "#2f8f8a", title: "Överenskommelser", desc: "Hårda linjer och månadsmöte" },
    resor: { icon: "plane", hue: "#3b82c4", title: "Resor och nöje", desc: "Resekalkyl, rättigheter, nöje" },
    djur: { icon: "paw", hue: "#8b6b4a", title: "Djur", desc: "Kostnad under hela livet" },
  };

  // ---------- components ----------
  // Validated categorical slots (light/dark come from CSS variables --s1..--s8).
  const slot = (n) => `var(--s${n})`;

  // Status chip: always icon + text, never colour alone.
  function chip(level, text) {
    const m = { ok: ["check", "Ok"], warn: ["alert", "Se upp"], bad: ["stop", "Röd flagga"], wait: ["stop", "Vänta"], info: ["check", ""] }[level] || ["check", ""];
    return `<span class="chip chip-${level}">${icon(m[0], 14)}${esc(text || m[1])}</span>`;
  }

  // Stacked bar with a 2px surface gap between segments and a legend that carries the values.
  // segments: [{label, value, slot}] with slot 1..8 in fixed order.
  function stack(segments, opts) {
    const o = opts || {};
    const total = segments.reduce((a, s) => a + Math.max(s.value, 0), 0);
    const live = segments.filter((s) => s.value > 0);
    if (total <= 0) return "";
    const bar = live
      .map((s) => `<span class="seg" style="flex:${s.value};background:${s.color || slot(s.slot)}" title="${esc(s.label)}: ${esc(kr(s.value))}"></span>`)
      .join("");
    const legend = segments
      .map((s) => `<li><span class="dot" style="background:${s.color || slot(s.slot)}"></span><span class="lg-label">${esc(s.label)}</span><span class="lg-val">${esc(kr(s.value))}</span><span class="lg-pct">${Math.round((Math.max(s.value, 0) / total) * 100)} %</span></li>`)
      .join("");
    return `<div class="stack" role="img" aria-label="${esc(o.label || "Fördelning")}">${bar}</div><ul class="legend">${legend}</ul>`;
  }

  // Horizontal bars (<= 24px, 4px rounded data end). items: [{label, value, slot?}]; value at the tip.
  function bars(items, opts) {
    const o = opts || {};
    const rows = items.filter((i) => i.value > 0);
    const max = Math.max(...rows.map((r) => r.value), 0);
    if (!rows.length || max <= 0) return "";
    return `<ul class="bars">${rows
      .map(
        (r) => `<li><div class="b-head"><span>${esc(r.label)}</span><strong>${esc(o.fmt ? o.fmt(r.value) : kr(r.value))}</strong></div><div class="b-track"><span class="b-fill" style="width:${Math.max((r.value / max) * 100, 2)}%;background:${slot(r.slot || 1)}"></span></div></li>`
      )
      .join("")}</ul>`;
  }

  // Meter: fill carries severity, track is a lighter step of the same hue.
  function meter(value, max, opts) {
    const o = opts || {};
    const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    const sev = o.severity || "accent";
    return `<div class="meter meter-${sev}" role="img" aria-label="${esc(o.label || "Framsteg")}: ${Math.round(pct * 100)} %"><span style="width:${pct * 100}%"></span></div>`;
  }

  // Ring gauge for a share 0..1. Colour comes from CSS (--ring-color), text sits in the middle.
  function ring(p, o) {
    const opt = o || {};
    const size = opt.size || 88;
    const sw = opt.stroke || 10;
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.min(Math.max(Number.isFinite(p) ? p : 0, 0), 1);
    const mid = size / 2;
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opt.label || "Andel")}: ${Math.round(v * 100)} %">
      <circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="${sw}"/>
      <circle class="ring-arc" cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${v * c} ${c}" transform="rotate(-90 ${mid} ${mid})"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text" style="font-size:${Math.round(size * 0.24)}px">${Math.round(v * 100)}%</text>
    </svg>`;
  }

  // Donut with a 3px surface gap between arcs. segments: [{label, value, slot|color}]. Centre shows a label and a value.
  function donut(segments, o) {
    const opt = o || {};
    const total = segments.reduce((a, s) => a + Math.max(s.value, 0), 0);
    if (total <= 0) return "";
    const size = opt.size || 200;
    const sw = opt.stroke || 26;
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    const mid = size / 2;
    const gap = 3;
    let offset = 0;
    const arcs = segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const len = Math.max((s.value / total) * c - gap, 0.5);
        const el = `<circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${s.color || slot(s.slot)}" stroke-width="${sw}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${mid} ${mid})"><title>${esc(s.label)}: ${esc(kr(s.value))}</title></circle>`;
        offset += (s.value / total) * c;
        return el;
      })
      .join("");
    const legend = segments
      .map((s) => `<li><span class="dot" style="background:${s.color || slot(s.slot)}"></span><span class="lg-label">${esc(s.label)}</span><span class="lg-val">${esc(kr(s.value))}</span><span class="lg-pct">${Math.round((Math.max(s.value, 0) / total) * 100)} %</span></li>`)
      .join("");
    return `<div class="donut-wrap"><svg class="donut" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opt.label || "Fördelning")}">${arcs}
      <text x="50%" y="${mid - 8}" text-anchor="middle" class="donut-l">${esc(opt.center ? opt.center.label : "")}</text>
      <text x="50%" y="${mid + 18}" text-anchor="middle" class="donut-v">${esc(opt.center ? opt.center.value : "")}</text></svg></div><ul class="legend">${legend}</ul>`;
  }

  // Initial in a coloured circle.
  const avatar = (name, color) => `<span class="avatar" style="--av:${color}" aria-hidden="true">${esc((String(name).trim()[0] || "?").toUpperCase())}</span>`;

  // Compact figure with an icon.
  const stat = (iconName, label, value, hue) => `<div class="stat" style="--hue:${hue || "var(--accent)"}"><span class="stat-ico">${icon(iconName, 20)}</span><div class="stat-v">${esc(value)}</div><div class="stat-l">${esc(label)}</div></div>`;

  // Friendly flat illustration for first-time users (house, coins, sun).
  const illustration = () => `<svg class="illus-svg" viewBox="0 0 260 130" role="img" aria-label="Hus, mynt och sol" xmlns="http://www.w3.org/2000/svg">
    <circle cx="214" cy="30" r="20" fill="#ffd166"/><circle cx="214" cy="30" r="30" fill="#ffd166" opacity="0.25"/>
    <path d="M0 112c40-14 80-14 130 0s90 14 130 0v18H0z" fill="var(--accent)" fill-opacity="0.22"/>
    <path d="M52 112h156" stroke="var(--accent)" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>
    <rect x="86" y="58" width="84" height="54" rx="10" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/>
    <path d="M76 62l52-38 52 38" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="116" y="80" width="24" height="32" rx="6" fill="var(--accent)"/>
    <circle cx="48" cy="96" r="15" fill="#f4b73f"/><circle cx="48" cy="96" r="9" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="3"/>
    <circle cx="70" cy="104" r="11" fill="#f08a4b"/><circle cx="70" cy="104" r="6" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="2.5"/>
    <circle cx="30" cy="40" r="4" fill="var(--accent)" opacity="0.5"/><circle cx="62" cy="26" r="3" fill="var(--s1)" opacity="0.6"/><circle cx="188" cy="74" r="3.5" fill="var(--s5)" opacity="0.6"/>
  </svg>`;

  // Hero number: one per view.
  const hero = (label, value, sub, neg, o) => `<div class="hero"><div class="hero-main"><div class="hero-label">${esc(label)}</div><div class="hero-value${neg ? " neg" : ""}">${esc(value)}</div>${sub ? `<div class="hero-sub">${sub}</div>` : ""}</div>${o && o.ring != null ? `<div class="hero-ring">${ring(o.ring, { size: 96, stroke: 10, label: o.ringLabel || "Andel" })}<span>${esc(o.ringCaption || "")}</span></div>` : ""}</div>`;

  // ---------- theme ----------
  const THEME_KEY = "hushallskassan.theme";
  // Light is the default. "auto" follows the phone's setting; "dark" is chosen explicitly.
  function getTheme() {
    try { const t = localStorage.getItem(THEME_KEY); return t === "dark" || t === "auto" ? t : "light"; } catch (e) { return "light"; }
  }
  function setTheme(t) {
    try { if (t === "light") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch (e) { /* storage blocked */ }
    applyTheme();
  }
  function applyTheme() {
    const t = getTheme();
    const root = document.documentElement;
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    const dark = t === "dark" || (t === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0d0d0d" : "#f3f4ef");
  }

  // ---------- enhancer ----------
  let lastFocus = null;
  const sig = (el) => [el.tagName, el.type || "", JSON.stringify(el.dataset), (el.closest("[data-id]") || { dataset: {} }).dataset.id || "", el.name || ""].join("|");
  document.addEventListener("focusin", (ev) => { lastFocus = { sig: sig(ev.target), at: Date.now() }; });
  // Runs on every DOM change inside #app. Idempotent: processed nodes are marked.
  function enhance(root) {
    if (!root) return;
    const route = (location.hash.replace(/^#\/?/, "") || "");
    const theme = ROUTES[route] || ROUTES[""];
    root.dataset.route = route;
    root.style.setProperty("--hue", theme.hue);

    // 1. Page header: icon chip beside the first h1.
    const h1 = root.querySelector("h1");
    if (h1 && !h1.closest(".page-head")) {
      const head = document.createElement("div");
      head.className = "page-head";
      h1.parentNode.insertBefore(head, h1);
      const chipEl = document.createElement("span");
      chipEl.className = "head-icon";
      chipEl.innerHTML = icon(theme.icon, 26);
      const text = document.createElement("div");
      text.className = "head-text";
      head.appendChild(chipEl);
      head.appendChild(text);
      text.appendChild(h1);
      const lead = head.nextElementSibling;
      if (lead && lead.tagName === "P") text.appendChild(lead);
    }

    // 2. Associate labels with the field that follows them.
    root.querySelectorAll("label").forEach((l) => {
      if (l.htmlFor || l.querySelector("input,select,textarea")) return;
      const next = l.nextElementSibling;
      if (next && /^(INPUT|SELECT|TEXTAREA)$/.test(next.tagName)) {
        if (!next.id) next.id = "f" + Math.random().toString(36).slice(2, 9);
        l.htmlFor = next.id;
      }
    });

    // 3. Info cards (heading + list, no controls) become collapsible; sources start closed.
    root.querySelectorAll(".card").forEach((card) => {
      if (card.dataset.enh) return;
      const first = card.firstElementChild;
      if (!first || first.tagName !== "H2") return;
      if (!card.querySelector("ul") || card.querySelector("input,select,textarea,button,table,.stack,.bars,.meter,.kv,.legend,.steps")) return;
      card.dataset.enh = "1";
      const isSources = /^Källor och osäkerheter/.test(first.textContent.trim());
      const det = document.createElement("details");
      det.className = "card info" + (isSources ? " sources" : "");
      if (!isSources) det.open = false;
      const sum = document.createElement("summary");
      sum.innerHTML = `<span>${first.innerHTML}</span>${icon("chevron", 18)}`;
      det.appendChild(sum);
      const body = document.createElement("div");
      body.className = "info-body";
      first.remove();
      while (card.firstChild) body.appendChild(card.firstChild);
      det.appendChild(body);
      card.replaceWith(det);
    });

    // 3b. Segmented tabs are toggle buttons in a group, not a full ARIA tab pattern.
    root.querySelectorAll(".tabs").forEach((t) => {
      t.setAttribute("role", "group");
      t.querySelectorAll("button").forEach((b) => {
        b.removeAttribute("role");
        b.setAttribute("aria-pressed", b.classList.contains("primary") ? "true" : "false");
      });
      // Keep the selected tab visible in a scrollable row (horizontal only, so the page does not jump).
      const on = t.querySelector("button.primary");
      if (on && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(on.offsetLeft - (t.clientWidth - on.offsetWidth) / 2, 0);
    });

    // 3c. Keep keyboard/screen-reader focus after a module re-renders the whole view.
    if (lastFocus && Date.now() - lastFocus.at < 1500 && (!document.activeElement || document.activeElement === document.body)) {
      const hit = [...root.querySelectorAll("input,select,textarea,button")].find((el) => sig(el) === lastFocus.sig);
      if (hit) { try { hit.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }

    // 3d. A card that opens with a label and a big number gets a coloured header strip in the module hue.
    root.querySelectorAll(".card").forEach((card) => {
      if (card.dataset.strip) return;
      const a = card.firstElementChild;
      const b = a && a.nextElementSibling;
      if (!a || !b || !a.classList.contains("muted") || !b.classList.contains("big")) return;
      card.dataset.strip = "1";
      const strip = document.createElement("div");
      strip.className = "hero-strip";
      card.insertBefore(strip, a);
      strip.appendChild(a);
      strip.appendChild(b);
      let n = strip.nextElementSibling;
      while (n && (n.classList.contains("muted") || n.classList.contains("meter"))) {
        const next = n.nextElementSibling;
        strip.appendChild(n);
        n = next;
      }
    });

    // 3e. Count the overview hero number up once. Writes to the text node, which the observer does not watch.
    root.querySelectorAll(".hero-value:not([data-cu])").forEach((el) => {
      el.dataset.cu = "1";
      const m = /^(-?)(\d(?:[\d\s\u00a0]*\d)?)(.*)$/.exec(el.textContent.trim());
      if (!m || !el.firstChild || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
      const target = Number(m[2].replace(/[\s\u00a0]/g, ""));
      const sign = m[1];
      const tail = m[3];
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min((now - t0) / 700, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        el.firstChild.nodeValue = sign + Math.round(target * eased).toLocaleString("sv-SE") + tail;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    // 4. Phone links look like buttons and meet the 44px target.
    root.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      if (a.dataset.enh) return;
      a.dataset.enh = "1";
      a.classList.add("call");
      a.insertAdjacentHTML("afterbegin", icon("phone", 16));
    });
  }

  function start() {
    applyTheme();
    const navIcons = { "": "overview", hushall: "people", utgifter: "list", bostad: "house", mer: "grid" };
    document.querySelectorAll("#nav a").forEach((a) => {
      const span = a.querySelector("span");
      if (span) span.innerHTML = icon(navIcons[a.dataset.route] || "grid", 24);
    });
    const app = document.getElementById("app");
    if (!app || typeof MutationObserver === "undefined") return;
    let busy = false;
    const run = () => {
      if (busy) return;
      busy = true;
      try { enhance(app); } finally { busy = false; }
    };
    new MutationObserver(() => { if (!busy) run(); }).observe(app, { childList: true, subtree: true });
    window.addEventListener("hashchange", run);
    run();
  }
  start();

  window.UI = { illustration, ring, donut, avatar, stat, safeId, objs, fill, toNum, parse, fv, localISO, addMonths, toast, esc, kr, icon, chip, stack, bars, meter, hero, slot, ROUTES, getTheme, setTheme, applyTheme, enhance, start };
})();
