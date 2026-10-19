// Barn module: child costs, parental leave planning, childcare fees and rules for unmarried parents.
// Amounts and rules come from rules.js (R.barn, R.konsumentverket). Simplified, not advice.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const BR = R.barn;
    const FP = BR.fp;
    const KV = R.konsumentverket;
    const TABS = [["kostnad", "Kostnad"], ["fp", "Föräldrapenning"], ["omsorg", "Barnomsorg"], ["regler", "Regler"]];
    const CARE = { none: "Ingen", forskola: "Förskola", fritids: "Fritidshem" };

    const defaults = () => ({
      tab: "kostnad",
      children: [],
      grossA: 0,
      grossB: 0,
      sickDaysA: 195,
      lowDaysA: 45,
      householdGross: 0,
    });

    function S() {
      const s = App.state.barn;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "kostnad";
      s.children = UI.objs(s.children).map((c) => ({
        id: UI.safeId(c.id),
        name: String(c.name || ""),
        age: Math.min(Math.max(Math.floor(num(c.age)), 0), 17),
        care: CARE[c.care] ? c.care : "none",
      }));
      return s;
    }

    const name = (i) => App.pname(i);
    const num1 = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE");

    // ---------- calculations ----------
    function ageGroup(age) {
      if (age <= 0) return "0";
      if (age <= 3) return "1-3";
      if (age <= 6) return "4-6";
      if (age <= 10) return "7-10";
      if (age <= 14) return "11-14";
      return "15-17";
    }

    // Konsumentverket: "other costs" + food per child, plus the extra shared cost for a bigger household (known for up to 4 people).
    function childCosts(children) {
      const per = children.map((c) => {
        const [other, food] = KV.child[ageGroup(c.age)];
        return { child: c, other, food, total: other + food };
      });
      const n = children.length;
      const known = n <= 2;
      const sharedExtra = n === 0 ? 0 : known ? KV.sharedByPeople[2 + n] - KV.sharedByPeople[2] : KV.sharedByPeople[4] - KV.sharedByPeople[2];
      const sum = per.reduce((a, p) => a + p.total, 0) + sharedExtra;
      return { per, sharedExtra, known, sum };
    }

    // Barnbidrag + flerbarnstillägg for children counted until 15 (age limits unverified).
    function allowance(children) {
      const n = children.filter((c) => c.age < 16).length;
      const base = n * R.values.barnbidrag.value;
      const f = BR.flerbarn;
      const extra = n < 2 ? 0 : n <= 4 ? f[n] : f[4] + (n - 4) * f.extraPerChildFrom5;
      return { n, base, extra, total: base + extra };
    }

    // Maxtaxa: household income before tax; 10 000 deducted; basis capped. Youngest child counted as child 1 (assumption).
    function maxtaxa(children, householdGross) {
      const m = BR.maxtaxa;
      const basis = Math.min(Math.max(num(householdGross) - m.deduction, 0), m.basisCap);
      const enrolled = children.filter((c) => c.care !== "none").sort((a, b) => a.age - b.age);
      const rows = enrolled.map((c, i) => {
        const pct = (c.care === "forskola" ? m.forskola : m.fritids)[Math.min(i, 3)];
        return { child: c, order: i + 1, pct, fee: Math.round(basis * pct) };
      });
      return { basis, rows, total: rows.reduce((a, r) => a + r.fee, 0) };
    }

    // Parental benefit per day at sjukpenningsnivå from monthly gross income.
    function dailyBenefit(grossMonthly) {
      const sgi = Math.min(num(grossMonthly) * 12, BR.sgiTak);
      return Math.min(Math.max((FP.factor * 0.8 * sgi) / 365, FP.minPerDay), FP.maxPerDay);
    }

    function leaveCalc(s) {
      const sick = [Math.min(Math.max(Math.round(num(s.sickDaysA)), FP.reservedEach), FP.sick - FP.reservedEach)];
      sick[1] = FP.sick - sick[0];
      const low = [Math.min(Math.max(Math.round(num(s.lowDaysA)), 0), FP.low)];
      low[1] = FP.low - low[0];
      const gross = [num(s.grossA), num(s.grossB)];
      const daily = gross.map(dailyBenefit);
      const grossDaily = gross.map((g) => (g * 12) / 365);
      const people = [0, 1].map((i) => {
        const days = sick[i] + low[i];
        const benefit = sick[i] * daily[i] + low[i] * FP.lowAmount;
        const lost = days * grossDaily[i];
        return { sick: sick[i], low: low[i], days, daily: daily[i], benefit, lost, loss: lost - benefit, months: days / 30.4 };
      });
      return { people, totalLoss: people[0].loss + people[1].loss, totalBenefit: people[0].benefit + people[1].benefit };
    }

    // Split that gives the smallest total income loss: non-reserved days go to the parent who loses less per day.
    function bestSplit(s) {
      const gross = [num(s.grossA), num(s.grossB)];
      const daily = gross.map(dailyBenefit);
      const grossDaily = gross.map((g) => (g * 12) / 365);
      const lossSick = [grossDaily[0] - daily[0], grossDaily[1] - daily[1]];
      const lossLow = [grossDaily[0] - FP.lowAmount, grossDaily[1] - FP.lowAmount];
      const free = FP.sick - 2 * FP.reservedEach;
      let sickA = FP.reservedEach + free / 2;
      let lowA = FP.low / 2;
      if (lossSick[0] < lossSick[1]) sickA = FP.reservedEach + free;
      else if (lossSick[0] > lossSick[1]) sickA = FP.reservedEach;
      if (lossLow[0] < lossLow[1]) lowA = FP.low;
      else if (lossLow[0] > lossLow[1]) lowA = 0;
      return { sickA, lowA };
    }

    // Maxtaxa text built from the rules: percent and the resulting maximum fee per child.
    function maxtaxaText() {
      const m = BR.maxtaxa;
      return m.forskola
        .map((p, i) => (p === 0 ? `barn ${i + 1} gratis` : `${Math.round(p * 100)} % för barn ${i + 1} (högst ${kr(Math.round(m.basisCap * p))})`))
        .join(", ");
    }

    // ---------- views ----------
    function viewBarn() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { kostnad: viewCost, fp: viewLeave, omsorg: viewCare, regler: viewRules }[s.tab](s);
      return `<h1>Barn</h1>
        <p class="muted">Kostnader, föräldrapenning och regler för er som sambor. Förenklade kalkyler.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewBarn.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(BR.checked)}.</p>
        <ul class="muted">${BR.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${BR.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const f = (label, attr, v, ph, hint) => `<label>${label}</label><input ${attr} inputmode="decimal" value="${UI.fv(v, attr)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;

    function childCard(c) {
      return `<div class="card child" data-id="${c.id}">
        <input data-c="name" value="${esc(c.name)}" placeholder="Namn (valfritt)" aria-label="Namn" autocomplete="off">
        <div class="grid2">
          <div>${f("Ålder (år, 0–17)", 'data-c="age"', c.age, "0")}</div>
          <div><label>Barnomsorg</label><select data-c="care">${Object.entries(CARE).map(([k, v]) => `<option value="${k}" ${c.care === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        </div>
        <button class="danger" data-del="${c.id}" style="margin-top:8px">Ta bort</button>
      </div>`;
    }

    function viewCost(s) {
      return `${s.children.map(childCard).join("") || `<div class="card"><p class="muted" style="margin:0">Lägg till de barn ni har eller väntar.</p></div>`}
        <button id="btn-add-child" class="primary" style="width:100%">+ Lägg till barn</button>
        <div id="cost-result" style="margin-top:12px">${costResult(s)}</div>`;
    }

    function costResult(s) {
      if (!s.children.length) return "";
      const c = childCosts(s.children);
      const a = allowance(s.children);
      const tax = maxtaxa(s.children, s.householdGross);
      const rows = c.per.map((p) => `<div class="kv"><span>${esc(p.child.name || "Barn")}, ${p.child.age} år (mat ${kr(p.food)})</span><span>${kr(p.total)}</span></div>`).join("");
      const net = Math.max(c.sum + tax.total - a.total, 0);
      return `<div class="card"><h2>Kostnad per månad enligt Konsumentverket</h2>
          ${rows}
          <div class="kv"><span>Extra gemensamma kostnader${c.known ? "" : " (tabell för större hushåll saknas, räknat som två barn)"}</span><span>${kr(c.sharedExtra)}</span></div>
          <div class="kv"><strong>Summa</strong><strong>${kr(c.sum)}</strong></div>
          <p class="muted" style="margin-top:6px">Ingår: mat, kläder, fritid, hygien, lek, barnförsäkring (230 kr), samt andel av gemensamma kostnader. Ingår inte: barnomsorg, boendekostnad för större bostad, tandvård, läkemedel, resor och semester. Internet och mobil minskas med 229 kr för hushåll med barn under 8 år (inte avdraget här).</p></div>
        <div class="card"><h2>Barnbidrag</h2>
          <div class="kv"><span>Barnbidrag (${a.n} barn)</span><span>${kr(a.base)}</span></div>
          <div class="kv"><span>Flerbarnstillägg</span><span>${kr(a.extra)}</span></div>
          <div class="kv"><strong>Totalt per månad</strong><strong>${kr(a.total)}</strong></div>
          <p class="muted" style="margin-top:6px">Barnbidraget är skattefritt. Åldersgränsen är inte verifierad, så barn från 16 år räknas inte. Underhållsstöd vid separation: ${kr(BR.underhall[0])}, ${kr(BR.underhall[1])} från 7 år och ${kr(BR.underhall[2])} från 15 år.</p></div>
        <div class="card"><div class="muted">Nettokostnad för barn per månad</div><div class="big">${kr(net)}</div>
          <div class="muted">Konsumentverkets kostnader${tax.total ? " plus barnomsorg" : ""} minus barnbidrag.${tax.total ? "" : " Fyll i hushållets bruttoinkomst under Barnomsorg för att få med avgifterna."}</div>
          <button id="btn-budget" class="primary" style="margin-top:10px;width:100%">Lägg barnens nettokostnad i Utgifter</button>
          <p id="budget-msg" class="muted" style="margin-top:6px"></p></div>`;
    }

    function viewLeave(s) {
      const calc = leaveCalc(s);
      return `<div class="card"><h2>Inkomst före skatt</h2>
          ${f(esc(name(0)) + " (kr per månad)", 'data-s="grossA"', s.grossA, "0", `SGI räknas upp till ${kr(BR.sgiTak)} per år.`)}
          ${f(esc(name(1)) + " (kr per månad)", 'data-s="grossB"', s.grossB)}
        </div>
        <div class="card"><h2>Dela dagarna</h2>
          <p class="muted">${FP.total} dagar per barn: ${FP.sick} på sjukpenningnivå och ${FP.low} på lägstanivå (${FP.lowAmount} kr per dag). ${FP.reservedEach} sjukpenningdagar är reserverade för varje förälder och kan inte överlåtas.</p>
          ${f(esc(name(0)) + "s sjukpenningdagar", 'data-s="sickDaysA"', s.sickDaysA, "0", `Mellan ${FP.reservedEach} och ${FP.sick - FP.reservedEach}. Resten går till ${esc(name(1))}.`)}
          ${f(esc(name(0)) + "s lägstanivådagar", 'data-s="lowDaysA"', s.lowDaysA, "0", `Mellan 0 och ${FP.low}.`)}
          <div class="row" style="margin-top:8px"><button id="btn-equal">Dela lika</button><button id="btn-best">Minsta förlust</button></div>
        </div>
        <div id="leave-result">${leaveResult(s)}</div>
        <div class="card"><h2>Regler</h2><ul>
          <li>Dubbeldagar: ${FP.doubleDays} dagar där båda är lediga samtidigt, tills barnet är 15 månader. De reserverade dagarna kan inte användas, och lägstanivådagar bara efter 180 sjukpenningdagar.</li>
          <li>Dagarna kan tas ut tills barnet fyllt 12 år eller avslutat årskurs 5. Efter 4-årsdagen kan högst ${FP.saveMax} dagar sparas.</li>
          <li>Ersättningen är 80 % av SGI, lägst ${kr(FP.minPerDay)} och högst ${kr(FP.maxPerDay)} per dag. För full nivå krävs SGI på minst ${kr(FP.minSgiMonth)} per månad i 240 dagar före beräknad förlossning.</li>
          <li>Vab: ${BR.vabDays} dagar per barn och år, till barnet är 12. Ersättning lite under 80 % av SGI, och inkomst över 7,5 prisbasbelopp ersätts inte. Ansök inom 30 dagar.</li>
          <li>Föräldraledighetslagen: hel ledighet till barnet är 18 månader (5 §), arbetstidsförkortning upp till en fjärdedel till 8 år (7 §), anmälan minst två månader före (13 §).</li>
          <li>Pension: föräldrapenning och vab är pensionsgrundande. Barnår för barnets första 4 år går till den med lägst inkomst. Ingen pensionsrätt för barnår om årsinkomsten är över ${kr(BR.barnarPensionTak)}.</li></ul></div>`;
    }

    function leaveResult(s) {
      const c = leaveCalc(s);
      if (num(s.grossA) + num(s.grossB) <= 0) return `<div class="warn">Fyll i inkomster för att se ersättning och förlust.</div>`;
      const card = (i) => {
        const p = c.people[i];
        return `<div class="card"><h2>${esc(name(i))}</h2>
          <div class="kv"><span>Dagar</span><span>${p.sick} + ${p.low} (ca ${num1(p.months)} månader)</span></div>
          <div class="kv"><span>Ersättning per dag, sjukpenningnivå</span><span>${kr(p.daily)}</span></div>
          <div class="kv"><span>Total ersättning före skatt</span><span>${kr(p.benefit)}</span></div>
          <div class="kv"><strong>Förlorad inkomst före skatt</strong><strong>${kr(p.loss)}</strong></div></div>`;
      };
      return `${card(0)}${card(1)}
        <div class="card"><div class="kv"><strong>Hushållets förlust totalt</strong><strong>${kr(c.totalLoss)}</strong></div>
          <p class="muted" style="margin:6px 0 0">Jämför ersättning med bruttolön för samma tid. Faktorn 0,97 i dagbeloppet står inte på Försäkringskassans sida men ger det bekräftade maxbeloppet. Föräldralön från arbetsgivare, skatt, pension, karriär och barnets behov ingår inte. Den som tjänar över taket förlorar mest per dag.</p></div>`;
    }

    function viewCare(s) {
      return `<div class="card">${f("Hushållets inkomst före skatt (kr per månad)", 'data-s="householdGross"', s.householdGross, "0", "Räkna båda. Ogifta räknas som make om de har eller har haft gemensamt barn eller är folkbokförda på samma adress (förordning 2001:160, 4 §).")}</div>
        <div id="care-result">${careResult(s)}</div>
        <div class="card"><ul>
          <li>Maxtaxa från 1 juli 2026: förskola ${maxtaxaText()}. Fritidshem ${BR.maxtaxa.fritids.map((p) => Math.round(p * 100) + " %").join(", ")}.</li>
          <li>${kr(BR.maxtaxa.deduction)} dras av från hushållets inkomst, och avgiften räknas på högst ${kr(BR.maxtaxa.basisCap)} därefter.</li>
          <li>Kommunen kan ta lägre avgift. Kostnad utöver maxtaxan har inte verifierats.</li>
          <li>Förskola är inte obligatorisk. Allmän förskola ger 525 avgiftsfria timmar per år från hösten det år barnet fyller 3 (sekundär källa). Grundskola och skolmåltider är avgiftsfria.</li></ul></div>`;
    }

    function careResult(s) {
      const enrolled = s.children.filter((c) => c.care !== "none");
      if (!enrolled.length) return `<div class="warn">Välj förskola eller fritidshem för något barn under Kostnad.</div>`;
      if (num(s.householdGross) <= 0) return `<div class="warn">Fyll i hushållets inkomst.</div>`;
      const t = maxtaxa(s.children, s.householdGross);
      return `<div class="card"><h2>Avgift per månad</h2>
        ${t.rows.map((r) => `<div class="kv"><span>${esc(r.child.name || "Barn")} (${CARE[r.child.care]}, barn ${r.order}, ${Math.round(r.pct * 100)} %)</span><span>${kr(r.fee)}</span></div>`).join("")}
        <div class="kv"><strong>Totalt</strong><strong>${kr(t.total)}</strong></div>
        <p class="muted" style="margin-top:6px">Avgiftsgrundande inkomst ${kr(t.basis)}. Yngsta barnet räknas som barn 1 (antagande, ej verifierat).</p></div>`;
    }

    function viewRules() {
      return `<div class="card"><h2>Vårdnad när ni är sambor</h2><ul>
          <li>Gifta har gemensam vårdnad från födseln. Ogifta: modern har ensam vårdnad (föräldrabalken 6 kap. 3 §).</li>
          <li>Faderskapsbekräftelse ger inte automatiskt gemensam vårdnad. Gemensam vårdnad anmäls separat (6 kap. 4 §).</li>
          <li>För barn födda från 2022 kan ogifta bekräfta föräldraskap och ansöka om gemensam vårdnad i Skatteverkets e-tjänst. Båda gör det tillsammans, inom 14 dagar efter födseln.</li>
          <li>Att göra direkt efter födseln: bekräfta faderskap och anmäl gemensam vårdnad.</li></ul></div>
        <div class="card"><h2>Underhåll och arv</h2><ul>
          <li>Föräldrarna betalar underhåll efter barnets behov och deras förmåga, normalt till 18 år och vid skolgång högst till 21 (7 kap. 1 §, läst som sammanfattning).</li>
          <li>Sambor ärver inte varandra, och barn har laglott. Se Sambo och juridik.</li></ul></div>
        <div class="card"><h2>Vård och stöd</h2><ul>
          <li>Tandvård är gratis till och med det år man fyller 19. Unga 20–23 får allmänt tandvårdsbidrag på 600 kr per år.</li>
          <li>Öppen läkarvård är avgiftsfri till 20 år i de flesta regioner. Regionerna bestämmer (1177, sekundär).</li>
          <li>Bostadsbidrag för barnfamiljer finns för låginkomsthushåll, högst 4 200, 5 200 och 6 200 kr för 1, 2 och 3 eller fler barn. Inkomstgränserna är inte verifierade.</li>
          <li>Graviditetspenning för tungt eller riskfyllt arbete: högst 944 kr per dag.</li>
          <li>Ingen barnförsäkring eller hemförsäkring är obligatorisk. Hemförsäkringen gäller normalt hela familjen, men kontrollera villkoren (sekundär).</li></ul></div>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "barn";
    const rerender = () => { app.innerHTML = viewBarn(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-child") {
        s.children.push({ id: uid(), name: "", age: 0, care: "none" });
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.children = s.children.filter((c) => c.id !== t.dataset.del);
        App.save();
        rerender();
      } else if (t.id === "btn-equal") {
        s.sickDaysA = FP.sick / 2;
        s.lowDaysA = FP.low / 2;
        App.save();
        rerender();
      } else if (t.id === "btn-best") {
        const b = bestSplit(s);
        s.sickDaysA = b.sickA;
        s.lowDaysA = b.lowA;
        App.save();
        rerender();
      } else if (t.id === "btn-budget") {
        const c = childCosts(s.children);
        const net = Math.round(Math.max(c.sum + maxtaxa(s.children, s.householdGross).total - allowance(s.children).total, 0));
        const list = App.state.expenses;
        const e = list.find((x) => x.id === "children");
        if (e) { e.amount = net; e.name = "Barn (kostnad minus barnbidrag)"; e.owner = "shared"; }
        else list.push({ id: "children", name: "Barn (kostnad minus barnbidrag)", amount: net, owner: "shared", essential: true });
        App.save();
        const msg = document.getElementById("budget-msg");
        if (msg) msg.textContent = "Lagt till som gemensam, nödvändig utgift. Ändra under Utgifter.";
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset.c) {
        const card = t.closest(".child");
        const c = s.children.find((x) => x.id === card.dataset.id);
        if (!c) return;
        const k = t.dataset.c;
        if (k === "name") c.name = t.value;
        else if (k === "care") c.care = CARE[t.value] ? t.value : "none";
        else c.age = Math.min(Math.max(Math.floor(num(t.value)), 0), 17);
        App.save();
        const out = document.getElementById("cost-result");
        if (out) out.innerHTML = costResult(s);
      } else if (t.dataset.s) {
        s[t.dataset.s] = num(t.value);
        App.save();
        const $ = (id) => document.getElementById(id);
        if ($("leave-result")) $("leave-result").innerHTML = leaveResult(s);
        if ($("care-result")) $("care-result").innerHTML = careResult(s);
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.barn = viewBarn;
    App.moreLinks.push({ title: "Barn", href: "#/barn", desc: "Kostnad, föräldrapenning, barnomsorg, vårdnad" });
    App._barn = { childCosts, allowance, maxtaxa, dailyBenefit, leaveCalc, bestSplit, ageGroup, S };
  });
})();
