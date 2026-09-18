import type { UstawieniaMaterialu } from '@/meble/material'

import type { Silnik } from './most'

/* Materiał edytora w TSL na obiektach silnika (THREE i TSL z ramki). Suwaki zmieniają tylko uniformy
   (bez kompilacji shadera); przebudowa jest potrzebna wyłącznie przy zmianie struktury (klucz struktury).
   Współrzędne wzoru/tekstury: trójplanarnie w świecie (cm) albo UV siatki. Wypukłości: gradient wysokości
   w przestrzeni ekranu (Mikkelsen), jak BumpMapNode, ale także dla wysokości proceduralnej. */
export const kluczStruktury = (u: UstawieniaMaterialu) =>
  JSON.stringify([u.baza, u.wzor.rodzaj, u.tekstura.zrodlo, u.tekstura.url, u.tekstura.mapy, u.relief.sledzenieWysokosci, u.relief.generatywne, u.niedoskonalosci.wlaczone, u.mapowanie.trojplanarne])

const tekstury = new Map<string, any>()

function odcienZnormalizowany(T: any, hex: string) {
  // Jak silnik (materialy.js → drewno): kolor zmienia odcień skanu, nie jego jasność.
  const c = new T.Color(hex)
  const luma = Math.max(0.05, 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b)
  return [c.r, c.g, c.b].map((v) => v / luma).map((v) => v + (1 - v) * 0.78)
}

export function aktualizujUniformy(s: Silnik, m: any, u: UstawieniaMaterialu) {
  const U = m.userData.uniformy
  if (!U) return
  const T = s.THREE
  const t = u.tekstura
  U.kolor.value.set(u.kolor)
  U.kolor2.value.set(u.wzor.kolor2)
  U.proporcja.value = u.wzor.proporcja
  const [r, g, b] = odcienZnormalizowany(T, u.kolor)
  const [r0, g0, b0] = odcienZnormalizowany(T, m.userData.kolorZrodla ?? '#ffffff')
  U.odcienTekstury.value.set(r / r0, g / g0, b / b0)
  U.eksp.value = t.ekspozycja
  U.kontrast.value = t.kontrast
  U.nasycenie.value = t.nasycenie
  U.temperatura.value = t.temperatura
  U.odcien.value = t.odcien
  U.swiatla.value = t.swiatla
  U.cienie.value = t.cienie
  U.skala.value = 1 / u.mapowanie.skala
  U.obrot.value = (u.mapowanie.obrot * Math.PI) / 180
  U.wypuklosc.value = u.relief.wypuklosc
  U.glebokosc.value = u.relief.glebokosc
  U.skalaSzumu.value = u.relief.skalaSzumu
  U.silaSzumu.value = u.relief.silaSzumu
  U.ziarno.value = u.relief.ziarno
  U.kurz.value = u.niedoskonalosci.kurz
  U.smugi.value = u.niedoskonalosci.smugi
  U.rysy.value = u.niedoskonalosci.rysy
  U.wytarcie.value = u.niedoskonalosci.wytarcie
  m.roughness = u.powierzchnia.chropowatosc
  m.metalness = u.powierzchnia.metalicznosc
  m.clearcoat = u.powierzchnia.lakier
  m.sheen = u.powierzchnia.polysk
  m.name = u.nazwa
}

function obraz(s: Silnik, url: string) {
  if (!tekstury.has(url)) {
    const T = s.THREE
    const t = new T.TextureLoader().load(url, () => s.oznaczZmiane?.())
    t.colorSpace = T.SRGBColorSpace
    t.wrapS = t.wrapT = T.RepeatWrapping
    t.anisotropy = 8
    tekstury.set(url, t)
  }
  return tekstury.get(url)
}

/* Mapy z biblioteki online muszą być w pamięci GPU, zanim zbudujemy materiał — tekstura bez pikseli
   unieważnia cały potok WebGPU. Adresy, których nie udało się wczytać, pomijamy, żeby nie czekać w kółko. */
const nieudaneMapy = new Set<string>()
const mapyOnline = (u: UstawieniaMaterialu): [string, string][] =>
  u.tekstura.zrodlo === 'online'
    ? (Object.entries(u.tekstura.mapy ?? {}).filter(([, url]) => typeof url === 'string' && !nieudaneMapy.has(url)) as [string, string][])
    : []

export const mapyGotowe = (s: Silnik, u: UstawieniaMaterialu) =>
  mapyOnline(u).every(([rodzaj, url]) => (s as any).tekstury?.czyGotowa(url, rodzaj === 'kolor'))

export const wczytajMapy = (s: Silnik, u: UstawieniaMaterialu) =>
  Promise.all(mapyOnline(u).map(([rodzaj, url]) => (s as any).tekstury?.wczytaj(url, { kolor: rodzaj === 'kolor' }).catch(() => nieudaneMapy.add(url))))

/* `zrodlo` — materiał, który grupa miała w silniku (skan, normal map, kolor zadeklarowany w modelu). */
export function zbudujMaterial(s: Silnik, u: UstawieniaMaterialu, zrodlo?: any) {
  const T = s.THREE
  const L = T.TSL
  const m = new T.MeshPhysicalNodeMaterial({ clearcoatRoughness: 0.35, sheenRoughness: 0.6, envMapIntensity: zrodlo?.envMapIntensity ?? 0.8 })
  const U = {
    kolor: L.uniform(new T.Color()),
    kolor2: L.uniform(new T.Color()),
    odcienTekstury: L.uniform(new T.Vector3(1, 1, 1)),
    ...Object.fromEntries(
      ['proporcja', 'eksp', 'kontrast', 'nasycenie', 'temperatura', 'odcien', 'swiatla', 'cienie', 'skala', 'obrot', 'wypuklosc', 'glebokosc', 'skalaSzumu', 'silaSzumu', 'ziarno', 'kurz', 'smugi', 'rysy', 'wytarcie'].map((k) => [k, L.uniform(0)])
    )
  } as Record<string, any>
  m.userData = { uniformy: U, struktura: kluczStruktury(u), kolorZrodla: zrodlo?.userData?.kolorDrewna ?? '#ffffff' }

  const cs = L.cos(U.obrot)
  const sn = L.sin(U.obrot)
  const obroc = (v: any) => L.vec2(v.x.mul(cs).sub(v.y.mul(sn)), v.x.mul(sn).add(v.y.mul(cs)))
  // Obrót odwrotny — wektory styczne (nachylenie, normalna z mapy) wracają z obróconego UV do płaszczyzny rzutu.
  const obrocWstecz = (v: any) => L.vec2(v.x.mul(cs).add(v.y.mul(sn)), v.y.mul(cs).sub(v.x.mul(sn)))
  const pozycja = L.positionWorld
  const wagi = (() => {
    const w = L.normalWorld.abs().pow(L.vec3(4))
    return w.div(w.x.add(w.y).add(w.z))
  })()
  // Wartość z trzech rzutów świata zmieszana wagami normalnej (bez UV) albo z UV siatki.
  const trojplanarnie = (f: (p: any) => any) => {
    if (!u.mapowanie.trojplanarne) return f(obroc(L.uv().mul(U.skala.mul(60))))
    const p = pozycja.mul(U.skala)
    return f(obroc(p.zy)).mul(wagi.x).add(f(obroc(p.xz)).mul(wagi.y)).add(f(obroc(p.xy)).mul(wagi.z))
  }

  let kolor: any
  let wysokosc: any = null          // null = brak pola wysokości, więc bez perturbacji ekranowej
  let bazowaNormalna: any = L.normalView
  let chropowatoscMapy: any = null
  let metalicznoscMapy: any = null

  if (u.baza === 'solid') kolor = U.kolor
  else if (u.baza === 'pattern') {
    const maska = (p: any) => {
      switch (u.wzor.rodzaj) {
        case 'stripes': return L.step(U.proporcja, L.fract(p.x))
        case 'checker': return L.mod(L.floor(p.x).add(L.floor(p.y)), 2)
        case 'grid': return L.max(L.step(L.float(1).sub(U.proporcja.mul(0.3)), L.fract(p.x)), L.step(L.float(1).sub(U.proporcja.mul(0.3)), L.fract(p.y)))
        case 'dots': return L.float(1).sub(L.step(U.proporcja.mul(0.5), L.length(L.fract(p).sub(0.5))))
        case 'herringbone': {
          // Jodełka 1:4 (skala = długość deski). Deski poziome tworzą kratę (1,1)·(4,−4); punkt należy do poziomej,
          // gdy mod(x − floor(y), 8) < 4, w przeciwnym razie do pionowej. Spoiny — pół tonu między kolorami.
          const q = p.mul(4)
          const r = L.mod(q.x.sub(L.floor(q.y)), 8)
          const pionowa = L.step(4, r)
          const r2 = L.mod(q.y.sub(L.floor(q.x)).add(7), 8)
          const blisko = (v: any, d: number) => L.float(1).sub(L.step(0.05, L.min(v, L.float(d).sub(v))))
          const szew = L.mix(L.max(blisko(L.fract(q.y), 1), blisko(L.mod(r, 4), 4)), L.max(blisko(L.fract(q.x), 1), blisko(L.mod(r2, 4), 4)), pionowa)
          return L.mix(pionowa, L.float(0.5), szew)
        }
        default: {
          // Lastryko: odłamki dwóch wielkości z komórek Worleya (odległość euklidesowa).
          const odlamek = (q: any, gestosc: number) => L.step(L.mx_worley_noise_float(L.vec3(q.mul(gestosc), U.ziarno), 1, 0), U.proporcja.mul(0.9))
          return L.max(odlamek(p, 3), odlamek(p.add(7.1), 8))
        }
      }
    }
    kolor = L.mix(U.kolor, U.kolor2, trojplanarnie(maska))
  } else if (u.tekstura.zrodlo === 'online' && u.tekstura.mapy?.kolor && (s as any).tekstury?.czyGotowa(u.tekstura.mapy.kolor, true)) {
    /* Zestaw map z biblioteki online: barwa, normalne, ARM (AO + chropowatość + metaliczność) i wysokość.
       Wszystkie mapy próbkujemy tym samym odwzorowaniem, żeby się nie rozjeżdżały. */
    const mapy = u.tekstura.mapy
    const magazyn = (s as any).tekstury
    const wczytaj = (url?: string, kolorSrgb = false) => (url && magazyn.czyGotowa(url, kolorSrgb) ? magazyn.wczytajOdRazu(url, { kolor: kolorSrgb }) : null)
    const tKolor = wczytaj(mapy.kolor, true)
    const tNormalna = wczytaj(mapy.normalna)
    const tWysokosc = wczytaj(mapy.wysokosc)
    const p = pozycja.mul(U.skala)
    // Trzy rzuty świata mieszane wagami normalnej albo jedno UV siatki — wspólne dla wszystkich map.
    const rzuty: { uv: any; waga: any }[] = u.mapowanie.trojplanarne
      ? [{ uv: obroc(p.zy), waga: wagi.x }, { uv: obroc(p.xz), waga: wagi.y }, { uv: obroc(p.xy), waga: wagi.z }]
      : [{ uv: obroc(L.uv().mul(U.skala.mul(60))), waga: null }]
    const probka = (t: any) => (t ? rzuty.map((r) => (r.waga ? L.texture(t, r.uv).mul(r.waga) : L.texture(t, r.uv))).reduce((a: any, b: any) => a.add(b)) : null)
    let c = probka(tKolor).rgb.mul(L.pow(L.float(2), U.eksp.mul(2)))
    c = c.sub(0.5).mul(U.kontrast.add(1)).add(0.5)
    c = L.saturation(c, U.nasycenie.add(1))
    c = c.mul(L.vec3(U.temperatura.mul(0.25).add(1), U.odcien.mul(-0.2).add(1), U.temperatura.mul(-0.25).add(1)))
    /* Mapy danych bywają wydane inaczej, niż czyta je silnik: gloss zamiast chropowatości (odwrócona)
       albo wartość spakowana w innym kanale — manifest z `narzedzia/blendkit.mjs` to opisuje. */
    const kanalMapy = (n: any, rodzaj: string) => (n ? (mapy.kanaly?.[rodzaj] ? n[mapy.kanaly[rodzaj]] : n.r) : null)
    const wartoscMapy = (url: string | undefined, rodzaj: string) => {
      const n = kanalMapy(probka(wczytaj(url)), rodzaj)
      return n && mapy.odwrocone?.includes(rodzaj) ? L.float(1).sub(n) : n
    }
    const arm = probka(wczytaj(mapy.arm))
    const ao = arm ? arm.r : wartoscMapy(mapy.ao, 'ao')
    if (ao) c = c.mul(ao.mul(0.85).add(0.15))          // AO nie gasi materiału do zera
    kolor = c.mul(U.kolor).clamp(0, 1)
    chropowatoscMapy = arm ? arm.g : wartoscMapy(mapy.chropowatosc, 'chropowatosc')
    metalicznoscMapy = arm ? arm.b : wartoscMapy(mapy.metalicznosc, 'metalicznosc')
    /* Relief liczymy w przestrzeni tekstury, nie ekranu: nachylenie [cm/cm] = Δwysokość · amplituda / droga,
       gdzie krok jednego teksela to e/skala centymetrów. Gradient ekranowy (dFdx) przy powtórzeniu rzędu metrów
       dawał ułamki stopnia, czyli materiał zupełnie płaski. Normalną z mapy mieszamy metodą „whiteout” (Golus) —
       normalMap() zakłada styczne z UV siatki i dla rzutów trójplanarnych rozrzuca normalne losowo. */
    if (tNormalna || tWysokosc) {
      const e = 1 / Math.max(64, tWysokosc?.image?.width ?? 1024)
      const nachylenie = (uv: any) => {
        const h = (dx: number, dy: number) => L.texture(tWysokosc, uv.add(L.vec2(dx, dy))).r
        const h0 = h(0, 0)
        return L.vec2(h(e, 0).sub(h0), h(0, e).sub(h0)).mul(U.wypuklosc.mul(2 / e).mul(U.skala))
      }
      const styczna = (uv: any) => {
        const n = tNormalna ? L.texture(tNormalna, uv).xyz.mul(2).sub(1) : L.vec3(0, 0, 1)
        const xy = tWysokosc ? n.xy.mul(U.wypuklosc.mul(4)).sub(nachylenie(uv)) : n.xy.mul(U.wypuklosc.mul(4))
        return L.vec3(obrocWstecz(xy), n.z.max(0.05))
      }
      if (!u.mapowanie.trojplanarne) bazowaNormalna = L.normalMap(L.vec4(styczna(rzuty[0].uv).normalize().mul(0.5).add(0.5), 1), L.vec2(1, 1))
      else {
        const n = L.normalWorld
        const [sx, sy, sz] = rzuty.map((r) => styczna(r.uv))
        const wSwiecie = (t: any, rzut: any, os: any) => L.vec3(t.xy.add(rzut), t.z.abs().mul(os))
        bazowaNormalna = wSwiecie(sx, n.zy, n.x).zyx.mul(wagi.x)
          .add(wSwiecie(sy, n.xz, n.y).xzy.mul(wagi.y))
          .add(wSwiecie(sz, n.xy, n.z).xyz.mul(wagi.z))
          .normalize()
          .transformNormalByViewMatrix(L.cameraViewMatrix)
      }
    }
  } else {
    const mapa = u.tekstura.zrodlo === 'image' && u.tekstura.url ? obraz(s, u.tekstura.url) : zrodlo?.map
    let surowy: any
    if (u.tekstura.zrodlo === 'scene' && zrodlo?.colorNode) surowy = zrodlo.colorNode
    else if (mapa) {
      if (u.mapowanie.trojplanarne) surowy = L.triplanarTexture(L.texture(mapa), null, null, U.skala, pozycja, L.normalWorld).rgb
      else {
        let uvMapy = obroc(L.uv().mul(U.skala.mul(60)))
        // Height field tracing: przesunięcie paralaksy wzdłuż kierunku widoku o wysokość z jasności.
        if (u.relief.sledzenieWysokosci) uvMapy = L.parallaxUV(uvMapy, U.glebokosc.mul(0.04).mul(L.luminance(L.texture(mapa, uvMapy).rgb)))
        surowy = L.texture(mapa, uvMapy).rgb
      }
    } else surowy = U.kolor
    if (zrodlo?.normalMap && u.tekstura.zrodlo === 'scene') bazowaNormalna = L.normalMap(L.texture(zrodlo.normalMap), L.vec2(zrodlo.normalScale?.x ?? 0.3))
    let c = surowy.mul(L.pow(L.float(2), U.eksp.mul(2)))
    c = c.sub(0.5).mul(U.kontrast.add(1)).add(0.5)
    c = L.saturation(c, U.nasycenie.add(1))
    c = c.mul(L.vec3(U.temperatura.mul(0.25).add(1), U.odcien.mul(-0.2).add(1), U.temperatura.mul(-0.25).add(1)))
    const luma = L.luminance(c)
    c = c.add(c.mul(U.cienie).mul(L.float(1).sub(L.smoothstep(0, 0.5, luma))))
    c = c.add(c.mul(U.swiatla).mul(L.smoothstep(0.5, 1, luma)))
    kolor = c.mul(u.tekstura.zrodlo === 'scene' ? U.odcienTekstury : U.kolor).clamp(0, 1)
    wysokosc = L.luminance(surowy).mul(U.wypuklosc)
  }

  if (u.relief.generatywne) {
    wysokosc = (wysokosc ?? L.float(0)).add(L.mx_fractal_noise_float(pozycja.div(U.skalaSzumu).add(U.ziarno.mul(17.3)), 4, 2, 0.5).mul(U.silaSzumu))
  }

  let chropowatosc: any = chropowatoscMapy ? chropowatoscMapy.mul(L.materialRoughness.add(0.5)) : L.materialRoughness
  if (metalicznoscMapy) m.metalnessNode = metalicznoscMapy
  if (u.niedoskonalosci.wlaczone) {
    const q = pozycja.add(U.ziarno.mul(31.7))
    // Kurz osiada na powierzchniach zwróconych do góry; smugi to płaty satyny; rysy — rozciągnięte komórki Worleya.
    const kurz = L.mx_fractal_noise_float(q.mul(0.012), 3, 2, 0.5).mul(0.5).add(0.5).mul(L.normalWorld.y.clamp(0, 1).mul(0.7).add(0.3)).mul(U.kurz)
    const smugi = L.mx_fractal_noise_float(q.mul(0.03), 3, 2, 0.5).mul(U.smugi)
    const rysa = L.float(1).sub(L.smoothstep(0, 0.035, L.mx_worley_noise_float(q.mul(L.vec3(0.08, 1.6, 0.08)), 1, 1))).mul(U.rysy)
    const dlon = L.smoothstep(55, 85, pozycja.y).mul(L.smoothstep(125, 95, pozycja.y)).mul(L.float(1).sub(L.normalWorld.y.abs())).mul(U.wytarcie)
    kolor = L.mix(kolor, L.vec3(0.38, 0.37, 0.35), kurz.mul(0.35)).mul(L.float(1).add(dlon.mul(0.08))).add(rysa.mul(0.05)).clamp(0, 1)
    chropowatosc = chropowatosc.add(smugi.mul(0.25)).add(kurz.mul(0.3)).add(rysa.mul(0.2)).sub(dlon.mul(0.2)).clamp(0.04, 1)
    wysokosc = (wysokosc ?? L.float(0)).sub(rysa.mul(0.3))
  }

  if (wysokosc) {
    const dH = L.vec2(wysokosc.dFdx(), wysokosc.dFdy())
    const sx = L.positionView.dFdx().normalize()
    const sy = L.positionView.dFdy().normalize()
    const R1 = sy.cross(bazowaNormalna)
    const R2 = bazowaNormalna.cross(sx)
    const det = sx.dot(R1).mul(L.faceDirection)
    m.normalNode = det.abs().mul(bazowaNormalna).sub(det.sign().mul(dH.x.mul(R1).add(dH.y.mul(R2)))).normalize()
  } else m.normalNode = bazowaNormalna
  m.colorNode = kolor
  m.roughnessNode = chropowatosc
  aktualizujUniformy(s, m, u)
  return m
}
