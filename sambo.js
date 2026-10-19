// Sambo och juridik module. Facts come from rules.js (R.legal) and are simplified: this is not legal advice.
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const L = R.legal;
    const pbb = () => R.values.prisbasbelopp.value;
    const TABS = [["lage", "Läget"], ["agare", "Äger"], ["sep", "Separation"], ["dod", "Dödsfall"], ["avtal", "Avtal"]];
    const KINDS = {
      bostad: ["Bostad", true],
      bohag: ["Bohag (möbler, vitvaror)", true],
      annat: ["Annat (sparande, bil, värdepapper)", false],
      villkor: ["Gåva eller arv med villkor om enskild egendom", false],
    };

    const defaults = () => ({
      tab: "lage",
      checks: {},
      assets: [],
      death: { who: 0, kids: false, testament: false },
      own: { insA: 0, insB: 0, price: null, value: null, loan: null, ownA: null },
    });

    function S() {
      const s = App.state.sambo;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "lage";
      s.assets = UI.objs(s.assets).map((a) => ({
        id: UI.safeId(a.id),
        name: String(a.name || ""),
        kind: KINDS[a.kind] ? a.kind : "annat",
        value: num(a.value),
        debt: num(a.debt),
        owner: a.owner === 0 || a.owner === 1 ? a.owner : "both",
        shareA: a.shareA === undefined ? 50 : Math.min(num(a.shareA), 100),
        debtOn: a.debtOn === 0 || a.debtOn === 1 ? a.debtOn : "follow",
      }));
      if (!s.death || typeof s.death !== "object") s.death = d.death;
      if (!s.own || typeof s.own !== "object") s.own = d.own;
      if (!s.checks || typeof s.checks !== "object") s.checks = {};
      return s;
    }

    const name = (i) => App.pname(i);
    const pct = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE") + " %";

    // ---------- bodelning ----------
    // Each asset is split between the two by ownership share; its debt by who carries it.
    function split(assets) {
      const sambo = [0, 0];
      const priv = [0, 0];
      for (const a of assets) {
        const own = a.owner === "both" ? [a.shareA / 100, 1 - a.shareA / 100] : a.owner === 0 ? [1, 0] : [0, 1];
        const dbt = a.debtOn === "follow" ? own : a.debtOn === 0 ? [1, 0] : [0, 1];
        const target = KINDS[a.kind][1] ? sambo : priv;
        for (let i = 0; i < 2; i++) target[i] += a.value * own[i] - a.debt * dbt[i];
      }
      return { sambo, priv };
    }

    function bodelning(assets) {
      const { sambo, priv } = split(assets);
      const total = sambo[0] + sambo[1];
      const half = Math.max(total, 0) / 2;
      const without = [half + priv[0], half + priv[1]];
      const withAgreement = [sambo[0] + priv[0], sambo[1] + priv[1]];
      return { sambo, priv, total, half, without, withAgreement, negative: sambo[0] < 0 || sambo[1] < 0 };
    }

    // ---------- views ----------
    const checkItems = [
      ["avtal", "Samboavtal", "Bara skriftligt och undertecknat av båda (9 §). Behövs om ni vill avvika från lika delning av bostad och bohag.", "Lag"],
      ["testamente", "Testamente till varandra", "Sambor ärver inte varandra. Testamente kräver skriftlighet och två samtidigt närvarande vittnen (ÄB 10 kap. 1 §).", "Lag"],
      ["formansl", "Förmånstagare på livförsäkring", "Du kan ange sambo som förmånstagare (FAL 14 kap. 6 §). Vad som gäller utan förordnande har inte kunnat verifieras. Skriv därför in det.", "Lag"],
      ["pension", "Efterlevandeskydd i tjänstepension", "Kontrollera med arbetsgivaren eller pensionsbolaget och skriv in förmånstagare. Reglerna för sambor är inte verifierade här.", "Råd"],
      ["papper", "Vem står på köpehandling, lagfart, hyreskontrakt och lån?", "Ägandet följer köpehandlingen, inte bodelningsreglerna. Utan samtycke får en sambo inte sälja, hyra ut eller belåna den gemensamma bostaden (23 §).", "Lag"],
      ["lan", "Medlåntagares ansvar är genomgånget", "Flera låntagare utan förbehåll svarar solidariskt för hela skulden (skuldebrevslagen 2 §). Den som betalar har regress mot den andre.", "Lag"],
      ["hem", "Hemförsäkring i båda namnen", "Allmänt råd. Kontrollera villkoren hos försäkringsbolaget.", "Råd"],
      ["bil", "Vem äger bil och djur?", "Ni bör vara överens skriftligt. Om bil räknas som bohag är inte verifierat.", "Råd"],
    ];

    function viewSambo() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { lage: viewLage, agare: viewAgare, sep: viewSep, dod: viewDod, avtal: viewAvtal }[s.tab](s);
      return `<h1>Sambo och juridik</h1>
        <p class="muted">Förenklad vägledning, inte juridisk rådgivning. Vid stora värden: ta hjälp av en jurist.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewSambo.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(L.checked)}. Lagtexten är läst som sammanfattning via lagen.nu och riksdagen.se.</p>
        <ul class="muted">${L.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${L.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    function viewLage(s) {
      const done = checkItems.filter(([k]) => s.checks[k] === "yes").length;
      const rows = checkItems
        .map(
          ([k, t, why, kind]) => `<div class="module" style="display:block">
            <div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(t)}</strong><span class="tag">${kind}</span></div>
            <div class="muted" style="margin:4px 0 8px">${esc(why)}</div>
            <select data-check="${k}" aria-label="Status för ${esc(t)}">
              <option value="" ${!s.checks[k] ? "selected" : ""}>Vet inte</option>
              <option value="yes" ${s.checks[k] === "yes" ? "selected" : ""}>Ordnat</option>
              <option value="no" ${s.checks[k] === "no" ? "selected" : ""}>Inte ordnat</option>
            </select></div>`
        )
        .join("");
      return `<div class="card"><div class="muted">Ordnat</div><div class="big">${done} av ${checkItems.length}</div>${UI.meter(done, checkItems.length, { label: "Ordnat" })}</div>
        <div class="card">${rows}</div>`;
    }

    function assetCard(a) {
      const opt = (v, cur, label) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
      return `<div class="card asset" data-id="${a.id}">
        <input data-a="name" value="${esc(a.name)}" placeholder="Vad? (t.ex. Lägenheten)" aria-label="Namn" autocomplete="off">
        <label>Typ</label>
        <select data-a="kind">${Object.entries(KINDS).map(([k, v]) => opt(k, a.kind, v[0])).join("")}</select>
        <div class="grid2">
          <div><label>Värde (kr)</label><input data-a="value" inputmode="decimal" value="${a.value || ""}" placeholder="0"></div>
          <div><label>Skuld (kr)</label><input data-a="debt" inputmode="decimal" value="${a.debt || ""}" placeholder="0"></div>
        </div>
        <label>Ägare</label>
        <select data-a="owner">${opt("both", a.owner, "Båda")}${opt(0, a.owner, name(0))}${opt(1, a.owner, name(1))}</select>
        ${a.owner === "both" ? `<label>${esc(name(0))}s andel (%)</label><input data-a="shareA" inputmode="decimal" value="${a.shareA}">` : ""}
        <label>Skulden står på</label>
        <select data-a="debtOn">${opt("follow", a.debtOn, "Följer ägandet")}${opt(0, a.debtOn, name(0))}${opt(1, a.debtOn, name(1))}</select>
        <p class="muted" style="margin-top:6px">${KINDS[a.kind][1] ? "Räknas som samboegendom: delas lika vid bodelning (3 §, 14 §)." : "Räknas som enskild egendom: ingår inte i bodelningen."}</p>
        <button class="danger" data-del="${a.id}" style="margin-top:6px">Ta bort</button>
      </div>`;
    }

    function viewAgare(s) {
      return `<p class="muted">Lägg in det som är värt något. Bostad och bohag köpta för gemensam användning är samboegendom (3 §). Allt annat är enskilt, liksom gåvor och arv med villkor om enskild egendom (4 §). Ägandet följer ändå köpehandlingen.</p>
        ${s.assets.map(assetCard).join("") || `<div class="card"><p class="muted" style="margin:0">Inga poster ännu.</p></div>`}
        <button id="btn-add-asset" class="primary" style="width:100%">+ Lägg till</button>`;
    }

    function viewSep(s) {
      return `<div id="sep-result">${sepResult(s)}</div>
        <div class="card"><h2>Regler vid separation</h2><ul>
          <li>Bodelning begärs inom ${L.bodelningMonths} månader efter att förhållandet upphört (8 §).</li>
          <li>Skulder avräknas först, sedan delas samboegendomen lika (13–14 §). Vem som betalat mest påverkar inte delningen automatiskt. Domstol kan jämka om lika delning är oskälig (15 §).</li>
          <li>Hyresrätt eller bostadsrätt som inte är samboegendom: den som bäst behöver bostaden kan få ta över den (22 §). Utan gemensamma barn krävs särskilt starka skäl. Begär inom ett år, eller tre månader om innehavaren flyttar.</li>
          <li>22 § gäller inte villa. En villa som är samboegendom hanteras via 14, 16 och 17 §§.</li>
          <li>Ett samboavtal kan utesluta bodelning eller undanta egendom (9 §). Orimliga villkor kan jämkas.</li>
          <li>Medlåntagare svarar solidariskt mot banken oavsett vem som äger.</li></ul></div>`;
    }

    function sepResult(s) {
      if (!s.assets.length) return `<div class="warn">Lägg först in era ägodelar under fliken Äger.</div>`;
      const b = bodelning(s.assets);
      const warn = b.negative
        ? `<div class="warn">Någon har mer skuld än tillgångar i samboegendomen. Det finns särskilda regler för det som den här kalkylen inte hanterar. Räkna inte med siffrorna utan rådgivning.</div>`
        : "";
      const transfer = (arr) => {
        const d = arr[0] - b.sambo[0] - b.priv[0];
        return Math.abs(d) < 0.5 ? "Ingen utjämning" : d > 0 ? `${esc(name(1))} betalar ${kr(d)} till ${esc(name(0))}` : `${esc(name(0))} betalar ${kr(-d)} till ${esc(name(1))}`;
      };
      const row = (label, arr, t) => `<div class="card"><h2>${label}</h2>
        <div class="kv"><span>${esc(name(0))}</span><strong>${kr(arr[0])}</strong></div>
        <div class="kv"><span>${esc(name(1))}</span><strong>${kr(arr[1])}</strong></div>
        <p class="muted" style="margin:6px 0 0">${t}</p></div>`;
      return `${warn}
        ${row("Utan samboavtal", b.without, transfer(b.without))}
        ${row("Med avtal som utesluter bodelning av samboegendom", b.withAgreement, "Var och en behåller det den äger. Förutsätter ett giltigt, skriftligt avtal (9 §).")}
        <p class="muted">Nettovärde efter skulder per person. Förenklad: ingen hänsyn till skatt, mäklararvode, jämkning (15 §) eller att en viss person har rätt att lösa ut bostaden.</p>`;
    }

    function viewDod(s) {
      const d = s.death;
      return `<div class="card">
        <label for="d-who">Vem avlider (i exemplet)?</label>
        <select id="d-who" data-d="who"><option value="0" ${d.who === 0 ? "selected" : ""}>${esc(name(0))}</option><option value="1" ${d.who === 1 ? "selected" : ""}>${esc(name(1))}</option></select>
        <label style="display:flex;gap:10px;align-items:center;color:var(--text);font-size:1rem"><input type="checkbox" data-d="kids" ${d.kids ? "checked" : ""} style="width:auto;min-height:0"> Har barn (bröstarvingar)</label>
        <label style="display:flex;gap:10px;align-items:center;color:var(--text);font-size:1rem"><input type="checkbox" data-d="testament" ${d.testament ? "checked" : ""} style="width:auto;min-height:0"> Testamente till sambon finns</label>
      </div>
      <div id="dod-result">${dodResult(s)}</div>
      <div class="card"><h2>Praktiskt vid dödsfall</h2><ul>
        <li>Bouppteckning förrättas inom ${L.bouppteckningMonths} månader och lämnas till Skatteverket inom en månad (ÄB 20 kap. 1 och 8 §§).</li>
        <li>Den efterlevande sambon begär bodelning senast när bouppteckningen förrättas (8 §, 18 §).</li>
        <li>Livförsäkring med förmånstagare går inte via arvet. Se Läget.</li></ul></div>`;
    }

    function dodResult(s) {
      if (!s.assets.length) return `<div class="warn">Lägg först in era ägodelar under fliken Äger.</div>`;
      const d = s.death;
      const D = d.who;
      const S2 = 1 - D;
      const { sambo, priv } = split(s.assets);
      const half = Math.max(sambo[0] + sambo[1], 0) / 2;
      const estate = Math.max(half + priv[D], 0);
      const survivorOwn = half + priv[S2];
      const uttagMax = L.uttagPBB * pbb();
      const uttag = Math.min(uttagMax, estate);
      const rest = estate - uttag;
      let lines = [];
      lines.push(["Efterlevandes egen del efter bodelning", survivorOwn]);
      lines.push([`Efterlevandes uttag enligt 18 § (högst ${kr(uttagMax)})`, uttag]);
      if (d.testament) {
        if (d.kids) {
          const laglott = estate * 0.5;
          lines.push(["Barnens laglott (hälften av arvslotten, ÄB 7 kap. 1 §)", laglott]);
          lines.push(["Sambon enligt testamentet (om allt testamenterats)", Math.max(rest - laglott, 0)]);
        } else {
          lines.push(["Sambon enligt testamentet (om allt testamenterats)", rest]);
          lines.push(["Övriga arvingar", 0]);
        }
      } else if (d.kids) {
        lines.push(["Barnen ärver", rest]);
        lines.push(["Sambon ärver", 0]);
      } else {
        lines.push(["Arvingar enligt arvsordningen (föräldrar, syskon, far- och morföräldrar)", rest]);
        lines.push(["Sambon ärver", 0]);
      }
      const total = survivorOwn + uttag + (d.testament ? lines[lines.length - (d.kids ? 1 : 2)][1] : 0);
      return `<div class="card"><h2>Om ${esc(name(D))} avlider</h2>
        <div class="kv"><span>Avlidens kvarlåtenskap efter bodelning</span><strong>${kr(estate)}</strong></div>
        ${lines.map(([a, b]) => `<div class="kv"><span>${esc(a)}</span><span>${kr(b)}</span></div>`).join("")}
        <div class="kv"><strong>${esc(name(S2))} får sammanlagt</strong><strong>${kr(total)}</strong></div>
        <p class="muted" style="margin-top:6px">${d.testament ? "Förenklad: att laglotten bara gäller bröstarvingar och att testamentet inte får inkräkta på den är inte verifierat i lagtext här." : "Utan testamente ärver sambon ingenting (sambo nämns inte i ÄB 2 kap.)."} Ingen hänsyn till livförsäkring, pension eller skatt.</p></div>`;
    }

    function viewAvtal(s) {
      const o = s.own;
      const h = App.state.housing || {};
      const price = o.price !== null && o.price !== undefined ? num(o.price) : num(h.price);
      const insTot = num(o.insA) + num(o.insB);
      const hint = num(h.price) ? `<div class="muted">Pris i Bostad: ${kr(num(h.price))}, kontantinsats ${kr(num(h.down))}.</div>` : "";
      const f = (label, key, v, ph) => `<label>${label}</label><input data-o="${key}" inputmode="decimal" value="${UI.fv(v, key)}" placeholder="${ph || "0"}">`;
      return `<div class="card"><h2>Ägarandelar vid bostadsköp</h2>
        ${hint}
        <div class="grid2"><div>${f(esc(name(0)) + "s insats (kr)", "insA", o.insA)}</div><div>${f(esc(name(1)) + "s insats (kr)", "insB", o.insB)}</div></div>
        ${f("Bostadens pris (kr)", "price", o.price !== null && o.price !== undefined ? o.price : h.price || "", "0")}
        ${f("Värde vid en framtida separation (kr)", "value", o.value, "Samma som priset")}
        ${f("Lånet vid separation (kr)", "loan", o.loan, "Pris minus insatser")}
        ${f(esc(name(0)) + "s ägarandel (%)", "ownA", o.ownA, insTot ? pct((num(o.insA) / insTot) * 100) + " (efter insats)" : "50")}
      </div>
      <div id="avtal-result">${avtalResult(s, price)}</div>
      <div class="card"><h2>Att ta med till en jurist</h2><ul>
        <li>Ska bostaden uteslutas från bodelning, och ska insatserna betalas tillbaka först?</li>
        <li>Hur delas värdeökning och värdeminskning?</li>
        <li>Hur hanteras amortering och renovering som bara en betalar?</li>
        <li>Vem har rätt att lösa ut den andre, och till vilket värde?</li>
        <li>Hur länge gäller avtalet, och hur ändras det? Det ska vara skriftligt och undertecknat av båda (9 §).</li>
        <li>Testamente och förmånstagare så att det stämmer med avtalet.</li></ul>
        <p class="muted">Ett samboavtal ändrar bodelningen men inte vem som äger. Ägarandelarna anges i köpehandlingen och lagfarten.</p></div>`;
    }

    function avtalResult(s, price) {
      const o = s.own;
      const insA = num(o.insA);
      const insB = num(o.insB);
      const ins = insA + insB;
      if (price <= 0 || ins <= 0) return `<div class="warn">Fyll i pris och insatser.</div>`;
      const value = o.value !== null && o.value !== undefined && num(o.value) > 0 ? num(o.value) : price;
      const loan = o.loan !== null && o.loan !== undefined && num(o.loan) > 0 ? num(o.loan) : Math.max(price - ins, 0);
      const net = value - loan;
      const ownA = o.ownA !== null && o.ownA !== undefined && o.ownA !== "" ? Math.min(num(o.ownA), 100) / 100 : insA / ins;
      const ownB = 1 - ownA;
      const without = [net / 2, net / 2];
      const surplus = net - ins;
      const withAgreement = [insA + surplus * ownA, insB + surplus * ownB];
      const row = (label, a, b, t) => `<div class="card"><h2>${label}</h2>
        <div class="kv"><span>${esc(name(0))}</span><strong>${kr(a)}</strong></div>
        <div class="kv"><span>${esc(name(1))}</span><strong>${kr(b)}</strong></div>
        <p class="muted" style="margin:6px 0 0">${t}</p></div>`;
      return `<div class="card"><div class="muted">Förslag på andelar efter insats</div>
          <div class="big">${pct((insA / ins) * 100)} / ${pct((insB / ins) * 100)}</div>
          <div class="muted">Netto vid separation: ${kr(net)} (värde ${kr(value)} minus lån ${kr(loan)}).</div></div>
        ${row("Utan avtal, bostaden är samboegendom", without[0], without[1], "Delas lika efter skuldavräkning (14 §), oavsett vem som lagt mest. Domstol kan jämka (15 §), men det är inte automatiskt.")}
        ${row("Med avtal: insatserna tillbaka, resten efter ägarandel", withAgreement[0], withAgreement[1], "Exempel på en klausul. Den måste skrivas och undertecknas av båda (9 §) och kan jämkas om den är orimlig.")}
        <p class="muted">Utan hänsyn till skatt, kostnader, amortering över tid eller att bara en står på lånet.</p>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "sambo";
    const rerender = () => { app.innerHTML = viewSambo(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-asset") {
        s.assets.push({ id: uid(), name: "", kind: "bostad", value: 0, debt: 0, owner: "both", shareA: 50, debtOn: "follow" });
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.assets = s.assets.filter((a) => a.id !== t.dataset.del);
        App.save();
        rerender();
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset.check !== undefined) {
        s.checks[t.dataset.check] = t.value;
        App.save();
        rerender();
      } else if (t.dataset.a) {
        const card = t.closest(".asset");
        const a = s.assets.find((x) => x.id === card.dataset.id);
        if (!a) return;
        const f = t.dataset.a;
        if (f === "name") a.name = t.value;
        else if (f === "kind") a.kind = KINDS[t.value] ? t.value : "annat";
        else if (f === "owner") a.owner = t.value === "both" ? "both" : Number(t.value);
        else if (f === "debtOn") a.debtOn = t.value === "follow" ? "follow" : Number(t.value);
        else if (f === "shareA") a.shareA = Math.min(num(t.value), 100);
        else a[f] = num(t.value);
        App.save();
        if (ev.type === "change" && (f === "kind" || f === "owner")) rerender();
      } else if (t.dataset.d) {
        const f = t.dataset.d;
        if (f === "who") s.death.who = Number(t.value) === 1 ? 1 : 0;
        else s.death[f] = t.checked;
        App.save();
        document.getElementById("dod-result").innerHTML = dodResult(s);
      } else if (t.dataset.o) {
        const f = t.dataset.o;
        s.own[f] = t.value.trim() === "" ? null : num(t.value);
        App.save();
        const h = App.state.housing || {};
        const price = s.own.price !== null && s.own.price !== undefined ? num(s.own.price) : num(h.price);
        document.getElementById("avtal-result").innerHTML = avtalResult(s, price);
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.sambo = viewSambo;
    App.moreLinks.push({ title: "Sambo och juridik", href: "#/sambo", desc: "Samboavtal, testamente, separation, dödsfall, ägarandelar" });
    App._sambo = { bodelning, split, S };
  });
})();
