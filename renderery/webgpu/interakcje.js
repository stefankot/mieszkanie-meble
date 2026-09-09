/* ============================================================
   INTERAKCJE MEBLI — otwieranie drzwi, szuflad i klap
   ------------------------------------------------------------
   Brief stawia to jako wymóg twardy: „każda funkcjonalnie ruchoma część
   każdego przyszłego mebla musi rzeczywiście działać. Sama szczelina albo
   narysowany zawias nie wystarcza."

   Biblioteka od początku budowała mechanizmy (TYPY_MECHANIZMOW → hinge/slide)
   i oznaczała każdą siatkę przez userData.ruchId, ale nic ich nie napędzało.
   Ten moduł zamyka tę pętlę: klik w ruchomą część otwiera ją i zamyka,
   z easingiem, a panel dostaje listę wszystkiego, co się rusza.

   Rozstrzygnięcie konfliktu z Point & Go: klik w część z mechanizmem otwiera
   mebel, klik w cokolwiek innego przenosi kamerę. Dzięki temu jeden gest
   obsługuje obie rzeczy i nie trzeba trybu „edycji".
   ============================================================ */

const CZAS_RUCHU = 620;    // ms pełnego otwarcia
const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;

export function utworzInterakcje({biblioteka, zastosujRuch, przyZmianie}){
  /* Stan animacji trzymamy obok mechanizmu, nie w nim — biblioteka podmienia
     obiekty ruchów przy każdej nowej wersji mebla. */
  const animowane = new Map();   // id → {ruch, od, do, start}

  function ruchy(){
    const lista = [];
    for(const [id, wpis] of biblioteka.meble){
      for(const r of wpis.ruchy || []){
        if(r.legacy || !r.os) continue;      // łóżko: sprzężone siłowniki, inny mechanizm
        lista.push({mebel: id, nazwaMebla: wpis.nazwa, ruch: r});
      }
    }
    return lista;
  }

  function ustaw(ruch, cel){
    const od = ruch.wartosc ?? 0;
    if(Math.abs(od - cel) < .002) return false;
    animowane.set(ruch.id, {ruch, od, do: cel, start: performance.now()});
    ruch.cel = cel;
    return true;
  }

  function przelacz(ruch){
    return ustaw(ruch, (ruch.cel ?? ruch.wartosc ?? 0) > .5 ? 0 : 1);
  }

  /* Klik: szukamy najbliższego przodka z przypisanym mechanizmem. */
  function kliknij(obiekt){
    let o = obiekt, id = null;
    while(o && !id){ id = o.userData?.ruchId; o = o.parent; }
    if(!id) return false;
    const wpis = ruchy().find(r => r.ruch.id === id);
    if(!wpis) return false;
    const zmiana = przelacz(wpis.ruch);
    if(zmiana) przyZmianie?.();
    return zmiana;
  }

  function otworzWszystko(otwarte){
    let ile = 0;
    for(const {ruch} of ruchy()) if(ustaw(ruch, otwarte ? 1 : 0)) ile++;
    if(ile) przyZmianie?.();
    return ile;
  }

  function aktualizuj(){
    if(!animowane.size) return false;
    const teraz = performance.now();
    for(const [id, a] of animowane){
      const t = Math.min(1, (teraz - a.start) / CZAS_RUCHU);
      const v = a.od + (a.do - a.od) * easeInOut(t);
      zastosujRuch(a.ruch, v);
      if(t >= 1){ a.ruch.wartosc = a.do; animowane.delete(id); }
    }
    return true;
  }

  return {kliknij, przelacz, ustaw, otworzWszystko, aktualizuj, ruchy,
          get wRuchu(){ return animowane.size; }};
}
