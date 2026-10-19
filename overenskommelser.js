// Överenskommelser module: the household's own agreements, hard lines, conversation prompts, compromises and monthly check-in.
// Mostly the household's own content. Legal statements and helplines come from rules.js (R.avtal).
(function () {
  "use strict";
  window.AppModules = window.AppModules || [];
  window.AppModules.push(function (App) {
    const { app, R, esc, kr, num, uid } = App;
    const AV = R.avtal;
    const TABS = [["avtal", "Avtal"], ["samtal", "Samtal"], ["komp", "Kompromisser"], ["mote", "Möte"], ["stod", "Stöd"]];
    const LEVEL = { hard: "Hård linje", flex: "Flexibel" };
    const STATUS = { agreed: "Överens", open: "Ej pratat", disagree: "Oense" };

    // Starter topics. `prompt` is a question to answer; the household writes its own text.
    const TOPICS = [
      ["Fördelning av gemensamma kostnader", "Hur delar vi hyra, mat och räkningar, och hur ofta ser vi över det?"],
      ["Egna pengar", "Hur mycket har var och en att använda utan att förklara sig?"],
      ["Större köp", "Vid vilket belopp ska vi vara överens, och hur lång betänketid har vi?"],
      ["Lån och skulder", "Tar vi lån eller kredit i eget namn eller bara tillsammans? Hur bokför vi pengar vi lånar av varandra?"],
      ["Buffert och sparande", "Hur stor buffert vill vi ha, och vad prioriterar vi först?"],
      ["Bostad", "Vem står på köpehandlingen och lånet? Vad händer med insatser om vi separerar?"],
      ["Bil och djur", "Vem äger, vem betalar, och vad händer vid separation?"],
      ["Barn och föräldraledighet", "Hur delar vi dagarna och ekonomin om vi får barn, och vad gör vi åt pensionen?"],
      ["Släkt och vänner", "Hjälper vi familj eller vänner med pengar, och hur mycket utan att fråga den andre?"],
      ["Jobb och studier", "Hur väger vi lön mot tid, och vad gör vi om en av oss vill byta bana eller studera?"],
      ["Om vi separerar", "Hur tar vi beslut om bostad, saker, djur och skulder på ett rättvist sätt?"],
      ["Om en av oss dör", "Testamente, förmånstagare och vem som får bo kvar?"],
    ];

    const THEMES = [
      ["Pengasyn", ["Vad betyder pengar för dig: trygghet, frihet, status eller något annat?", "Vad lärde du dig om pengar hemma?", "Vad oroar dig mest ekonomiskt?", "Spar du hellre eller njuter du nu, och varför?"]],
      ["Vardagen", ["Vad ska vara vår gemensamma budget och vad är var och ens?", "Vad får den andre köpa utan att fråga, och vad kräver samtal?", "Hur vill vi få veta hur vi ligger till, och hur ofta?"]],
      ["Framtiden", ["Vad vill vi ha om fem och tio år? Bostad, barn, resor, jobb?", "Hur mycket risk är vi beredda att ta med våra besparingar?", "Hur ser vi på pension och vem som tar ansvar för den?"]],
      ["Det svåra", ["Hur vill vi prata när vi är oense om pengar?", "Vad gör vi om en av oss tjänar mycket mindre eller blir arbetslös eller sjuk?", "Vad är en röd linje för dig som inte får passeras?"]],
      ["Familj och barn", ["Hur vill vi dela föräldraledigheten, och vad kostar det oss var och en?", "Hur ofta ska någon jobba deltid, och hur kompenserar vi det?", "Hur stöttar vi våra egna familjer?"]],
    ];

    const AGENDA = ["Gå igenom Översikt: vad blev kvar och vad avvek?", "Kommande större köp och betänketider", "Sparmål och buffert", "Något som skaver eller behöver ändras i våra avtal"];

    const defaults = () => ({
      tab: "avtal",
      agreements: [],
      talked: {},
      compromises: [],
      meeting: { last: "", next: "", notes: "", done: {} },
    });

    function S() {
      const s = App.state.avtal;
      const d = defaults();
      UI.fill(s, d);
      if (!TABS.some((t) => t[0] === s.tab)) s.tab = "avtal";
      s.agreements = UI.objs(s.agreements).map((a) => ({
        id: UI.safeId(a.id),
        topic: String(a.topic || ""),
        text: String(a.text || ""),
        level: LEVEL[a.level] ? a.level : "flex",
        status: STATUS[a.status] ? a.status : "open",
      }));
      s.compromises = UI.objs(s.compromises).map((c) => ({
        id: UI.safeId(c.id),
        question: String(c.question || ""),
        a: String(c.a || ""),
        b: String(c.b || ""),
        solution: String(c.solution || ""),
        review: /^\d{4}-\d{2}-\d{2}$/.test(c.review || "") ? c.review : "",
      }));
      if (!s.talked || typeof s.talked !== "object") s.talked = {};
      if (!s.meeting || typeof s.meeting !== "object") s.meeting = d.meeting;
      for (const k of Object.keys(d.meeting)) if (s.meeting[k] === undefined) s.meeting[k] = d.meeting[k];
      return s;
    }

    const name = (i) => App.pname(i);

    // Facts from the other modules that the household may want to write into the agreement.
    function appFacts() {
      const st = App.state;
      const facts = [];
      const m = R.models[st.model];
      if (m) facts.push(`Fördelning av gemensamma kostnader i appen: ${m.name}.`);
      const pocket = st.persons.map((p, i) => [App.pname(i), p.pocket]).filter(([, v]) => v > 0);
      if (pocket.length) facts.push(`Fickpengar: ${pocket.map(([n, v]) => `${n} ${kr(v)}`).join(", ")} per månad.`);
      const k = st.kop && st.kop.limit;
      if (k > 0) facts.push(`Köp över ${kr(k)} kräver samtal (från Köpbeslut).`);
      return facts;
    }

    function summary(s) {
      const c = { agreed: 0, open: 0, disagree: 0 };
      s.agreements.forEach((a) => c[a.status]++);
      return c;
    }

    function exportText(s) {
      const lines = [`Våra överenskommelser, ${new Date().toLocaleDateString("sv-SE")}`, `${name(0)} och ${name(1)}`, ""];
      s.agreements.forEach((a) => lines.push(`${a.topic || "Utan rubrik"} [${LEVEL[a.level]}, ${STATUS[a.status]}]: ${a.text || "(ej ifyllt)"}`));
      if (s.compromises.length) {
        lines.push("", "Kompromisser:");
        s.compromises.forEach((c) => lines.push(`${c.question || "Utan rubrik"}: ${c.solution || "(ej beslutat)"}${c.review ? ` (ses över ${c.review})` : ""}`));
      }
      return lines.join("\n");
    }

    // ---------- views ----------
    function viewAvtal2() {
      const s = S();
      const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${s.tab === k ? "primary" : ""}">${t}</button>`).join("")}</div>`;
      const body = { avtal: viewAgreements, samtal: viewTalk, komp: viewCompromise, mote: viewMeeting, stod: viewSupport }[s.tab](s);
      return `<h1>Överenskommelser</h1>
        <p class="muted">Era egna regler för pengar och beslut, i ert tonfall. Appen föreslår frågor, ni bestämmer svaren.</p>
        ${tabs}${body}${sourcesCard()}`;
    }
    viewAvtal2.nav = "mer";

    function sourcesCard() {
      return `<div class="card"><h2>Källor och osäkerheter</h2>
        <p class="muted">Kontrollerat ${esc(AV.checked)}.</p>
        <ul class="muted">${AV.sources.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px"><strong>Ej verifierat:</strong></p>
        <ul class="muted">${AV.unverified.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }

    const ta = (label, attr, v, ph) => `<label>${label}</label><textarea ${attr} placeholder="${ph || ""}" style="min-height:80px;font-family:inherit;font-size:16px">${esc(v)}</textarea>`;
    const inp = (label, attr, v, ph, type) => `<label>${label}</label><input ${attr} ${type ? `type="${type}"` : ""} value="${esc(v)}" placeholder="${ph || ""}" autocomplete="off">`;

    function agreementCard(a) {
      const opt = (v, cur, l) => `<option value="${v}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
      const hint = TOPICS.find((t) => t[0] === a.topic);
      return `<div class="card agr" data-id="${a.id}">
        ${inp("Ämne", 'data-a="topic"', a.topic, "T.ex. Större köp")}
        ${hint ? `<div class="muted">${esc(hint[1])}</div>` : ""}
        ${ta("Vad vi har kommit överens om", 'data-a="text"', a.text, "Skriv så att båda förstår samma sak")}
        <div class="grid2">
          <div><label>Typ</label><select data-a="level">${Object.entries(LEVEL).map(([k, v]) => opt(k, a.level, v)).join("")}</select></div>
          <div><label>Läge</label><select data-a="status">${Object.entries(STATUS).map(([k, v]) => opt(k, a.status, v)).join("")}</select></div>
        </div>
        <button class="danger" data-del="${a.id}" style="margin-top:8px">Ta bort</button>
      </div>`;
    }

    function viewAgreements(s) {
      const c = summary(s);
      const facts = appFacts();
      return `<div class="card">
          <div class="kv"><span>Överens</span><strong>${c.agreed}</strong></div>
          <div class="kv"><span>Ej pratat</span><strong>${c.open}</strong></div>
          <div class="kv"><span>Oense</span><strong class="${c.disagree ? "neg" : ""}">${c.disagree}</strong></div>
          <p class="muted" style="margin:6px 0 0">En hård linje är något ni inte går ifrån utan att båda är med. Flexibelt får ni ändra när det behövs.</p>
        </div>
        ${facts.length ? `<div class="card"><h2>Från appen</h2><ul class="muted">${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : ""}
        <div id="agreements">${s.agreements.map(agreementCard).join("") || `<div class="card"><p class="muted" style="margin:0">Inga överenskommelser ännu. Lägg in förslagen, eller skriv egna.</p></div>`}</div>
        <div class="row"><button id="btn-add-agr" class="primary">+ Lägg till</button><button id="btn-starter">Lägg in förslag</button></div>
        <div class="card" style="margin-top:12px"><h2>Vad är en överenskommelse här?</h2><ul>
          <li>Det här är ett internt avtal mellan er. Om en överenskommelse mellan sambor är juridiskt bindande har inte kunnat verifieras. Behandla den som en gemensam uppgörelse, och ta hjälp av en jurist för sådant som är viktigt.</li>
          <li>Ett samboavtal enligt sambolagen 9 § reglerar bodelning och ska vara skriftligt och undertecknat av båda. Ägandet ändras inte av det, utan följer köpehandlingen. För fast egendom krävs en skriftlig, undertecknad köpe- eller gåvohandling (jordabalken 4 kap. 1 och 29 §§).</li>
          <li>Pengar på bankkonto ingår inte i bodelningen mellan sambor, eftersom lagen bara nämner bostad och bohag (3 §). Skriv ner vem som satt in vad på ett gemensamt konto. Hur ett gemensamt konto ägs har inte kunnat verifieras i lagtext.</li></ul></div>
        <button id="btn-copy" style="width:100%;margin-top:8px">Kopiera som text</button>
        <p id="copy-msg" class="muted" style="margin-top:6px"></p>`;
    }

    function viewTalk(s) {
      return `<p class="muted">Ta ett tema i taget, när ni båda har tid och ro. Kryssa i det ni har pratat om. Det finns inga rätta svar.</p>
        ${THEMES.map(([t, qs], ti) => `<div class="card"><h2>${esc(t)}</h2>${qs.map((q, qi) => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:1rem;margin:8px 0"><input type="checkbox" data-talk="${ti}-${qi}" ${s.talked[ti + "-" + qi] ? "checked" : ""} style="width:auto;min-height:0;margin-top:4px"><span>${esc(q)}</span></label>`).join("")}</div>`).join("")}
        <div class="card"><h2>Att tänka på</h2><ul>
          <li>Den som tjänar mindre och tar mer föräldraledighet tappar ofta mer i pension. Se Barn för pensionsregler. Pensionsmyndigheten anger för 2025 att kvinnors pension är cirka 74 % av männens (preliminärt, sekundär källa).</li>
          <li>Konsumentverket föreslår öppna samtal om pengar och gemensam budget (sökutdrag, ej läst direkt).</li></ul></div>`;
    }

    function compCard(c) {
      return `<div class="card cmp" data-id="${c.id}">
        ${inp("Fråga", 'data-m="question"', c.question, "T.ex. Semester: charter eller backpacking?")}
        ${ta(esc(name(0)) + "s önskan", 'data-m="a"', c.a)}
        ${ta(esc(name(1)) + "s önskan", 'data-m="b"', c.b)}
        ${ta("Vad vi kom fram till", 'data-m="solution"', c.solution)}
        ${inp("Ses över senast", 'data-m="review"', c.review, "", "date")}
        <button class="danger" data-del-c="${c.id}" style="margin-top:8px">Ta bort</button>
      </div>`;
    }

    function viewCompromise(s) {
      return `<p class="muted">Skriv ner kompromisser så att ni inte behöver förhandla om samma sak igen. Sätt ett datum då ni ser över den.</p>
        ${s.compromises.map(compCard).join("") || `<div class="card"><p class="muted" style="margin:0">Inga kompromisser ännu.</p></div>`}
        <button id="btn-add-cmp" class="primary" style="width:100%">+ Lägg till</button>`;
    }

    function viewMeeting(s) {
      const m = s.meeting;
      const today = UI.localISO(new Date());
      const due = m.next && m.next <= today;
      return `<div class="card"><h2>Månadsmöte</h2>
          <p class="muted">En fast stund där ni går igenom pengarna utan att det blir ett bråk. Samma punkter varje gång.</p>
          ${inp("Senaste mötet", 'data-t="last"', m.last, "", "date")}
          ${inp("Nästa möte", 'data-t="next"', m.next, "", "date")}
          ${due ? `<div class="warn" style="margin-top:8px">Det är dags för ert möte.</div>` : ""}
        </div>
        <div class="card"><h2>Dagordning</h2>
          ${AGENDA.map((t, i) => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:1rem;margin:8px 0"><input type="checkbox" data-agenda="${i}" ${m.done[i] ? "checked" : ""} style="width:auto;min-height:0;margin-top:4px"><span>${esc(t)}</span></label>`).join("")}
          ${ta("Anteckningar", 'data-t="notes"', m.notes)}
          <button id="btn-new-meeting" style="margin-top:8px;width:100%">Mötet klart: rensa och sätt datum</button>
        </div>`;
    }

    function viewSupport() {
      return `<div class="card"><h2>Familjerådgivning</h2><ul>
          <li>Socialnämnden ska erbjuda familjerådgivning till den som begär det (socialtjänstlagen 13 kap. 4 §). Kostnad och hur man bokar har inte verifierats. Fråga kommunen eller 1177.</li></ul></div>
        <div class="card"><h2>Ekonomi och pengar som makt</h2><ul>
          <li>Ekonomiskt våld delas av Jämställdhetsmyndigheten in i ekonomisk kontroll, inkomstsabotage och ekonomiskt utnyttjande (sekundär källa). Kvinnofridslinjen räknar det som en form av våld i nära relationer.</li>
          <li>Ekonomiskt våld är inget eget brott, men det kan ingå i grov fridskränkning eller olaga tvång beroende på vad som hänt (min slutsats av brottsbalken 4 kap. 4 och 4 a §§).</li>
          <li>Om någon styr dina pengar, tar din lön, hindrar dig från att arbeta eller ger dig skulder mot din vilja kan du få stöd. Du behöver inte veta om det är "tillräckligt illa" först.</li></ul></div>
        <div class="card"><h2>Stöd och hjälp</h2>
          ${AV.helplines.map((h) => `<div class="module" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(h.name)}</strong><a href="tel:${h.number}" style="font-weight:700">${esc(h.shown)}</a></div><div class="muted">${esc(h.info)}</div></div>`).join("")}
          <p class="muted" style="margin-top:8px">Numren kontrollerades ${esc(AV.checked)} mot organisationernas egna sidor. Kommunal budget- och skuldrådgivning är gratis och sekretessbelagd (Konsumentverket).</p></div>`;
    }

    // ---------- events ----------
    const active = () => App.route() === "overenskommelser";
    const rerender = () => { app.innerHTML = viewAvtal2(); };

    app.addEventListener("click", (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset && t.dataset.tab) {
        s.tab = t.dataset.tab;
        App.save();
        rerender();
        window.scrollTo(0, 0);
      } else if (t.id === "btn-add-agr") {
        s.agreements.push({ id: uid(), topic: "", text: "", level: "flex", status: "open" });
        App.save();
        rerender();
      } else if (t.id === "btn-starter") {
        const have = new Set(s.agreements.map((a) => a.topic));
        TOPICS.filter(([topic]) => !have.has(topic)).forEach(([topic]) => s.agreements.push({ id: uid(), topic, text: "", level: "flex", status: "open" }));
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.del) {
        s.agreements = s.agreements.filter((a) => a.id !== t.dataset.del);
        App.save();
        rerender();
      } else if (t.id === "btn-copy") {
        const msg = document.getElementById("copy-msg");
        const text = exportText(s);
        Promise.resolve()
          .then(() => navigator.clipboard.writeText(text))
          .then(() => { if (msg) msg.textContent = "Kopierat. Klistra in i en anteckning eller ett meddelande."; })
          .catch(() => { if (msg) msg.textContent = "Kunde inte kopiera automatiskt."; });
      } else if (t.id === "btn-add-cmp") {
        s.compromises.push({ id: uid(), question: "", a: "", b: "", solution: "", review: "" });
        App.save();
        rerender();
      } else if (t.dataset && t.dataset.delC) {
        s.compromises = s.compromises.filter((c) => c.id !== t.dataset.delC);
        App.save();
        rerender();
      } else if (t.id === "btn-new-meeting") {
        const d = new Date();
        s.meeting.last = UI.localISO(d);
        s.meeting.next = UI.addMonths(d, 1);
        s.meeting.done = {};
        s.meeting.notes = "";
        App.save();
        rerender();
      }
    });

    const onInput = (ev) => {
      if (!active()) return;
      const t = ev.target;
      const s = S();
      if (t.dataset.a) {
        const a = s.agreements.find((x) => x.id === t.closest(".agr").dataset.id);
        if (!a) return;
        a[t.dataset.a] = t.value;
        App.save();
        if (ev.type === "change" && (t.dataset.a === "status" || t.dataset.a === "level")) rerender();
      } else if (t.dataset.m) {
        const c = s.compromises.find((x) => x.id === t.closest(".cmp").dataset.id);
        if (!c) return;
        c[t.dataset.m] = t.value;
        App.save();
      } else if (t.dataset.talk !== undefined) {
        s.talked[t.dataset.talk] = t.checked;
        App.save();
      } else if (t.dataset.agenda !== undefined) {
        s.meeting.done[t.dataset.agenda] = t.checked;
        App.save();
      } else if (t.dataset.t) {
        s.meeting[t.dataset.t] = t.value;
        App.save();
        if (ev.type === "change" && t.dataset.t === "next") rerender();
      }
    };
    app.addEventListener("input", onInput);
    app.addEventListener("change", onInput);

    App.views.overenskommelser = viewAvtal2;
    App.moreLinks.push({ title: "Överenskommelser", href: "#/overenskommelser", desc: "Hårda linjer, samtalsfrågor, kompromisser, månadsmöte, stöd" });
    App._avtal = { appFacts, summary, exportText, S, TOPICS };
  });
})();
