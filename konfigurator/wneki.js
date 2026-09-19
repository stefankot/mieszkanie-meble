/* Wnęki (scalone prostokąty komórek z własną wyściółką) i nóżki prętowe. */

import {stan, NOZKA_FI} from './dane.js';

export const WNEKA_TRESC = {pusta: 'Empty', polka: 'Mid shelf', biurko: 'Drop-down desk'};

export function granicaWneki(w){
  const kom = stan.komorki.filter(k => k.r >= w.r1 && k.r <= w.r2 && k.c >= w.c1 && k.c <= w.c2);
  if(!kom.length) return null;
  const x1 = Math.min(...kom.map(k => k.x - k.w / 2)), x2 = Math.max(...kom.map(k => k.x + k.w / 2));
  const y1 = Math.min(...kom.map(k => k.y - k.h / 2)), y2 = Math.max(...kom.map(k => k.y + k.h / 2));
  return {x1, x2, y1, y2, sz: x2 - x1, wys: y2 - y1, d: kom[0].d};
}

export const wWnece = (r, c) => stan.wneki.findIndex(w => r >= w.r1 && r <= w.r2 && c >= w.c1 && c <= w.c2);

/* Silnik robi półkę w każdej komórce i pion na całą wysokość, więc scaloną wnękę
   wycinam z jego wyniku: półki w środku znikają, pion zostaje pocięty na odcinki nad i pod. */
export function przytnijDoWnek(parts){
  if(!stan.wneki.length) return parts;
  const granice = stan.wneki.map(granicaWneki);
  const wynik = [];
  for(const cz of parts){
    const polka = /^polka-k(\d+)-(\d+)$/.exec(cz.id);
    if(polka){
      const c = +polka[1], r = +polka[2];
      if(stan.wneki.some(w => c >= w.c1 && c <= w.c2 && r >= w.r1 && r < w.r2)) continue;
      wynik.push(cz);
      continue;
    }
    const pion = /^pion-(\d+)$/.exec(cz.id);
    if(pion){
      const i = +pion[1];
      const kolizje = stan.wneki.map((w, k) => [w, granice[k]]).filter(([w, g]) => g && i >= w.c1 && i < w.c2);
      if(kolizje.length){
        let odcinki = [[cz.positionMm[1] - cz.sizeMm[1] / 2, cz.positionMm[1] + cz.sizeMm[1] / 2]];
        for(const [, g] of kolizje) odcinki = odcinki.flatMap(([a, b]) => {
          if(g.y2 <= a || g.y1 >= b) return [[a, b]];
          const out = [];
          if(g.y1 > a + 1) out.push([a, g.y1]);
          if(g.y2 < b - 1) out.push([g.y2, b]);
          return out;
        });
        for(const [a, b] of odcinki)
          wynik.push({...cz, id: `${cz.id}-${Math.round(a)}`, sizeMm: [cz.sizeMm[0], b - a, cz.sizeMm[2]],
                      positionMm: [cz.positionMm[0], (a + b) / 2, cz.positionMm[2]]});
        continue;
      }
    }
    wynik.push(cz);
  }
  return wynik;
}

/* Wnęka jest WYŁOŻONA drugą warstwą płyty meblowej: plecy, dwa boki, spód i wierzch,
   każde pełnej grubości. Ich czoła tworzą widoczną ramkę wokół otworu — tak jak w kuchni
   z wyściełaną niszą. Wyściółka istnieje zawsze; własny kolor tylko ją przebarwia.
   Gdy wnęka wystaje przed lico mebla, wysuwa się WYŁĄCZNIE ta wyściółka — jak błękitna
   skrzynka wychodząca ze ściany dębowych frontów. Korpus zostaje na swoim miejscu. */
export function czesciWnek(){
  const t = stan.plytaMm, D = stan.glebokoscMm, lista = [];
  stan.wneki.forEach((w, i) => {
    const g = granicaWneki(w);
    if(!g) return;
    const wysun = w.wysun || 0;
    const zPrzod = D / 2 + wysun;                      // lico wnęki
    const zTyl = D / 2 - g.d;                          // czoło pleców mebla
    const gl = zPrzod - zTyl;                          // głębokość wyściółki
    const zC = (zTyl + t + zPrzod) / 2;                // środek boków, już za plecami wyściółki
    const glBokow = zPrzod - (zTyl + t);
    const srX = (g.x1 + g.x2) / 2, srY = (g.y1 + g.y2) / 2;
    const plyta = 'maple-0375';
    const wnetrze = w.kolor != null ? `wneka-${i}` : 'maple-0375-front';
    const box = (id, sizeMm, positionMm, material) => lista.push({
      id: `wneka${i}-${id}`, type: 'box', sizeMm, positionMm, rotationDeg: [0, 0, 0],
      material, label: `Niche ${i + 1}`});

    box('wyklad-plecy', [g.sz, g.wys, t], [srX, srY, zTyl + t / 2], wnetrze);
    box('wyklad-l', [t, g.wys, glBokow], [g.x1 + t / 2, srY, zC], wnetrze);
    box('wyklad-p', [t, g.wys, glBokow], [g.x2 - t / 2, srY, zC], wnetrze);
    box('wyklad-d', [g.sz - 2 * t, t, glBokow], [srX, g.y1 + t / 2, zC], wnetrze);
    box('wyklad-g', [g.sz - 2 * t, t, glBokow], [srX, g.y2 - t / 2, zC], wnetrze);

    const swiatloSz = g.sz - 2 * t, swiatloWys = g.wys - 2 * t;   // otwór wewnątrz wyściółki
    if(w.tresc === 'polka') box('polka', [swiatloSz, t, glBokow * .86], [srX, srY, zC], wnetrze);
    if(w.tresc === 'biurko'){
      box('blat', [swiatloSz, t, glBokow * .9], [srX, g.y1 + t + swiatloWys * .34, zC], wnetrze);
      if(w.otwarte)                                    // klapa opuszczona tworzy blat roboczy
        box('klapa', [swiatloSz - 4, 18, swiatloWys * .58], [srX, g.y1 + t + swiatloWys * .34 + 12, zPrzod + swiatloWys * .29], plyta);
      else
        box('klapa', [swiatloSz - 4, swiatloWys * .58, 18], [srX, g.y2 - t - swiatloWys * .29, zPrzod - 9], plyta);
    }
  });
  return lista;
}

/* Cztery nóżki prętowe w narożnikach: walce fi 15 mm pod korpusem. Mebel jest o ich
   wysokość podniesiony, więc siedzą w ujemnym Y, od -wysokość do zera. */
export function czesciNozek(){
  const h = stan.nozkiMm || 0;
  if(h <= 0) return [];
  const r = NOZKA_FI / 2, wcięcie = 40;
  const x = stan.szerokoscMm / 2 - wcięcie, z = stan.glebokoscMm / 2 - wcięcie;
  return [[-x, -z], [x, -z], [-x, z], [x, z]].map(([px, pz], i) => ({
    id: `nozka-${i + 1}`, type: 'cylinder', radiusMm: r, heightMm: h,
    sizeMm: [NOZKA_FI, h, NOZKA_FI], positionMm: [px, -h / 2, pz], rotationDeg: [0, 0, 0],
    material: 'nozka', label: `Leg ${i + 1}`
  }));
}

