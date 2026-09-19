#!/usr/bin/env node
/* Generator MAP — po jednej linii na plik źródłowy: rozmiar, pierwsze zdanie
   komentarza nagłówkowego i wyeksportowane nazwy.

   Po co: czytanie kodu jest najdroższą rzeczą, jaką robi agent (model językowy).
   `silnik.js` to ~27 000 tokenów za JEDNO otwarcie. MAPA kosztuje ~2 000 tokenów
   za CAŁY katalog i w większości zadań wystarcza, żeby trafić od razu w jeden plik.
   Generujemy ją, a nie piszemy ręcznie, bo ręczna mapa po tygodniu kłamie.

   Użycie:  node narzedzia/mapa.mjs [--sprawdz]
   --sprawdz kończy się kodem 1, gdy któraś MAPA jest nieaktualna (dla CI). */
import {readdirSync, readFileSync, writeFileSync, statSync, existsSync} from 'node:fs'
import {join, extname, basename} from 'node:path'

const KATALOGI = [
  {kat: 'renderery/webgpu', tytul: 'MAPA — renderery/webgpu (silnik WebGPU)',
   wstep: 'Silnik działa w ramce `<iframe>` edytora. Wejście: `mieszkanie-webgpu-v1.html` → `silnik/index.js`.\nPublicznym API jest obiekt `window.__silnik` (czyta go `edytor/src/silnik/most.ts`).',
   pomin: ['experymenty', 'eksperymenty', 'tekstury-uzytkownika', 'silnik']},
  {kat: 'renderery/webgpu/silnik', tytul: 'MAPA — renderery/webgpu/silnik (rozruch silnika)',
   wstep: 'Moduły rozruchu. Każdy dostaje kontekst i zwraca swoje API; kolejność składania jest w `index.js`.',
   pomin: []},
  {kat: 'konfigurator', tytul: 'MAPA — konfigurator (konfigurator szafy)', wstep: '', pomin: []},
  {kat: 'narzedzia', tytul: 'MAPA — narzedzia (skrypty poza aplikacją)', wstep: '', pomin: []}
]
const ROZSZERZENIA = new Set(['.js', '.mjs', '.ts'])

/* Pierwsze zdanie komentarza nagłówkowego: bez ramek z gwiazdek i znaczników sekcji. */
function opis(tekst){
  const linie = tekst.split('\n').slice(0, 40)
  const zebrane = []
  for (const l of linie) {
    const t = l.trim()
    if (!zebrane.length && !/^(\/\*|\/\/)/.test(t)) { if (t === '' ) continue; break }
    if (/^(\/\*+|\*+\/?|\/\/)?[\s=*-]*$/.test(t)) { if (zebrane.length) break; continue }
    zebrane.push(t.replace(/^\/\*+|\*+\/$|^\*\s?|^\/\/\s?/g, '').trim())
    if (zebrane.join(' ').includes('.')) break
  }
  const zdanie = zebrane.join(' ').split(/(?<=\.)\s/)[0] || ''
  return zdanie.replace(/\s+/g, ' ').slice(0, 190)
}

/* Nazwy eksportowane — to jest kontrakt modułu i zwykle wszystko, czego agent potrzebuje. */
function eksporty(tekst){
  const n = new Set()
  for (const m of tekst.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([\w$]+)/gm)) n.add(m[1])
  for (const m of tekst.matchAll(/^export\s*\{([^}]+)\}/gm))
    for (const cz of m[1].split(',')) { const nazwa = cz.split(/\s+as\s+/).pop().trim(); if (nazwa) n.add(nazwa) }
  if (/^export\s+default/m.test(tekst)) n.add('default')
  return [...n]
}

const korzen = process.cwd()
let nieaktualne = 0
for (const {kat, tytul, wstep, pomin} of KATALOGI) {
  const sciezka = join(korzen, kat)
  if (!existsSync(sciezka)) continue
  const pliki = readdirSync(sciezka)
    .filter(f => ROZSZERZENIA.has(extname(f)) && !f.endsWith('.d.ts') && !pomin.includes(basename(f, extname(f))))
    .filter(f => statSync(join(sciezka, f)).isFile())
    .sort()
  const wiersze = pliki.map(f => {
    const tekst = readFileSync(join(sciezka, f), 'utf8')
    const l = tekst.split('\n').length
    const e = eksporty(tekst)
    return `- \`${f}\` · ${l} l.${e.length ? ' · ' + e.map(x => '`' + x + '`').join(', ') : ''}${opis(tekst) ? ' — ' + opis(tekst) : ''}`
  })
  const podkatalogi = readdirSync(sciezka).filter(f => statSync(join(sciezka, f)).isDirectory() && !pomin.includes(f))
  const tresc = [
    `# ${tytul}`, '',
    '<!-- PLIK GENEROWANY: `node narzedzia/mapa.mjs`. Nie edytuj ręcznie. -->', '',
    'Czytaj najpierw tę mapę, potem **tylko** potrzebny moduł.', '',
    wstep, wstep ? '' : null,
    '## Moduły', '', ...wiersze, '',
    podkatalogi.length ? '## Podkatalogi\n\n' + podkatalogi.map(d => `- \`${d}/\``).join('\n') + '\n' : null,
    `_Razem: ${pliki.length} plików, ${pliki.reduce((a, f) => a + readFileSync(join(sciezka, f), 'utf8').split('\n').length, 0)} linii._`, ''
  ].filter(x => x !== null).join('\n')
  const cel = join(sciezka, 'MAPA.md')
  const stare = existsSync(cel) ? readFileSync(cel, 'utf8') : ''
  if (stare === tresc) continue
  if (process.argv.includes('--sprawdz')) { console.error('nieaktualna: ' + join(kat, 'MAPA.md')); nieaktualne++ }
  else { writeFileSync(cel, tresc); console.log('zapisano ' + join(kat, 'MAPA.md') + ' (' + pliki.length + ' plików)') }
}
process.exit(nieaktualne ? 1 : 0)
