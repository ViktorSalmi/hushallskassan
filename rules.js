// All rules and amounts live here. Every value has a source and the date it was last checked.
// Update a value => update `checked`. The app warns when a value is older than STALE_DAYS.
window.RULES = {
  STALE_DAYS: 180,
  values: {
    prisbasbelopp: {
      label: "Prisbasbelopp 2026",
      value: 59200,
      unit: "kr",
      source: "SCB",
      checked: "2026-10-19",
    },
    barnbidrag: {
      label: "Barnbidrag per barn och månad",
      value: 1250,
      unit: "kr",
      source: "Försäkringskassan, aktuella belopp",
      checked: "2026-10-19",
    },
    bolanetak: {
      label: "Högsta belåning vid nytt bolån",
      value: 0.9,
      unit: "andel",
      source: "Lag (2026:226) om begränsning av bostadskrediter, 4 § (riksdagen.se)",
      checked: "2026-10-19",
    },
    amortering50: {
      label: "Amortering, belåning över 50 % till 70 %",
      value: 0.01,
      unit: "andel per år",
      source: "Lag (2026:226) 7 § (riksdagen.se). Belåning på 50 % eller lägre: inget krav i 7 §.",
      checked: "2026-10-19",
    },
    amortering70: {
      label: "Amortering, belåning över 70 %",
      value: 0.02,
      unit: "andel per år",
      source: "Lag (2026:226) 7 § (riksdagen.se). Belåning på 50 % eller lägre: inget krav i 7 §.",
      checked: "2026-10-19",
    },
    lagfartPct: {
      label: "Lagfart, stämpelskatt (privatperson)",
      value: 0.015,
      unit: "andel",
      source: "Lantmäteriet. Underlag (köpeskilling eller taxeringsvärde, det högre) är inte bekräftat på läst sida.",
      checked: "2026-10-19",
    },
    lagfartFee: {
      label: "Lagfart, expeditionsavgift",
      value: 825,
      unit: "kr",
      source: "Lantmäteriet",
      checked: "2026-10-19",
    },
    pantbrevPct: {
      label: "Pantbrev, stämpelskatt av nytt belopp (avrundas ned till hela tusental)",
      value: 0.02,
      unit: "andel",
      source: "Lantmäteriet. Gäller nya inteckningar; övertagna befintliga pantbrev är inte verifierat.",
      checked: "2026-10-19",
    },
    pantbrevFee: {
      label: "Pantbrev, expeditionsavgift per inteckning",
      value: 375,
      unit: "kr",
      source: "Lantmäteriet",
      checked: "2026-10-19",
    },
    fastighetsavgiftPct: {
      label: "Fastighetsavgift småhus, andel av taxeringsvärde",
      value: 0.0075,
      unit: "andel",
      source: "Skatteverket, inkomstår 2026",
      checked: "2026-10-19",
    },
    fastighetsavgiftMax: {
      label: "Fastighetsavgift småhus, tak per år",
      value: 10425,
      unit: "kr",
      source: "Skatteverket, inkomstår 2026",
      checked: "2026-10-19",
    },
    ranteavdragPct1: {
      label: "Ränteavdrag, underskott upp till gränsen",
      value: 0.3,
      unit: "andel",
      source: "Skatteverket",
      checked: "2026-10-19",
    },
    ranteavdragLimit: {
      label: "Ränteavdrag, gräns för 30 %",
      value: 100000,
      unit: "kr",
      source: "Skatteverket. Att gränsen gäller per person är bara belagt av sekundärkällor.",
      checked: "2026-10-19",
    },
    ranteavdragPct2: {
      label: "Ränteavdrag, underskott över gränsen",
      value: 0.21,
      unit: "andel",
      source: "Skatteverket",
      checked: "2026-10-19",
    },
    pantsattningsavgift: {
      label: "Pantsättningsavgift BRF, vanligt tak (1 % av prisbasbeloppet)",
      value: 592,
      unit: "kr",
      source: "Egen uträkning. Gäller bara om föreningens stadgar anger den.",
      checked: "2026-10-19",
    },
    overlatelseavgift: {
      label: "Överlåtelseavgift BRF, vanligt tak (2,5 % av prisbasbeloppet)",
      value: 1480,
      unit: "kr",
      source: "Egen uträkning. Gäller bara om stadgarna anger den; stadgarna avgör vem som betalar.",
      checked: "2026-10-19",
    },
    iskRate: {
      label: "ISK, schablonränta 2026",
      value: 0.0355,
      unit: "andel",
      source: "Skatteverket, belopp och procent 2026 (statslåneränta 30 nov 2025 2,55 % + 1 procentenhet)",
      checked: "2026-10-19",
    },
    kapitalskatt: {
      label: "Skatt på kapital (ISK-schablon, bankränta)",
      value: 0.3,
      unit: "andel",
      source: "Skatteverket",
      checked: "2026-10-19",
    },
    iskGrund: {
      label: "ISK, skattefri grundnivå av kapitalunderlaget",
      value: 300000,
      unit: "kr",
      source: "Skatteverket. Gäller sammanlagt för ISK, kapitalförsäkring och PEPP. Att den är per person står inte ordagrant på sidan.",
      checked: "2026-10-19",
    },
    insattningsgaranti: {
      label: "Insättningsgaranti per person och institut",
      value: 1150000,
      unit: "kr",
      source: "Riksgälden, från 1 januari 2026",
      checked: "2026-10-19",
    },
    akassaTak: {
      label: "A-kassa, ersättningsgrundande inkomst (tak per månad)",
      value: 34000,
      unit: "kr",
      source: "IAF. Nivå 80 % vid minst 12 månaders medlemskap, därefter nedtrappning (detaljer ej verifierade).",
      checked: "2026-10-19",
    },
    akassaNiva: {
      label: "A-kassa, första ersättningsnivå (minst 12 månaders medlemskap)",
      value: 0.8,
      unit: "andel",
      source: "IAF",
      checked: "2026-10-19",
    },
    sgiTak: {
      label: "Högsta SGI (sjukpenninggrundande inkomst)",
      value: 592000,
      unit: "kr",
      source: "Försäkringskassan, aktuella belopp (uppdaterad 2026-07-03)",
      checked: "2026-10-19",
    },
    bufferMin: {
      label: "Buffert enligt Finansinspektionen, lägst antal månader nödvändiga utgifter",
      value: 2,
      unit: "månader",
      source: "Finansinspektionen, fem tips för ditt sparande (granskad 2025-12-10)",
      checked: "2026-10-19",
    },
    bufferMax: {
      label: "Buffert enligt Finansinspektionen, högst antal månader",
      value: 3,
      unit: "månader",
      source: "Finansinspektionen. Större behov kan finnas, t.ex. vid eget hus.",
      checked: "2026-10-19",
    },
    fordonsskattGrund: {
      label: "Fordonsskatt personbil, grundbelopp per år",
      value: 360,
      unit: "kr",
      source: "Transportstyrelsen, Skattens storlek (uppd. 2025-11-06)",
      checked: "2026-10-19",
    },
    co2Grans: {
      label: "Fordonsskatt, koldioxidbelopp gäller över",
      value: 111,
      unit: "g/km",
      source: "Transportstyrelsen, Skattens storlek (WLTP, blandad körning)",
      checked: "2026-10-19",
    },
    co2Belopp: {
      label: "Fordonsskatt, koldioxidbelopp bensin och diesel",
      value: 22,
      unit: "kr/g",
      source: "Transportstyrelsen, Skattens storlek",
      checked: "2026-10-19",
    },
    co2BeloppAlt: {
      label: "Fordonsskatt, koldioxidbelopp alternativa drivmedel (etanol, gas)",
      value: 11,
      unit: "kr/g",
      source: "Transportstyrelsen, Skattens storlek",
      checked: "2026-10-19",
    },
    dieselBransle: {
      label: "Fordonsskatt diesel, bränsletillägg (fordonsår 2018 eller senare)",
      value: 13.52,
      unit: "kr/g",
      source: "Transportstyrelsen, Skattens storlek",
      checked: "2026-10-19",
    },
    dieselMiljo: {
      label: "Fordonsskatt diesel, miljötillägg (fordonsår 2018 eller senare)",
      value: 250,
      unit: "kr",
      source: "Transportstyrelsen, Skattens storlek",
      checked: "2026-10-19",
    },
    malusLag: {
      label: "Malus, första tre åren, 75–125 g/km",
      value: 107,
      unit: "kr/g",
      source: "Transportstyrelsen, Malus (uppd. 2025-02-01). Ingen ändring 2026 hittad, men laddhybrider har ny viktningsfaktor från 2026.",
      checked: "2026-10-19",
    },
    malusHog: {
      label: "Malus, första tre åren, över 125 g/km",
      value: 132,
      unit: "kr/g",
      source: "Transportstyrelsen, Malus",
      checked: "2026-10-19",
    },
    milersattning: {
      label: "Milersättning, egen bil (skattefri)",
      value: 25,
      unit: "kr/mil",
      source: "Skatteverket (läst som utdrag), 2025 och 2026",
      checked: "2026-10-19",
    },
    reseavdragGrans: {
      label: "Reseavdrag, avdrag bara för kostnad över (inkomståret 2026)",
      value: 15000,
      unit: "kr",
      source: "Skatteverket. Gränsen var 11 000 kr t.o.m. 2025. Lagtext inte läst.",
      checked: "2026-10-19",
    },
    referensranta: {
      label: "Referensränta (Riksbanken, 1 juli–31 dec 2026)",
      value: 0.02,
      unit: "andel",
      source: "Riksbanken, enligt 9 § räntelagen",
      checked: "2026-10-19",
    },
    kreditRantetakPaslag: {
      label: "Konsumentkredit, högsta ränta: referensränta plus",
      value: 0.2,
      unit: "andel",
      source: "Konsumentkreditlagen 19 a §. Förs över oförändrat till ny lag från 2026-11-20 (civilutskottet CU26). Taket 22 % är egen uträkning.",
      checked: "2026-10-19",
    },
    droejsmalPaslag: {
      label: "Dröjsmålsränta: referensränta plus",
      value: 0.08,
      unit: "andel",
      source: "Räntelagen 6 § (riksdagen.se). 10 % är egen uträkning.",
      checked: "2026-10-19",
    },
    uppl: {
      label: "Konsumentkredit, högsta uppläggningsavgift (andel av prisbasbeloppet)",
      value: 0.01,
      unit: "andel",
      source: "Konsumentkreditlagen 19 c §",
      checked: "2026-10-19",
    },
    paminnelseavgift: {
      label: "Påminnelseavgift, högst (om avtalad)",
      value: 60,
      unit: "kr",
      source: "Kronofogden",
      checked: "2026-10-19",
    },
    inkassoavgift: {
      label: "Inkassokostnad per krav, högst",
      value: 180,
      unit: "kr",
      source: "Inkassolagen 5 § via Kronofogden",
      checked: "2026-10-19",
    },
    betalningsforelaggande: {
      label: "Ansökan om betalningsföreläggande",
      value: 300,
      unit: "kr",
      source: "Kronofogden",
      checked: "2026-10-19",
    },
    arnAvgift: {
      label: "Ansökningsavgift till ARN",
      value: 150,
      unit: "kr",
      source: "ARN",
      checked: "2026-10-19",
    },
    passAvgift: {
      label: "Pass, avgift",
      value: 500,
      unit: "kr",
      source: "Polisen, vanliga frågor om pass (granskad 2026-09-30)",
      checked: "2026-10-19",
    },
    idkortAvgift: {
      label: "Nationellt ID-kort, avgift",
      value: 400,
      unit: "kr",
      source: "Polisen (granskad 2026-09-30)",
      checked: "2026-10-19",
    },
    provPassAvgift: {
      label: "Provisoriskt pass, avgift",
      value: 980,
      unit: "kr",
      source: "Polisen (granskad 2026-09-30)",
      checked: "2026-10-19",
    },
    paketPrishojning: {
      label: "Paketresa: du får frånträda avtalet om prishöjningen överstiger",
      value: 0.08,
      unit: "andel",
      source: "Paketreselagen (2018:1217) 3 kap. 5 §, via sammanfattning av lagen.nu",
      checked: "2026-10-19",
    },
    hundReg: {
      label: "Registrering av hund i Jordbruksverkets register (e-tjänst)",
      value: 40,
      unit: "kr",
      source: "Jordbruksverket, märk och registrera hundar. Blankett: 100 kr. Avgift för ägarbyte i e-tjänst är inte verifierad.",
      checked: "2026-10-19",
    },
    hundRegBlankett: {
      label: "Registrering eller ägarbyte av hund via blankett",
      value: 100,
      unit: "kr",
      source: "Jordbruksverket, märk och registrera hundar",
      checked: "2026-10-19",
    },
  },

  // Konsumentverket, Hushållskostnader 2026. Covers only ca 40 % of a household's costs:
  // housing, travel, childcare, dental, medicine, holidays, restaurants and gifts are NOT included.
  konsumentverket: {
    source: "Konsumentverket, Hushållskostnader 2026 (PDF, 2025-11-04)",
    checked: "2026-10-19",
    adult: {
      food: 2730, // vuxen 25-50 år, per månad
      other: 2140, // kläder 820, fritid 600, mobil 130, hygien 590
      parts: { "Kläder och skor": 820, Fritid: 600, Mobil: 130, Hygien: 590 },
    },
    // Gemensamma kostnader per månad, index = antal personer i hushållet
    sharedByPeople: { 1: 3530, 2: 4390, 3: 5500, 4: 6530 },
    child: {
      // [åldersgrupp, övriga poster, mat] per månad
      "0": [2920, 1030],
      "1-3": [2730, 1100],
      "4-6": [2000, 1710],
      "7-10": [2090, 2130],
      "11-14": [2070, 2650],
      "15-17": [2390, 3050],
    },
  },


  // Rules of thumb from industry sources (HSB/Bostadsrättskollen, secondary), NOT law and no official thresholds exist.
  // Debt and savings per sqm must be compared on the same area basis (all sqm incl. commercial vs residential only).
  brfGuides: {
    source: "Branschriktmärken (sekundärkällor). Inga officiella trösklar hos Boverket eller BFN.",
    checked: "2026-10-19",
    debtOk: 10000, // kr/kvm: up to this is low to normal
    debtBad: 15000, // above this is "very high"
    savingOk: 200, // kr/kvm: at or above is medium to high
    savingBad: 120, // below this is "very low"
    feeRaiseWarn: 5, // % per year
    floatingWarn: 40, // % of loans with floating rate
    planOldYears: 10,
    commercialWarn: 30, // % of income from commercial premises
  },

  // Legal facts used by the Sambo module. Paraphrased from law texts; see `unverified` for what could not be read in primary text.
  legal: {
    checked: "2026-10-19",
    sources: [
      "Sambolag (2003:376), lagen.nu och riksdagen.se: 1, 3, 4, 8, 9, 13, 14, 15, 16, 17, 18, 22, 23 §§",
      "Ärvdabalken (1958:637): 2 kap. 1–4 §§, 7 kap. 1 §, 10 kap. 1 §, 20 kap. 1 och 8 §§",
      "Försäkringsavtalslag (2005:104) 14 kap. 1–3, 6 §§",
      "Skuldebrevslagen (1936:81) 2 §",
    ],
    unverified: [
      "Vad som gäller för förmånstagare till livförsäkring när inget förordnande finns",
      "Efterlevandeskydd i tjänstepension och allmän pension för sambor",
      "Att laglotten bara gäller bröstarvingar, och 7 kap. 3 § (testamente och laglott)",
      "Om bil och andra tillgångar räknas som bohag (sambolagen 3 §)",
      "Detaljer i 13 § (skuldavräkning) och 15 § (jämkning): läst som sammanfattning, inte som originaltext",
      "Att medlåntagares andelar är lika stora om inget annat avtalats",
    ],
    bodelningMonths: 12, // 8 §
    uttagPBB: 2, // 18 §: two price base amounts for the year of death
    bouppteckningMonths: 3, // ÄB 20 kap. 1 §
  },

  // Notes for the Buffert och sparande module.
  sparande: {
    checked: "2026-10-19",
    sources: [
      "Skatteverket: ISK och belopp och procent 2026",
      "Riksgälden: insättningsgarantin (1 150 000 kr från 1 januari 2026)",
      "Finansinspektionen: fem tips för ditt sparande (2–3 månaders nödvändiga utgifter)",
      "IAF: ny arbetslöshetsförsäkring från 1 oktober 2025",
      "Försäkringskassan: aktuella belopp (SGI-tak 592 000 kr)",
    ],
    unverified: [
      "A-kassans nedtrappning efter 100 och 200 dagar: källorna skiljer sig åt",
      "A-kassans dagtak 2026, karens och grundbelopp för icke-medlemmar",
      "Kapitalunderlagets beräkning för kapitalförsäkring",
      "Fonder på vanligt depåkonto och kvittning av förluster",
      "Att ISK:s grundnivå gäller per person (ISK har bara en innehavare)",
      "Neutral vägledning om att amortera eller spara hittades inte. Jämförelsen är en egen förenkling",
    ],
  },

  // Notes for the Bil module.
  bil: {
    checked: "2026-10-19",
    sources: [
      "Transportstyrelsen: fordonsskatt, malus, skattskyldighet, trängselskatt, besiktning, vinterdäck",
      "Konsumentverket: köpa bil av handlare eller privatperson, ångerrätt, leasa bil",
      "Skatteverket: milersättning och reseavdrag",
      "Regeringen: elbilspremie (pressmeddelanden 2025-12-18 och 2026-03-12)",
    ],
    unverified: [
      "Värdeminskning, försäkringspremier, däckpriser, drivmedelspriser och billånsränta: inga primärkällor. Fyll i egna siffror",
      "Elbilars fordonsskatt: formeln ger grundbelopp, men sidan säger det inte uttryckligen",
      "Skatt för laddhybrider registrerade från 2026 (ny viktningsfaktor)",
      "Hur samägd bil mellan sambor behandlas hos Transportstyrelsen",
      "Trafikförsäkringsavgiftens belopp vid utebliven försäkring",
      "Reseavdragets 15 000 kr i lagtext och Naturvårdsverkets premiesida",
      "Privatleasing: ingen särskild lag, avtalet styr",
    ],
  },

  // Barn module. Sources: Försäkringskassan, Skolverket, Pensionsmyndigheten, Konsumentverket, lagen.nu/riksdagen.
  barn: {
    checked: "2026-10-19",
    sgiTak: 592000, // 10 prisbasbelopp, Försäkringskassan aktuella belopp
    fp: {
      total: 480, sick: 390, low: 90, lowAmount: 180, reservedEach: 90, doubleDays: 60, saveMax: 96,
      maxPerDay: 1259, minPerDay: 250, minSgiMonth: 7083,
      factor: 0.97, // not stated on the FK page, but reproduces the confirmed maximum 1 259 kr/day
    },
    vabDays: 120,
    flerbarn: { 2: 150, 3: 730, 4: 1740, extraPerChildFrom5: 1250 }, // total supplement per household by number of children
    underhall: [1673, 1823, 2223], // up to 7 years, from 7, from 15
    maxtaxa: {
      incomeCap: 61560, // household income above this counts as the cap; 10 000 deducted first
      deduction: 10000,
      basisCap: 51560,
      forskola: [0.03, 0.02, 0.01, 0],
      fritids: [0.02, 0.01, 0.01, 0],
    },
    barnarPensionTak: 672600,
    sources: [
      "Försäkringskassan: föräldrapenning, dubbeldagar, vab, aktuella belopp, bostadsbidrag, graviditetspenning, tandvårdsstöd",
      "Skolverket: statsbidrag för maxtaxa 2026 (gäller från 2026-07-01)",
      "Förordning (2001:160) om maxtaxa 4 §, Föräldrabalken 1, 6, 7 kap., Föräldraledighetslag (1995:584)",
      "Pensionsmyndigheten: småbarnstiden och pensionen (barnår)",
      "Konsumentverket: Hushållskostnader 2026",
    ],
    unverified: [
      "Föräldrapenning för ensamstående och beslutade ändringar (ett förslag om 460 dagar bereds, ej beslutat)",
      "Faktorn 0,97 i dagbeloppet står inte på Försäkringskassans sida, men ger det bekräftade maxbeloppet",
      "Bostadsbidragets inkomstgränser och om maxbeloppen gäller per månad",
      "Studiebidrag och exakta åldersgränser för barnbidrag (appen räknar barnbidrag till 15 år)",
      "Vilket barn som räknas som barn 1 i maxtaxan (appen antar yngsta först)",
      "Kommunernas egna lägre avgifter och kostnad för barnomsorg utöver maxtaxan",
      "Beskattning av föräldrapenning (sekundär), föräldraledighetslagens 16 §, skollagen",
      "Barnförsäkring, förmyndare och god man",
    ],
  },

  // Köpbeslut module.
  kop: {
    checked: "2026-10-19",
    sources: [
      "Konsumentköplag (2022:260): 4 kap. 13–18 §§, 5 kap. 2–10 §§, 8 kap. 2 §, 9 kap.",
      "Lag (2005:59) om distansavtal och avtal utanför affärslokaler: 2 kap. 10–15 §§",
      "Konsumentkreditlag (2010:1846): 2, 12, 13, 19 a–c, 21–25, 29, 32, 36 §§ (upphävs 2026-11-20 av ny konsumentkreditlag)",
      "Räntelag (1975:635) 6 och 9 §§, Riksbanken: referensränta",
      "Kronofogden: avgifter, betalningsanmärkning, skuldsanering, vad man gör om man inte kan betala",
      "Konsumentverket: garanti och reklamation, invändningsrätt, kommunal budget- och skuldrådgivning",
      "Köplag (1990:931) 17, 19, 32, 33 §§",
    ],
    unverified: [
      "Belopp som kräver samråd, betänketid och kostnad per användning är era egna inställningar. Ingen källa styrker ett visst värde",
      "Kortreklamation, Swish och utlandsköp: ingen primärkälla öppnades. Särskild kortköpsparagraf hittades inte",
      "Ny konsumentkreditlag från 2026-11-20: det nya undantaget för räntefri kredit (50 dagar) och kreditprövningskravet för det",
      "Abonnemang, bindningstid och ARN:s ansökningsregler: bara sökutdrag från Konsumentverket och ARN",
      "Kreditupplysningars effekt på kreditbetyg och typiska räntor på kreditkort och blancolån: ingen primärkälla",
      "Betalningsanmärkningens konsekvenser för bolån, hyra och abonnemang",
      "Konsumenttjänstlagens aktuella status och ägarförbehåll",
      "Effektiv ränta i appen är en uppskattning, inte lagens beräkning",
    ],
  },

  // Överenskommelser module. Helpline numbers verified against the organisations' own sites on 2026-10-19; recheck before relying on them.
  avtal: {
    checked: "2026-10-19",
    helplines: [
      { name: "Kvinnofridslinjen", number: "116016", shown: "116 016", info: "Dygnet runt, gratis och anonymt. Stöd vid våld i nära relationer, även ekonomiskt våld." },
      { name: "Brottsofferjouren", number: "116006", shown: "116 006", info: "Stödlinje. Vardagar 09–19, helger 09–12 och 13–16." },
      { name: "Polisen, icke akut", number: "11414", shown: "114 14", info: "Dygnet runt." },
      { name: "112", number: "112", shown: "112", info: "Vid pågående brott eller fara." },
    ],
    sources: [
      "Sambolag (2003:376) 3 och 9 §§ (riksdagen.se)",
      "Jordabalken 4 kap. 1 och 29 §§: köpehandling och gåva av fast egendom",
      "Socialtjänstlag (2025:400) 13 kap. 4 §: familjerådgivning",
      "Kvinnofridslinjen, Brottsofferjouren, Polisen: telefonnummer och öppettider",
      "Brottsbalken 4 kap. 4 och 4 a §§",
    ],
    unverified: [
      "Om en ekonomisk överenskommelse mellan sambor är juridiskt bindande (avtalslagen är inte läst). Behandla den som en överenskommelse mellan er",
      "Formkrav för gåva av pengar och bostadsrätt, och om 'vi delar lika på allt' gör något gemensamt ägt",
      "Hur ett gemensamt bankkonto ägs och om en kontohavare får ta ut allt (bara sekundärkällor)",
      "Definition och exempel på ekonomiskt våld från NCK, Brå och Socialstyrelsen. Jämställdhetsmyndighetens indelning är sekundär",
      "Kostnad och bokning av familjerådgivning, och Mansjouren eller andra stödlinjer för män",
      "Pensionsskillnaden mellan kvinnor och män (74 %) och Konsumentverkets råd om par och pengar: bara sökutdrag",
    ],
  },

  // Resor och nöje module.
  resor: {
    checked: "2026-10-19",
    ud: { name: "UD-jouren", number: "+4684055005", shown: "08-405 50 05", info: "Bemannad dygnet runt för akuta ärenden utomlands." },
    sources: [
      "Semesterlag (1977:480), riksdagen.se: 3, 4, 12, 15, 16 a, 17, 17 a, 18 §§ (läst bara t.o.m. SFS 2014:424)",
      "Paketreselag (2018:1217), Resegarantilag (2018:1218), Konsumentverket om paketresor, Kammarkollegiet",
      "Flygpassagerares rättigheter, förordning (EG) 261/2004, via Konsumentverket och Your Europe",
      "Konsumenternas försäkringsbyrå: reseförsäkring; Försäkringskassan: EU-kortet",
      "Polisen: pass, nationellt id-kort och resa med barn; Tullverket: ta med på resan; regeringen.se: UD:s reseinformation",
    ],
    unverified: [
      "Semesterlagens paragrafnummer och senare ändringar än 2014: kontrollera lagen eller ditt avtal",
      "Tullverkets tullfria mängder och värdegräns, roaming och EU:s regler om valutapåslag (inga siffror används)",
      "EU:s reform av flygpassagerarreglerna: bara söksammanfattningar, ikraftträdande okänt",
      "Tågpassagerares ersättning (25 % och 50 %) bygger på en söksammanfattning av förordning 2021/782",
      "Bagage och egendom i hemförsäkringens reseskydd, och ångerrätt för enbart flyg eller hotell",
      "Preskriptionstid för paketresor och resegarantilagens paragrafer",
      "Barnpass ingen separat avgift hittad, och EU-kortets giltighet (tre år) är sökutdrag",
    ],
  },

  // Djur module.
  djur: {
    checked: "2026-10-19",
    // SKK:s exempel, golden retriever (tik), Stockholm, priser januari 2026. Ett enskilt exempel, inte ett genomsnitt.
    skk: {
      source: "Svenska Kennelklubben, Vad kostar det att ha hund (priser januari 2026)",
      first: { total: 49010, items: [["Inköp", 25000], ["Foder", 10000], ["Vaccination", 820], ["Försäkring", 6600], ["Bajspåsar", 450], ["Tillbehör", 1900], ["HD/AD-röntgen och ögonlysning", 4240]] },
      after: { total: 20970, items: [["Foder", 9000], ["Vaccination", 820], ["Försäkring", 9000], ["Tillbehör", 1700], ["Bajspåsar", 450]] },
    },
    // Konsumenternas försäkringsbyrå: veterinärvårdsbelopp per år i hundförsäkringar.
    vetCover: { bas: [20000, 59000], mellan: [60000, 89000], stor: [90000, 175000] },
    sources: [
      "Lag (2007:1150) om tillsyn över hundar och katter: 2, 3, 16, 19 §§ (riksdagen.se)",
      "Djurskyddslag (2018:1192): 2 kap. 1 och 4 §§, 9 kap. 1–2 §§",
      "Jordbruksverket: märk och registrera hundar, reseguide för hundar och katter",
      "Konsumentköplag (2022:260): 4 kap. 14, 17–19 §§, 5 kap. 2 §",
      "Svenska Kennelklubben: kostnader; Konsumenternas försäkringsbyrå: hundförsäkringar och ansvarsskydd",
      "SJVFS 2020:8 om hållande av hund och katt (via lagen.nu, sekundär källa)",
    ],
    unverified: [
      "Kattregistrering: lagen säger att katt ska märkas, men ålder och avgift 2026 är inte kontrollerade",
      "Avgift för ägarbyte av hund i e-tjänsten, och att det inte finns hundskatt (bara att ingen hittades)",
      "Föreskriftens detaljer (SJVFS 2020:8): 8 veckor för valpar, 12 veckor för kattungar och rastning var sjätte timme är sekundärkälla",
      "Lokala koppeltvång i kommunernas ordningsföreskrifter",
      "Köp av djur från privatperson (köplagen) och Konsumentverkets köpråd",
      "Priser för katt, veterinärvård, hunddagis och djurvakt: ingen källa. Fyll i egna siffror",
      "Försäkringspremier, karenstid, självrisk och tecknandeålder: inga bekräftade siffror",
      "Att djur normalt inte är bohag och hur djur delas vid separation: bara sekundärkällor, ingen lagstadgad vårdnad hittad",
      "Veterinärers prisinformationsplikt (Konsumentverket utreder frågan, rapport senast 2027-03-01)",
    ],
  },

  // Market reference rates shown as context for the interest-rate slider. They change often.
  market: {
    checked: "2026-10-19",
    source: "SCB, finansmarknadsstatistik augusti 2026 (nya avtal) och Riksbankens beslut 2026-09-24",
    floating: 2.73, // %, rörlig ränta
    fixed1to5: 3.18, // %, bunden 1–5 år
    policyRate: 1.75, // %, styrränta
  },

  models: {
    proportional: {
      name: "Proportionell",
      text: "Gemensamma kostnader delas efter hur stor del av hushållets inkomst var och en har.",
    },
    equalLeft: {
      name: "Lika kvar",
      text: "Båda har lika mycket kvar efter gemensamt och eget. Den som tjänar mer betalar mer.",
    },
    half: {
      name: "50/50",
      text: "Gemensamma kostnader delas lika. Enkelt, men tyngre för den som tjänar mindre.",
    },
  },
};

// Values derived from others are computed once here so they cannot drift apart.
(function () {
  const R = window.RULES;
  R.barn.sgiTak = R.values.sgiTak.value;
  R.values.pantsattningsavgift.value = Math.round(R.values.prisbasbelopp.value * 0.01);
  R.values.overlatelseavgift.value = Math.round(R.values.prisbasbelopp.value * 0.025);
})();

window.RULES.staleKeys = function () {
  const now = Date.now();
  const limit = window.RULES.STALE_DAYS * 86400000;
  const stale = [];
  for (const [key, v] of Object.entries(window.RULES.values)) {
    if (now - new Date(v.checked).getTime() > limit) stale.push(key);
  }
  if (now - new Date(window.RULES.konsumentverket.checked).getTime() > limit) stale.push("konsumentverket");
  if (now - new Date(window.RULES.brfGuides.checked).getTime() > limit) stale.push("brfGuides");
  if (now - new Date(window.RULES.legal.checked).getTime() > limit) stale.push("legal");
  if (now - new Date(window.RULES.sparande.checked).getTime() > limit) stale.push("sparande");
  if (now - new Date(window.RULES.bil.checked).getTime() > limit) stale.push("bil");
  if (now - new Date(window.RULES.barn.checked).getTime() > limit) stale.push("barn");
  if (now - new Date(window.RULES.kop.checked).getTime() > limit) stale.push("kop");
  if (now - new Date(window.RULES.avtal.checked).getTime() > limit) stale.push("avtal");
  if (now - new Date(window.RULES.market.checked).getTime() > 30 * 86400000) stale.push("market");
  if (now - new Date(window.RULES.resor.checked).getTime() > limit) stale.push("resor");
  if (now - new Date(window.RULES.djur.checked).getTime() > limit) stale.push("djur");
  return stale;
};
