// Djur module: running and lifetime costs, rules, buying and what happens to a pet if you separate.
// Legal facts and the SKK example come from rules.js (R.djur, R.values). Prices are always the household's own input.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const DJ = R.djur;
    const TABS = [["kostnad", "Kostnad"], ["regler", "Regler"], ["kop", "Köpa"], ["sep", "Separation"]];
    const TYPES = { hund: "Hund", katt: "Katt", annat: "Annat djur" };
    const COST_FIELDS = [
      ["food", "Foder"],
      ["insurance", "Försäkring"],
      ["vet", "Veterinär och vaccination"],
      ["gear", "Tillbehör och godis"],
      ["care", "Hunddagis, djurvakt, pensionat"],
      ["other", "Övrigt (trimning, kurser, skatt)"],
    ];
    const CHECK = [
      "Vi har tid varje dag för rastning och kontakt, även i vardagar",
      "Någon kan ta hand om djuret när vi reser eller är sjuka",
      "Ingen i hushållet är allergisk, och vi har provat att umgås med rasen",
      "Boendeavtal eller föreningens stadgar tillåter djur",
      "Vi har räknat på kostnaden under hela djurets liv, inte bara första året",
      "Vi har pratat om vem som äger djuret och vem som betalar",
      "Vi har en plan för en stor veterinärräkning",
    ];

    const defaults = () => ({ tab: "kostnad", pets: [], checks: {} });

    function pet(p) {
      const c = p || {};
      const out = {
        id: UI.safeId(c.id),
        name: String(c.name || ""),
        type: TYPES[c.type] ? c.type : "hund",
        years: Math.max(num(c.years), 0),
        upfront: num(c.upfront),
        vetBuffer: num(c.vetBuffer),
        owner: c.owner === 0 || c.owner === 1 ? c.owner : "both",
        registered: c.registered === 0 || c.registered === 1 || c.registered === "both" ? c.registered : "unknown",
        payer: c.payer === 0 || c.payer === 1 ? c.payer : "both",
      };
      for (const [k] of COST_FIELDS) out[k] = num(c[k]);
      return out;
    }

    function S() {
      const s = App.state.djur;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "kostnad";
      s.pets = UI.objs(s.pets).map(pet);
      if (!s.checks || typeof s.checks !== "object") s.checks = {};
      return s;
    }

    const name = (i) => App.pname(i);
    const petName = (p) => p.name || TYPES[p.type];

    // ---------- calculations ----------
    function petCalc(p) {
      const perYear = COST_FIELDS.reduce((a, [k]) => a + p[k], 0);
      const lifetime = p.upfront + perYear * p.years;
      return { perYear, perMonth: perYear / 12, lifetime };
    }

    function totals(pets) {
      const rows = pets.map((p) => petCalc(p));
      return {
        perYear: rows.reduce((a, r) => a + r.perYear, 0),
        perMonth: rows.reduce((a, r) => a + r.perMonth, 0),
        lifetime: rows.reduce((a, r) => a + r.lifetime, 0),
        buffer: pets.reduce((a, p) => a + p.vetBuffer, 0),
      };
    }

    // ---------- views ----------
    function viewDjur() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { kostnad: viewCost, regler: viewRules, kop: viewBuy, sep: viewSep }[s.tab](s);
      return `<h1>Djur</h1>
        <p class="muted">Räkna på djurets kostnad under hela livet, och känn till regler och vad som gäller om ni separerar.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewDjur.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(DJ.checked)}.</p>
        <ul class="muted">${DJ.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${DJ.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const f = (label, attr, v, ph, hint) => `<label>${label}</label><input ${attr} inputmode="decimal" value="${UI.fv(v, attr)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;
    const opt = (v, cur, l) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`;

    function petCard(p) {
      return `<div class="card pet" data-id="${p.id}">
        <input data-p="name" value="${esc(p.name)}" placeholder="Namn" aria-label="Namn" autocomplete="off">
        <label>Djur</label><select data-p="type">${Object.entries(TYPES).map(([k, v]) => opt(k, p.type, v)).join("")}</select>
        <div class="grid2"><div>${f("Förväntade år kvar", 'data-p="years"', p.years, "0")}</div><div>${f("Engångskostnad (kr)", 'data-p="upfront"', p.upfront, "0")}</div></div>
        <div class="muted">Inköp eller adoption, märkning, första utrustning och veterinär.</div>
        <h2 style="margin-top:12px">Kostnad per år (kr)</h2>
        ${COST_FIELDS.map(([k, l]) => f(l, `data-p="${k}"`, p[k])).join("")}
        ${f("Buffert för akut veterinärvård (kr)", 'data-p="vetBuffer"', p.vetBuffer, "0", "Fråga försäkringsbolaget vad som ingår. Konsumenternas hundjämförelse visar veterinärvårdsbelopp på 20 000–59 000 kr (bas), 60 000–89 000 kr (mellan) och 90 000–175 000 kr (stor) per år.")}
        <div class="muted" data-pet-out style="margin-top:8px">${petOut(p)}</div>
        <button class="danger" data-del="${p.id}" style="margin-top:8px">Ta bort</button>
      </div>`;
    }

    function petOut(p) {
      const c = petCalc(p);
      if (c.perYear <= 0 && p.upfront <= 0) return "Fyll i kostnader.";
      return `<strong>${kr(c.perMonth)}</strong> per månad, ${kr(c.perYear)} per år. Under hela livet: <strong>${kr(c.lifetime)}</strong>.`;
    }

    function viewCost(s) {
      const skk = DJ.skk;
      return `${s.pets.map(petCard).join("") || `<div class="card"><p class="muted" style="margin:0">Lägg till ett djur ni har eller funderar på.</p></div>`}
        <button id="btn-add-pet" class="primary" style="width:100%">+ Lägg till djur</button>
        <div id="pet-total" style="margin-top:12px">${totalCard(s)}</div>
        <div class="card"><h2>Ett exempel från SKK</h2>
          <p class="muted">${esc(skk.source)}. Golden retriever (tik), Stockholm. Ett enskilt exempel, inte ett genomsnitt.</p>
          <div class="kv"><strong>Första året</strong><strong>${kr(skk.first.total)}</strong></div>
          ${skk.first.items.map(([a, v]) => `<div class="kv muted"><span>${esc(a)}</span><span>${kr(v)}</span></div>`).join("")}
          <div class="kv" style="margin-top:8px"><strong>Varje år därefter</strong><strong>${kr(skk.after.total)}</strong></div>
          ${skk.after.items.map(([a, v]) => `<div class="kv muted"><span>${esc(a)}</span><span>${kr(v)}</span></div>`).join("")}
          <p class="muted" style="margin-top:6px">Veterinärvård utöver vaccination, hunddagis och dagmatte ingår inte. Katt: ingen verifierad källa hittades. Fyll i egna siffror.</p></div>`;
    }

    function totalCard(s) {
      if (!s.pets.length) return "";
      const t = totals(s.pets);
      if (t.perYear <= 0 && t.lifetime <= 0) return "";
      return `<div class="card"><div class="muted">Djuren kostar tillsammans</div><div class="big">${kr(t.perMonth)} per månad</div>
          <div class="kv" style="margin-top:6px"><span>Per år</span><span>${kr(t.perYear)}</span></div>
          <div class="kv"><span>Under hela livet</span><span>${kr(t.lifetime)}</span></div>
          <button id="btn-budget" class="primary" style="margin-top:10px;width:100%">Lägg djurens kostnad i Utgifter</button>
          ${t.buffer > 0 ? `<button id="btn-buffer" style="margin-top:8px;width:100%">Lägg veterinärbufferten (${kr(t.buffer)}) som sparmål</button>` : ""}
          <p id="pet-msg" class="muted" style="margin-top:6px"></p></div>`;
    }

    function viewRules() {
      return `<div class="card"><h2>Hund</h2><ul>
          <li>Hunden ska ID-märkas och registreras i Jordbruksverkets register före 4 månaders ålder. Köps en omärkt hund som är äldre än 3 månader ska den märkas och registreras inom 4 veckor (Jordbruksverket).</li>
          <li>Ägaren ansvarar för registreringen. Vid ägarbyte anmäler den nya ägaren inom 4 veckor.</li>
          <li>Avgift: ${kr(V("hundReg"))} i e-tjänsten och ${kr(V("hundRegBlankett"))} via blankett. Ägarbyte kostar motsvarande på blankett. Avgift för ägarbyte i e-tjänsten är inte verifierad.</li>
          <li>Jag har inte hittat någon hundskatt i underlaget, men det är inte aktivt bekräftat.</li>
          <li>Hunden ska rastas utomhus varje dag och få kontakt med människor, och ska vänjas gradvis vid att vara ensam. Allmänt råd är minst var sjätte timme dagtid. Någon fast gräns för ensamvaro finns inte i det jag läst (föreskriften, sekundär källa).</li>
          <li>Mellan 1 mars och 20 augusti ska hundar hållas under sådan tillsyn att de inte springer lösa i marker med vilt (lag 2007:1150 16 §). Lagen har inget allmänt koppeltvång, men kommuner kan ha lokala regler.</li></ul></div>
        <div class="card"><h2>Katt</h2><ul>
          <li>Lagen säger att hund eller katt ska märkas, och att Jordbruksverket för register över hund- och kattägare (2007:1150 2 och 3 §§).</li>
          <li>Ålder för märkning och avgift 2026 för katt är inte kontrollerade. Se Jordbruksverket.</li>
          <li>Katt ska normalt få social kontakt med människor varje dag (föreskriften, sekundär källa).</li></ul></div>
        <div class="card"><h2>Alla djur</h2><ul>
          <li>Djur ska behandlas väl och ha tillräcklig tillsyn (djurskyddslagen 2 kap. 1 och 4 §§). Länsstyrelsen kan besluta om djurförbud (9 kap. 1–2 §§).</li>
          <li>Någon uttrycklig regel att en hund aldrig får lämnas i bil hittades inte, men djurskyddslagens allmänna krav gäller. Lämna aldrig djur i en varm bil.</li></ul></div>
        <div class="card"><h2>Skador som djuret orsakar</h2><ul>
          <li>Skada som en hund orsakar ersätts av ägaren eller innehavaren även utan vållande (2007:1150 19 §). Undantag finns för vissa tjänstehundar.</li>
          <li>Hemförsäkringens ansvarsskydd täcker normalt person- och sakskador som hunden orsakar, även utanför hemmet (Konsumenternas försäkringsbyrå, sökutdrag). Kontrollera villkoren.</li></ul></div>
        <div class="card"><h2>Resa med djur inom EU</h2><ul>
          <li>Hund och katt behöver EU-pass utfärdat av veterinär. Chipet ska sättas eller läsas av före rabiesvaccinationen.</li>
          <li>Djuret ska vara minst 12 veckor för grundvaccination, och du kan resa tidigast 21 dagar efter grundvaccinationen.</li>
          <li>Chip som sätts i Sverige från 22 april 2026 ska vara godkänt av Jordbruksverket. Kostnaden är inte verifierad.</li></ul></div>`;
    }

    function viewBuy(s) {
      const done = CHECK.filter((_, i) => s.checks[i]).length;
      return `<div class="card"><div class="muted">Genomtänkt</div><div class="big">${done} av ${CHECK.length}</div>${UI.meter(done, CHECK.length, { label: "Genomtänkt" })}</div>
        <div class="card"><h2>Innan ni skaffar djur</h2>${CHECK.map((t, i) => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:1rem;margin:8px 0"><input type="checkbox" data-check="${i}" ${s.checks[i] ? "checked" : ""} style="width:auto;min-height:0;margin-top:4px"><span>${esc(t)}</span></label>`).join("")}</div>
        <div class="card"><h2>Köpa av näringsidkare</h2><ul>
          <li>Konsumentköplagen gäller även levande djur. Du kan reklamera fel som fanns vid leveransen och visar sig inom 3 år (4 kap. 14 §).</li>
          <li>För levande djur är det säljaren som ska visa att felet inte fanns vid leveransen bara de första 6 månaderna, mot 2 år för andra varor (4 kap. 17–18 §§).</li>
          <li>Du kan inte åberopa fel som du borde ha upptäckt vid en undersökning (4 kap. 19 §). Klaga inom skälig tid, och två månader efter att du märkt felet räknas alltid som i tid (5 kap. 2 §).</li>
          <li>Köp från privatperson: köplagen gäller. Det har inte kunnat verifieras här.</li></ul></div>
        <div class="card"><h2>Valpar och kattungar</h2><ul>
          <li>Enligt Jordbruksverkets föreskrift ska valpar vara hos modern till 8 veckors ålder och kattungar till 12 veckor. Undantag kan godtas om veterinär bedömer att ungarna äter fast föda och mår bra. Försäljning i zoobutiker och på marknader är förbjuden (sekundär källa, aktuell status 2026 inte bekräftad).</li>
          <li>Be att få se modern, ungarnas miljö, hälsointyg, stamtavla och ett skriftligt avtal.</li></ul></div>
        <div class="card"><h2>Försäkring</h2><ul>
          <li>Premien beror på ras, ålder, belopp och ort. Det finns inget standardpris (Konsumenternas). Valprabatt gäller normalt bara första året.</li>
          <li>Byter du bolag kan det nya bolaget göra undantag för sjukdomar som djuret redan haft.</li>
          <li>Kontrollera karenstid, självrisk, undantag för ärftliga sjukdomar och sista tecknandeålder i villkoren. Inga siffror har kunnat verifieras.</li></ul></div>`;
    }

    function sepCard(p) {
      return `<div class="card pet" data-id="${p.id}">
        <h2>${esc(petName(p))}</h2>
        <label>Äger</label><select data-p="owner">${opt("both", p.owner, "Båda")}${opt(0, p.owner, name(0))}${opt(1, p.owner, name(1))}</select>
        <label>Registrerad ägare i Jordbruksverkets register</label><select data-p="registered">${opt("unknown", p.registered, "Vet inte")}${opt(0, p.registered, name(0))}${opt(1, p.registered, name(1))}${opt("both", p.registered, "Båda")}</select>
        <label>Betalar kostnaderna</label><select data-p="payer">${opt("both", p.payer, "Båda")}${opt(0, p.payer, name(0))}${opt(1, p.payer, name(1))}</select>
        <button data-agree="${p.id}" style="margin-top:8px;width:100%">Lägg i Överenskommelser</button>
        <p class="muted" data-agree-msg style="margin-top:6px"></p>
      </div>`;
    }

    function viewSep(s) {
      return `<div class="card"><h2>Vad gäller för djuret om ni separerar?</h2><ul>
          <li>Ett djur räknas normalt inte som bohag, och ingår då inte i bodelningen. Sambolagen 3 § nämner bara bostad och bohag. Det som avgör är i regel vem som äger djuret (Familjens Jurist och Lawline, sekundära källor).</li>
          <li>Äger ni det tillsammans gäller samäganderättslagen. Den som hävdar samägande har bevisbördan.</li>
          <li>Registrering, vem som köpt och vem som betalat nämns som ledtrådar. Det har inte kunnat bekräftas som rättskälla, och någon lagstadgad vårdnad om djur har inte hittats.</li>
          <li>Därför är det klokt att komma överens i förväg och skriva ner vem som äger, vem som betalar och vem som behåller djuret.</li>
          <li>Anmäl ägarbyte i registret inom 4 veckor om hunden byter ägare.</li></ul></div>
        ${s.pets.map(sepCard).join("") || `<div class="card"><p class="muted" style="margin:0">Lägg först till ett djur under Kostnad.</p></div>`}`;
    }

    // ---------- events ----------
    const active = () => App.route() === "djur";
    const rerender = () => { app.innerHTML = viewDjur(); };
    const label = (v) => (v === "both" ? "båda" : v === "unknown" ? "okänt" : name(v));

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-pet") {
        s.pets.push(pet({}));
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.pets = s.pets.filter((p) => p.id !== t.dataset.del);
        App.save();
        rerender();
      } else if (t.id === "btn-budget") {
        const amount = Math.round(totals(s.pets).perMonth);
        const list = App.state.expenses;
        const e = list.find((x) => x.id === "pets");
        if (e) { e.amount = amount; e.name = "Djur (från Djur)"; e.owner = "shared"; }
        else list.push({ id: "pets", name: "Djur (från Djur)", amount, owner: "shared", essential: true });
        App.save();
        const msg = document.getElementById("pet-msg");
        if (msg) msg.textContent = "Lagt till som gemensam, nödvändig utgift.";
      } else if (t.id === "btn-buffer") {
        const sp = App.state.sparande;
        if (!Array.isArray(sp.goals)) sp.goals = [];
        const target = Math.round(totals(s.pets).buffer);
        const ex = sp.goals.find((g) => g.id === "petbuffer");
        if (ex) ex.target = target;
        else sp.goals.push({ id: "petbuffer", name: "Veterinärbuffert", target, saved: 0, date: "" });
        App.save();
        const msg = document.getElementById("pet-msg");
        if (msg) msg.textContent = "Lagt till som sparmål. Fyll i datum under Buffert och sparande.";
      } else if (t.dataset && t.dataset.agree) {
        const p = s.pets.find((x) => x.id === t.dataset.agree);
        if (!p) return;
        const av = App.state.avtal;
        if (!Array.isArray(av.agreements)) av.agreements = [];
        const text = `Ägare: ${label(p.owner)}. Registrerad ägare: ${label(p.registered)}. Betalar kostnaderna: ${label(p.payer)}. Vid separation: `;
        const id = "pet-" + p.id;
        const ex = av.agreements.find((a) => a.id === id);
        if (ex) { ex.topic = "Djur: " + petName(p); ex.text = text; }
        else av.agreements.push({ id, topic: "Djur: " + petName(p), text, level: "flex", status: "open" });
        App.save();
        const msg = t.parentElement.querySelector("[data-agree-msg]");
        if (msg) msg.textContent = "Lagt till i Överenskommelser. Fyll i vad som gäller vid separation där.";
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset.p) {
        const card = t.closest(".pet");
        const i = s.pets.findIndex((x) => x.id === card.dataset.id);
        if (i < 0) return;
        const k = t.dataset.p;
        const p = s.pets[i];
        if (k === "name") p.name = t.value;
        else if (k === "type") p.type = TYPES[t.value] ? t.value : "hund";
        else if (k === "owner" || k === "payer" || k === "registered") p[k] = t.value === "both" || t.value === "unknown" ? t.value : Number(t.value);
        else p[k] = num(t.value);
        App.save();
        const out = card.querySelector("[data-pet-out]");
        if (out) out.innerHTML = petOut(p);
        const tot = document.getElementById("pet-total");
        if (tot) tot.innerHTML = totalCard(s);
      } else if (t.dataset.check !== undefined) {
        s.checks[t.dataset.check] = t.checked;
        App.save();
        if (ev.type === "change") rerender();
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.djur = viewDjur;
    App.moreLinks.push({ title: "Djur", href: "#/djur", desc: "Kostnad under hela livet, regler, köpa djur, separation" });
    App._djur = { petCalc, totals, pet, S, COST_FIELDS };
  });
})();
