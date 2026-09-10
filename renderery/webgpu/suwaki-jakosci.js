/* P37 — suwaki parametrów jakości obrazu w zakładce „Jakość”.
   Każde pole: {id, etykieta, min, max, krok, get(), set(v), zdarzenie?: 'input'|'change',
   typ?: 'przelacznik', auto?: true (0 = wartość z poziomu jakości), poPoziomie?: true}.
   Pola, których węzeł nie istnieje (get() === undefined), są pomijane.
   Wartości zapisuje ogólny mechanizm panelu (po id); tu je odczytujemy przy tworzeniu,
   bo węzły potoku powstają później niż panel. */
const KLUCZ = 'mieszkanie-webgpu:ustawienia:1';
const miejsca = krok => Math.max(0, (String(krok).split('.')[1] || '').length);

export function dodajSuwakiJakosci({kontener, grupy}){
  let zapis = {};
  try{ zapis = JSON.parse(localStorage.getItem(KLUCZ) || '{}')?.pola || {}; }catch(e){}
  const pola = [];
  for(const g of grupy){
    const lista = g.pola.filter(d => { try{ return d.get() !== undefined; }catch(e){ return false; } });
    if(!lista.length) continue;
    const det = document.createElement('details');
    det.innerHTML = `<summary style="cursor:pointer;font-weight:600;margin-top:6px">${g.nazwa}</summary>`;
    for(const d of lista){
      const domyslna = +d.get();
      const w = document.createElement('div');
      let input;
      if(d.typ === 'przelacznik'){
        w.innerHTML = `<label class="pole"><input type="checkbox" id="${d.id}">${d.etykieta}</label>`;
        input = w.querySelector('input'); input.checked = !!domyslna;
        input.addEventListener('change', () => d.set(input.checked ? 1 : 0));
        if(typeof zapis[d.id] === 'boolean'){ input.checked = zapis[d.id]; d.set(input.checked ? 1 : 0); }
      }else{
        const fmt = v => d.auto && +v === 0 ? 'auto' : (+v).toFixed(miejsca(d.krok)).replace('.', ',');
        w.className = 'suwak';
        w.innerHTML = `<div class="naglowek"><label for="${d.id}">${d.etykieta}</label><output>${fmt(domyslna)}</output></div>
          <input id="${d.id}" type="range" min="${d.min}" max="${d.max}" step="${d.krok}" value="${domyslna}">`;
        input = w.querySelector('input');
        const out = w.querySelector('output');
        input.addEventListener('input', () => { out.textContent = fmt(input.value); if(d.zdarzenie !== 'change') d.set(+input.value); });
        input.addEventListener('change', () => { if(d.zdarzenie === 'change') d.set(+input.value); });
        if(typeof zapis[d.id] === 'string' && zapis[d.id] !== String(domyslna)){
          input.value = zapis[d.id]; out.textContent = fmt(input.value); d.set(+input.value);
        }
      }
      det.append(w);
      pola.push({d, input, domyslna});
    }
    kontener.append(det);
  }
  const przycisk = document.createElement('button');
  przycisk.className = 'dzialanie'; przycisk.type = 'button'; przycisk.style.marginTop = '6px';
  przycisk.textContent = 'Przywróć domyślne parametry';
  przycisk.addEventListener('click', () => {
    for(const {d, input, domyslna} of pola){
      if(d.typ === 'przelacznik') input.checked = !!domyslna; else input.value = domyslna;
      input.dispatchEvent(new Event('input', {bubbles: true}));
      input.dispatchEvent(new Event('change', {bubbles: true}));
      d.set(domyslna);
    }
  });
  kontener.append(przycisk);

  /* Po zmianie poziomu jakości preset nadpisuje część parametrów — przywracamy ręczne. */
  function zastosujNadpisania(){
    for(const {d, input} of pola) if(d.poPoziomie && !(d.auto && +input.value === 0)) d.set(+input.value);
  }
  return {pola: pola.map(p => p.d.id), zastosujNadpisania};
}
