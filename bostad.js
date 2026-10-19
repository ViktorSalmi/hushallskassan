// Bostad module: purchase calculator (bostadsrätt first, villa basics) and BRF review.
// Registered through window.AppModules so app.js can load it without knowing about it.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const G = R.brfGuides;
    const EPS = 1e-9;

    const brfDefaults = { area: null, debt: null, saving: null, fee: null, floating: null, planAge: null, commercial: null, raise: null };
    const defaults = () => ({
      tab: "kop",
      type: "brf",
      price: 0,
      down: 0,
      rate: 4,
      stress: 7,
      fee: 0,
      opex: 0,
      maint: 0,
      taxValue: 0,
      existingPantbrev: 0,
      newBrev: 1,
      extra: 0,
      deduct: true,
      brf: Object.assign({}, brfDefaults),
      checks: {},
    });

    function H() {
      const h = UI.fill(App.state.housing, defaults());
      if (h.type !== "villa") h.type = "brf";
      if (h.tab !== "brf") h.tab = "kop";
      return h;
    }

    const pct1 = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE") + " %";
    const incomeNow = () => {
      const c = App.calc();
      return c.totalInc;
    };
    const otherCosts = () =>
      App.state.expenses.filter((e) => e.id !== "housing").reduce((a, e) => a + e.amount, 0) +
      App.state.persons.reduce((a, p) => a + p.pocket, 0);

    // ---------- purchase calculation ----------
    function compute(h, rate) {
      const price = num(h.price);
      const down = num(h.down);
      const loan = Math.max(price - down, 0);
      const ltv = price > 0 ? loan / price : 0;
      const amortRate = ltv > 0.7 + EPS ? V("amortering70") : ltv > 0.5 + EPS ? V("amortering50") : 0;
      const interestY = (loan * rate) / 100;
      const interestM = interestY / 12;
      const amortM = (loan * amortRate) / 12;

      // Interest deduction: assumed split equally over two borrowers, each with their own threshold.
      const half = interestY / 2;
      const dedY = 2 * (V("ranteavdragPct1") * Math.min(half, V("ranteavdragLimit")) + V("ranteavdragPct2") * Math.max(half - V("ranteavdragLimit"), 0));
      const deductM = h.deduct ? dedY / 12 : 0;

      let fixedM;
      let fastighetsavgiftY = 0;
      if (h.type === "brf") {
        fixedM = num(h.fee);
      } else {
        fastighetsavgiftY = Math.min(num(h.taxValue) * V("fastighetsavgiftPct"), V("fastighetsavgiftMax"));
        fixedM = num(h.opex) + num(h.maint) + fastighetsavgiftY / 12;
      }
      const total = interestM + amortM + fixedM - deductM;

      let lagfart = 0;
      let pantbrev = 0;
      if (h.type === "villa") {
        lagfart = V("lagfartPct") * Math.max(price, num(h.taxValue)) + V("lagfartFee");
        const base = Math.floor(Math.max(loan - num(h.existingPantbrev), 0) / 1000) * 1000;
        pantbrev = base > 0 ? V("pantbrevPct") * base + V("pantbrevFee") * Math.max(1, Math.round(num(h.newBrev))) : 0;
      }
      const cash = down + lagfart + pantbrev + num(h.extra);

      const inc = incomeNow();
      const left = inc - otherCosts() - total;
      return { price, down, loan, ltv, amortRate, interestM, amortM, fixedM, deductM, total, lagfart, pantbrev, cash, inc, left, fastighetsavgiftY };
    }

    // ---------- views ----------
    function field(label, key, value, opts) {
      const o = opts || {};
      return `<label for="h-${key}">${label}</label>
        <input id="h-${key}" data-h="${key}" inputmode="decimal" value="${value ? esc(String(value)) : ""}" placeholder="${o.placeholder || "0"}">${o.hint ? `<div class="muted">${o.hint}</div>` : ""}`;
    }

    function viewBostad() {
      const h = H();
      const tabs = `<div class="tabs">
        <button data-tab="kop" role="tab" class="${h.tab === "kop" ? "primary" : ""}">Köpekalkyl</button>
        <button data-tab="brf" role="tab" class="${h.tab === "brf" ? "primary" : ""}">BRF-granskning</button>
      </div>`;
      return `<h1>Bostad</h1>
        <p class="muted">Räkna på ett köp och granska föreningen. Egna kalkyler, inte en bankoffert.</p>
        ${tabs}${h.tab === "kop" ? viewBuy(h) : viewBrf(h)}`;
    }

    function viewBuy(h) {
      const downPct = num(h.price) > 0 ? (num(h.down) / num(h.price)) * 100 : 0;
      const brfFields = field("Månadsavgift (kr)", "fee", h.fee, { hint: "Från mäklarens annons eller föreningens årsredovisning." });
      const villaFields =
        field("Taxeringsvärde (kr)", "taxValue", h.taxValue, { hint: `Ger fastighetsavgift (${Math.round(V("fastighetsavgiftPct") * 10000) / 100} %, tak ${kr(V("fastighetsavgiftMax"))} per år) och påverkar lagfarten.` }) +
        field("Drift per månad (kr): el, vatten, sophämtning, försäkring", "opex", h.opex) +
        field("Underhållsreserv per månad (kr)", "maint", h.maint, { hint: "Tumregel varierar mycket mellan hus. Räkna hellre högt." }) +
        field("Befintliga pantbrev som följer med (kr)", "existingPantbrev", h.existingPantbrev, { hint: "Övertagna pantbrev kostar normalt inget. Det är inte verifierat i Lantmäteriets text." }) +
        field("Antal nya pantbrev", "newBrev", h.newBrev, { placeholder: "1" });
      return `
        <div class="card">
          <label for="h-type">Typ av bostad</label>
          <select id="h-type" data-h="type">
            <option value="brf" ${h.type === "brf" ? "selected" : ""}>Bostadsrätt</option>
            <option value="villa" ${h.type === "villa" ? "selected" : ""}>Villa (grundläggande)</option>
          </select>
          ${field("Pris (kr)", "price", h.price)}
          ${field("Kontantinsats (kr)", "down", h.down)}
          <div class="muted" id="down-pct">${pct1(downPct)} av priset. Minst ${Math.round((1 - V("bolanetak")) * 100)} % krävs.</div>
          ${h.type === "brf" ? brfFields : villaFields}
          ${field("Övriga engångskostnader (kr)", "extra", h.extra, { hint: "Besiktning, flytt, pantsättningsavgift, renovering. Pantsättningsavgift tas bara ut om stadgarna anger den." })}
        </div>
        <div class="card">
          <h2>Ränta</h2>
          <div class="row">
            <input type="range" min="0" max="10" step="0.1" data-h="rate" value="${num(h.rate)}" aria-label="Ränta, reglage">
            <input data-h="rate" inputmode="decimal" value="${String(num(h.rate)).replace(".", ",")}" class="fixed" style="width:84px" aria-label="Ränta i procent">
          </div>
          <p class="muted" style="margin-top:8px">Din egen antagna ränta. Referens (kontrollerad ${esc(R.market.checked)}): rörlig ${R.market.floating.toLocaleString("sv-SE")} %, bunden 1–5 år ${R.market.fixed1to5.toLocaleString("sv-SE")} % och styrräntan ${R.market.policyRate.toLocaleString("sv-SE")} %.</p>
          <label for="h-stress">Stresstest-ränta (%)</label>
          <input id="h-stress" data-h="stress" inputmode="decimal" value="${String(num(h.stress)).replace(".", ",")}">
          <p class="muted" style="margin-top:6px">Banker räknar ofta med 6–7 %. FI har ingen regel om kalkylränta.</p>
          <label style="display:flex;gap:10px;align-items:center;color:var(--text);font-size:1rem">
            <input type="checkbox" data-h="deduct" ${h.deduct ? "checked" : ""} style="width:auto;min-height:0">
            Räkna med ränteavdrag
          </label>
        </div>
        <div id="bostad-result">${buyResult(h)}</div>
        <div class="card">
          <h2>Sambo: avgör innan ni köper</h2>
          <ul>
            <li>Bara den som står på köpehandlingen (eller lagfarten för villa) äger. Sambolagens bodelning ändrar inte ägandet.</li>
            <li>Står ni båda på lånet blir ni solidariskt betalningsansvariga för hela skulden.</li>
            <li>Sambor ärver inte varandra. Utan testamente ärver barn och släkt. Efterlevande sambo kan vid bodelning få ut egendom upp till två prisbasbelopp (högst ${kr(2 * V("prisbasbelopp"))} för dödsfall 2026), i mån av tillgångar efter skulder.</li>
            <li>Skriv ägarandelar och insatser. Ett samboavtal om bostaden ska vara skriftligt och undertecknat.</li>
          </ul>
        </div>`;
    }

    function buyResult(h) {
      const r = compute(h, num(h.rate));
      const s = compute(h, num(h.stress));
      if (r.price <= 0) return `<div class="warn">Fyll i pris och kontantinsats.</div>`;
      const warns = [];
      if (r.ltv > V("bolanetak") + EPS) warns.push(`Kontantinsatsen är för låg. Bolånetaket är ${Math.round(V("bolanetak") * 100)} %, så minst ${kr(r.price * (1 - V("bolanetak")))} krävs.`);
      if (r.inc === 0) warns.push("Fyll i inkomster under Hushåll för att se vad som blir kvar.");
      if (r.left < 0) warns.push(`Utgifterna överstiger inkomsterna med ${kr(-r.left)} per månad vid vald ränta.`);
      else if (s.left < 0) warns.push(`Vid stresstest-räntan blir det ${kr(-s.left)} i minus per månad.`);
      const warnHtml = warns.map((w) => `<div class="warn">${esc(w)}</div>`).join("");

      const amortTxt = r.amortRate > 0 ? `${r.amortRate * 100} % per år (lagens minimum)` : "Inget krav vid belåning på 50 % eller lägre";
      const rows = [
        ["Lån", kr(r.loan)],
        ["Belåningsgrad", pct1(r.ltv * 100)],
        ["Ränta", kr(r.interestM)],
        ["Amortering", kr(r.amortM)],
        [h.type === "brf" ? "Månadsavgift" : "Drift, underhåll och fastighetsavgift", kr(r.fixedM)],
        ["Ränteavdrag", r.deductM > 0 ? "-" + kr(r.deductM) : kr(0)],
      ]
        .map(([a, b]) => `<div class="kv"><span>${a}</span><span>${b}</span></div>`)
        .join("");

      const scenarios = [2, 3, 4, 5, 6, 7, 8]
        .map((rt) => {
          const x = compute(h, rt);
          const cur = Math.abs(rt - num(h.rate)) < 0.05;
          return `<tr${cur ? ' style="font-weight:700"' : ""}><td>${rt} %</td><td style="text-align:right">${kr(x.total)}</td><td style="text-align:right" class="${x.left < 0 ? "neg" : ""}">${x.inc ? kr(x.left) : "–"}</td></tr>`;
        })
        .join("");

      const cashRows = [["Kontantinsats", r.down]];
      if (h.type === "villa") cashRows.push(["Lagfart", r.lagfart], ["Pantbrev", r.pantbrev]);
      cashRows.push(["Övrigt", num(h.extra)]);

      return `${warnHtml}
        <div class="card">
          <div class="muted">Boendekostnad per månad vid ${pct1(num(h.rate))} ränta</div>
          <div class="big">${kr(r.total)}</div>
          ${r.inc ? `<div class="muted">${pct1((r.total / r.inc) * 100)} av hushållets inkomst. Kvar efter övriga utgifter: <strong class="${r.left < 0 ? "neg" : ""}">${kr(r.left)}</strong></div>` : ""}
          <div style="margin-top:8px">${rows}</div>
          <div class="muted">Amortering: ${amortTxt}. Banken kan kräva mer.</div>
          <button id="btn-budget" class="primary" style="margin-top:10px;width:100%">Lägg boendekostnaden i Utgifter</button>
          <p id="budget-msg" class="muted" style="margin-top:6px"></p>
        </div>
        <div class="card">
          <h2>Stresstest vid ${pct1(num(h.stress))}</h2>
          <div class="kv"><span>Boendekostnad per månad</span><span>${kr(s.total)}</span></div>
          ${s.inc ? `<div class="kv"><strong>Kvar per månad</strong><strong class="${s.left < 0 ? "neg" : ""}">${kr(s.left)}</strong></div>` : ""}
        </div>
        <div class="card">
          <h2>Olika räntor</h2>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr class="muted"><th style="text-align:left;font-weight:400">Ränta</th><th style="text-align:right;font-weight:400">Boende/mån</th><th style="text-align:right;font-weight:400">Kvar/mån</th></tr></thead>
            <tbody>${scenarios}</tbody>
          </table>
        </div>
        <div class="card">
          <h2>Det här behöver du ha på kontot</h2>
          ${cashRows.map(([a, b]) => `<div class="kv"><span>${a}</span><span>${kr(b)}</span></div>`).join("")}
          <div class="kv"><strong>Totalt</strong><strong>${kr(r.cash)}</strong></div>
          <p class="muted" style="margin-top:6px">Mäklararvodet betalas av säljaren. Bostadsrättens överlåtelseavgift avgörs av stadgarna.${h.type === "villa" ? " Lagfarten räknas på det högre av pris och taxeringsvärde (ej bekräftat på Lantmäteriets sida)." : ""}</p>
        </div>
        <p class="muted">Ränteavdraget antas fördelat lika på två låntagare och kan bli lägre om skatten inte räcker. Kalkylen visar inte vad en bank skulle bevilja.</p>`;
    }

    // ---------- BRF review ----------
    function brfResult(h) {
      const b = h.brf;
      const items = [];
      const add = (lv, label, text) => items.push({ lv, label, text });
      if (b.debt !== null) {
        if (b.debt > G.debtBad) add("bad", `Skuld ${kr(b.debt)}/kvm`, "Mycket hög skuldsättning enligt branschens riktmärken.");
        else if (b.debt > G.debtOk) add("warn", `Skuld ${kr(b.debt)}/kvm`, "Hög skuldsättning. Ränteläget påverkar avgiften mycket.");
        else add("ok", `Skuld ${kr(b.debt)}/kvm`, "Låg till normal skuldsättning.");
      }
      if (b.saving !== null) {
        if (b.saving < G.savingBad) add("bad", `Sparande ${kr(b.saving)}/kvm`, "Mycket lågt. Risk för avgiftshöjning eller lån när underhåll kommer.");
        else if (b.saving < G.savingOk) add("warn", `Sparande ${kr(b.saving)}/kvm`, "Lågt till medel. Jämför mot underhållsplanens behov.");
        else add("ok", `Sparande ${kr(b.saving)}/kvm`, "Medel till högt. Jämför ändå mot underhållsplanens behov.");
      }
      if (b.raise !== null && b.raise > G.feeRaiseWarn) add("warn", `Avgiftshöjning ${pct1(b.raise)} per år`, `Över ${G.feeRaiseWarn} % per år. Fråga vad som driver höjningen och vad som kommer.`);
      if (b.floating !== null && b.floating > G.floatingWarn) add("warn", `Rörlig ränta på ${pct1(b.floating)} av lånen`, "Hög andel rörlig ränta ger snabbare effekt på avgiften när räntan stiger.");
      if (b.planAge !== null && b.planAge > G.planOldYears) add("warn", `Underhållsplan ${b.planAge} år gammal`, "Gammal plan. Begär en uppdaterad och se vad som är finansierat.");
      if (b.commercial !== null && b.commercial > G.commercialWarn) add("warn", `Lokalintäkter ${pct1(b.commercial)}`, "Stor del av intäkterna beror på lokalhyresgäster.");

      const list = items.length
        ? items
            .map((i) => {
              return `<div class="module"><div><strong>${esc(i.label)}</strong><br><span class="muted">${esc(i.text)}</span></div>${UI.chip(i.lv)}</div>`;
            })
            .join("")
        : `<p class="muted">Fyll i nyckeltal från årsredovisningen ovan.</p>`;

      let sens = "";
      if (b.debt !== null && b.area !== null && b.area > 0) {
        const perPoint = (b.debt * b.area * 0.01) / 12;
        sens = `<div class="card"><h2>Räntekänslighet för din lägenhet</h2>
          <div class="kv"><span>+1 procentenhet</span><span>${kr(perPoint)}/mån</span></div>
          <div class="kv"><span>+2 procentenheter</span><span>${kr(perPoint * 2)}/mån</span></div>
          <p class="muted" style="margin-top:6px">Skuld per kvm × din yta × räntechocken. Förenklad uträkning: en förening kan ha räknat skulden på en annan yta än din.</p></div>`;
      }
      let fee = "";
      if (b.fee !== null && b.area !== null && b.area > 0) {
        const m = Math.round((b.fee * b.area) / 12);
        fee = `<div class="card"><h2>Avgift för din lägenhet</h2>
          <div class="kv"><span>Årsavgift per kvm × yta</span><span>${kr(m)}/mån</span></div>
          <button id="btn-usefee" style="margin-top:8px;width:100%">Använd som månadsavgift i köpekalkylen</button>
          <p id="fee-msg" class="muted" style="margin-top:6px"></p></div>`;
      }
      return `<div class="card"><h2>Bedömning</h2>${list}
        <p class="muted" style="margin-top:8px">Riktmärken från branschen, inte lag. Inga officiella trösklar finns hos Boverket eller BFN. Kontrollerade ${esc(G.checked)}.</p></div>${sens}${fee}`;
    }

    const checklist = [
      "Läst de tre senaste årsredovisningarna, inte bara den senaste",
      "Teknisk underhållsplan finns, är uppdaterad och visar vad som är finansierat",
      "Stambyte, fasad, tak eller fönster planerat eller nyligen gjort? Hur finansieras det?",
      "Lånen: bindningstider, andel rörlig ränta och när stora lån förfaller",
      "Räntekänslighet och sparande per kvm jämförda med liknande föreningar",
      "Negativt kassaflöde eller revisionsanmärkning i någon av åren?",
      "Tomträtt? När omförhandlas avgälden och till vad?",
      "Nyproduktion: ekonomiska planen är inte bindande. Vad säger intygsgivarna? Avgiftsfria år är uppskjuten kostnad",
      "Stadgarna: regler för andrahandsuthyrning och renovering",
      "Pantsättnings- och överlåtelseavgift enligt stadgarna, och vem som betalar",
      "Andel lokaler och vilka hyresgäster som finns",
      "Planerade avgiftshöjningar kommande 2–3 år",
      "Vem står på köpehandlingen och lånet? Ägarandelar och samboavtal klara?",
    ];

    function viewBrf(h) {
      const b = h.brf;
      const f = (label, key, hint) => `<label for="b-${key}">${label}</label>
        <input id="b-${key}" data-b="${key}" inputmode="decimal" value="${b[key] === null || b[key] === undefined ? "" : esc(String(b[key]))}" placeholder="Okänt">${hint ? `<div class="muted">${hint}</div>` : ""}`;
      return `<div class="card">
          <h2>Nyckeltal ur årsredovisningen</h2>
          <p class="muted">Lämna tomt det du inte vet. Skuld, sparande och energi räknas på alla kvm i föreningen, årsavgift på bostadsrättsytan. Jämför på samma yta.</p>
          ${f("Din lägenhets yta (kvm)", "area")}
          ${f("Skuld per kvm (kr)", "debt")}
          ${f("Sparande per kvm (kr)", "saving")}
          ${f("Årsavgift per kvm (kr)", "fee")}
          ${f("Andel rörlig ränta av lånen (%)", "floating")}
          ${f("Underhållsplanens ålder (år)", "planAge")}
          ${f("Lokalintäkter av totala intäkter (%)", "commercial")}
          ${f("Avgiftshöjning per år (%)", "raise", "Senaste eller aviserad.")}
        </div>
        <div id="brf-result">${brfResult(h)}</div>
        <div class="card">
          <h2>Frågor att ställa</h2>
          ${checklist
            .map((t, i) => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:1rem;margin:8px 0"><input type="checkbox" data-check="${i}" ${h.checks[i] ? "checked" : ""} style="width:auto;min-height:0;margin-top:4px"><span>${esc(t)}</span></label>`)
            .join("")}
        </div>`;
    }

    // ---------- events ----------
    const rerender = () => {
      app.innerHTML = viewBostad();
    };
    const active = () => App.route() === "bostad";

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const h = H();
      if (t.dataset && t.dataset.tab) {
        h.tab = t.dataset.tab;
        App.save();
        rerender();
      } else if (t.id === "btn-budget") {
        const total = Math.round(compute(h, num(h.rate)).total);
        const list = App.state.expenses;
        const e = list.find((x) => x.id === "housing");
        if (e) { e.amount = total; e.name = "Boende (från Bostad)"; e.owner = "shared"; }
        else list.push({ id: "housing", name: "Boende (från Bostad)", amount: total, owner: "shared" });
        App.save();
        document.getElementById("bostad-result").innerHTML = buyResult(h);
        const m2 = document.getElementById("budget-msg");
        if (m2) m2.textContent = "Lagt till som gemensam utgift. Ändra eller ta bort den under Utgifter.";
      } else if (t.id === "btn-usefee") {
        const b = h.brf;
        h.fee = Math.round((b.fee * b.area) / 12);
        App.save();
        const msg = document.getElementById("fee-msg");
        if (msg) msg.textContent = `Månadsavgiften ${kr(h.fee)} är satt i köpekalkylen.`;
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const h = H();
      if (t.dataset.h) {
        const k = t.dataset.h;
        if (k === "type") {
          h.type = t.value === "villa" ? "villa" : "brf";
          App.save();
          rerender();
          return;
        }
        if (k === "deduct") h.deduct = t.checked;
        else if (k === "rate" || k === "stress") {
          h[k] = Math.min(num(t.value), 20);
          if (num(t.value) > 20 && t.type !== "range") t.value = String(h[k]);
        }
        else h[k] = num(t.value);
        App.save();
        if (k === "rate") {
          app.querySelectorAll('[data-h="rate"]').forEach((el) => {
            if (el !== t) el.value = el.type === "range" ? h.rate : String(h.rate).replace(".", ",");
          });
        }
        const pct = document.getElementById("down-pct");
        if (pct) pct.textContent = `${pct1(num(h.price) > 0 ? (num(h.down) / num(h.price)) * 100 : 0)} av priset. Minst ${Math.round((1 - V("bolanetak")) * 100)} % krävs.`;
        document.getElementById("bostad-result").innerHTML = buyResult(h);
      } else if (t.dataset.b) {
        h.brf[t.dataset.b] = t.value.trim() === "" ? null : num(t.value);
        App.save();
        document.getElementById("brf-result").innerHTML = brfResult(h);
      } else if (t.dataset.check !== undefined) {
        h.checks[t.dataset.check] = t.checked;
        App.save();
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", (ev) => {
      if (ev.target.dataset && (ev.target.dataset.h === "type" || ev.target.dataset.h === "deduct" || ev.target.dataset.check !== undefined)) onInput(ev);
    });

    App.views.bostad = viewBostad;

    // exposed for tests
    App._bostad = { compute, H };
  });
})();
