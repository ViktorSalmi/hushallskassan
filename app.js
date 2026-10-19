(function () {
  "use strict";

  const STORAGE_KEY = "hushallskassan.v1";
  const R = window.RULES;
  const app = document.getElementById("app");

  // ---------- state ----------
  const defaults = () => ({
    version: 1,
    persons: [
      { name: "Person 1", income: 0, pocket: 0 },
      { name: "Person 2", income: 0, pocket: 0 },
    ],
    model: "proportional",
    expenses: [],
    housing: {},
    sambo: {},
    sparande: {},
    bil: {},
    barn: {},
    kop: {},
    avtal: {},
    resor: {},
    djur: {},
  });

  let state;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      // Corrupt data: keep a copy so the next save() does not destroy it, then start fresh.
      try { if (raw) localStorage.setItem(STORAGE_KEY + ".backup", raw); } catch (e2) { /* storage blocked */ }
    }
    return defaults();
  }

  function normalize(s) {
    const d = defaults();
    if (!s || typeof s !== "object") return d;
    return {
      version: 1,
      persons: [0, 1].map((i) => {
        const p = Array.isArray(s.persons) && s.persons[i] && typeof s.persons[i] === "object" ? s.persons[i] : {};
        return {
          name: typeof p.name === "string" ? p.name : d.persons[i].name,
          income: num(p.income),
          pocket: num(p.pocket),
        };
      }),
      model: R.models[s.model] ? s.model : d.model,
      expenses: UI.objs(s.expenses).map((e) => ({
        id: UI.safeId(e.id),
        name: String(e.name || ""),
        amount: num(e.amount),
        owner: e.owner === 0 || e.owner === 1 ? e.owner : "shared",
        essential: e.essential !== false,
      })),
      housing: s.housing && typeof s.housing === "object" && !Array.isArray(s.housing) ? s.housing : {},
      sambo: s.sambo && typeof s.sambo === "object" && !Array.isArray(s.sambo) ? s.sambo : {},
      sparande: s.sparande && typeof s.sparande === "object" && !Array.isArray(s.sparande) ? s.sparande : {},
      bil: s.bil && typeof s.bil === "object" && !Array.isArray(s.bil) ? s.bil : {},
      barn: s.barn && typeof s.barn === "object" && !Array.isArray(s.barn) ? s.barn : {},
      kop: s.kop && typeof s.kop === "object" && !Array.isArray(s.kop) ? s.kop : {},
      avtal: s.avtal && typeof s.avtal === "object" && !Array.isArray(s.avtal) ? s.avtal : {},
      resor: s.resor && typeof s.resor === "object" && !Array.isArray(s.resor) ? s.resor : {},
      djur: s.djur && typeof s.djur === "object" && !Array.isArray(s.djur) ? s.djur : {},
    };
  }

  let saveFailed = false;
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveFailed = false;
    } catch (e) {
      if (!saveFailed) {
        saveFailed = true;
        UI.toast("Kunde inte spara. Datan finns bara tills du lämnar sidan (privat läge eller full lagring?).", true);
      }
    }
  }

  // ---------- helpers ----------
  const num = (v) => {
    const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const kr = (n) => { const r = Math.round(n); return (r === 0 ? 0 : r).toLocaleString("sv-SE").replace(/−/g, "-") + " kr"; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pname = (i) => state.persons[i].name.trim() || "Person " + (i + 1);

  state = load();

  // ---------- calculation ----------
  function calc() {
    const inc = state.persons.map((p) => p.income);
    const totalInc = inc[0] + inc[1];
    const shared = state.expenses.filter((e) => e.owner === "shared").reduce((a, e) => a + e.amount, 0);
    const own = [0, 1].map((i) =>
      state.expenses.filter((e) => e.owner === i).reduce((a, e) => a + e.amount, 0) + state.persons[i].pocket
    );
    let share = [0, 0];
    if (state.model === "half") {
      share = [shared / 2, shared / 2];
    } else if (state.model === "equalLeft") {
      const left = (totalInc - own[0] - own[1] - shared) / 2;
      share = [inc[0] - own[0] - left, inc[1] - own[1] - left];
      // The person with less income cannot pay a negative share: clamp and rebalance.
      for (let i = 0; i < 2; i++) {
        if (share[i] < 0) { share[i] = 0; share[1 - i] = shared; }
        if (share[i] > shared) { share[i] = shared; share[1 - i] = 0; }
      }
    } else {
      share = totalInc > 0 ? [shared * inc[0] / totalInc, shared * inc[1] / totalInc] : [shared / 2, shared / 2];
    }
    const left = [0, 1].map((i) => inc[i] - own[i] - share[i]);
    const essential = state.expenses.filter((e) => e.essential !== false).reduce((a, e) => a + e.amount, 0);
    return { inc, totalInc, shared, own, share, left, totalLeft: left[0] + left[1], essential };
  }

  // ---------- views ----------
  const views = {
    "": viewOverview,
    hushall: viewHousehold,
    utgifter: viewExpenses,
    mer: viewMore,
  };
  // Feature modules (loaded before this file) register extra views through window.AppModules.

  function route() {
    const r = location.hash.replace(/^#\/?/, "");
    return Object.prototype.hasOwnProperty.call(views, r) ? r : "";
  }

  function render() {
    const r = route();
    app.innerHTML = views[r]();
    document.querySelectorAll("#nav a").forEach((a) => {
      if (a.dataset.route === (views[r].nav || r)) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (views[r].after) views[r].after();
    window.scrollTo(0, 0);
  }

  // Money allocation for the stacked bar: housing, other expenses, pocket money and what is left.
  function allocation(c) {
    const housing = state.expenses.filter((e) => e.id === "housing").reduce((a, e) => a + e.amount, 0);
    const total = state.expenses.reduce((a, e) => a + e.amount, 0);
    const pocket = state.persons.reduce((a, p) => a + p.pocket, 0);
    return [
      { label: "Boende", value: housing, slot: 1 },
      { label: "Övriga utgifter", value: Math.max(total - housing, 0), slot: 2 },
      { label: "Kvar att spara", value: Math.max(c.totalLeft, 0), slot: 3 },
      { label: "Fickpengar", value: pocket, slot: 4 },
    ];
  }

  // Person colours (violet, pink). Names are always written next to them, so colour never carries identity alone.
  const PCOL = ["var(--s7)", "var(--s5)"];

  // mode "hero": the overview with the one hero figure. Otherwise a compact summary card.
  function resultBlock(mode) {
    const c = calc();
    const m = R.models[state.model];
    const warn =
      c.totalInc === 0
        ? `<div class="warn">Fyll i inkomster under Hushåll.</div>`
        : c.totalLeft < 0
        ? `<div class="warn">Utgifterna är större än inkomsterna med ${kr(-c.totalLeft)} per månad.</div>`
        : "";
    const rate = c.totalInc > 0 ? Math.round((c.totalLeft / c.totalInc) * 100) : null;
    const sub = c.totalInc > 0 ? `${rate} % av hushållets inkomst på ${kr(c.totalInc)}. Gemensamma kostnader: ${kr(c.shared)}.` : `Gemensamma kostnader: ${kr(c.shared)}.`;

    if (mode === "hero") {
      if (c.totalInc === 0) return ""; // new household: the welcome card in the overview carries the first step
      const alloc = allocation(c);
      const expTotal = state.expenses.reduce((acc, e) => acc + e.amount, 0);
      const pocket = alloc[3].value;
      const hero = UI.hero("Kvar att spara per månad", kr(c.totalLeft), sub, c.totalLeft < 0, {
        ring: c.totalInc > 0 ? Math.max(c.totalLeft, 0) / c.totalInc : null,
        ringLabel: "Sparkvot",
        ringCaption: "sparkvot",
      });
      const stats = c.totalInc > 0
        ? `<div class="stats">${UI.stat("coins", "Inkomst", kr(c.totalInc), "var(--s1)")}${UI.stat("list", "Utgifter", kr(expTotal), "var(--s2)")}${UI.stat("house", "Boende", kr(alloc[0].value), "var(--s1)")}${UI.stat("heart", "Fickpengar", kr(pocket), "var(--s4)")}</div>`
        : "";
      const donut = c.totalInc > 0 ? `<div class="card"><h2>Så fördelas era pengar</h2>${UI.donut(alloc, { label: "Fördelning av hushållets månadsinkomst", center: { label: "Inkomst", value: kr(c.totalInc) } })}</div>` : "";
      const split = c.shared > 0 && c.totalInc > 0
        ? `<div class="card"><h2>Så delar ni gemensamma kostnader</h2><p class="muted">Fördelning: ${esc(m.name.toLowerCase())}.</p>${UI.stack([{ label: pname(0), value: c.share[0], color: PCOL[0] }, { label: pname(1), value: c.share[1], color: PCOL[1] }], { label: "Fördelning av gemensamma kostnader" })}</div>`
        : "";
      const person = (i) => {
        const part = c.shared > 0 ? Math.round((c.share[i] / c.shared) * 100) : 0;
        const leftShare = c.inc[i] > 0 ? Math.max(c.left[i], 0) / c.inc[i] : 0;
        return `<div class="card pcard" style="--pc:${PCOL[i]}">
          <div class="p-head">${UI.avatar(pname(i), PCOL[i])}<div><strong>${esc(pname(i))}</strong><div class="muted">Betalar ${part} % av gemensamt</div></div></div>
          <div class="p-body">
            <div class="p-ring">${UI.ring(leftShare, { size: 96, stroke: 10, label: "Andel av inkomsten som blir kvar" })}<span class="p-cap">kvar</span></div>
            <div class="p-kv">
              <div class="kv"><span>Inkomst</span><span>${kr(c.inc[i])}</span></div>
              <div class="kv"><span>Gemensamt</span><span>${kr(c.share[i])}</span></div>
              <div class="kv"><span>Eget</span><span>${kr(c.own[i])}</span></div>
              <div class="kv"><strong>Kvar att spara</strong><strong class="${c.left[i] < 0 ? "neg" : ""}">${kr(c.left[i])}</strong></div>
            </div>
          </div></div>`;
      };
      return `${warn}${hero}${stats}${donut}${split}${person(0)}${person(1)}`;
    }

    const people = [0, 1]
      .map((i) => {
        const part = c.shared > 0 ? Math.round((c.share[i] / c.shared) * 100) : 0;
        return `
      <div class="card">
        <div class="kv"><strong>${esc(pname(i))}</strong><span class="tag">${part} % av gemensamt</span></div>
        <div class="kv"><span>Inkomst</span><span>${kr(c.inc[i])}</span></div>
        <div class="kv"><span>Gemensamt (${m.name.toLowerCase()})</span><span>${kr(c.share[i])}</span></div>
        <div class="kv"><span>Eget och fickpengar</span><span>${kr(c.own[i])}</span></div>
        <div class="kv"><strong>Kvar att spara</strong><strong class="${c.left[i] < 0 ? "neg" : ""}">${kr(c.left[i])}</strong></div>
        ${c.inc[i] > 0 ? UI.meter(Math.max(c.left[i], 0), c.inc[i], { label: "Andel av inkomsten som blir kvar", severity: c.left[i] < 0 ? "bad" : "accent" }) : ""}
      </div>`;
      })
      .join("");
    return `${warn}<div class="card"><div class="muted">Kvar för hushållet per månad</div><div class="big ${c.totalLeft < 0 ? "neg" : ""}">${kr(c.totalLeft)}</div><div class="muted">${sub}</div></div>${people}`;
  }

  function staleNotice() {
    const stale = R.staleKeys();
    return stale.length
      ? `<div class="warn">Några regler och belopp i appen är äldre än ${R.STALE_DAYS} dagar och kan ha ändrats. Kontrollera dem innan du fattar beslut.</div>`
      : "";
  }

  function onboarding() {
    const visited = ["housing", "sambo", "sparande", "bil", "barn", "kop", "avtal", "resor", "djur"].some((k) => state[k] && Object.keys(state[k]).length > 0);
    const steps = [
      ["Fyll i era inkomster", "#/hushall", state.persons.some((p) => p.income > 0)],
      ["Lägg in utgifter, gärna med Konsumentverkets mall", "#/utgifter", state.expenses.length > 0],
      ["Sätt fickpengar och fördelning", "#/hushall", state.persons.some((p) => p.pocket > 0)],
      ["Utforska bostad, sparande och mer", "#/mer", visited],
    ];
    const done = steps.filter((s) => s[2]).length;
    if (done === steps.length) return "";
    return `<div class="card welcome"><div class="illus">${UI.illustration()}</div><h2>Så kommer ni igång</h2>
      <p class="muted">Fyra korta steg, så får ni en tydlig bild av månaden.</p>
      ${UI.meter(done, steps.length, { label: "Steg klara" })}
      <ol class="steps">${steps.map(([t, href, ok], i) => `<li class="${ok ? "done" : ""}"><a href="${href}"><span class="step-n">${ok ? UI.icon("check", 16) : i + 1}</span><span>${esc(t)}</span></a></li>`).join("")}</ol></div>`;
  }

  function themeButtons() {
    const cur = UI.getTheme();
    return `<div class="tabs" style="position:static;margin:8px 0" role="group" aria-label="Utseende">${[["light", "Ljust"], ["dark", "Mörkt"], ["auto", "Automatiskt"]]
      .map(([k, l]) => `<button data-theme-set="${k}" class="${cur === k ? "primary" : ""}">${l}</button>`)
      .join("")}</div>`;
  }

  function viewOverview() {
    const tiles = ["bostad", "sparande", "overenskommelser", "kopbeslut"]
      .map((k) => {
        const t = UI.ROUTES[k];
        return `<a class="tile" href="#/${k}" style="--hue:${t.hue}"><span class="t-icon">${UI.icon(t.icon, 24)}</span><strong>${esc(t.title)}</strong><span class="t-desc">${esc(t.desc || "")}</span></a>`;
      })
      .join("");
    return `<div class="head-avatars" aria-hidden="true">${UI.avatar(pname(0), PCOL[0])}${UI.avatar(pname(1), PCOL[1])}</div>
      <h1>Översikt</h1>
      <p class="muted">${state.persons.every((p) => p.name.trim() && !/^Person \d$/.test(p.name.trim())) ? "Hej " + esc(pname(0)) + " och " + esc(pname(1)) + ". Så ser månaden ut." : "Månadsbudget för er två."}</p>
      ${staleNotice()}
      ${onboarding()}
      ${resultBlock("hero")}
      <h2 style="margin:22px 4px 0">Fördjupa</h2>
      <div class="tiles">${tiles}</div>
      <div class="card">
        <h2>Utseende</h2>
        ${themeButtons()}
        <h2 style="margin-top:18px">Spara och flytta data</h2>
        <p class="muted">Datan finns bara på den här telefonen. Kopiera den för att ta backup eller flytta den. Exporten innehåller inkomster och, om du fyllt i dem, ägodelar och värden. Förvara den privat.</p>
        <div class="row">
          <button id="btn-export">Kopiera data</button>
          <button id="btn-import-toggle">Klistra in data</button>
        </div>
        <div id="import-box" hidden>
          <label for="import-text">Klistra in tidigare kopierad data</label>
          <textarea id="import-text" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>
          <button id="btn-import" class="primary" style="margin-top:8px;width:100%">Ersätt min data</button>
        </div>
        <p id="io-msg" class="muted" style="margin-top:8px"></p>
      </div>`;
  }
  viewOverview.after = function () {
    const msg = document.getElementById("io-msg");
    document.querySelectorAll("[data-theme-set]").forEach((b) => {
      b.onclick = () => {
        UI.setTheme(b.dataset.themeSet);
        document.querySelectorAll("[data-theme-set]").forEach((x) => x.classList.toggle("primary", x === b));
      };
    });
    document.getElementById("btn-export").onclick = async () => {
      const text = JSON.stringify(state);
      try {
        await navigator.clipboard.writeText(text);
        msg.textContent = "Kopierat. Klistra in i en anteckning eller ett meddelande till dig själv.";
      } catch (e) {
        const box = document.getElementById("import-box");
        box.hidden = false;
        document.getElementById("import-text").value = text;
        msg.textContent = "Kunde inte kopiera automatiskt. Markera texten i rutan och kopiera manuellt.";
      }
    };
    document.getElementById("btn-import-toggle").onclick = () => {
      const box = document.getElementById("import-box");
      box.hidden = !box.hidden;
    };
    document.getElementById("btn-import").onclick = () => {
      try {
        const parsed = JSON.parse(document.getElementById("import-text").value);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.persons)) throw new Error("bad shape");
        if (!confirm("Din nuvarande data ersätts. Fortsätta?")) return;
        state = normalize(parsed);
        save();
        render();
      } catch (e) {
        msg.textContent = "Texten gick inte att läsa som hushållsdata. Inget har ändrats.";
      }
    };
  };

  function viewHousehold() {
    const person = (i) => `
      <div class="card">
        <h2>Person ${i + 1}</h2>
        <label for="name-${i}">Namn</label>
        <input id="name-${i}" data-person="${i}" data-field="name" value="${esc(state.persons[i].name)}" autocomplete="off">
        <label for="income-${i}">Inkomst efter skatt per månad (kr)</label>
        <input id="income-${i}" data-person="${i}" data-field="income" inputmode="decimal" value="${state.persons[i].income || ""}" placeholder="0">
        <label for="pocket-${i}">Fickpengar per månad (kr), egna pengar utan insyn</label>
        <input id="pocket-${i}" data-person="${i}" data-field="pocket" inputmode="decimal" value="${state.persons[i].pocket || ""}" placeholder="0">
      </div>`;
    const models = Object.entries(R.models)
      .map(
        ([k, m]) => `
        <label class="opt">
          <input type="radio" name="model" value="${k}" ${state.model === k ? "checked" : ""}>
          <span><strong>${m.name}</strong><span class="muted">${m.text}</span></span>
        </label>`
      )
      .join("");
    return `<h1>Hushåll</h1>
      <p class="muted">Inkomster och hur gemensamma kostnader fördelas.</p>
      ${person(0)}${person(1)}
      <div class="card"><h2>Fördelning av gemensamt</h2><div class="opts">${models}</div></div>
      <div id="result">${resultBlock()}</div>`;
  }
  function onHouseholdInput(ev) {
    const t = ev.target;
    if (route() !== "hushall") return;
    if (t.name === "model") {
      state.model = t.value;
    } else if (t.dataset.person !== undefined) {
      const p = state.persons[Number(t.dataset.person)];
      p[t.dataset.field] = t.dataset.field === "name" ? t.value : num(t.value);
    } else {
      return;
    }
    save();
    const res = document.getElementById("result");
    if (res) res.innerHTML = resultBlock();
  }

  const kv = R.konsumentverket;

  function viewExpenses() {
    const rows = state.expenses.map(expenseRow).join("") ||
      `<p class="muted">Inga utgifter ännu. Lägg till egna, eller börja från Konsumentverkets mall.</p>`;
    return `<h1>Utgifter</h1>
      <p class="muted">Ungefärliga belopp per månad. Avrunda gärna uppåt. "Nödvändig" används för att räkna ut buffertmålet.</p>
      <div id="exp-summary">${expenseSummary()}</div>
      <div class="card">
        <div id="exp-list">${rows}</div>
        <div class="row" style="margin-top:10px">
          <button id="btn-add" class="primary">+ Lägg till</button>
          <button id="btn-template">Konsumentverkets mall</button>
        </div>
      </div>
      <div class="card">
        <p class="muted" style="margin:0">Konsumentverkets mall (${esc(kv.checked)}) täcker bara ungefär 40 % av ett hushålls kostnader: mat, kläder, fritid, hygien, mobil samt gemensamma förbrukningsvaror, el och hemförsäkring. Boende, resor, barnomsorg, tandvård, läkemedel, semester, restaurang och gåvor måste du lägga till själv.</p>
      </div>
      <div id="result">${resultBlock()}</div>`;
  }
  viewExpenses.after = function () {
    document.getElementById("btn-add").onclick = () => {
      state.expenses.push({ id: uid(), name: "", amount: 0, owner: "shared" });
      save();
      render();
      const inputs = document.querySelectorAll("#exp-list [data-exp-field='name']");
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
    document.getElementById("btn-template").onclick = () => {
      if (state.expenses.length && !confirm("Mallen läggs till bland dina nuvarande utgifter. Fortsätta?")) return;
      const a = kv.adult;
      state.expenses.push(
        { id: uid(), name: "Mat (Konsumentverket)", amount: a.food * 2, owner: "shared" },
        { id: uid(), name: "Gemensamt för 2 pers. (förbrukning, el, hemförsäkring m.m.)", amount: kv.sharedByPeople[2], owner: "shared" },
        { id: uid(), name: "Kläder, fritid, mobil, hygien", amount: a.other, owner: 0 },
        { id: uid(), name: "Kläder, fritid, mobil, hygien", amount: a.other, owner: 1 }
      );
      save();
      render();
    };
  };

  function expenseSummary() {
    const total = state.expenses.reduce((a, e) => a + e.amount, 0);
    if (total <= 0) return "";
    const shared = state.expenses.filter((e) => e.owner === "shared").reduce((a, e) => a + e.amount, 0);
    return `<div class="card"><div class="muted">Utgifter per månad</div><div class="big">${kr(total)}</div><div class="muted">Gemensamt ${kr(shared)}, egna ${kr(total - shared)}. Nödvändiga ${kr(calc().essential)}.</div></div>`;
  }

  function expenseRow(e) {
    const opt = (v, label) => `<option value="${v}" ${String(e.owner) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
    return `<div class="exp" data-id="${e.id}">
      <input data-exp-field="name" value="${esc(e.name)}" placeholder="Vad?" aria-label="Namn" autocomplete="off">
      <input data-exp-field="amount" inputmode="decimal" value="${e.amount || ""}" placeholder="kr" aria-label="Belopp per månad">
      <div class="sub">
        <select data-exp-field="owner" aria-label="Vem betalar">
          ${opt("shared", "Gemensam")}${opt(0, pname(0))}${opt(1, pname(1))}
        </select>
        <label class="fixed" style="display:flex;gap:6px;align-items:center;margin:0;color:var(--text);font-size:0.9rem"><input type="checkbox" data-exp-field="essential" ${e.essential !== false ? "checked" : ""} style="width:auto;min-height:0">Nödvändig</label>
        <button class="danger fixed" data-del="${e.id}" aria-label="Ta bort">Ta bort</button>
      </div>
    </div>`;
  }

  function onExpenseInput(ev) {
    if (route() !== "utgifter") return;
    const t = ev.target;
    const f = t.dataset.expField;
    if (!f) return;
    const e = state.expenses.find((x) => x.id === t.closest(".exp").dataset.id);
    if (!e) return;
    if (f === "name") e.name = t.value;
    else if (f === "amount") e.amount = num(t.value);
    else if (f === "essential") e.essential = t.checked;
    else e.owner = t.value === "shared" ? "shared" : Number(t.value);
    save();
    document.getElementById("result").innerHTML = resultBlock();
    const sum = document.getElementById("exp-summary");
    if (sum) sum.innerHTML = expenseSummary();
  }

  function onExpenseClick(ev) {
    if (route() !== "utgifter") return;
    const id = ev.target.dataset && ev.target.dataset.del;
    if (!id) return;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    save();
    render();
  }

  const modules = [
  ];

  function viewMore() {
    const staleKeys = R.staleKeys();
    const vals = Object.values(R.values)
      .map((v) => `<div class="kv"><span>${esc(v.label)}</span><span>${v.unit.indexOf("andel") === 0 ? Math.round(v.value * 10000) / 100 + " %" : v.unit === "månader" ? v.value + " mån" : v.unit === "kr" ? kr(v.value) : v.value.toLocaleString("sv-SE") + " " + v.unit}</span></div>`)
      .join("");
    return `<h1>Mer</h1>
      <p class="muted">Fördjupningar och verktyg för större beslut.</p>
      <div class="tiles">
        ${window.App.moreLinks
          .map((m) => {
            const key = m.href.replace(/^#\//, "");
            const t = UI.ROUTES[key] || {};
            return `<a class="tile" href="${m.href}" style="--hue:${t.hue || "var(--accent)"}"><span class="t-icon">${UI.icon(t.icon || "grid", 24)}</span><strong>${esc(m.title)}</strong><span class="t-desc">${esc(m.desc)}</span></a>`;
          })
          .join("")}
      </div>
      <div class="card">
        <h2>Regler och belopp i appen</h2>
        <p class="muted">Källor och kontrolldatum finns i rules.js. ${staleKeys.length ? "Några är gamla." : "Kontrollerade " + esc(R.konsumentverket.checked) + "."}</p>
        <details><summary>Visa alla belopp</summary>${vals}</details>
      </div>`;
  }

  window.App = {
    app, R, views, route, render, save, kr, num, esc, uid, pname,
    moreLinks: [],
    get state() { return state; },
    calc,
  };
  (window.AppModules || []).forEach((init) => init(window.App));

  // Delegated listeners are bound once; each handler checks the active route.
  ["input", "change"].forEach((type) =>
    app.addEventListener(type, (ev) => {
      onHouseholdInput(ev);
      onExpenseInput(ev);
    })
  );
  app.addEventListener("click", onExpenseClick);
  window.addEventListener("hashchange", render);
  // Another tab changed the data: reload it, and redraw unless the user is typing.
  window.addEventListener("storage", (ev) => {
    if (ev.key !== STORAGE_KEY) return;
    state = load();
    const a = document.activeElement;
    if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) render();
  });
  render();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is optional */ });
  }
})();
