// Buffert och sparande module: emergency fund, savings goals, priorities and ISK.
// Values come from rules.js; calculations are simplified and not financial advice.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const V = (k) => R.values[k].value;
    const SP = R.sparande;
    const TABS = [["buffert", "Buffert"], ["mal", "Sparmål"], ["prio", "Prioritet"], ["isk", "ISK"]];

    const defaults = () => ({
      tab: "buffert",
      months: 3,
      have: 0,
      lossWho: 0,
      lossIncome: null,
      goals: [],
      goalRate: 2,
      loanRate: null,
      returnRate: 4,
      iskA: 0,
      iskB: 0,
      iskReturn: 5,
      bankRate: 2,
    });

    function S() {
      const s = App.state.sparande;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "buffert";
      s.goals = UI.objs(s.goals).map((g) => ({
        id: UI.safeId(g.id),
        name: String(g.name || ""),
        target: num(g.target),
        saved: num(g.saved),
        date: /^\d{4}-\d{2}$/.test(g.date || "") ? g.date : "",
      }));
      return s;
    }

    const pct = (n) => (Math.round(n * 100) / 100).toLocaleString("sv-SE") + " %";
    const num1 = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE");
    const name = (i) => App.pname(i);

    // ---------- calculations ----------
    function monthsUntil(ym, now) {
      const [y, m] = ym.split("-").map(Number);
      const d = now || new Date();
      return Math.max((y - d.getFullYear()) * 12 + (m - 1 - d.getMonth()), 1);
    }

    // Monthly deposit needed to reach `target` in `n` months from `saved`, with annual rate `r` percent.
    function monthlyNeeded(target, saved, n, r) {
      const i = r / 100 / 12;
      if (i === 0) return Math.max(target - saved, 0) / n;
      const f = Math.pow(1 + i, n);
      return Math.max(((target - saved * f) * i) / (f - 1), 0);
    }

    function bufferCalc(s) {
      const c = App.calc();
      const essential = c.essential;
      const goal = essential * num(s.months);
      const have = num(s.have);
      const covers = essential > 0 ? have / essential : 0;
      return { essential, goal, have, gap: Math.max(goal - have, 0), covers, c };
    }

    function lossCalc(s, b) {
      const w = s.lossWho === 1 ? 1 : 0;
      const income = b.c.inc;
      const other = income[1 - w];
      const during = s.lossIncome === null || s.lossIncome === undefined ? null : num(s.lossIncome);
      if (during === null) return null;
      const available = other + during;
      const gap = Math.max(b.essential - available, 0);
      return { w, available, gap, months: gap > 0 ? b.have / gap : Infinity };
    }

    // ---------- views ----------
    function viewSparande() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { buffert: viewBuffer, mal: viewGoals, prio: viewPrio, isk: viewIsk }[s.tab](s);
      return `<h1>Buffert och sparande</h1>
        <p class="muted">Förenklade kalkyler, inte finansiell rådgivning.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewSparande.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(SP.checked)}.</p>
        <ul class="muted">${SP.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${SP.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const field = (label, attr, v, ph, hint) => `<label>${label}</label><input ${attr} inputmode="decimal" value="${UI.fv(v, attr)}" placeholder="${ph || "0"}">${hint ? `<div class="muted">${hint}</div>` : ""}`;

    function viewBuffer(s) {
      return `<div class="card">
          ${field("Antal månader buffert", 'data-s="months"', s.months, "3", `Finansinspektionen anger ${V("bufferMin")}–${V("bufferMax")} månaders nödvändiga utgifter. Större behov kan finnas, t.ex. med eget hus eller osäker inkomst.`)}
          ${field("Det ni har i buffert (kr)", 'data-s="have"', s.have)}
        </div>
        <div id="buffer-result">${bufferResult(s)}</div>`;
    }

    function bufferResult(s) {
      const b = bufferCalc(s);
      if (b.essential <= 0) return `<div class="warn">Lägg in utgifter under Utgifter och markera de som är nödvändiga.</div>`;
      const loss = lossCalc(s, b);
      const lossHtml = loss
        ? `<div class="kv"><span>Hushållets inkomst under bortfallet</span><span>${kr(loss.available)}</span></div>
           <div class="kv"><span>Underskott per månad (nödvändiga utgifter)</span><span class="${loss.gap > 0 ? "neg" : ""}">${kr(loss.gap)}</span></div>
           <div class="kv"><strong>Bufferten räcker</strong><strong>${loss.gap > 0 ? num1(loss.months) + " månader" : "inget underskott"}</strong></div>`
        : `<p class="muted">Fyll i inkomsten under bortfallet för att se hur länge bufferten räcker.</p>`;
      const nettoA = b.c.inc[s.lossWho === 1 ? 1 : 0];
      return `<div class="card">
          <div class="muted">Buffertmål (${num(s.months)} månader av nödvändiga utgifter)</div>
          <div class="big">${kr(b.goal)}</div>
          ${UI.meter(b.have, b.goal, { label: "Buffert uppnådd", severity: b.have >= b.goal ? "accent" : b.covers < 1 ? "bad" : "warn" })}
          <div class="muted">Nödvändiga utgifter: ${kr(b.essential)} per månad.</div>
          <div class="kv" style="margin-top:8px"><span>Ni har</span><span>${kr(b.have)} (${num1(b.covers)} månader)</span></div>
          <div class="kv"><strong>Saknas</strong><strong class="${b.gap > 0 ? "neg" : ""}">${kr(b.gap)}</strong></div>
        </div>
        <div class="card">
          <h2>Om inkomsten faller bort</h2>
          <label>Vem tappar inkomst?</label>
          <select data-s="lossWho"><option value="0" ${s.lossWho === 0 ? "selected" : ""}>${esc(name(0))}</option><option value="1" ${s.lossWho === 1 ? "selected" : ""}>${esc(name(1))}</option></select>
          ${field("Inkomst efter skatt under bortfallet (kr/mån)", 'data-s="lossIncome"', s.lossIncome, "0", `A-kassan är högst ${Math.round(V("akassaNiva") * 100)} % av ${kr(V("akassaTak"))}, alltså ${kr(V("akassaNiva") * V("akassaTak"))} före skatt, första tiden och vid minst 12 månaders medlemskap. Nivån trappas ner senare (detaljerna är inte verifierade). Ersättningen beskattas.`)}
          <button id="btn-estimate" style="margin-top:8px;width:100%">Grov uppskattning: ${Math.round(V("akassaNiva") * 100)} % av ${esc(name(s.lossWho === 1 ? 1 : 0))}s nettoinkomst (${kr(nettoA * V("akassaNiva"))})</button>
          <div style="margin-top:10px">${lossHtml}</div>
        </div>`;
    }

    function goalCard(g) {
      return `<div class="card goal" data-id="${g.id}">
        <input data-g="name" value="${esc(g.name)}" placeholder="Mål (t.ex. Kontantinsats)" aria-label="Namn" autocomplete="off">
        <div class="grid2">
          <div>${field("Målbelopp (kr)", 'data-g="target"', g.target)}</div>
          <div>${field("Redan sparat (kr)", 'data-g="saved"', g.saved)}</div>
        </div>
        <label>Klart senast</label>
        <input type="month" data-g="date" value="${esc(g.date)}">
        <div class="muted" data-goal-out style="margin-top:8px">${goalOut(g, S().goalRate)}</div>
        <button class="danger" data-del="${g.id}" style="margin-top:6px">Ta bort</button>
      </div>`;
    }

    function goalOut(g, rate) {
      const bar = g.target > 0 ? UI.meter(g.saved, g.target, { label: "Sparat av målet" }) : "";
      if (g.target <= 0 || !g.date) return bar + "Fyll i målbelopp och datum.";
      if (g.saved >= g.target) return bar + "Målet är redan nått.";
      const n = monthsUntil(g.date);
      return `${bar}Sparas ${kr(monthlyNeeded(g.target, g.saved, n, rate))} per månad i ${n} månader.`;
    }

    function viewGoals(s) {
      return `<div class="card">
          ${field("Antagen sparränta per år (%)", 'data-s="goalRate"', s.goalRate, "0", "Din egen antagna ränta, inte en utfästelse. 0 ger enkel division.")}
        </div>
        ${s.goals.map(goalCard).join("")}
        <button id="btn-add-goal" class="primary" style="width:100%">+ Lägg till mål</button>
        <div id="goal-total">${goalTotal(s)}</div>`;
    }

    function goalTotal(s) {
      const rows = s.goals.filter((g) => g.target > 0 && g.date && g.saved < g.target);
      if (!rows.length) return "";
      const total = rows.reduce((a, g) => a + monthlyNeeded(g.target, g.saved, monthsUntil(g.date), s.goalRate), 0);
      const c = App.calc();
      const inc = c.inc;
      const sum = inc[0] + inc[1];
      const split = sum > 0 ? [total * inc[0] / sum, total * inc[1] / sum] : [total / 2, total / 2];
      const diff = c.totalLeft - total;
      return `<div class="card" style="margin-top:12px"><h2>Allt tillsammans</h2>
        <div class="kv"><span>Månadssparande som krävs</span><strong>${kr(total)}</strong></div>
        <div class="kv"><span>Kvar att spara enligt Översikt</span><span class="${c.totalLeft < 0 ? "neg" : ""}">${kr(c.totalLeft)}</span></div>
        <div class="kv"><strong>${diff >= 0 ? "Marginal" : "Saknas"}</strong><strong class="${diff < 0 ? "neg" : ""}">${kr(Math.abs(diff))}</strong></div>
        <p class="muted" style="margin-top:6px">Delat efter inkomst: ${esc(name(0))} ${kr(split[0])}, ${esc(name(1))} ${kr(split[1])}. Välj annan fördelning om ni vill.</p></div>`;
    }

    function viewPrio(s) {
      const h = App.state.housing || {};
      const loanRate = s.loanRate !== null && s.loanRate !== undefined ? num(s.loanRate) : num(h.rate) || 0;
      const afterDeduct = loanRate * (1 - V("ranteavdragPct1"));
      const ret = num(s.returnRate);
      const netReturn = ret - V("iskRate") * V("kapitalskatt") * 100;
      const better = afterDeduct > netReturn ? "amort" : "spara";
      const c = App.calc();
      const inc = c.inc[0] + c.inc[1];
      const parts = [];
      if (inc > 0) {
        const housing = App.state.expenses.filter((e) => e.id === "housing").reduce((a, e) => a + e.amount, 0);
        const pocket = App.state.persons.reduce((a, p) => a + p.pocket, 0);
        const others = Math.max(c.shared + c.own[0] + c.own[1] - pocket - housing, 0);
        parts.push(["Boende (från Bostad)", housing], ["Övriga utgifter", others], ["Fickpengar", pocket], ["Kvar att spara", c.totalLeft]);
      }
      const steps = [
        ["1. Buffert", `Börja med ${V("bufferMin")}–${V("bufferMax")} månaders nödvändiga utgifter (Finansinspektionen).`, "Råd"],
        ["2. Dyra lån", "Kredit och blancolån har hög ränta, och från inkomståret 2026 ges inget ränteavdrag för lån utan säkerhet (Skatteverket). Betala av dem först.", "Råd"],
        ["3. Amortera eller spara", "Se kalkylen nedan. Lagens amorteringskrav är ett golv, och du kan amortera mer.", "Råd"],
        ["4. Långsiktigt sparande", "Fonder, ISK och annat för mål långt fram. Se fliken ISK.", "Råd"],
      ];
      return `<div class="card">${steps.map(([t, d, k]) => `<div class="module" style="display:block"><div style="display:flex;justify-content:space-between"><strong>${esc(t)}</strong><span class="tag">${k}</span></div><div class="muted">${esc(d)}</div></div>`).join("")}</div>
        <div class="card"><h2>Amortera eller spara?</h2>
          ${field("Lånets ränta (%)", 'data-s="loanRate"', s.loanRate !== null && s.loanRate !== undefined ? s.loanRate : h.rate || "", "0", "Hämtas från Bostad om du fyllt i den.")}
          ${field("Antagen avkastning på sparande per år (%)", 'data-s="returnRate"', s.returnRate, "4", "Din egen gissning. Avkastning är inte garanterad och kan bli negativ.")}
          <div id="prio-result" style="margin-top:10px">${prioResult(loanRate, afterDeduct, ret, netReturn, better)}</div>
        </div>
        ${parts.length ? `<div class="card"><h2>Så fördelas era pengar</h2>${parts.map(([a, b]) => `<div class="kv"><span>${a}</span><span>${kr(b)} (${pct((b / inc) * 100)})</span></div>`).join("")}<p class="muted" style="margin-top:6px">Andel av nettoinkomsten. Ingen norm är bevisad, så appen dömer inte fördelningen.</p></div>` : ""}`;
    }

    function prioResult(loanRate, afterDeduct, ret, netReturn, better) {
      return `<div class="kv"><span>Lånets kostnad efter ränteavdrag (${Math.round(V("ranteavdragPct1") * 100)} %)</span><span>${pct(afterDeduct)}</span></div>
        <div class="kv"><span>Sparandets avkastning efter ISK-skatt (vid kapital över grundnivån)</span><span>${pct(netReturn)}</span></div>
        <p style="margin:8px 0 0"><strong>${better === "amort" ? "Amortering ger i den här kalkylen högre och säker avkastning." : "Sparande kan ge mer i den här kalkylen, men med risk."}</strong></p>
        <p class="muted" style="margin:6px 0 0">Förenklat: ränteavdraget förutsätter att räntan ryms inom avdragsgränsen, och avgifter ingår inte. Pengar som amorterats går inte lätt att ta ut igen. Extra amortering kostar normalt inget, utom ränteskillnadsersättning vid bunden ränta.</p>`;
    }

    function viewIsk(s) {
      return `<div class="card">
          ${field(esc(name(0)) + "s kapitalunderlag (kr)", 'data-s="iskA"', s.iskA, "0", "Kontots värde vid ingången av varje kvartal plus insättningar, delat med fyra.")}
          ${field(esc(name(1)) + "s kapitalunderlag (kr)", 'data-s="iskB"', s.iskB)}
          ${field("Antagen avkastning på ISK (%)", 'data-s="iskReturn"', s.iskReturn, "5")}
          ${field("Ränta på sparkonto (%)", 'data-s="bankRate"', s.bankRate, "2")}
        </div>
        <div id="isk-result">${iskResult(s)}</div>`;
    }

    function iskTax(under) {
      return Math.max(under - V("iskGrund"), 0) * V("iskRate") * V("kapitalskatt");
    }

    function iskResult(s) {
      const under = [num(s.iskA), num(s.iskB)];
      if (under[0] + under[1] <= 0) return `<div class="warn">Fyll i kapitalunderlag.</div>`;
      const gross = (u, r) => (u * r) / 100;
      const rows = [0, 1].map((i) => {
        const tax = iskTax(under[i]);
        const iskNet = gross(under[i], num(s.iskReturn)) - tax;
        const bankNet = gross(under[i], num(s.bankRate)) * (1 - V("kapitalskatt"));
        const over = under[i] > V("insattningsgaranti");
        return `<div class="card"><h2>${esc(name(i))}</h2>
          <div class="kv"><span>ISK-skatt per år</span><strong>${kr(tax)}</strong></div>
          <div class="kv"><span>Effektiv skatt på kapitalunderlaget</span><span>${under[i] > 0 ? pct((tax / under[i]) * 100) : "–"}</span></div>
          <div class="kv"><span>ISK efter skatt (avkastning ${pct(num(s.iskReturn))})</span><span>${kr(iskNet)}</span></div>
          <div class="kv"><span>Sparkonto efter ${Math.round(V("kapitalskatt") * 100)} % skatt (ränta ${pct(num(s.bankRate))})</span><span>${kr(bankNet)}</span></div>
          ${over ? `<p class="warn" style="margin:8px 0 0">Över insättningsgarantin på ${kr(V("insattningsgaranti"))} per person och institut. Gäller pengar på konto, inte värdepapper.</p>` : ""}</div>`;
      });
      return `${rows.join("")}
        <p class="muted">ISK-skatten är 30 % av en schablonintäkt: ${pct(V("iskRate") * 100)} av kapitalunderlaget över ${kr(V("iskGrund"))} grundnivå. Grundnivån är sammanlagd för ISK, kapitalförsäkring och PEPP, och antas gälla per person. Skatten tas ut oavsett om kontot gått plus eller minus. Fondavgifter ingår inte.</p>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "sparande";
    const rerender = () => { app.innerHTML = viewSparande(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-goal") {
        s.goals.push({ id: uid(), name: "", target: 0, saved: 0, date: "" });
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.goals = s.goals.filter((g) => g.id !== t.dataset.del);
        App.save();
        rerender();
      } else if (t.id === "btn-estimate") {
        const w = s.lossWho === 1 ? 1 : 0;
        s.lossIncome = Math.round(App.calc().inc[w] * V("akassaNiva"));
        App.save();
        rerender();
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset.s) {
        const k = t.dataset.s;
        if (k === "lossWho") {
          s.lossWho = Number(t.value) === 1 ? 1 : 0;
          App.save();
          rerender();
          return;
        }
        const nullable = k === "lossIncome" || k === "loanRate";
        s[k] = t.value.trim() === "" && nullable ? null : UI.parse(t.value, { months: 3, returnRate: 4, iskReturn: 5, bankRate: 2 }[k]);
        App.save();
        const $ = (id) => document.getElementById(id);
        if ($("buffer-result") && (k === "months" || k === "have" || k === "lossIncome")) $("buffer-result").innerHTML = bufferResult(s);
        if (k === "goalRate") {
          app.querySelectorAll(".goal").forEach((card) => {
            const g = s.goals.find((x) => x.id === card.dataset.id);
            const out = card.querySelector("[data-goal-out]");
            if (g && out) out.innerHTML = goalOut(g, s.goalRate);
          });
          $("goal-total").innerHTML = goalTotal(s);
        }
        if (k === "loanRate" || k === "returnRate") rerenderPrio();
        if ($("isk-result") && (k === "iskA" || k === "iskB" || k === "iskReturn" || k === "bankRate")) $("isk-result").innerHTML = iskResult(s);
      } else if (t.dataset.g) {
        const card = t.closest(".goal");
        const g = s.goals.find((x) => x.id === card.dataset.id);
        if (!g) return;
        const f = t.dataset.g;
        g[f] = f === "name" || f === "date" ? t.value : num(t.value);
        App.save();
        card.querySelector("[data-goal-out]").innerHTML = goalOut(g, s.goalRate);
        document.getElementById("goal-total").innerHTML = goalTotal(s);
      }
    };

    // The Prioritet result is computed from two inputs; recompute only its result block to keep input focus.
    function rerenderPrio() {
      const s = S();
      const h = App.state.housing || {};
      const loanRate = s.loanRate !== null && s.loanRate !== undefined ? num(s.loanRate) : num(h.rate) || 0;
      const afterDeduct = loanRate * (1 - V("ranteavdragPct1"));
      const netReturn = num(s.returnRate) - V("iskRate") * V("kapitalskatt") * 100;
      const el = document.getElementById("prio-result");
      if (el) el.innerHTML = prioResult(loanRate, afterDeduct, num(s.returnRate), netReturn, afterDeduct > netReturn ? "amort" : "spara");
    }

    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.sparande = viewSparande;
    App.moreLinks.push({ title: "Buffert och sparande", href: "#/sparande", desc: "Buffert, sparmål, prioritetsordning, ISK" });
    App._sparande = { monthlyNeeded, monthsUntil, bufferCalc, lossCalc, iskTax, S };
  });
})();
