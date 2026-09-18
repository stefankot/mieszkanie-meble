import Fuse from 'fuse.js'

/* ============================================================
   OFFLINE INTERPRETER POLECEŃ (bez API)
   ------------------------------------------------------------
   Nie ma utrzymywanej biblioteki NLU dla polskiego, więc jak w poprzedniej wersji projektu
   (paczka „logika bez UI”, `jezyk.js`): leksykon + obcinanie końcówek + Fuse na literówki i odmianę.
   Różnica: słownik celów jest budowany z ŻYWEJ sceny — nazwy mebli, grup materiałów, świateł i pokoi —
   więc „materac”, „regał w kuchni” czy „lampa w salonie” trafiają bez modelu językowego.
   Wynik to lista operacji z rejestru (ta sama droga co UI), więc działa Cofnij/Ponów.
   ============================================================ */
const OGONKI: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }
export const bezOgonkow = (s: string) => s.toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => OGONKI[c])
const KONCOWKI = ['iami', 'ami', 'ach', 'owi', 'emu', 'ego', 'owe', 'owa', 'owy', 'ymi', 'ych', 'ow', 'om', 'em', 'ie', 'ia', 'iu', 'y', 'i', 'a', 'e', 'u', 'o']
export function rdzen(w: string) {
  let s = bezOgonkow(String(w))
  for (const k of KONCOWKI) if (s.length - k.length >= 4 && s.endsWith(k)) return s.slice(0, -k.length)
  return s
}

const LICZEBNIKI: Record<string, number> = { zero: 0, jeden: 1, jedna: 1, jedno: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10, jedenascie: 11, dwanascie: 12 }
const JEDNOSTKI: Record<string, number> = { mm: 0.1, cm: 1, m: 100, metr: 100, metry: 100, metrow: 100 }
const STOPKI = new Set(['kolor', 'kolorze', 'kolorem', 'barwa', 'na', 'w', 'we', 'z', 'ze', 'do', 'od', 'po', 'o', 'u', 'za', 'przy', 'i', 'a', 'to', 'ten', 'ta', 'te', 'tego', 'tej', 'tym', 'sie', 'jest', 'sa', 'ma', 'mam', 'zrob', 'zrobic', 'daj', 'chce', 'prosze', 'moze', 'niech', 'troche', 'bardzo', 'teraz', 'tutaj', 'tu', 'the', 'a', 'an', 'of', 'to', 'for', 'and', 'with', 'this', 'that', 'please', 'make', 'set', 'change'])

export const BARWY: Record<string, string> = {
  bialy: '#f2efe8', biel: '#f2efe8', czarny: '#151515', grafitowy: '#2f3134', grafit: '#2f3134', antracyt: '#33363a',
  szary: '#8d8d88', popielaty: '#a8a49b', kremowy: '#e8dcc4', krem: '#e8dcc4', bezowy: '#d9c8a8', piaskowy: '#cdb894',
  brazowy: '#6b4a2f', braz: '#6b4a2f', orzech: '#5d4032', dab: '#c69c6d', debowy: '#c69c6d', buk: '#d8bd99', sosna: '#d9b88a',
  czerwony: '#9c3025', bordowy: '#5e2020', burgund: '#6f2230', ceglasty: '#a04b32', pomaranczowy: '#c2661f', koralowy: '#ff8a70',
  zolty: '#d6b23c', musztardowy: '#b9902f', zielony: '#3f6b46', oliwkowy: '#6b6b3a', butelkowy: '#2c4a34',
  pistacjowy: '#b5cd8f', mietowy: '#8fbfa8', szalwiowy: '#9aab8e', niebieski: '#2f5c8a', granatowy: '#22314a',
  kobaltowy: '#2e4fa0', kobalt: '#2e4fa0', blekitny: '#9fc4e0', turkusowy: '#2f7d7d', fioletowy: '#5a3f6b',
  sliwkowy: '#4a2f42', rozowy: '#c08a94', pudrowy: '#e3c4c0', srebrny: '#b9bec2', zloty: '#c9a227', miedziany: '#a55f3a',
  white: '#f2efe8', black: '#151515', grey: '#8d8d88', gray: '#8d8d88', cream: '#e8dcc4', beige: '#d9c8a8',
  brown: '#6b4a2f', oak: '#c69c6d', red: '#9c3025', burgundy: '#5e2020', orange: '#c2661f', yellow: '#d6b23c',
  green: '#3f6b46', olive: '#6b6b3a', mint: '#8fbfa8', pistachio: '#b5cd8f', blue: '#2f5c8a', navy: '#22314a',
  cobalt: '#2e4fa0', turquoise: '#2f7d7d', purple: '#5a3f6b', pink: '#c08a94', silver: '#b9bec2', gold: '#c9a227'
}

/* Kontekst ze sceny — bez niego interpreter zna tylko słowa ogólne. */
export interface Cel { id: string; etykieta: string; slowa: string[] }
export interface Kontekst {
  meble: Cel[]
  grupy: Record<string, Cel[]>
  swiatla: Cel[]
  pokoje: Cel[]
  presety: string[]
  palety: { id: string; nazwa: string }[]
  zaznaczenie: string | null
}

export interface Zrozumiane {
  operacje: { nazwa: string; dane: Record<string, unknown> }[]
  wyjasnienie: string
  pytanie?: { tekst: string; opcje: { etykieta: string; tekst: string }[] }
  nierozpoznane: string[]
}

type Wpis = { rodzaj: string; [k: string]: unknown }
const SLOWNIK: { formy: string[]; wpis: Wpis }[] = [
  { formy: ['otworz', 'otwarte', 'rozchyl', 'open'], wpis: { rodzaj: 'stanRuchu', otwarty: true } },
  { formy: ['zamknij', 'zamkniete', 'close', 'shut'], wpis: { rodzaj: 'stanRuchu', otwarty: false } },
  { formy: ['wlacz', 'zapal', 'zaswiec', 'on'], wpis: { rodzaj: 'przelacznik', wlaczone: true } },
  { formy: ['wylacz', 'zgas', 'off'], wpis: { rodzaj: 'przelacznik', wlaczone: false } },
  { formy: ['ukryj', 'schowaj', 'hide'], wpis: { rodzaj: 'widocznosc', widoczny: false } },
  { formy: ['pokaz', 'odkryj', 'show'], wpis: { rodzaj: 'widocznosc', widoczny: true } },
  { formy: ['polka', 'polki', 'polek', 'shelf', 'shelves'], wpis: { rodzaj: 'licznik', pole: 'polki' } },
  { formy: ['kolumna', 'kolumny', 'kolumn', 'column', 'columns'], wpis: { rodzaj: 'licznik', pole: 'kolumny' } },
  { formy: ['drzwiczki', 'drzwi', 'skrzydlo', 'door', 'doors'], wpis: { rodzaj: 'mechanizm', fraza: 'drzwi' } },
  { formy: ['szuflada', 'szuflady', 'szuflad', 'drawer', 'drawers'], wpis: { rodzaj: 'mechanizm', fraza: 'szuflad' } },
  { formy: ['rowno', 'rownomiernie', 'rowny', 'equal', 'even'], wpis: { rodzaj: 'rozklad', wartosc: 'rowne' } },
  { formy: ['fibonacci', 'zlotypodzial'], wpis: { rodzaj: 'rozklad', wartosc: 'fibonacci' } },
  { formy: ['losowo', 'losowy', 'przypadkowo', 'random'], wpis: { rodzaj: 'rozklad', wartosc: 'losowe' } },
  { formy: ['lumen', 'lumeny', 'lumenow', 'lm'], wpis: { rodzaj: 'jednostkaSwiatla' } },
  { formy: ['jasniej', 'mocniej', 'brighter'], wpis: { rodzaj: 'jasnosc', mnoznik: 1.6 } },
  { formy: ['ciemniej', 'slabiej', 'dimmer'], wpis: { rodzaj: 'jasnosc', mnoznik: 0.6 } },
  { formy: ['cieplej', 'cieplo', 'warmer'], wpis: { rodzaj: 'barwaSwiatla', kelwiny: 2700 } },
  { formy: ['chlodniej', 'zimniej', 'cooler'], wpis: { rodzaj: 'barwaSwiatla', kelwiny: 4000 } },
  { formy: ['swiatlo', 'swiatla', 'lampa', 'lampy', 'lamp', 'light', 'lights', 'oswietlenie'], wpis: { rodzaj: 'swiatlo' } },
  { formy: ['led', 'ledy', 'listwa', 'podswietlenie'], wpis: { rodzaj: 'swiatlo', led: true } },
  { formy: ['cofnij', 'undo'], wpis: { rodzaj: 'operacja', nazwa: 'project.undo' } },
  { formy: ['ponow', 'redo'], wpis: { rodzaj: 'operacja', nazwa: 'project.redo' } },
  { formy: ['eksportuj', 'eksport', 'export'], wpis: { rodzaj: 'operacja', nazwa: 'project.exportJson' } },
  { formy: ['zapisz', 'wersja', 'wersje', 'save'], wpis: { rodzaj: 'operacja', nazwa: 'project.saveVersion' } },
  { formy: ['gory', 'gora', 'lotu', 'ptaka', 'top'], wpis: { rodzaj: 'operacja', nazwa: 'camera.topView' } },
  { formy: ['kadruj', 'wykadruj', 'zblizenie', 'frame'], wpis: { rodzaj: 'operacja', nazwa: 'camera.frameSelection' } },
  { formy: ['mapa', 'mape', 'map'], wpis: { rodzaj: 'operacja', nazwa: 'view.toggleMap' } },
  { formy: ['renderuj', 'render', 'zdjecie', 'wizualizacja', 'wizualizacje'], wpis: { rodzaj: 'operacja', nazwa: 'render.ai' } },
  { formy: ['tekstura', 'teksture', 'texture'], wpis: { rodzaj: 'tekstura' } },
  { formy: ['przejdz', 'idz', 'przenies', 'goto'], wpis: { rodzaj: 'przejdz' } },
  { formy: ['zaznacz', 'wybierz', 'select'], wpis: { rodzaj: 'zaznacz' } },
  { formy: ['wstaw', 'dodaj', 'postaw', 'add', 'insert'], wpis: { rodzaj: 'dodaj' } },
  { formy: ['usun', 'skasuj', 'wywal', 'remove', 'delete'], wpis: { rodzaj: 'usun' } },
  { formy: ['paleta', 'palete', 'palette'], wpis: { rodzaj: 'paleta' } },
  { formy: ['material', 'materialem', 'wykonczenie', 'finish'], wpis: { rodzaj: 'material' } }
]

const INDEKS = SLOWNIK.flatMap(({ formy, wpis }) => formy.map((f) => ({ r: rdzen(f), wpis })))
  .concat(Object.entries(BARWY).map(([n, hex]) => ({ r: rdzen(n), wpis: { rodzaj: 'barwa', hex } as Wpis })))
const FUSE = new Fuse(INDEKS, { keys: ['r'], includeScore: true, threshold: 0.3, ignoreLocation: true, minMatchCharLength: 3 })
const PROG = 0.24

function dopasujSlowo(token: string) {
  if (STOPKI.has(bezOgonkow(token))) return null
  const r = rdzen(token)
  const dokladne = INDEKS.find((p) => p.r === r)
  if (dokladne) return dokladne.wpis
  if (r.length < 4) return null
  const [hit] = FUSE.search(r, { limit: 1 })
  if (!hit || (hit.score ?? 1) > PROG) return null
  // Odmiana nie zmienia pierwszej litery ani długości o więcej niż kilka znaków.
  const kand = hit.item.r
  return kand[0] === r[0] && Math.abs(kand.length - r.length) <= 3 ? hit.item.wpis : null
}

/* Dopasowanie celu ze sceny: liczy trafione słowa nazwy (rdzenie), remis → pytanie. */
function dopasujCel(cele: Cel[], tokeny: string[]) {
  const rdzenie = tokeny.map(rdzen)
  const oceny = cele
    .map((c) => ({ cel: c, punkty: c.slowa.filter((s) => rdzenie.some((r) => r === s || (r.length >= 4 && s.startsWith(r)) || (s.length >= 4 && r.startsWith(s)))).length }))
    .filter((o) => o.punkty > 0)
    .sort((a, b) => b.punkty - a.punkty)
  if (!oceny.length) return { cel: null as Cel | null, remis: [] as Cel[] }
  const najlepsze = oceny.filter((o) => o.punkty === oceny[0].punkty).map((o) => o.cel)
  return { cel: najlepsze[0], remis: najlepsze.length > 1 ? najlepsze : [] }
}

export const slowaCelu = (tekst: string) => bezOgonkow(tekst).split(/[^0-9a-z]+/).filter((w) => w.length > 2 && !STOPKI.has(w)).map(rdzen)

export function zinterpretuj(tekst: string, k: Kontekst): Zrozumiane {
  const operacje: Zrozumiane['operacje'] = []
  const opis: string[] = []
  const nierozpoznane: string[] = []
  const hex = [...tekst.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => (m[1].length === 3 ? `#${[...m[1]].map((c) => c + c).join('')}` : `#${m[1]}`).toLowerCase())
  const tokeny = bezOgonkow(tekst.replace(/#[0-9a-f]{3,6}\b/gi, ' ')).split(/[^0-9a-z.,]+/).filter(Boolean)

  const liczby: { wartosc: number; jednostka: string | null; poz: number }[] = []
  const trafienia: Wpis[] = []
  for (let i = 0; i < tokeny.length; i++) {
    const t = tokeny[i]
    if (LICZEBNIKI[t] !== undefined) {
      liczby.push({ wartosc: LICZEBNIKI[t], jednostka: null, poz: i })
      continue
    }
    const m = t.match(/^(\d+(?:[.,]\d+)?)([a-z]*)$/)
    if (m) {
      const jed = m[2] || (tokeny[i + 1] && JEDNOSTKI[rdzen(tokeny[i + 1])] !== undefined ? tokeny[++i] : '')
      liczby.push({ wartosc: Number(m[1].replace(',', '.')), jednostka: jed ? rdzen(jed) : null, poz: i })
      continue
    }
    const w = dopasujSlowo(t)
    if (w) trafienia.push(w)
    else if (t.length > 2) nierozpoznane.push(t)
  }
  const ma = (rodzaj: string) => trafienia.find((w) => w.rodzaj === rodzaj) as any
  // Przy dwóch barwach wygrywa OSTATNIA: „zielony pistacjowy” to pistacjowy, nie zielony.
  const barwy = trafienia.filter((w) => w.rodzaj === 'barwa') as any[]
  const kolor = hex.at(-1) ?? (barwy.at(-1)?.hex as string | undefined)

  // Cel: mebel z nazwy albo zaznaczenie; grupa materiału po nazwie części (np. „materac”).
  const { cel: mebelZTekstu, remis } = dopasujCel(k.meble, tokeny)
  const preset = k.presety.find((p) => dopasujCel([{ id: p, etykieta: p, slowa: slowaCelu(p) }], tokeny).cel)
  const paleta = k.palety.find((p) => dopasujCel([{ id: p.id, etykieta: p.nazwa, slowa: slowaCelu(p.nazwa) }], tokeny).cel)
  // Słowa zużyte na nazwę presetu/palety nie mogą drugi raz wskazywać części mebla („Burgund mat”).
  const zajete = new Set([...slowaCelu(preset ?? ''), ...slowaCelu(paleta?.nazwa ?? '')])
  const tokenyCzesci = tokeny.filter((t) => !zajete.has(rdzen(t)))
  let mebel = mebelZTekstu?.id ?? k.zaznaczenie ?? null
  let grupa = mebel ? dopasujCel(k.grupy[mebel] ?? [], tokenyCzesci).cel : null
  // Część nazwana wprost („materac”) może należeć do innego mebla niż zaznaczony — wtedy idziemy za nią.
  if (!grupa && !mebelZTekstu) {
    for (const m of k.meble) {
      const trafiona = dopasujCel(k.grupy[m.id] ?? [], tokenyCzesci).cel
      if (trafiona) {
        mebel = m.id
        grupa = trafiona
        break
      }
    }
  }
  const pokoj = dopasujCel(k.pokoje, tokeny).cel

  if (remis.length > 1 && !k.zaznaczenie) {
    return {
      operacje: [], nierozpoznane, wyjasnienie: '',
      pytanie: { tekst: 'Który mebel?', opcje: remis.slice(0, 4).map((c) => ({ etykieta: c.etykieta, tekst: `${tekst} (${c.etykieta})` })) }
    }
  }

  // 1. Globalne operacje bez celu.
  const globalne = trafienia.filter((x) => x.rodzaj === 'operacja') as any[]
  for (const w of globalne) {
    if (w.nazwa === 'render.ai') operacje.push({ nazwa: 'render.ai', dane: { opis: tekst } })
    else if (w.nazwa === 'project.saveVersion') operacje.push({ nazwa: 'project.saveVersion', dane: {} })
    else operacje.push({ nazwa: w.nazwa, dane: {} })
    opis.push(w.nazwa)
  }

  // 2. Kamera i pokoje: „idź do kuchni”, „pokaż salon”.
  if (pokoj && (ma('przejdz') || !trafienia.length || ma('widocznosc')?.widoczny)) {
    operacje.push({ nazwa: 'camera.goToRoom', dane: { pokoj: pokoj.id } })
    opis.push(`przejście do: ${pokoj.etykieta}`)
  }

  // 3. Światło: włącz/wyłącz, lumeny, barwa, jaśniej/ciemniej.
  // Lampy pokoi nazywają się jak pokoje, więc światła bierzemy pod uwagę dopiero przy słowie o świetle.
  const swiatlo = ma('swiatlo') ? dopasujCel(k.swiatla, tokeny).cel : null
  const swiatloWzmianka = ma('swiatlo')
  if (swiatloWzmianka) {
    const przel = ma('przelacznik')
    const lumeny = liczby.find((l) => l.jednostka === null || ['lumen', 'lm'].includes(l.jednostka ?? ''))
    const jasnosc = ma('jasnosc')
    const barwa = ma('barwaSwiatla')
    const dane: Record<string, unknown> = {}
    if (przel) dane.wlaczone = przel.wlaczone
    if (ma('jednostkaSwiatla') && lumeny) dane.lumeny = lumeny.wartosc
    if (barwa) dane.kelwiny = barwa.kelwiny
    if (swiatlo && (Object.keys(dane).length || jasnosc)) {
      operacje.push({ nazwa: 'light.set', dane: { swiatlo: swiatlo.id, ...dane, ...(jasnosc ? { mnoznikJasnosci: jasnosc.mnoznik } : {}) } })
      opis.push(`światło: ${swiatlo.etykieta}`)
    } else if (przel) {
      operacje.push({ nazwa: 'light.setAll', dane: { wlaczone: przel.wlaczone, zakres: ma('swiatlo')?.led ? 'meble' : 'wszystkie' } })
      opis.push(przel.wlaczone ? 'zapalenie świateł' : 'zgaszenie świateł')
    } else if (ma('dodaj')) {
      operacje.push({ nazwa: 'light.add', dane: {} })
      opis.push('nowe światło')
    }
  }

  // 4. Mechanizmy: „otwórz drzwiczki”, „zamknij szuflady”.
  const stan = ma('stanRuchu')
  const mech = ma('mechanizm')
  if (stan && (mech || mebel)) {
    operacje.push({ nazwa: 'furniture.setMechanism', dane: { ...(mebel ? { mebel } : {}), ...(mech ? { mechanizm: mech.fraza } : {}), otwarty: stan.otwarty } })
    opis.push(stan.otwarty ? 'otwarcie' : 'zamknięcie')
  }

  // 5. Układ półek i kolumn.
  const licznik = trafienia.filter((w) => w.rodzaj === 'licznik') as any[]
  const rozklad = ma('rozklad')
  if (licznik.length || rozklad) {
    const dane: Record<string, unknown> = mebel ? { mebel } : {}
    licznik.forEach((l, i) => {
      const n = liczby[i] ?? liczby[0]
      if (n) dane[l.pole] = Math.round(n.wartosc)
    })
    if (rozklad) dane.rozklad = rozklad.wartosc
    if (Object.keys(dane).length > (mebel ? 1 : 0)) {
      operacje.push({ nazwa: 'furniture.setShelfLayout', dane })
      opis.push('układ półek')
    }
  }

  // 6. Materiały i kolory (grupa z nazwy części, np. „materac”). Bez wskazanego mebla nie zgadujemy — niżej pytanie.
  if (preset && mebel) {
    operacje.push({ nazwa: 'material.applyPreset', dane: { ...(mebel ? { mebel } : {}), ...(grupa ? { grupa: grupa.id } : {}), preset } })
    opis.push(`materiał: ${preset}`)
  } else if (paleta && mebel) {
    operacje.push({ nazwa: 'palette.apply', dane: { paleta: paleta.id, ...(mebel ? { mebel } : {}) } })
    opis.push(`paleta: ${paleta.nazwa}`)
  } else if (kolor && mebel && !swiatloWzmianka) {
    operacje.push({ nazwa: 'material.setColor', dane: { ...(mebel ? { mebel } : {}), ...(grupa ? { grupa: grupa.id } : {}), kolor } })
    opis.push(`kolor ${kolor}${grupa ? ` na: ${grupa.etykieta}` : ''}`)
  } else if (ma('tekstura') && mebel && nierozpoznane.length) {
    operacje.push({ nazwa: 'material.generateTexture', dane: { ...(mebel ? { mebel } : {}), ...(grupa ? { grupa: grupa.id } : {}), opis: tekst } })
    opis.push('tekstura z opisu (AI)')
  }

  // 7. Widoczność, zaznaczenie, wstawianie i usuwanie mebli.
  // „pokaż mapę” to jedna myśl — czasownik należy do operacji globalnej, nie do widoczności mebla.
  const widocznosc = globalne.length ? null : ma('widocznosc')
  if (widocznosc && mebel && !pokoj) {
    operacje.push({ nazwa: 'furniture.setVisibility', dane: { mebel, ...(grupa ? {} : {}), widoczny: widocznosc.widoczny } })
    opis.push(widocznosc.widoczny ? 'pokazanie mebla' : 'ukrycie mebla')
  }
  if (ma('zaznacz') && mebelZTekstu) {
    operacje.push({ nazwa: 'furniture.select', dane: { mebel: mebelZTekstu.id } })
    opis.push(`zaznaczenie: ${mebelZTekstu.etykieta}`)
  }
  if (ma('dodaj') && mebelZTekstu && !swiatloWzmianka) {
    operacje.push({ nazwa: 'furniture.insert', dane: { asset: mebelZTekstu.id } })
    opis.push(`wstawienie: ${mebelZTekstu.etykieta}`)
  }
  if (ma('usun') && mebel) {
    operacje.push({ nazwa: 'furniture.remove', dane: { mebel } })
    opis.push('usunięcie kopii')
  }

  // Cel wymagany, a nie ma ani nazwy, ani zaznaczenia → pytanie zamiast zgadywania.
  if (!operacje.length && (kolor || licznik.length || stan || preset || paleta) && !mebel) {
    return {
      operacje: [], nierozpoznane, wyjasnienie: '',
      pytanie: { tekst: 'Do którego mebla?', opcje: k.meble.slice(0, 4).map((c) => ({ etykieta: c.etykieta, tekst: `${tekst} — ${c.etykieta}` })) }
    }
  }
  // Jedno polecenie = jedna operacja danego rodzaju („zapisz wersję” trafia w dwa słowa tego samego wpisu).
  const widziane = new Set<string>()
  const unikalne = operacje.filter((o) => {
    const klucz = `${o.nazwa}|${JSON.stringify(o.dane)}`
    if (widziane.has(klucz)) return false
    widziane.add(klucz)
    return true
  })
  return { operacje: unikalne, wyjasnienie: opis.join(', '), nierozpoznane }
}
