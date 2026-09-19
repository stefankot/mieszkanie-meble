/* Przedmioty na półkach i doniczka obok mebla — co, ile i gdzie postawić.
   Wstawianiem brył zajmuje się zbudujBryle() w scena.js. */
import * as THREE from 'three';
import {stan, MM, DEKORY, BARWY_DEKORU, ziarno, zacisk, frontKomorki, ileDodatkow} from './dane.js';
import {wWnece, granicaWneki} from './wneki.js';
import {modeleRoli, wymiaryModelu, egzemplarz} from './modele.js';
import {mebel} from './scena.js';

export function postawRosline(){
  if(!ileDodatkow()) return;
  if(stan.roslina === 'brak') return;
  const duze = modeleRoli('podloga');
  if(!duze.length) return;
  const pudlo = new THREE.Box3().setFromObject(mebel);
  if(pudlo.isEmpty()) return;
  /* Bez wyboru staje najwyższa — przy meblu pod sufit niska doniczka ginie. */
  const wybrany = duze.find(m => m.id === stan.roslina)
    || duze.reduce((a, b) => (wymiaryModelu(b.id)?.h || 0) > (wymiaryModelu(a.id)?.h || 0) ? b : a);
  const r = wymiaryModelu(wybrany.id);
  const obiekt = egzemplarz(wybrany.id);
  if(!obiekt) return;
  obiekt.position.set(pudlo.max.x + r.w * MM * .62, 0, pudlo.max.z - r.d * MM * .5);
  obiekt.rotation.y = .4;
  mebel.add(obiekt);
}

function modelNaPolke(los, wolneX, limitWys, glebokosc){
  const kandydaci = modeleRoli('polka').map(m => ({m, r: wymiaryModelu(m.id)}))
    .filter(({r}) => r && r.w < wolneX && r.d < glebokosc * .92 && r.h < limitWys * 1.25);
  if(!kandydaci.length) return null;
  const {m, r} = kandydaci[Math.floor(los() * kandydaci.length)];
  const skala = Math.min(1, limitWys * .94 / r.h);
  return {model: m.id, w: r.w * skala, h: r.h * skala, d: r.d * skala, dol: r.dol * skala, skala,
          obrotY: (los() - .5) * .7};
}

/* ---------- dekoracje: ile przedmiotów wygląda „akurat” ---------- */
export function ustawDekor(los, x0, y, z, szerokosc, limitWys, zbior, gestosc = .55){
  const grupa = [];
  const rodzaje = ['model', 'ksiazka', 'model', 'stos', 'model', 'pudelko', 'wazon', 'roslina'];
  let x = x0 + 25 + los() * 40;
  const koniec = x0 + szerokosc - 25;
  while(x < koniec){
    let rodzaj = rodzaje[Math.floor(los() * rodzaje.length)];
    if(rodzaj === 'model'){
      const wybor = modelNaPolke(los, koniec - x, limitWys, stan.glebokoscMm);
      if(wybor){
        grupa.push({...wybor, x: x + wybor.w / 2, y});
        x += wybor.w + 30 + los() * 70;
        if(los() < .6 - gestosc * .5) break;
        continue;
      }
      rodzaj = 'wazon';                                  // nic nie pasuje — zostaje bryłka
    }
    if(rodzaj === 'ksiazka'){                            // rządek książek o różnej wysokości
      const n = 3 + Math.floor(los() * 5);
      for(let i = 0; i < n && x < koniec; i++){
        const [w, h, d] = DEKORY.ksiazka[Math.floor(los() * DEKORY.ksiazka.length)];
        const wys = Math.min(h, limitWys);
        if(x + w > koniec) break;
        grupa.push({w, h: wys, d, x: x + w / 2, y: y + wys / 2, barwa: Math.floor(los() * BARWY_DEKORU.length)});
        x += w + 2;
      }
    }else if(rodzaj === 'stos'){                         // leżący stosik
      const n = 2 + Math.floor(los() * 3), w = 180 + los() * 60;
      if(x + w > koniec) break;
      for(let i = 0; i < n; i++)
        grupa.push({w: w - i * 12, h: 26, d: 150, x: x + w / 2, y: y + 13 + i * 27, barwa: Math.floor(los() * BARWY_DEKORU.length)});
      x += w + 30;
    }else{
      const [w, h, d] = DEKORY[rodzaj === 'stos' ? 'pudelko' : rodzaj][Math.floor(los() * DEKORY[rodzaj].length)];
      const wys = Math.min(h, limitWys);
      if(x + w > koniec) break;
      grupa.push({w, h: wys, d, x: x + w / 2, y: y + wys / 2, barwa: Math.floor(los() * BARWY_DEKORU.length)});
      if(rodzaj === 'roslina')
        grupa.push({w: w * .8, h: Math.min(wys * 1.4, limitWys - wys), d: d * .8, x: x + w / 2,
                    y: y + wys + Math.min(wys * 1.4, limitWys - wys) / 2, barwa: 2});
      x += w + 40 + los() * 90;
    }
    if(los() < .6 - gestosc * .5) break;                 // nonszalancja: przy małej gęstości często kończymy wcześniej
  }
  for(const p of grupa) zbior.push({...p, z});
}

export function zbierzDekor(){
  const zbior = [];
  const gestosc = ileDodatkow() / 100;                 // suwak „Items on shelves"
  if(!gestosc) return zbior;
  const los = ziarno(stan.komorki.length * 977 + stan.kolumny.length * 31 + Math.round(stan.szerokoscMm));
  let poprzednia = false;
  for(const k of stan.komorki){
    if(wWnece(k.r, k.c) >= 0){ poprzednia = false; continue; }      // wnętrze wnęki ma własną zawartość
    const zajeta = frontKomorki(`r${k.r}c${k.c}`);
    const szansa = zajeta ? 0 : (poprzednia ? .45 : 1) * gestosc;   // sąsiad pełny → rzadziej, żeby nie było ściany rzeczy
    if(los() > szansa){ poprzednia = false; continue; }
    poprzednia = true;
    const n = (stan.polkiWyliczone?.[`r${k.r}c${k.c}`] ?? 0) + 1;
    const polka = Math.floor(los() * n);                 // wybieramy jedną z przegród w komórce
    const wysPrzegrody = k.h / n;
    ustawDekor(los, k.x - k.w / 2, k.y - k.h / 2 + polka * wysPrzegrody,
               k.d * .5 - stan.glebokoscMm / 2 + 30, k.w, wysPrzegrody - 30, zbior, gestosc);
  }
  /* Lampa stoi we wnęce — to jedyne miejsce, gdzie światło ma sens: zamknięta z trzech stron
     półka odbija je i widać, że naprawdę świeci. */
  const lampy = modeleRoli('lampa');
  if(lampy.length) stan.wneki.forEach((w, i) => {
    const g = granicaWneki(w);
    const r = wymiaryModelu(lampy[0].id);
    if(!g || !r || w.tresc === 'biurko') return;
    const skala = Math.min(1, (g.wys - 40) / r.h, (g.sz - 60) / r.w);
    if(skala < .25) return;
    zbior.push({model: lampy[0].id, skala, obrotY: .3,
                w: r.w * skala, h: r.h * skala, d: r.d * skala, dol: r.dol * skala,
                x: g.x1 + g.sz / 2, y: g.y1 + 9, z: stan.glebokoscMm / 2 - r.d * skala / 2 - 20 + (w.wysun || 0)});
  });

  const naGorze = zacisk(Math.round(stan.szerokoscMm / 1100), 0, 3);
  for(let i = 0; i < naGorze; i++){
    const pas = stan.szerokoscMm / naGorze;
    if(los() < .35) continue;                          // nie każdy pas dostaje przedmioty
    ustawDekor(los, -stan.szerokoscMm / 2 + i * pas, stan.wysokoscMm, 0, pas, 230, zbior, gestosc);
  }
  return zbior;
}

