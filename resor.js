// Resor och nöje module: holiday budget, trip cost, travel rights, preparation and leisure money.
// Amounts and legal facts come from rules.js (R.resor and R.values). Prices of trips are always the household's own input.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const RS = R.resor;
    const TABS = [["resa", "Resan"], ["semester", "Semester"], ["ratt", "Rättigheter"], ["fore", "Före resan"], ["noje", "Nöje"]];

    const defaults = () => ({
      tab: "resa",
      trip: { name: "", people: 2, nights: 0, transport: 0, lodging: 0, food: 0, activities: 0, local: 0, insurance: 0, docs: 0, other: 0, buffer: 10, fx: 0, date: "" },
      grossA: 0,
      grossB: 0,
      checks: {},
      leisure: { restaurant: 0, culture: 0, hobby: 0, subs: 0, gifts: 0 },
    });

    function S() {
      const s = App.state.resor;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "resa";
      for (const k of ["trip", "leisure"]) {
        if (!s[k] || typeof s[k] !== "object") s[k] = d[k];
        for (const f of Object.keys(d[k])) if (s[k][f] === undefined) s[k][f] = d[k][f];
      }
      if (!s.checks || typeof s.checks !== "object") s.checks = {};
      return s;
    }

    const pct = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE") + " %";
    const name = (i) => App.pname(i);

    // ---------- calculations ----------
    // food, lodging, activities and local transport are paid abroad per person/night/day as entered; fx adds a card surcharge to the abroad part.
    function tripCalc(t) {
      const people = Math.max(Math.round(num(t.people)), 1);
      const nights = Math.max(num(t.nights), 0);
      const days = nights + 1;
      const lodging = num(t.lodging) * nights;
      const food = num(t.food) * people * days;
      const abroad = lodging + food + num(t.activities) + num(t.local);
      const fx = (abroad * num(t.fx)) / 100;
      const fixed = num(t.transport) + num(t.insurance) + num(t.docs) + num(t.other);
      const sub = fixed + abroad + fx;
      const buffer = (sub * num(t.buffer)) / 100;
      const total = sub + buffer;
      return { people, days, lodging, food, abroad, fx, fixed, sub, buffer, total, perPerson: total / people, perDay: total / days };
    }

    function split(total) {
      const inc = App.calc().inc;
      const sum = inc[0] + inc[1];
      return { half: [total / 2, total / 2], prop: sum > 0 ? [(total * inc[0]) / sum, (total * inc[1]) / sum] : null };
    }

    function leisureCalc(l) {
      const parts = [["Restaurang och café", num(l.restaurant)], ["Kultur och evenemang", num(l.culture)], ["Hobby och sport", num(l.hobby)], ["Streaming och abonnemang", num(l.subs)], ["Presenter", num(l.gifts)]];
      const total = parts.reduce((a, [, v]) => a + v, 0);
      const pocket = App.state.persons.reduce((a, p) => a + p.pocket, 0);
      return { parts, total, pocket, left: App.calc().totalLeft };
    }

    // ---------- views ----------
    function viewResor() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { resa: viewTrip, semester: viewHoliday, ratt: viewRights, fore: viewPrep, noje: viewLeisure }[s.tab](s);
      return `<h1>Resor och nöje</h1>
        <p class="muted">Räkna på resor, känn till dina rättigheter och sätt gränser för det roliga.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewResor.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(RS.checked)}.</p>
        <ul class="muted">${RS.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${RS.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const f = (label, attr, v, ph, hint) => `<label>${label}</label><input ${attr} inputmode="decimal" value="${UI.fv(v, attr)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;

    function viewTrip(s) {
      const t = s.trip;
      return `<div class="card"><h2>Resan</h2>
          <label>Vart?</label><input data-t="name" value="${esc(t.name)}" placeholder="T.ex. Italien i juli" autocomplete="off">
          <div class="grid2"><div>${f("Antal resenärer", 'data-t="people"', t.people, "2")}</div><div>${f("Antal nätter", 'data-t="nights"', t.nights)}</div></div>
          ${f("Resa dit och hem, totalt (kr)", 'data-t="transport"', t.transport, "0", "Flyg, tåg, bil eller färja för alla.")}
          ${f("Boende per natt (kr)", 'data-t="lodging"', t.lodging)}
          ${f("Mat och dryck per person och dag (kr)", 'data-t="food"', t.food)}
          ${f("Aktiviteter och inträden, totalt (kr)", 'data-t="activities"', t.activities)}
          ${f("Lokala transporter, totalt (kr)", 'data-t="local"', t.local)}
          ${f("Reseförsäkring eller extra skydd (kr)", 'data-t="insurance"', t.insurance, "0", "Hemförsäkringens reseskydd ingår ofta. Se Före resan.")}
          ${f("Pass, id-kort, visum (kr)", 'data-t="docs"', t.docs, "0", `Pass ${kr(V("passAvgift"))}, nationellt id-kort ${kr(V("idkortAvgift"))} (Polisen).`)}
          ${f("Övrigt (kr)", 'data-t="other"', t.other)}
          ${f("Påslag vid kortbetalning utomlands (%)", 'data-t="fx"', t.fx, "0", "Fråga banken. Att betala i lokal valuta är oftast billigast, och du har rätt att välja det (Konsumenternas bank- och finansbyrå).")}
          ${f("Buffert för oväntat (%)", 'data-t="buffer"', t.buffer, "10", "Ert eget antagande.")}
          <label>Betalt senast</label><input type="month" data-t="date" value="${esc(t.date)}">
        </div>
        <div id="trip-result">${tripResult(s)}</div>`;
    }

    function tripResult(s) {
      const t = s.trip;
      const c = tripCalc(t);
      if (c.total <= 0) return `<div class="warn">Fyll i resans kostnader.</div>`;
      const sp = split(c.total);
      const rows = [["Resa, försäkring, pass och övrigt", c.fixed], ["Boende", c.lodging], ["Mat och dryck", c.food], ["Aktiviteter och lokal transport", num(t.activities) + num(t.local)], ["Kortpåslag", c.fx], ["Buffert", c.buffer]].filter(([, v]) => v > 0);
      return `<div class="card">
          <div class="muted">Resan kostar${t.name ? ` (${esc(t.name)})` : ""}</div>
          <div class="big">${kr(c.total)}</div>
          <div class="muted">${kr(c.perPerson)} per person, ${kr(c.perDay)} per dag.</div>
          <div style="margin-top:12px">${UI.bars(rows.map(([label, value]) => ({ label, value })))}</div>
          <p class="muted" style="margin-top:6px">Delat 50/50: ${kr(sp.half[0])} var.${sp.prop ? ` Efter inkomst: ${esc(name(0))} ${kr(sp.prop[0])}, ${esc(name(1))} ${kr(sp.prop[1])}.` : ""}</p>
          <button id="btn-goal" class="primary" style="margin-top:8px;width:100%">Lägg som sparmål</button>
          <p id="goal-msg" class="muted" style="margin-top:6px"></p>
        </div>`;
    }

    function viewHoliday(s) {
      return `<div class="card"><h2>Semesterdagar</h2><ul>
          <li>Du har rätt till 25 semesterdagar per semesterår (semesterlagen 4 §). Semesteråret är 1 april–31 mars, och dagarna tjänas in under året före (3 §).</li>
          <li>Du har rätt till minst fyra sammanhängande veckor under juni–augusti om inget annat avtalas (12 §).</li>
          <li>Sparade dagar: bara dagar utöver 20 kan sparas, alltså högst 5 per år, och de ska tas ut inom 5 år (18 §).</li>
          <li>Sjukdagar under semestern kan undantas om du begär det utan oskäligt dröjsmål (15 §).</li>
          <li>Föräldraledighet likställs med arbetad tid upp till 120 dagar per barn, 180 för ensamstående (17 a §). Sjukfrånvaro likställs upp till 180 dagar (17 §).</li>
          <li>Semesterersättning vid månadslön är 0,43 % av månadslönen per semesterdag. Procentregeln ger 12 % av intjänad lön (16 a §).</li></ul>
          <p class="muted">Läst som sammanfattning av lagen till och med 2014 års ändringar. Paragrafnummer och senare ändringar är inte verifierade. Kollektivavtal kan ge mer, så kontrollera ditt avtal.</p></div>
        <div class="card"><h2>Semester och barn</h2>
          <p class="muted" style="margin:0">Planera tillsammans vem som är ledig när, och räkna på vad lönen är under föräldraledighet och vab under semestern. Se Barn.</p></div>`;
    }

    function viewRights() {
      return `<div class="card"><h2>Paketresa</h2><ul>
          <li>En paketresa är minst två typer av resetjänster för samma resa (paketreselagen 2018:1217, 1 kap. 3 §). Konsumentverket tillägger minst 24 timmar eller övernattning. Flera avtal kan ändå vara en paketresa, t.ex. vid samtidig betalning på samma webbplats.</li>
          <li>Arrangören ansvarar för att hela resan blir som avtalat, även andras tjänster (4 kap. 1 §), och ska avhjälpa fel inom skälig tid (4 kap. 6 §).</li>
          <li>Priset kan höjas bara på vissa grunder och besked ska komma senast 20 dagar före avresa. Höjs det med mer än ${pct(V("paketPrishojning") * 100)} får du frånträda avtalet (3 kap. 2 och 5 §§).</li>
          <li>Du kan avboka utan avgift vid väsentlig ändring eller extraordinära omständigheter på resmålet. Pengarna ska tillbaka senast inom 14 dagar (3 kap. 1 och 9 §§).</li>
          <li>Du kan avboka före avresa utan skäl, men då kan en skälig avgift tas ut.</li>
          <li>Vid fel kan du få prisavdrag, häva eller få skadestånd (4 kap. 7 och 9 §§). Reklamera utan onödigt dröjsmål (4 kap. 2 §), helst på plats och skriftligt.</li>
          <li>Du kan inte ångra köpet av en paketresa (Konsumentverket).</li>
          <li>Resegaranti: kontrollera att arrangören finns i Kammarkollegiets lista över reseaktörer med resegaranti. Går arrangören i konkurs ansöker du hos Kammarkollegiet inom 3 månader. Vanliga flygbiljetter täcks inte.</li></ul></div>
        <div class="card"><h2>Egen ihopsatt resa</h2><ul>
          <li>Bokar du flyg och hotell separat är det separata avtal med svagare skydd, och varje företag ansvarar för sin del.</li>
          <li>Om ett företag underlättar nästa bokning kan det bli ett sammanlänkat researrangemang. Då ska det första företaget ordna resegaranti för sin del (1 kap. 4 §).</li></ul></div>
        <div class="card"><h2>Flyg</h2><ul>
          <li>Kompensation vid försening på 3 timmar eller mer vid ankomst, inställt flyg eller nekad ombordstigning: 250 euro upp till 1 500 km, 400 euro för längre flygningar inom EU och övriga flygningar på 1 500–3 500 km, och 600 euro för övriga (förordning 261/2004).</li>
          <li>Inställt flyg ger kompensation om beskedet kom mindre än två veckor före avgång och ingen omdirigering erbjöds. Ombokning eller återbetalning gäller alltid.</li>
          <li>Du har rätt till mat och dryck vid förväntad försening på 2 timmar, och hotell med transfer vid övernattning. Vid över 5 timmar kan du kräva pengarna tillbaka.</li>
          <li>Extraordinära omständigheter som väder och flygledning ger ingen kompensation. Tekniska fel och egen personals strejk räknas oftast inte.</li>
          <li>Begär ersättning hos flygbolaget inom 2 månader. Därefter kan du vända dig till ARN vid avgång från Sverige (avgift ${kr(V("arnAvgift"))}).</li>
          <li>Tåg: ersättning vid försening är 25 % av biljettpriset efter 60 minuter och 50 % efter 120 minuter (sekundär källa).</li>
          <li>EU arbetar med en ändring av reglerna. Ikraftträdande är inte verifierat.</li></ul></div>
        <div class="card"><h2>Om något går fel</h2><ul>
          <li>Spara bokningsbekräftelse, kvitton, boardingkort och svar. Reklamera skriftligt, först hos arrangören.</li>
          <li>ARN prövar tvisten men inte om företaget gått i konkurs. Anmäl inom ett år från första reklamationen.</li>
          <li>Vid kreditkortsköp kan invändningsrätt mot kreditgivaren finnas vid konkurs eller utebliven leverans. Kortets reseskydd är en försäkring och beror på villkoren.</li></ul></div>`;
    }

    const PREP = [
      "Pass eller id-kort är giltigt och räcker för destinationen",
      "Barnens pass eller id-kort är ordnade, och intyg från vårdnadshavare finns om bara en reser",
      "EU-kort beställt, ett per person inklusive barn",
      "Reseskyddet i hemförsäkringen kontrollerat: antal dagar och vad som ingår",
      "Avbeställningsskydd bestämt, och kortförsäkring kontrollerad",
      "Resegaranti kontrollerad för arrangören",
      "UD:s reseinformation läst för destinationen",
      "Kort och betalning: lokal valuta vid kortbetalning, och kontrollerat avgifter",
      "Tullreglerna kontrollerade vid hemresa, särskilt alkohol och tobak",
    ];

    function viewPrep(s) {
      const done = PREP.filter((_, i) => s.checks[i]).length;
      return `<div class="card"><div class="muted">Klart</div><div class="big">${done} av ${PREP.length}</div>${UI.meter(done, PREP.length, { label: "Klart" })}</div>
        <div class="card"><h2>Checklista</h2>${PREP.map((t, i) => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:1rem;margin:8px 0"><input type="checkbox" data-check="${i}" ${s.checks[i] ? "checked" : ""} style="width:auto;min-height:0;margin-top:4px"><span>${esc(t)}</span></label>`).join("")}</div>
        <div class="card"><h2>Försäkring och vård</h2><ul>
          <li>Reseskydd ingår i de flesta hemförsäkringar och gäller hos de flesta bolag i 45 dagar. Det omfattar sjukvård, hemtransport och extrakostnader, men normalt inte avbeställning (Konsumenternas försäkringsbyrå).</li>
          <li>Avråder UD från resan gäller normalt inget reseskydd.</li>
          <li>EU-kortet gäller i EU, EES, Schweiz och Storbritannien, är gratis och beställs i Försäkringskassans e-tjänst. Varje barn behöver eget kort. Du betalar bara patientavgift hos vårdgivare som är anslutna till landets offentliga system. Kortet ersätter inte privat vård eller hemtransport.</li></ul></div>
        <div class="card"><h2>Pass och id</h2><ul>
          <li>Pass ${kr(V("passAvgift"))}, nationellt id-kort ${kr(V("idkortAvgift"))}, provisoriskt pass ${kr(V("provPassAvgift"))}. Giltigt 5 år, och 3 år för barn under 12 (Polisen).</li>
          <li>Nationellt id-kort är en godkänd resehandling inom EU och Schengen.</li>
          <li>Barn kräver tidsbokning och samtycke från vårdnadshavare. Provisoriskt pass kan sökas tidigast 72 timmar före avresa.</li>
          <li>Reser barnet utan alla vårdnadshavare rekommenderar Polisen ett intyg från vårdnadshavarna med namn och kontaktuppgifter. Regler varierar per land och flygbolag.</li></ul></div>
        <div class="card"><h2>Pengar och tull</h2><ul>
          <li>Betala helst i lokal valuta. Du har alltid rätt att välja det. Vid betalning i kronor ska påslaget anges i procent över ECB:s referenskurs.</li>
          <li>Alkohol: du ska vara minst 20 år, bära den själv och ha den för eget eller familjens bruk. Mängderna skiljer sig mellan EU och länder utanför EU, så kontrollera Tullverkets sida. Kontanter på 10 000 euro eller mer ska anmälas.</li></ul></div>
        <div class="card"><h2>Akut hjälp utomlands</h2>
          <div class="module" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(RS.ud.name)}</strong><a href="tel:${RS.ud.number}" style="font-weight:700">${esc(RS.ud.shown)}</a></div><div class="muted">${esc(RS.ud.info)} Utomlands: +46 8 405 50 05.</div></div></div>`;
    }

    function viewLeisure(s) {
      const l = s.leisure;
      return `<div class="card"><h2>Nöje per månad (gemensamt)</h2>
          ${f("Restaurang och café (kr)", 'data-l="restaurant"', l.restaurant)}
          ${f("Kultur och evenemang (kr)", 'data-l="culture"', l.culture)}
          ${f("Hobby och sport (kr)", 'data-l="hobby"', l.hobby)}
          ${f("Streaming och abonnemang (kr)", 'data-l="subs"', l.subs)}
          ${f("Presenter (kr)", 'data-l="gifts"', l.gifts)}
        </div>
        <div id="leisure-result">${leisureResult(s)}</div>
        <div class="card"><h2>Fria pengar utan konflikt</h2><ul>
          <li>Bestäm ett belopp var som kan användas utan att förklara sig. Se Hushåll för fickpengar.</li>
          <li>Skriv ner vad som är gemensamt nöje och vad som är eget, så att ni slipper diskutera varje kväll ute.</li>
          <li>Sätt en gräns för spontana köp och en betänketid. Se Köpbeslut.</li></ul></div>`;
    }

    function leisureResult(s) {
      const r = leisureCalc(s.leisure);
      if (r.total <= 0) return `<div class="warn">Fyll i vad ni lägger på nöje.</div>`;
      return `<div class="card"><div class="muted">Gemensamt nöje per månad</div><div class="big">${kr(r.total)}</div>
          ${r.parts.filter(([, v]) => v > 0).map(([a, v]) => `<div class="kv"><span>${a}</span><span>${kr(v)}</span></div>`).join("")}
          <div class="kv"><span>Fickpengar totalt (Hushåll)</span><span>${kr(r.pocket)}</span></div>
          <div class="kv"><span>Kvar att spara enligt Översikt</span><span class="${r.left < 0 ? "neg" : ""}">${kr(r.left)}</span></div>
          <button id="btn-leisure" class="primary" style="margin-top:10px;width:100%">Lägg nöje i Utgifter</button>
          <p id="leisure-msg" class="muted" style="margin-top:6px"></p></div>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "resor";
    const rerender = () => { app.innerHTML = viewResor(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-goal") {
        const c = tripCalc(s.trip);
        const sp = App.state.sparande;
        if (!Array.isArray(sp.goals)) sp.goals = [];
        const label = s.trip.name || "Resa";
        const existing = sp.goals.find((g) => g.id === "trip");
        const goal = { id: "trip", name: label, target: Math.round(c.total), saved: existing ? existing.saved : 0, date: s.trip.date || "" };
        if (existing) Object.assign(existing, goal);
        else sp.goals.push(goal);
        App.save();
        const msg = document.getElementById("goal-msg");
        if (msg) msg.textContent = goal.date ? "Lagt till som sparmål under Buffert och sparande." : "Lagt till som sparmål. Fyll i datum där för att få månadsbeloppet.";
      } else if (t.id === "btn-leisure") {
        const total = Math.round(leisureCalc(s.leisure).total);
        const list = App.state.expenses;
        const e = list.find((x) => x.id === "leisure");
        if (e) { e.amount = total; e.name = "Nöje (från Resor och nöje)"; e.owner = "shared"; }
        else list.push({ id: "leisure", name: "Nöje (från Resor och nöje)", amount: total, owner: "shared", essential: false });
        App.save();
        const msg = document.getElementById("leisure-msg");
        if (msg) msg.textContent = "Lagt till som gemensam, ej nödvändig utgift.";
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      const $ = (id) => document.getElementById(id);
      if (t.dataset.t) {
        const k = t.dataset.t;
        s.trip[k] = k === "name" || k === "date" ? t.value : UI.parse(t.value, { people: 2, buffer: 10 }[k]);
        App.save();
        if ($("trip-result")) $("trip-result").innerHTML = tripResult(s);
      } else if (t.dataset.l) {
        s.leisure[t.dataset.l] = num(t.value);
        App.save();
        if ($("leisure-result")) $("leisure-result").innerHTML = leisureResult(s);
      } else if (t.dataset.check !== undefined) {
        s.checks[t.dataset.check] = t.checked;
        App.save();
        if (ev.type === "change") rerender();
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.resor = viewResor;
    App.moreLinks.push({ title: "Resor och nöje", href: "#/resor", desc: "Resekalkyl, rättigheter, checklista, semester, nöje" });
    App._resor = { tripCalc, split, leisureCalc, PREP, S };
  });
})();
