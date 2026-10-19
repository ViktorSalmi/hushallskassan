// Köpbeslut module: shared purchase rules, cost per use, credit calculator and consumer rights.
// Limits and waiting times are the household's own settings; legal facts and amounts come from rules.js.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const K = R.kop;
    const TABS = [["beslut", "Beslut"], ["anv", "Per användning"], ["kredit", "Kredit"], ["ratt", "Rättigheter"]];
    const PAY = { cash: "Kontant", credit: "Kredit eller delbetalning" };

    const defaults = () => ({
      tab: "beslut",
      limit: 0,
      waitHours: 48,
      items: [],
      cpu: { price: 0, usesYear: 0, years: 3, runYear: 0, resale: 0, altPerUse: 0, person: 0, hours: 160 },
      credit: { price: 0, months: 12, rate: 0, setup: 0, fee: 0 },
    });

    function S() {
      const s = App.state.kop;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "beslut";
      s.items = UI.objs(s.items).map((i) => ({
        id: UI.safeId(i.id),
        name: String(i.name || ""),
        price: num(i.price),
        who: i.who === 0 || i.who === 1 ? i.who : "shared",
        added: Number.isFinite(Number(i.added)) && Number(i.added) > 0 ? Number(i.added) : Date.now(),
        agreed: !!i.agreed,
        pay: PAY[i.pay] ? i.pay : "cash",
      }));
      for (const k of ["cpu", "credit"]) {
        if (!s[k] || typeof s[k] !== "object") s[k] = d[k];
        for (const f of Object.keys(d[k])) if (s[k][f] === undefined) s[k][f] = d[k][f];
      }
      return s;
    }

    const pct = (n) => (Math.round(n * 100) / 100).toLocaleString("sv-SE") + " %";
    const dateStr = (ms) => new Date(ms).toLocaleDateString("sv-SE");

    // ---------- calculations ----------
    function bufferGap() {
      const sp = App._sparande;
      if (!sp) return 0;
      const b = sp.bufferCalc(sp.S());
      return b.essential > 0 ? b.gap : 0;
    }

    // Status against the household's own rules. `now` is injectable for tests.
    function itemStatus(item, s, now) {
      const blockers = [];
      const warns = [];
      const readyAt = item.added + num(s.waitHours) * 3600000;
      if (num(s.limit) > 0 && item.price >= num(s.limit) && !item.agreed) blockers.push(`Kostar ${kr(num(s.limit))} eller mer. Prata ihop er först.`);
      if (num(s.waitHours) > 0 && now < readyAt) blockers.push(`Betänketiden går ut ${dateStr(readyAt)}.`);
      const left = App.calc().totalLeft;
      if (item.price > 0) {
        if (left <= 0) warns.push("Hushållet har inget överskott per månad enligt Översikt.");
        else if (item.price / left > 6) warns.push(`Motsvarar ${Math.round(item.price / left)} månaders överskott.`);
      }
      if (bufferGap() > 0) warns.push("Bufferten är inte full.");
      if (item.pay === "credit") warns.push("Kredit gör köpet dyrare. Ränteavdrag för lån utan säkerhet är borta från inkomståret 2026.");
      const verdict = blockers.length ? "wait" : warns.length ? "caution" : "ok";
      return { verdict, blockers, warns, readyAt };
    }

    function cpuCalc(c, income) {
      const price = num(c.price);
      const years = Math.max(num(c.years), 0);
      const uses = num(c.usesYear) * years;
      const total = Math.max(price - num(c.resale), 0) + num(c.runYear) * years;
      const perUse = uses > 0 ? total / uses : 0;
      const hourly = num(c.hours) > 0 ? income / num(c.hours) : 0;
      return { total, uses, perUse, workHours: hourly > 0 ? price / hourly : 0, hourly };
    }

    // Monthly rate r with sum_{t=1..n} pay/(1+r)^t = net, solved by bisection. Effective annual = (1+r)^12 - 1.
    function effectiveRate(principal, setup, pay, n) {
      const net = principal - setup;
      if (net <= 0 || pay * n <= net) return 0;
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        const pv = (pay * (1 - Math.pow(1 + mid, -n))) / mid;
        if (pv > net) lo = mid;
        else hi = mid;
      }
      const r = (lo + hi) / 2;
      return Math.pow(1 + r, 12) - 1;
    }

    function creditCalc(c) {
      const P = num(c.price);
      const n = Math.max(Math.round(num(c.months)), 1);
      const i = num(c.rate) / 100 / 12;
      const base = i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));
      const pay = base + num(c.fee);
      const total = pay * n + num(c.setup);
      const cost = total - P;
      const eff = effectiveRate(P, num(c.setup), pay, n);
      const cap = V("referensranta") + V("kreditRantetakPaslag");
      const setupCap = V("uppl") * V("prisbasbelopp");
      const warns = [];
      if (num(c.rate) / 100 > cap + 1e-9) warns.push(`Räntan ${pct(num(c.rate))} är över taket på ${pct(cap * 100)} (referensränta ${pct(V("referensranta") * 100)} + ${pct(V("kreditRantetakPaslag") * 100)}). Kontrollera avtalet.`);
      if (num(c.setup) > setupCap + 1e-9) warns.push(`Uppläggningsavgiften är över ${kr(setupCap)} (1 % av prisbasbeloppet). Kontrollera avtalet.`);
      if (cost > P + 1e-9) warns.push("Total kreditkostnad är större än kreditbeloppet, vilket lagen inte tillåter (19 b §). Kontrollera avtalet.");
      return { pay, total, cost, eff, warns, cap, setupCap };
    }

    // ---------- views ----------
    function viewKop() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { beslut: viewDecide, anv: viewUse, kredit: viewCredit, ratt: viewRights }[s.tab](s);
      return `<h1>Köpbeslut</h1>
        <p class="muted">Regler ni sätter själva, och vad lagen säger när något går fel.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewKop.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(K.checked)}.</p>
        <ul class="muted">${K.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${K.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const f = (label, attr, v, ph, hint) => `<label>${label}</label><input ${attr} inputmode="decimal" value="${UI.fv(v, attr)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;

    function itemCard(it, s) {
      const st = itemStatus(it, s, Date.now());
      const label = { ok: ["Klart enligt era regler", "var(--accent)"], caution: ["Klart, men se upp", "var(--warn)"], wait: ["Vänta", "var(--bad)"] }[st.verdict];
      const opt = (v, cur, l) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`;
      return `<div class="card item" data-id="${it.id}">
        <input data-i="name" value="${esc(it.name)}" placeholder="Vad vill ni köpa?" aria-label="Namn" autocomplete="off">
        <div class="grid2">
          <div>${f("Pris (kr)", 'data-i="price"', it.price)}</div>
          <div><label>Vem</label><select data-i="who">${opt("shared", it.who, "Gemensamt")}${opt(0, it.who, App.pname(0))}${opt(1, it.who, App.pname(1))}</select></div>
        </div>
        <label>Betalas</label><select data-i="pay">${Object.entries(PAY).map(([k, v]) => opt(k, it.pay, v)).join("")}</select>
        <label style="display:flex;gap:10px;align-items:center;color:var(--text);font-size:1rem"><input type="checkbox" data-i="agreed" ${it.agreed ? "checked" : ""} style="width:auto;min-height:0"> Vi har pratat ihop oss</label>
        <div data-status style="margin-top:8px">${UI.chip({ ok: "ok", caution: "warn", wait: "wait" }[st.verdict], label[0])}
          <ul class="muted" style="margin-top:6px">${st.blockers.concat(st.warns).map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>
        <button class="danger" data-del="${it.id}" style="margin-top:6px">Ta bort</button>
      </div>`;
    }

    function viewDecide(s) {
      return `<div class="card"><h2>Era regler</h2>
          ${f("Belopp där båda ska vara överens (kr)", 'data-s="limit"', s.limit, "0", "Sätts av er. Ingen källa styrker ett visst belopp. 0 betyder ingen gräns.")}
          ${f("Betänketid i timmar", 'data-s="waitHours"', s.waitHours, "48", "En metod, inte en lag: vänta innan ni köper. Konsumentverkets ungdomssida nämner 24 timmar över 300 kr (bara sökutdrag).")}
        </div>
        <div id="items">${s.items.map((i) => itemCard(i, s)).join("") || `<div class="card"><p class="muted" style="margin:0">Lägg in sådant ni funderar på att köpa. Betänketiden räknas från att posten lades in.</p></div>`}</div>
        <button id="btn-add-item" class="primary" style="width:100%">+ Lägg till köp</button>
        <p class="muted" style="margin-top:12px">Statusen följer era egna regler och hushållets siffror. Den är inget råd om vad ni ska köpa.</p>`;
    }

    function incomeOf(c) {
      const p = App.state.persons[c.person === 1 ? 1 : 0];
      return p ? p.income : 0;
    }

    function viewUse(s) {
      const c = s.cpu;
      return `<div class="card"><h2>Kostnad per användning</h2>
          ${f("Pris (kr)", 'data-c="price"', c.price)}
          ${f("Hur många gånger används den per år?", 'data-c="usesYear"', c.usesYear)}
          ${f("Hur många år?", 'data-c="years"', c.years, "3")}
          ${f("Löpande kostnad per år (kr)", 'data-c="runYear"', c.runYear, "0", "Underhåll, förbrukning, abonnemang.")}
          ${f("Värde när ni säljer eller slutar använda (kr)", 'data-c="resale"', c.resale)}
          ${f("Alternativets kostnad per användning (kr)", 'data-c="altPerUse"', c.altPerUse, "0", "Hyra, begagnat eller en billigare modell.")}
          <label>Vems tid räknas</label>
          <select data-c="person"><option value="0" ${c.person === 0 ? "selected" : ""}>${esc(App.pname(0))}</option><option value="1" ${c.person === 1 ? "selected" : ""}>${esc(App.pname(1))}</option></select>
          ${f("Arbetstimmar per månad", 'data-c="hours"', c.hours, "160", "Ert antagande.")}
        </div>
        <div id="cpu-result">${cpuResult(s)}</div>`;
    }

    function cpuResult(s) {
      const c = s.cpu;
      if (num(c.price) <= 0) return `<div class="warn">Fyll i priset.</div>`;
      const r = cpuCalc(c, incomeOf(c));
      const alt = num(c.altPerUse);
      return `<div class="card">
          <div class="muted">Kostnad per användning</div>
          <div class="big">${r.uses > 0 ? kr(r.perUse) : "–"}</div>
          <div class="muted">Totalt ${kr(r.total)} över ${r.uses > 0 ? Math.round(r.uses) : 0} användningar.</div>
          ${alt > 0 && r.uses > 0 ? `<div class="kv" style="margin-top:8px"><strong>${r.perUse < alt ? "Köpet är billigare med" : "Alternativet är billigare med"}</strong><strong>${kr(Math.abs(r.perUse - alt))} per gång</strong></div>` : ""}
          ${r.workHours > 0 ? `<div class="kv"><span>Motsvarar arbetstid efter skatt</span><span>${Math.round(r.workHours * 10) / 10} timmar</span></div>` : ""}
          <p class="muted" style="margin-top:6px">Enkla metoder för att väga köp, inte regler. Räkna ärligt på hur ofta ni verkligen använder det.</p></div>`;
    }

    function viewCredit(s) {
      const c = s.credit;
      return `<div class="card"><h2>Delbetalning och kredit</h2>
          ${f("Belopp (kr)", 'data-k="price"', c.price)}
          ${f("Antal månader", 'data-k="months"', c.months, "12")}
          ${f("Ränta per år (%)", 'data-k="rate"', c.rate, "0", "0 om räntefritt. Avgifter räknas nedan.")}
          ${f("Uppläggningsavgift (kr)", 'data-k="setup"', c.setup)}
          ${f("Avgift per månad, t.ex. avi (kr)", 'data-k="fee"', c.fee)}
        </div>
        <div id="credit-result">${creditResult(s)}</div>
        <div class="card"><h2>Om man missar en betalning</h2>
          <div class="kv"><span>Dröjsmålsränta (referensränta + ${Math.round(V("droejsmalPaslag") * 100)} procentenheter)</span><span>${pct((V("referensranta") + V("droejsmalPaslag")) * 100)}</span></div>
          <div class="kv"><span>Påminnelseavgift, högst</span><span>${kr(V("paminnelseavgift"))}</span></div>
          <div class="kv"><span>Inkassokostnad per krav, högst</span><span>${kr(V("inkassoavgift"))}</span></div>
          <div class="kv"><span>Ansökan om betalningsföreläggande</span><span>${kr(V("betalningsforelaggande"))}</span></div>
          <p class="muted" style="margin-top:6px">En betalningsanmärkning ligger kvar i 3 år från händelsen för privatpersoner. Konsekvenser för lån, hyra och abonnemang är inte verifierade.</p></div>
        <div class="card"><h2>Räcker pengarna inte?</h2><ul>
          <li>Betala hyran först, därefter el, mat och mobilräkning. Konsumentverket nämner också medicin och hemförsäkring (Kronofogden och Konsumentverket).</li>
          <li>Kontakta den du är skyldig pengar och be om en avbetalningsplan.</li>
          <li>Kommunal budget- och skuldrådgivning är gratis och sekretessbelagd enligt Konsumentverket.</li>
          <li>Skuldsanering söks hos Kronofogden. Betalningsplanen är normalt 5 år, och man lever på existensminimum.</li></ul></div>
        <div class="card"><h2>Ny lag 20 november 2026</h2>
          <p class="muted" style="margin:0">Konsumentkreditlagen upphävs den 20 november 2026 av en ny. Ränte- och kostnadstaken förs över oförändrade. Räntefri kredit i handeln från annan än säljaren (köp nu, betala senare) omfattas, och kreditprövningen skärps. Äldre krediter följer den gamla lagen. Det nya undantaget för räntefri kredit är inte verifierat i lagtext.</p></div>`;
    }

    function creditResult(s) {
      const c = s.credit;
      if (num(c.price) <= 0) return `<div class="warn">Fyll i beloppet.</div>`;
      const r = creditCalc(c);
      return `${r.warns.map((w) => `<div class="warn">${esc(w)}</div>`).join("")}
        <div class="card">
          <div class="muted">Betalning per månad</div><div class="big">${kr(r.pay)}</div>
          <div class="kv" style="margin-top:8px"><span>Totalt att betala</span><span>${kr(r.total)}</span></div>
          <div class="kv"><strong>Kreditkostnad</strong><strong>${kr(r.cost)}</strong></div>
          <div class="kv"><span>Uppskattad effektiv ränta</span><span>${pct(r.eff * 100)}</span></div>
          <p class="muted" style="margin-top:6px">Taket för ränta är ${pct(r.cap * 100)} och för uppläggningsavgift ${kr(r.setupCap)} (konsumentkreditlagen 19 a och 19 c §§). Effektiv ränta är här en uppskattning, inte lagens beräkning. Räntefritt är sällan gratis: avgifter kan göra det dyrt.</p></div>`;
    }

    function viewRights() {
      return `<div class="card"><h2>Reklamation</h2><ul>
          <li>Du kan reklamera fel i 3 år (konsumentköplagen 4 kap. 14 §). Klaga inom skälig tid. Två månader efter att du märkt felet räknas alltid som i tid (5 kap. 2 §).</li>
          <li>Under de första 2 åren är det säljaren som ska visa att felet inte fanns vid leveransen (4 kap. 17 §). För levande djur gäller 6 månader.</li>
          <li>Du väljer mellan avhjälpande och omleverans (5 kap. 4 §). Prisavdrag eller hävning finns också, men hävning går inte vid ringa fel (5 kap. 8 och 10 §§).</li>
          <li>Du får hålla inne betalning (5 kap. 3 §). Säljaren bär kostnaden för retur vid hävning (8 kap. 2 §).</li>
          <li>Begagnade varor omfattas, utom på offentlig auktion. Digitalt innehåll finns i samma lag.</li></ul></div>
        <div class="card"><h2>Garanti och reklamation</h2><ul>
          <li>Reklamationsrätten är lag och gäller mot säljaren. Garanti är frivillig och styrs av företagets villkor. Efter 2 år ligger bevisbördan på dig, och då kan en garanti vara bättre (Konsumentverket).</li></ul></div>
        <div class="card"><h2>Ångerrätt</h2><ul>
          <li>14 dagar vid distansköp och köp utanför affärslokaler (2 kap. 10 §). För varor räknas de från dagen du tar emot dem. För tjänster från avtalsdagen.</li>
          <li>I butik finns ingen lagstadgad ångerrätt. Det är en slutsats av att lagen bara gäller distansköp och köp utanför affärslokaler.</li>
          <li>Undantag: bl.a. specialtillverkat, färskvaror, förseglade hygienvaror eller medier där förseglingen brutits, restaurang, logi, transport och evenemang på bestämt datum, samt tjänster som utförts med ditt samtycke (2 kap. 11 §).</li>
          <li>Du betalar returfrakten om inte handlaren avtalat annat eller missat att informera. Pengarna ska tillbaka inom 14 dagar.</li>
          <li>Avtal under 400 kr är undantagna från ångerrätten i vissa fall (2 kap. 1 a §).</li></ul></div>
        <div class="card"><h2>Betalning och kredit</h2><ul>
          <li>Vid kreditköp kan du rikta samma krav mot kreditgivaren som mot säljaren, upp till kreditbeloppet (konsumentkreditlagen 29 §, invändningsrätt). Det finns ingen lagstadgad tidsgräns, men kontakta snabbt. Lagen byts ut 20 november 2026, så kontrollera vad som gäller då.</li>
          <li>Kortreklamation, Swish och utlandsköp: skyddet är inte verifierat här.</li></ul></div>
        <div class="card"><h2>Abonnemang och tjänster</h2><ul>
          <li>Automatisk förnyelse gäller bara om avtalet säger det och företaget skickat en skriftlig påminnelse minst en månad före. Bindningstid för telekom är högst 24 månader (sökutdrag från Konsumentverket).</li>
          <li>Tjänster: klaga inom skälig tid, och två månader efter upptäckt är alltid i tid (konsumenttjänstlagen 17 §, aktuell status inte kontrollerad).</li></ul></div>
        <div class="card"><h2>Tvist</h2><ul>
          <li>Reklamera först hos företaget. Allmänna reklamationsnämnden (ARN) prövar tvister, och ansökan kostar ${kr(V("arnAvgift"))}. Ansök inom ett år (sökutdrag).</li></ul></div>
        <div class="card"><h2>Köp från privatperson</h2><ul>
          <li>Köplagen gäller, och du kan reklamera i högst 2 år (32 §). Ingen särskild bevisbörderegel för säljaren.</li>
          <li>"I befintligt skick" fritar inte säljaren om varan avviker från vad som sagts, om väsentlig upplysning undanhållits eller om varan är väsentligt sämre än man kunde vänta sig (19 §).</li></ul></div>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "kopbeslut";
    const rerender = () => { app.innerHTML = viewKop(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-item") {
        s.items.push({ id: uid(), name: "", price: 0, who: "shared", added: Date.now(), agreed: false, pay: "cash" });
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.items = s.items.filter((i) => i.id !== t.dataset.del);
        App.save();
        rerender();
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      const $ = (id) => document.getElementById(id);
      if (t.dataset.s) {
        s[t.dataset.s] = UI.parse(t.value, { waitHours: 48 }[t.dataset.s]);
        App.save();
        if ($("items")) $("items").innerHTML = s.items.map((i) => itemCard(i, s)).join("");
      } else if (t.dataset.i) {
        const card = t.closest(".item");
        const it = s.items.find((x) => x.id === card.dataset.id);
        if (!it) return;
        const k = t.dataset.i;
        if (k === "name") it.name = t.value;
        else if (k === "price") it.price = num(t.value);
        else if (k === "who") it.who = t.value === "shared" ? "shared" : Number(t.value);
        else if (k === "pay") it.pay = PAY[t.value] ? t.value : "cash";
        else if (k === "agreed") it.agreed = t.checked;
        App.save();
        const fresh = document.createElement("div");
        fresh.innerHTML = itemCard(it, s);
        card.querySelector("[data-status]").replaceWith(fresh.querySelector("[data-status]"));
      } else if (t.dataset.c) {
        const k = t.dataset.c;
        s.cpu[k] = k === "person" ? (Number(t.value) === 1 ? 1 : 0) : UI.parse(t.value, { years: 3, hours: 160 }[k]);
        App.save();
        if ($("cpu-result")) $("cpu-result").innerHTML = cpuResult(s);
      } else if (t.dataset.k) {
        s.credit[t.dataset.k] = UI.parse(t.value, { months: 12 }[t.dataset.k]);
        App.save();
        if ($("credit-result")) $("credit-result").innerHTML = creditResult(s);
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", (ev) => {
      if (ev.target.dataset && (ev.target.dataset.i === "who" || ev.target.dataset.i === "pay" || ev.target.dataset.i === "agreed" || ev.target.dataset.c === "person")) onInput(ev);
    });

    App.views.kopbeslut = viewKop;
    App.moreLinks.push({ title: "Köpbeslut", href: "#/kopbeslut", desc: "Egna köpregler, kostnad per användning, kredit, reklamation och ångerrätt" });
    App._kop = { itemStatus, cpuCalc, effectiveRate, creditCalc, S };
  });
})();
