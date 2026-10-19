// Bil module: monthly cost, financing comparison, "do we need a car?" and purchase rules.
// Tax formulas and rules come from rules.js. Prices (insurance, tyres, fuel, depreciation) are always the user's own input.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const B = R.bil;
    const TABS = [["kostnad", "Kostnad"], ["fin", "Finansiera"], ["behov", "Behövs bil?"], ["regler", "Regler"]];
    const FUELS = { bensin: "Bensin", diesel: "Diesel (fordonsår 2018 eller senare)", el: "El", alt: "Etanol eller gas" };

    const defaults = () => ({
      tab: "kostnad",
      price: 0, resid: 0, years: 3, rate: 0,
      miles: 0, fuel: "bensin", consumption: 0, unitPrice: 0,
      co2: 0, malus: false, taxOverride: null,
      insurance: 0, service: 0, tireSet: 0, tireLife: 4, besikt: 0, parking: 0, congestion: 0, other: 0,
      down: 0, loanRate: 0, loanMonths: 48, endValue: null,
      leaseFee: 0, leaseStart: 0, leaseMiles: 0, leaseOverRate: 0,
      altTaxi: 0, altRental: 0, altTransit: 0, altOther: 0,
      commuteKm: 0, commuteDays: 0,
    });

    function S() {
      const s = App.state.bil;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "kostnad";
      if (!FUELS[s.fuel]) s.fuel = "bensin";
      return s;
    }

    const pct1 = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE");

    // ---------- calculations ----------
    function malusPart(co2) {
      return V("malusLag") * Math.min(Math.max(co2 - 75, 0), 50) + V("malusHog") * Math.max(co2 - 125, 0);
    }

    // Annual vehicle tax from the Transportstyrelsen formulas. Electric cars use 0 g/km (formula result, not stated explicitly by the source).
    function carTax(fuel, co2, malus) {
      const g = fuel === "el" ? 0 : Math.max(num(co2), 0);
      const normal = (fuel === "alt" ? V("co2BeloppAlt") : V("co2Belopp")) * Math.max(g - V("co2Grans"), 0);
      let tax = V("fordonsskattGrund") + (malus ? malusPart(g) : normal);
      if (fuel === "diesel") tax += V("dieselBransle") * g + V("dieselMiljo");
      return Math.round(tax);
    }

    function costCalc(s) {
      const price = num(s.price);
      const resid = Math.min(num(s.resid), price);
      const years = Math.max(num(s.years), 1);
      const depM = (price - resid) / (years * 12);
      const capM = (((price + resid) / 2) * num(s.rate)) / 100 / 12;
      const miles = num(s.miles);
      const fuelM = (miles * num(s.consumption) * num(s.unitPrice)) / 12;
      const taxY = s.taxOverride !== null && s.taxOverride !== undefined ? num(s.taxOverride) : carTax(s.fuel, s.co2, s.malus);
      const tireM = num(s.tireLife) > 0 ? num(s.tireSet) / (num(s.tireLife) * 12) : 0;
      const items = [
        ["Värdeminskning", depM],
        ["Kapitalkostnad (ränta på bundet kapital)", capM],
        ["Drivmedel", fuelM],
        ["Fordonsskatt", taxY / 12],
        ["Försäkring", num(s.insurance)],
        ["Service och reparationer", num(s.service)],
        ["Däck", tireM],
        ["Besiktning", num(s.besikt) / 12],
        ["Parkering", num(s.parking)],
        ["Trängselskatt och vägavgifter", num(s.congestion)],
        ["Övrigt (tvätt, tillbehör)", num(s.other)],
      ];
      const total = items.reduce((a, [, v]) => a + v, 0);
      return { items, total, perYear: total * 12, perMil: miles > 0 ? (total * 12) / miles : 0, miles, taxY, price };
    }

    function annuity(P, ratePct, n) {
      const i = ratePct / 100 / 12;
      return i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));
    }

    function finCalc(s) {
      const price = num(s.price);
      const n = Math.max(Math.round(num(s.loanMonths)), 1);
      const endValue = s.endValue !== null && s.endValue !== undefined ? num(s.endValue) : Math.min(num(s.resid), price);
      const down = Math.min(num(s.down), price);
      const P = price - down;
      const pay = annuity(P, num(s.loanRate), n);
      const loanTotal = pay * n + down;
      const loan = (loanTotal - endValue) / n;
      const cash = (price - endValue) / n + (((price + endValue) / 2) * num(s.rate)) / 100 / 12;
      const years = n / 12;
      const over = Math.max(num(s.miles) * years - num(s.leaseMiles) * years, 0) * num(s.leaseOverRate);
      const leaseTotal = num(s.leaseFee) * n + num(s.leaseStart) + over;
      const lease = leaseTotal / n;
      return { n, pay, P, loanTotal, loan, cash, lease, over, endValue, interest: pay * n - P };
    }

    // ---------- views ----------
    function viewBil() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { kostnad: viewCost, fin: viewFin, behov: viewNeed, regler: viewRules }[s.tab](s);
      return `<h1>Bil</h1>
        <p class="muted">Räkna på vad bilen kostar per månad. Priser fyller du i själv, för jag har inga bekräftade medelvärden.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewBil.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(B.checked)}.</p>
        <ul class="muted">${B.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${B.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const f = (label, key, v, ph, hint) => `<label>${label}</label><input data-s="${key}" inputmode="decimal" value="${UI.fv(v, key)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;
    const sel = (key, cur, opts) => `<select data-s="${key}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${String(cur) === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;

    function viewCost(s) {
      const computedTax = carTax(s.fuel, s.co2, s.malus);
      return `<div class="card"><h2>Bilen</h2>
          ${f("Pris (kr)", "price", s.price)}
          ${f("Värde när ni säljer (kr)", "resid", s.resid, "0", "Ert eget antagande. Sekundära riktmärken (Vi Bilägare, odaterat) anger ca 50 % kvar efter 3 år, men det varierar mycket.")}
          ${f("Ägandetid (år)", "years", s.years, "3")}
          ${f("Ränta på bundet kapital (%)", "rate", s.rate, "0", "Låneräntan, eller vad pengarna annars hade gett. 0 ignorerar kapitalkostnaden.")}
        </div>
        <div class="card"><h2>Körning</h2>
          ${f("Mil per år", "miles", s.miles)}
          <label>Drivmedel</label>${sel("fuel", s.fuel, FUELS)}
          ${f(s.fuel === "el" ? "Förbrukning (kWh per mil)" : "Förbrukning (liter per mil)", "consumption", s.consumption, "0", "Se bilens uppgifter eller egen mätning.")}
          ${f(s.fuel === "el" ? "Elpris (kr per kWh)" : "Drivmedelspris (kr per liter)", "unitPrice", s.unitPrice, "0", "Aktuellt pris där ni tankar eller laddar. Mobility Sweden anger för 2025 (via TT, sekundärt) ca 11,50 kr/mil bensin, 9,20 diesel, 2,20–3,70 hemladdning och 8,50 enbart publik laddning, bara energi.")}
        </div>
        <div class="card"><h2>Fordonsskatt</h2>
          ${f("Koldioxidutsläpp WLTP (g/km)", "co2", s.fuel === "el" ? 0 : s.co2, "0", "Står i registreringsbeviset eller bilannonsen.")}
          <label style="display:flex;gap:10px;align-items:center;color:var(--text);font-size:1rem"><input type="checkbox" data-s="malus" ${s.malus ? "checked" : ""} style="width:auto;min-height:0"> Bilen är inom de tre första åren (malus)</label>
          <div class="muted" id="tax-calc">Beräknad skatt: <strong>${kr(computedTax)}</strong> per år (${kr(computedTax / 12)} per månad). Laddhybrider registrerade från 2026 har ny viktningsfaktor, så kontrollera värdet.</div>
          ${f("Eller ange skatten själv (kr per år)", "taxOverride", s.taxOverride, "Använd beräkningen")}
        </div>
        <div class="card"><h2>Löpande kostnader</h2>
          ${f("Försäkring (kr per månad)", "insurance", s.insurance, "0", "Skillnaden mellan billigaste och dyraste bolag kan vara stor (sekundärkälla). Jämför själv.")}
          ${f("Service och reparationer (kr per månad)", "service", s.service, "0", "Räkna hellre högt för äldre bilar.")}
          ${f("Däck, pris per sats (kr)", "tireSet", s.tireSet, "0", "Vinterdäck krävs 1 dec–31 mars vid vinterväglag, minst 3 mm mönsterdjup (Transportstyrelsen).")}
          ${f("Däcksats håller (år)", "tireLife", s.tireLife, "4")}
          ${f("Besiktning (kr per år)", "besikt", s.besikt)}
          ${f("Parkering (kr per månad)", "parking", s.parking)}
          ${f("Trängselskatt och vägavgifter (kr per månad)", "congestion", s.congestion, "0", "Trängselskatt: max 135 kr/dag i Stockholm högsäsong och 105 lågsäsong, och 60 kr/dag i Göteborg (Transportstyrelsen).")}
          ${f("Övrigt (kr per månad)", "other", s.other)}
        </div>
        <div id="cost-result">${costResult(s)}</div>`;
    }

    function costResult(s) {
      const c = costCalc(s);
      if (c.price <= 0) return `<div class="warn">Fyll i bilens pris.</div>`;
      const inc = App.calc().totalInc;
      return `<div class="card">
          <div class="muted">Bilen kostar per månad</div>
          <div class="big">${kr(c.total)}</div>
          <div class="muted">${kr(c.perYear)} per år${c.perMil > 0 ? `, ${kr(c.perMil)} per mil` : ""}.${inc > 0 ? ` ${pct1((c.total / inc) * 100)} % av hushållets inkomst efter skatt.` : ""}</div>
          <div style="margin-top:12px">${UI.bars(c.items.map(([label, value]) => ({ label, value })))}</div>
          <button id="btn-budget" class="primary" style="margin-top:10px;width:100%">Lägg bilkostnaden i Utgifter</button>
          <p id="budget-msg" class="muted" style="margin-top:6px"></p>
        </div>
        <p class="muted">Räkna med att engångsposter (reparation, självrisk) kan komma oväntat. Lägg gärna en egen buffert för bilen.</p>`;
    }

    function viewFin(s) {
      return `<div class="card"><h2>Gemensamt</h2>
          ${f("Bilens pris (kr)", "price", s.price)}
          ${f("Löptid (månader)", "loanMonths", s.loanMonths, "48")}
          ${f("Bilens värde när perioden är slut (kr)", "endValue", s.endValue !== null && s.endValue !== undefined ? s.endValue : s.resid, "0", "Ert antagande.")}
          ${f("Mil per år (ni kör)", "miles", s.miles)}
        </div>
        <div class="card"><h2>Billån</h2>
          ${f("Kontantinsats (kr)", "down", s.down)}
          ${f("Ränta (%)", "loanRate", s.loanRate, "0", "Fråga flera banker. Handlarens ränta kan vara högre än bankens.")}
        </div>
        <div class="card"><h2>Privatleasing</h2>
          ${f("Månadsavgift (kr)", "leaseFee", s.leaseFee)}
          ${f("Uppstartsavgift (kr)", "leaseStart", s.leaseStart)}
          ${f("Mil per år som ingår i avtalet", "leaseMiles", s.leaseMiles)}
          ${f("Pris per övermil (kr)", "leaseOverRate", s.leaseOverRate)}
        </div>
        <div id="fin-result">${finResult(s)}</div>`;
    }

    function finResult(s) {
      if (num(s.price) <= 0) return `<div class="warn">Fyll i bilens pris.</div>`;
      const r = finCalc(s);
      const row = (t, v, d) => `<div class="card"><div class="kv"><strong>${t}</strong><strong>${kr(v)} per månad</strong></div><p class="muted" style="margin:4px 0 0">${d}</p></div>`;
      return `${row("Kontant", r.cash, "Pris minus värde vid periodens slut, plus kapitalkostnad enligt räntan under Kostnad.")}
        ${row("Billån", r.loan, `Månadsbetalning ${kr(r.pay)}, räntekostnad totalt ${kr(r.interest)}, minus bilens värde ${kr(r.endValue)} vid slutet.`)}
        ${row("Privatleasing", r.lease, `Inklusive uppstartsavgift och övermil (${kr(r.over)}). Du äger ingen bil efteråt.`)}
        <p class="muted">Siffrorna gäller bara bilens kapitalkostnad. Drivmedel, försäkring och service tillkommer. Privatleasing har ingen särskild lag, så avtalet styr. Restvärde och övermil kan bli dyrt, och förtida uppsägning kan vara mycket dyr eller utesluten (Konsumentverket). Kontrollera att "garanterat" restvärde är fast.</p>`;
    }

    function viewNeed(s) {
      const miles = num(s.commuteKm) * 2 * num(s.commuteDays) / 10;
      const cost = miles * V("milersattning");
      const deduct = Math.max(cost - V("reseavdragGrans"), 0);
      return `<div class="card"><h2>Alternativen per månad</h2>
          ${f("Taxi och skjuts (kr)", "altTaxi", s.altTaxi)}
          ${f("Hyrbil eller bilpool (kr)", "altRental", s.altRental)}
          ${f("Kollektivtrafik, båda (kr)", "altTransit", s.altTransit)}
          ${f("Annat (cykel, elcykel m.m.) (kr)", "altOther", s.altOther)}
          <p class="muted" style="margin-top:6px">Priser för taxi och bilpool har inte kunnat verifieras, så fyll i egna.</p>
        </div>
        <div id="need-result">${needResult(s)}</div>
        <div class="card"><h2>Reseavdrag</h2>
          <div class="grid2"><div>${f("Km enkel väg till jobbet", "commuteKm", s.commuteKm)}</div><div>${f("Arbetsdagar per år med bil", "commuteDays", s.commuteDays)}</div></div>
          <div id="travel-result" style="margin-top:8px">${travelResult(miles, cost, deduct)}</div>
          <p class="muted" style="margin-top:6px">Villkor för bil: minst 5 km mellan hem och arbete och minst 2 timmar sparad tid per dag. Avdraget gäller bara kostnad över ${kr(V("reseavdragGrans"))} (för inkomståret 2026). Gränsen var 11 000 kr till och med 2025. Lagtexten är inte läst, och avdragets skattevärde räknas inte här.</p>
        </div>`;
    }

    function travelResult(miles, cost, deduct) {
      if (miles <= 0) return `<span class="muted">Fyll i avstånd och dagar.</span>`;
      return `<div class="kv"><span>Mil per år</span><span>${pct1(miles)}</span></div>
        <div class="kv"><span>Kostnad (${V("milersattning")} kr/mil)</span><span>${kr(cost)}</span></div>
        <div class="kv"><strong>Avdragsgill del</strong><strong>${kr(deduct)}</strong></div>`;
    }

    function needResult(s) {
      const c = costCalc(s);
      const alt = num(s.altTaxi) + num(s.altRental) + num(s.altTransit) + num(s.altOther);
      if (c.price <= 0) return `<div class="warn">Fyll i bilens kostnad under fliken Kostnad.</div>`;
      const diff = c.total - alt;
      return `<div class="card">
        <div class="kv"><span>Bilen</span><strong>${kr(c.total)}</strong></div>
        <div class="kv"><span>Alternativen</span><strong>${kr(alt)}</strong></div>
        <div class="kv"><strong>${diff > 0 ? "Bilen kostar mer med" : "Alternativen kostar mer med"}</strong><strong>${kr(Math.abs(diff))}</strong></div>
        <p class="muted" style="margin:6px 0 0">Kostnaden är bara en del av valet. Tid, möjlighet att jobba, barn, vinter, boendeort och flexibilitet spelar också in.</p></div>
        <div class="card"><h2>Frågor att ställa</h2><ul>
          <li>Hur ofta behöver ni bilen, och är det samma tider varje vecka?</li>
          <li>Finns parkering och vad kostar den?</li>
          <li>Går jobb, barnomsorg och inköp att nå utan bil?</li>
          <li>Räcker en bil, eller är det två vuxna med olika scheman?</li>
          <li>Kan en hyrbil några gånger per år ersätta bilen?</li></ul></div>`;
    }

    function viewRules(s) {
      return `<div class="card"><h2>Köpa av handlare</h2><ul>
          <li>Reklamation upp till 3 år, och du ska klaga inom skälig tid. Två månader efter att du märkt felet räknas alltid som i tid. Bevisbördan ligger hos företaget första 2 åren från att du fick bilen (Konsumentverket).</li>
          <li>Ingen 14-dagars ångerrätt när du köper i lokalen. Vid distansköp i organiserat distanssystem finns 14 dagar från att du fått bilen.</li></ul></div>
        <div class="card"><h2>Köpa av privatperson</h2><ul>
          <li>Köplagen gäller, med 2 år från att du fick bilen. Du kan inte klaga på fel du borde hittat vid noggrann undersökning.</li>
          <li>"Befintligt skick" fritar inte säljaren vid felaktiga uppgifter, undanhållna fel eller om bilen är klart sämre än priset motiverar.</li></ul></div>
        <div class="card"><h2>Skatt, besiktning och papper</h2><ul>
          <li>Den som är registrerad ägare i början av betalningsmånaden betalar fordonsskatten. Säljs bilen under månaden går skatten inte över till köparen (Transportstyrelsen).</li>
          <li>Anmäl ägarbyte inom 10 dagar.</li>
          <li>Vid leasing räknas brukaren som ägare för fordonsskatt, trängselskatt och trafikförsäkring.</li>
          <li>Besiktning: första senast 36 månader efter första registrering, andra senast 24 månader efter den första, därefter senast 14 månader efter föregående.</li>
          <li>Trafikförsäkring är obligatorisk. Utebliven försäkring kan ge avgift, men beloppet har inte verifierats.</li></ul></div>
        <div class="card"><h2>Elbilspremie</h2><ul>
          <li>Ingen allmän elbilsbonus finns. Bonusen avskaffades 2022.</li>
          <li>Riktad premie sedan 18 mars 2026 (Naturvårdsverket, enligt regeringen): för hushåll i landsbygdskommun eller område med dålig kollektivtrafik och hushållsinkomst under 80 % av medelinkomsten. 1 300 kr per månad i upp till 3 år, och ett starttillägg på 18 000 kr vid låg inkomst (högst 50 % av medelinkomsten). Gäller köp och leasing. Villkoren är inte kontrollerade mot Naturvårdsverkets egen sida.</li></ul></div>
        <div class="card"><h2>Ni som sambor</h2><ul>
          <li>Skriv ner vem som äger bilen och vem som betalar lån, försäkring och skatt.</li>
          <li>Står bara en på lånet eller leasingavtalet är det den personen som är bunden mot banken.</li>
          <li>Hur en samägd bil hanteras vid separation och om bil räknas som bohag har inte kunnat verifieras. Se Sambo och juridik.</li></ul></div>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "bil";
    const rerender = () => { app.innerHTML = viewBil(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-budget") {
        const total = Math.round(costCalc(s).total);
        const list = App.state.expenses;
        const e = list.find((x) => x.id === "car");
        if (e) { e.amount = total; e.name = "Bil (från Bil)"; e.owner = "shared"; }
        else list.push({ id: "car", name: "Bil (från Bil)", amount: total, owner: "shared", essential: false });
        App.save();
        const msg = document.getElementById("budget-msg");
        if (msg) msg.textContent = "Lagt till som gemensam, ej nödvändig utgift. Ändra under Utgifter.";
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      if (!t.dataset.s) return;
      const s = S();
      const k = t.dataset.s;
      if (k === "fuel") {
        s.fuel = FUELS[t.value] ? t.value : "bensin";
        App.save();
        rerender();
        return;
      }
      if (k === "malus") s.malus = t.checked;
      else if (k === "taxOverride" || k === "endValue") s[k] = t.value.trim() === "" ? null : num(t.value);
      else s[k] = UI.parse(t.value, { years: 3, loanMonths: 48, tireLife: 4 }[k]);
      App.save();
      const $ = (id) => document.getElementById(id);
      if ($("tax-calc")) {
        const tax = carTax(s.fuel, s.co2, s.malus);
        $("tax-calc").innerHTML = `Beräknad skatt: <strong>${kr(tax)}</strong> per år (${kr(tax / 12)} per månad). Laddhybrider registrerade från 2026 har ny viktningsfaktor, så kontrollera värdet.`;
      }
      if ($("cost-result")) $("cost-result").innerHTML = costResult(s);
      if ($("fin-result")) $("fin-result").innerHTML = finResult(s);
      if ($("need-result")) $("need-result").innerHTML = needResult(s);
      if ($("travel-result")) {
        const miles = (num(s.commuteKm) * 2 * num(s.commuteDays)) / 10;
        const cost = miles * V("milersattning");
        $("travel-result").innerHTML = travelResult(miles, cost, Math.max(cost - V("reseavdragGrans"), 0));
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", (ev) => {
      if (ev.target.dataset && (ev.target.dataset.s === "fuel" || ev.target.dataset.s === "malus")) onInput(ev);
    });

    App.views.bil = viewBil;
    App.moreLinks.push({ title: "Bil", href: "#/bil", desc: "Månadskostnad, finansiering, behövs bil?, regler" });
    App._bil = { carTax, malusPart, costCalc, finCalc, annuity, S };
  });
})();
