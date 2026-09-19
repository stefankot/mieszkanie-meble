/* ?selftest=1 — uruchamia kontrole i wypisuje wynik do DOM oraz do `window.__wynik`.
   Same kontrole leżą w kontrole-podstawy.js (3–12), kontrole-meble.js (13–36)
   kontrole-panelu.js (37 — przeklikanie panelu)
   i kontrole-sceny.js (38 — kliknięcia w widok 3D).

   Zakres da się zawęzić: `?selftest=29` albo `?selftest=29-36`. Model naprawiający jeden
   błąd uruchamia wtedy jedną kontrolę zamiast czterdziestu — to najtańsza pętla poprawek. */
import {kontrolePodstaw} from './kontrole-podstawy.js';
import {kontroleMebli} from './kontrole-meble.js';
import {kontrolePanelu} from './kontrole-panelu.js';
import {kontroleSceny} from './kontrole-sceny.js';

function zakresZAdresu(){
  const p = new URLSearchParams(location.search).get('selftest') || '1';
  const m = /^(\d+)(?:-(\d+))?$/.exec(p.trim());
  if(!m || p === '1') return null;                     // `1` znaczy „wszystko"
  return {od: +m[1], do: +(m[2] ?? m[1])};
}

export async function selftest(){
  const zakres = zakresZAdresu();
  const wyniki = [];
  const dodaj = (nr, opis, ok, det) => {
    if(zakres && (nr < zakres.od || nr > zakres.do)) return;
    wyniki.push({nr, opis, ok: !!ok, det: det || ''});
  };
  await kontrolePodstaw(dodaj);
  await kontroleMebli(dodaj);
  await kontrolePanelu(dodaj);
  await kontroleSceny(dodaj);

  const bledy = wyniki.filter(w => !w.ok);
  /* Wynik maszynowy: jedno miejsce, z którego model czyta wszystko jednym zapytaniem. */
  window.__wynik = {
    przeszlo: wyniki.length - bledy.length,
    razem: wyniki.length,
    zakres: zakres ? `${zakres.od}-${zakres.do}` : 'all',
    bledy: bledy.map(b => ({nr: b.nr, opis: b.opis, det: b.det})),
    tekst: `${wyniki.length - bledy.length}/${wyniki.length} passed`
      + (bledy.length ? '\n' + bledy.map(b => `FAIL ${b.nr}: ${b.opis} — ${b.det}`).join('\n') : '')
  };

  const panel = document.createElement('div');
  panel.className = 'selftest';
  panel.innerHTML = `<h2>selftest</h2><ul>${wyniki.map(w =>
      `<li class="${w.ok ? 'pass' : 'fail'}">${w.ok ? 'PASS' : 'FAIL'} · check ${w.nr} · ${w.opis}${w.det ? ' — ' + w.det : ''}</li>`).join('')}</ul>
    <p>${window.__wynik.przeszlo}/${wyniki.length} passed.</p>`;
  document.body.append(panel);
}
