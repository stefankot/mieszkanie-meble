/* ============================================================
   PANEL STEROWANIA
   ------------------------------------------------------------
   Odbudowa panelu z wersji WebGL: te same zakładki (Widok / Światło /
   Jakość / Pomoc), te same nazwy i te same wartości domyślne — ciepło 62 %,
   rozproszenie 82 %, wzmocnienia 100 %, krycie 100 %.

   Kontrolki, których ten silnik jeszcze nie potrafi obsłużyć (liczba próbek,
   rozdzielczość tekstur, głębia ostrości, profil tkaniny, własne lampy),
   są wypisane w zakładce Pomoc jako brakujące. Nie ma tu atrap: suwak, który
   nic nie robi, jest gorszy niż jego brak.
   ============================================================ */

const STYL = `
 #sterowanie{position:fixed;left:12px;top:12px;z-index:25;width:266px;
   font:12px/1.45 system-ui,sans-serif;color:#25241f}
 #sterowanie>summary{cursor:pointer;list-style:none;background:#25241f;color:#f8f7f1;
   border-radius:9px;padding:7px 11px;font-weight:600;user-select:none}
 #sterowanie>summary::-webkit-details-marker{display:none}
 #sterowanie[open]>summary{border-radius:9px 9px 0 0}
 #sterowanie .panel{background:#f8f7f1f2;border:1px solid #bdbbac;border-top:0;
   border-radius:0 0 9px 9px;padding:9px;max-height:74vh;overflow:auto}
 #sterowanie .zakladki{display:flex;gap:4px;margin-bottom:8px}
 #sterowanie .zakladki button{flex:1;padding:4px 2px;border:1px solid #bdbbac;border-radius:6px;
   background:#fffdf6;font:inherit;cursor:pointer}
 #sterowanie .zakladki button[aria-selected=true]{background:#25241f;color:#f8f7f1;border-color:#25241f}
 #sterowanie h3{margin:10px 0 5px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6f6d5f}
 #sterowanie h3:first-child{margin-top:0}
 #sterowanie .siatka{display:flex;gap:4px;flex-wrap:wrap}
 #sterowanie .siatka>*{flex:1 1 0;min-width:56px}
 #sterowanie button.dzialanie,#sterowanie select,#sterowanie input[type=date],#sterowanie input[type=time],#sterowanie input[type=text]{
   font:inherit;padding:4px 6px;border:1px solid #bdbbac;border-radius:6px;background:#fffdf6;
   color:#25241f;cursor:pointer;width:100%}
 #sterowanie button.dzialanie[aria-pressed=true]{background:#25241f;color:#f8f7f1;border-color:#25241f}
 #sterowanie .suwak{margin:6px 0}
 #sterowanie .suwak .naglowek{display:flex;justify-content:space-between;font-size:11px;color:#4a4a42}
 #sterowanie input[type=range]{width:100%;margin:2px 0 0}
 #sterowanie label.pole{display:flex;align-items:center;gap:6px;margin:6px 0}
 #sterowanie .strzalki{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
 #sterowanie p.uwaga{margin:6px 0 0;color:#6f6d5f}
 #sterowanie kbd{background:#eceadd;border:1px solid #c9c7b6;border-radius:4px;padding:0 4px}
 #sterowanie dl{margin:0}
 #sterowanie dl>div{display:flex;gap:8px;margin:3px 0}
 #sterowanie dt{flex:0 0 96px;color:#4a4a42}
 #sterowanie dd{margin:0;flex:1}
 #sterowanie .brak{color:#8a5a3a}
 #sterowanie #informacje{margin-top:10px;border-top:1px solid #bdbbac;padding-top:7px}
 #sterowanie #informacje>summary{cursor:pointer;font-weight:600}
 #sterowanie #hud{margin-top:6px;overflow-wrap:anywhere}`;

export function utworzSterowanie(api){
  const {THREE, renderer, camera, controls, nawigacja, plan, biblioteka, swiatlo, krycie, zielen, zaslony, archPhoto} = api;

  const styl = document.createElement('style');
  styl.textContent = STYL;
  document.head.append(styl);

  const el = document.createElement('details');
  el.id = 'sterowanie'; el.open = true;
  el.innerHTML = `<summary>Sterowanie</summary><div class="panel">
    <div class="zakladki" role="tablist">
      <button role="tab" data-z="widok"  aria-selected="true">Widok</button>
      <button role="tab" data-z="swiatlo" aria-selected="false">Światło</button>
      <button role="tab" data-z="jakosc" aria-selected="false">Jakość</button>
      <button role="tab" data-z="pomoc"  aria-selected="false">?</button>
    </div>
    <section data-s="widok">
      <h3>Tryb kamery</h3>
      <div class="siatka">
        <button class="dzialanie" data-tryb="spacer">Spacer</button>
        <button class="dzialanie" data-tryb="orbita">Rozglądanie</button>
        <button class="dzialanie" data-tryb="ptak" title="B — widok z góry / powrót">Z góry</button>
      </div>
      <div class="strzalki" style="margin-top:6px">
        <button class="dzialanie" data-krok="lewo"  title="A">←</button>
        <button class="dzialanie" data-krok="przod" title="W">↑</button>
        <button class="dzialanie" data-krok="tyl"   title="S">↓</button>
        <button class="dzialanie" data-krok="prawo" title="D">→</button>
      </div>
      <div class="siatka" style="margin-top:6px;align-items:center">
        <button class="dzialanie" id="oczNizej" title="Niżej o 5 cm · Q">−</button>
        <output id="oczy" style="text-align:center">160 cm</output>
        <button class="dzialanie" id="oczWyzej" title="Wyżej o 5 cm · E">+</button>
      </div>
      <h3>Kadr</h3>
      <div class="siatka">
        <select id="mebelWybor"></select>
        <button class="dzialanie" id="kadrMebel" style="flex:0 0 68px">Kadruj</button>
      </div>
      <div class="opis" id="kadrInfo" role="status" aria-live="polite"></div>
      <h3>ARCH_PHOTO</h3>
      <select id="trybKamery">
        <option value="interactive">Kamera interaktywna</option>
        <option value="arch_photo">ARCH_PHOTO — pozioma</option>
      </select>
      <div class="suwak"><div class="naglowek"><label for="lensShiftY">Lens shift Y</label><output id="lensShiftYVal">8%</output></div>
        <input id="lensShiftY" type="range" min="-20" max="20" value="8"></div>
      <div class="siatka"><input id="nazwaKadru" type="text" maxlength="48" value="Kadr 1" aria-label="Nazwa zapisanego kadru">
        <button class="dzialanie" id="zapiszKadr" style="flex:0 0 58px">Zapisz</button></div>
      <div class="siatka" style="margin-top:4px"><select id="archKadry" aria-label="Zapisane kadry ARCH_PHOTO"></select>
        <button class="dzialanie" id="wczytajKadr" style="flex:0 0 52px">Otwórz</button>
        <button class="dzialanie" id="usunKadr" style="flex:0 0 45px">Usuń</button></div>
      <h3>Ruchome części</h3>
      <div class="siatka">
        <button class="dzialanie" id="otworzWsz">Otwórz wszystko</button>
        <button class="dzialanie" id="zamknijWsz">Zamknij</button>
      </div>
      <div id="ruchy" style="margin-top:6px;max-height:150px;overflow:auto"></div>
      <p class="uwaga" id="ruchyInfo"></p>
      <h3>Zasłony</h3>
      <div id="zaslonySterowanie"></div>
      <h3>Przejdź</h3>
      <div class="siatka" id="pokoje"></div>
      <h3>Mieszkanie</h3>
      <button class="dzialanie" id="pokazMieszkanie" aria-pressed="true" title="P">Pokazuj mieszkanie</button>
      <div class="suwak"><div class="naglowek"><label for="krycie">Krycie</label><output id="krycieVal">100%</output></div>
        <input id="krycie" type="range" min="0" max="100" step="1" value="100"></div>
      <label class="pole"><input type="checkbox" id="kolizje" checked>Kolizje ze ścianami <kbd>K</kbd></label>
    </section>
    <section data-s="swiatlo" hidden>
      <h3>Pora dnia</h3>
      <div class="siatka">
        <input type="date" id="data" value="2026-09-15">
        <input type="time" id="godzina" value="16:30" step="60">
      </div>
      <div class="siatka" style="margin-top:5px">
        <button class="dzialanie" id="zastosujCzas">Zastosuj</button>
        <button class="dzialanie" id="terazCzas">Teraz</button>
        <button class="dzialanie" data-godz="08:00">08:00</button>
        <button class="dzialanie" data-godz="16:00">16:00</button>
      </div>
      <p class="uwaga" id="slonceInfo"></p>
      <h3>Charakter</h3>
      <div class="suwak"><div class="naglowek"><label for="cieplo">Ciepło</label><output id="cieploVal">45%</output></div>
        <input id="cieplo" type="range" min="0" max="100" value="45"></div>
      <div class="suwak"><div class="naglowek"><label for="rozproszenie">Rozproszenie</label><output id="rozproszenieVal">90%</output></div>
        <input id="rozproszenie" type="range" min="0" max="100" value="90"></div>
      <h3>Wzmocnienia</h3>
      <div class="suwak"><div class="naglowek"><label for="gOkna">Okna</label><output id="gOknaVal">100%</output></div>
        <input id="gOkna" type="range" min="0" max="200" step="5" value="100"></div>
      <div class="suwak"><div class="naglowek"><label for="gSlonce">Słońce</label><output id="gSlonceVal">100%</output></div>
        <input id="gSlonce" type="range" min="0" max="200" step="5" value="100"></div>
      <div class="suwak"><div class="naglowek"><label for="gKule">Kule sufitowe</label><output id="gKuleVal">30%</output></div>
        <input id="gKule" type="range" min="0" max="200" step="5" value="30"></div>
      <label class="pole"><input type="checkbox" id="animacjaTla" checked>Animacja tła (wiatr w koronach)</label>
      <label class="pole"><input type="checkbox" id="cienLisci">Cień liści na ścianach (komorebi)</label>
    </section>
    <section data-s="jakosc" hidden>
      <div class="suwak"><div class="naglowek"><label for="ekspozycja">Ekspozycja</label><output id="ekspozycjaVal">0,72</output></div>
        <input id="ekspozycja" type="range" min="0.35" max="2.2" step="0.01" value="0.72"></div>
      <h3>Jakość obrazu</h3>
      <select id="jakoscPoziom">
        <option value="minimalna" selected>Minimalna — płynność</option>
        <option value="srednia">Średnia</option>
        <option value="wysoka">Wysoka</option>
        <option value="photo_raster">PHOTO_RASTER — statyczny kadr</option>
        <option value="photo_path">PHOTO_PATH — integration TEST</option>
      </select>
      <select id="antyaliasing" title="Porównanie wygładzania">
        <option value="smaa" selected>SMAA — baseline</option>
        <option value="taau">TAAU r185 — TEST (wysoka)</option>
      </select>
      <select id="toneMapping" title="Porównanie tone mappingu">
        <option value="aces" selected>ACES — baseline</option>
        <option value="neutral">Neutral</option>
        <option value="agx">AgX</option>
      </select>
      <select id="worldGI" title="Porównanie światła pośredniego">
        <option value="ssgi" selected>SSGI — baseline</option>
        <option value="speedball">SSGI + Speedball 0.7.0 — TEST (wysoka)</option>
      </select>
      <select id="ssrWariant" title="Porównanie odbić ekranowych">
        <option value="current" selected>SSR current — baseline</option>
        <option value="modern">Stochastic SSR r185 — TEST (wysoka)</option>
      </select>
      <p class="uwaga" id="worldGIInfo"></p>
      <p class="uwaga" id="jakoscOpis"></p>
      <p class="uwaga" id="photoRasterInfo"></p>
      <p class="uwaga" id="photoPathInfo"></p>
      <label class="pole"><input type="checkbox" id="cienie" checked>Cienie</label>
      <label class="pole"><input type="checkbox" id="szkloFiz" checked>Szkło fizyczne (refrakcja, IOR 1,52)</label>
      <p class="uwaga">Po zatrzymaniu kamery jakość światła pośredniego stopniowo rośnie.
        Krawędzie są wygładzane w każdej klatce.</p>
    </section>
    <section data-s="pomoc" hidden>
      <p class="uwaga" id="navigationRegressionInfo"></p>
      <h3>Skróty</h3>
      <dl>
        <div><dt><kbd>W A S D</kbd></dt><dd>Chodzenie</dd></div>
        <div><dt><kbd>Shift</kbd> / <kbd>Spacja</kbd></dt><dd>Bieg / skok</dd></div>
        <div><dt><kbd>Q</kbd> <kbd>E</kbd> / <kbd>C</kbd></dt><dd>Wysokość oczu / kucanie</dd></div>
        <div><dt><kbd>F</kbd> <kbd>O</kbd> <kbd>B</kbd></dt><dd>Spacer / rozglądanie / z góry</dd></div>
        <div><dt><kbd>1</kbd>–<kbd>7</kbd></dt><dd>Pomieszczenia</dd></div>
        <div><dt>Dwa palce</dt><dd>Rozglądanie (jak panorama)</dd></div>
        <div><dt>Szczypanie</dt><dd>Podjazd do przodu / do tyłu</dd></div>
        <div><dt>Przeciągnięcie</dt><dd>Rozglądanie</dd></div>
        <div><dt>Klik</dt><dd>Podejdź w to miejsce</dd></div>
        <div><dt><kbd>K</kbd> / <kbd>Esc</kbd></dt><dd>Kolizje / wyjście</dd></div>
      </dl>
      <h3>Jeszcze nie przeniesione</h3>
      <p class="brak" id="brakujace"></p>
      <h3>Stan</h3>
      <p class="uwaga" id="stanPanelu"></p>
    </section>
    <details id="informacje"><summary>Informacje</summary>
      <button class="dzialanie" id="pomiarWydajnosci" type="button">Porównaj płynność — 20 s</button>
      <p class="uwaga">Wysoka jakość: 10 s ze skalą obrazu 1,25, potem 10 s ze skalą 1,0 (z uwzględnieniem limitu ekranu). Ustawienia GI i SSR są takie same. Rozglądaj się w tym samym miejscu; zachowaj rozmiar okna.</p>
      <p id="wynikWydajnosci" style="white-space:pre-line"></p>
    </details></div>`;
  document.body.append(el);
  const hud = document.getElementById('hud');
  if(hud){ el.querySelector('#informacje').append(hud); hud.hidden = false; }
  const $ = s => el.querySelector(s);
  $('#pomiarWydajnosci').addEventListener('click', () => {
    const pomiar = window.__silnik.wydajnosc;
    if(!pomiar){ $('#wynikWydajnosci').textContent = 'Poczekaj na wczytanie sceny.'; return; }
    pomiar.rozpocznijPomiar((tekst, trwa) => {
      $('#wynikWydajnosci').textContent = tekst;
      $('#pomiarWydajnosci').disabled = trwa;
    });
  });

  /* ---------- zakładki ---------- */
  el.querySelectorAll('.zakladki button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('.zakladki button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    el.querySelectorAll('section').forEach(x => { x.hidden = x.dataset.s !== b.dataset.z; });
  }));

  /* ---------- widok ---------- */
  el.querySelectorAll('[data-tryb]').forEach(b =>
    b.addEventListener('click', () => nawigacja.ustawTryb(b.dataset.tryb)));

  /* Przyciski kroków wysyłają te same zdarzenia co klawiatura, więc chodzenie
     ma dokładnie jedną implementację. */
  const KLAWISZ = {przod:'KeyW', tyl:'KeyS', lewo:'KeyA', prawo:'KeyD'};
  el.querySelectorAll('[data-krok]').forEach(b => {
    const kod = KLAWISZ[b.dataset.krok];
    const wcisnij = e => { e.preventDefault();
      if(nawigacja.tryb === 'ptak'){ nawigacja.ustawTryb('orbita'); return; }
      dispatchEvent(new KeyboardEvent('keydown', {code: kod})); };
    const pusc = () => dispatchEvent(new KeyboardEvent('keyup', {code: kod}));
    b.addEventListener('pointerdown', wcisnij);
    b.addEventListener('pointerup', pusc);
    b.addEventListener('pointerleave', pusc);
    b.addEventListener('pointercancel', pusc);
  });
  $('#oczNizej').addEventListener('click', () => nawigacja.zmienWysokoscOczu(-5));
  $('#oczWyzej').addEventListener('click', () => nawigacja.zmienWysokoscOczu(+5));

  const pokoje = $('#pokoje');
  nawigacja.pokoje.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'dzialanie'; b.textContent = p.name; b.title = p.dimensions + ' · ' + (i+1);
    b.style.flex = '1 1 44%';
    b.addEventListener('click', () => nawigacja.doPokoju(i));
    pokoje.append(b);
  });

  /* Kadrowanie mebla — lista bierze się z biblioteki, nie z listy zaszytej w kodzie. */
  const wybor = $('#mebelWybor');
  function odswiezMeble(){
    const byly = wybor.value;
    wybor.innerHTML = '';
    for(const [id, w] of biblioteka.meble){
      if(!w.korzen) continue;
      const o = document.createElement('option');
      o.value = id; o.textContent = w.nazwa || id;
      wybor.append(o);
    }
    if(byly) wybor.value = byly;
    odswiezRuchy?.();
  }
  odswiezMeble();
  $('#kadrMebel').addEventListener('click', () => {
    const w = biblioteka.meble.get(wybor.value);
    if(!w || !w.korzen) return;
    const wynik = nawigacja.kadrujMebel(w.korzen);
    $('#kadrInfo').textContent = !wynik.ok ? wynik.powod
      : wynik.caly ? '' : 'Widok częściowy — w pokoju brakuje miejsca na objęcie całego mebla.';
  });

  /* ARCH_PHOTO: pozioma kamera i przesunięcie osi optycznej. Kadry są stanem
     użytkownika przeglądarki, nie trafiają do furniture.json. */
  const trybKamery=$('#trybKamery'), lensShiftY=$('#lensShiftY'), archKadry=$('#archKadry');
  trybKamery.value=archPhoto.tryb;
  function odswiezArchKadry(){
    const poprzedni=archKadry.value;archKadry.innerHTML='';
    for(const k of archPhoto.kadry){const o=document.createElement('option');o.value=o.textContent=k.name;archKadry.append(o);}
    if(poprzedni)archKadry.value=poprzedni;
    if(!archKadry.options.length){const o=document.createElement('option');o.textContent='Brak zapisanych kadrów';o.value='';archKadry.append(o);}
  }
  trybKamery.addEventListener('change',()=>{
    if(trybKamery.value==='arch_photo'){
      const a=$('#antyaliasing');a.value='smaa';window.__silnik.aa?.ustaw('smaa');
    }
    archPhoto.ustaw(trybKamery.value);
  });
  lensShiftY.addEventListener('input',()=>{
    $('#lensShiftYVal').textContent=lensShiftY.value+'%';
    archPhoto.ustawParametry({shiftY:+lensShiftY.value/100});
  });
  $('#zapiszKadr').addEventListener('click',()=>{if(archPhoto.zapiszKadr($('#nazwaKadru').value))odswiezArchKadry();});
  $('#wczytajKadr').addEventListener('click',()=>archKadry.value&&archPhoto.zastosujKadr(archKadry.value));
  $('#usunKadr').addEventListener('click',()=>{if(archKadry.value)archPhoto.usunKadr(archKadry.value);odswiezArchKadry();});
  odswiezArchKadry();

  /* Jedna wspólna szyna na ścianę: wszystkie pary odsuwają się na boczne pasy. */
  const odswiezZaslony=[];
  for(const s of zaslony?.sciany || []){
    const wiersz=document.createElement('div');
    const opis=document.createElement('p');opis.className='uwaga';wiersz.append(opis);
    const guziki=document.createElement('div');guziki.className='siatka';wiersz.append(guziki);
    const lista=[];
    for(const [tekst,cel] of [['Odsłoń',1],['Zasłoń',0]]){
      const b=document.createElement('button');b.className='dzialanie';b.textContent=tekst;
      b.setAttribute('aria-label',tekst+' zasłony — '+s.nazwa);
      b.addEventListener('click',()=>zaslony.ustaw(s,cel));guziki.append(b);lista.push([b,cel]);
    }
    function odswiez(){
      opis.textContent=s.nazwa+' · '+s.rodzaj+' · '+(s.cel===1?'odsłonięte':s.cel===0?'zasłonięte':'częściowo odsłonięte');
      for(const [b,cel] of lista) b.setAttribute('aria-pressed',String(s.cel===cel));
    }
    odswiezZaslony.push(odswiez);odswiez();$('#zaslonySterowanie').append(wiersz);
  }
  zaslony?.obserwuj(()=>odswiezZaslony.forEach(fn=>fn()));

  /* ---------- RUCHOME CZĘŚCI ----------
     Lista bierze się z mechanizmów zbudowanych przez bibliotekę, nie z listy
     wpisanej w kod — nowy mebel z zawiasami pojawi się tu sam. */
  function odswiezRuchy(){
    const box = $('#ruchy'), lista = api.interakcje?.ruchy?.() || [];
    box.innerHTML = '';
    for(const {ruch, nazwaMebla} of lista){
      const b = document.createElement('button');
      b.className = 'dzialanie';
      b.style.cssText = 'width:100%;text-align:left;margin-bottom:3px';
      b.textContent = (ruch.etykieta || ruch.id);
      b.title = nazwaMebla + ' · ' + ruch.typ;
      b.addEventListener('click', () => { api.interakcje.przelacz(ruch); });
      box.append(b);
    }
    $('#ruchyInfo').textContent = lista.length
      ? lista.length + ' ruchomych części · można też kliknąć wprost w mebel'
      : 'Ten mebel nie ma zadeklarowanych mechanizmów.';
  }
  $('#otworzWsz').addEventListener('click', () => api.interakcje?.otworzWszystko(true));
  $('#zamknijWsz').addEventListener('click', () => api.interakcje?.otworzWszystko(false));

  const pokazMieszkanie = $('#pokazMieszkanie');
  let widoczne = true;
  function przelaczMieszkanie(){
    widoczne = !widoczne;
    pokazMieszkanie.setAttribute('aria-pressed', String(widoczne));
    krycie.ustawKrycieMieszkania(widoczne ? +$('#krycie').value/100 : 0);
  }
  pokazMieszkanie.addEventListener('click', przelaczMieszkanie);
  addEventListener('keydown', e => {
    if(e.code === 'KeyP' && !e.metaKey && !e.ctrlKey && !e.altKey) przelaczMieszkanie();
  });
  $('#krycie').addEventListener('input', e => {
    $('#krycieVal').textContent = e.target.value + '%';
    if(widoczne) krycie.ustawKrycieMieszkania(+e.target.value/100);
  });
  $('#kolizje').addEventListener('change', () => nawigacja.przelaczKolizje());

  /* ---------- światło ---------- */
  function zastosujCzas(){
    const d = $('#data').value, g = $('#godzina').value;
    if(!d || !g) return;
    const wynik = swiatlo.ustawCzas(new Date(d + 'T' + g + ':00'));
    const st = THREE.MathUtils.radToDeg(wynik.wysokosc);
    $('#slonceInfo').textContent = st > 0
      ? 'Słońce ' + st.toFixed(1) + '° nad horyzontem.'
      : 'Słońce pod horyzontem — świecą tylko kule sufitowe.';
  }
  $('#zastosujCzas').addEventListener('click', zastosujCzas);
  $('#terazCzas').addEventListener('click', () => {
    const t = new Date();
    $('#data').value = t.toISOString().slice(0,10);
    $('#godzina').value = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    zastosujCzas();
  });
  el.querySelectorAll('[data-godz]').forEach(b => b.addEventListener('click', () => {
    $('#godzina').value = b.dataset.godz; zastosujCzas();
  }));

  const suwaki = [['cieplo','cieplo',100], ['rozproszenie','rozproszenie',100],
                  ['gOkna','okna',100], ['gSlonce','slonce',100], ['gKule','kule',100]];
  for(const [id, klucz, dziel] of suwaki){
    $('#'+id).addEventListener('input', e => {
      $('#'+id+'Val').textContent = e.target.value + '%';
      swiatlo.ustawSwiatlo({[klucz]: +e.target.value/dziel});
    });
  }
  $('#animacjaTla').addEventListener('change', e => { zielen.animuj = e.target.checked; });
  $('#cienLisci').addEventListener('change', e => window.__silnik.ustawCienZieleni?.(e.target.checked));

  /* ---------- jakość ---------- */
  $('#ekspozycja').addEventListener('input', e => {
    renderer.toneMappingExposure = +e.target.value;
    $('#ekspozycjaVal').textContent = (+e.target.value).toFixed(2).replace('.', ',');
  });
  const jakoscSel = $('#jakoscPoziom');
  const aaSel = $('#antyaliasing');
  const toneSel = $('#toneMapping');
  const giSel = $('#worldGI');
  const ssrSel = $('#ssrWariant');
  const parametry = new URLSearchParams(location.search);
  if(parametry.get('aa')==='taau') aaSel.value='taau';
  if(['aces','neutral','agx'].includes(parametry.get('tone'))) toneSel.value=parametry.get('tone');
  if(parametry.get('gi')==='speedball') giSel.value='speedball';
  if(parametry.get('ssr')==='modern') ssrSel.value='modern';
  if(['minimalna','srednia','wysoka','photo_raster','photo_path'].includes(parametry.get('quality'))) jakoscSel.value=parametry.get('quality');
  aaSel.addEventListener('change',()=>{
    window.__silnik.aa?.ustaw(aaSel.value);
    opiszJakosc();
  });
  const TONE={aces:THREE.ACESFilmicToneMapping,neutral:THREE.NeutralToneMapping,agx:THREE.AgXToneMapping};
  toneSel.addEventListener('change',()=>{renderer.toneMapping=TONE[toneSel.value]??TONE.aces;});
  giSel.addEventListener('change',()=>{
    const q = new URLSearchParams(location.search);
    if(giSel.value === 'speedball') {
      q.set('gi','speedball');
      q.set('quality','wysoka');
    } else q.delete('gi');
    location.search = q.toString();
  });
  ssrSel.addEventListener('change',()=>{
    const q = new URLSearchParams(location.search);
    if(ssrSel.value === 'modern') q.set('ssr','modern'); else q.delete('ssr');
    q.set('quality','wysoka'); q.set('aa','smaa'); q.delete('gi');
    location.search = q.toString();
  });
  function opiszJakosc(){
    const j = window.__silnik.jakosc;
    const p = j?.POZIOMY?.[jakoscSel.value];
    $('#jakoscOpis').textContent = p
        ? p.opis + (['photo_raster','photo_path'].includes(jakoscSel.value)
        ? ' · TAAU 64 próbek, pełna rozdzielczość'
        : aaSel.value==='taau' && jakoscSel.value==='wysoka'
        ? ' · TAAU: wejście 75%, wynik 100%' : ' · SMAA')
        + (giSel.value==='speedball' ? ' · Speedball GI TEST' : ' · current SSGI')
        + (ssrSel.value==='modern' ? ' · stochastic SSR TEST' : ' · current SSR')
        + ' · przełączenie wymaga rekompilacji shaderów, potrwa chwilę'
      : '';
  }
  jakoscSel.addEventListener('change', () => {
    $('#jakoscOpis').textContent = 'Przełączanie…';
    /* Oddajemy klatkę, żeby komunikat zdążył się pojawić przed rekompilacją,
       która blokuje wątek. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__silnik.jakosc?.ustawPoziomJakosci(jakoscSel.value);
      opiszJakosc();
    }));
  });
  opiszJakosc();
  $('#szkloFiz').addEventListener('change', e => window.__silnik.ustawSzklo?.(e.target.checked));
  $('#cienie').addEventListener('change', e => {
    renderer.shadowMap.enabled = e.target.checked;
    renderer.shadowMap.needsUpdate = true;
  });

  /* ---------- pomoc ---------- */
  $('#brakujace').textContent =
    'Liczba próbek (1/32/128), rozdzielczość tekstur (2K/4K/8K), poziomy SSGI, '
  + 'profil tkaniny, głębia ostrości, wycieczka, własne lampy, otwieranie ruchomych '
  + 'części mebli. Warstwy wykończenia powierzchni (mikrorelief, plamy, relief) '
  + 'czekają na przepisanie z onBeforeCompile na graf TSL.';

  /* ---------- PAMIĘĆ USTAWIEŃ MIĘDZY SESJAMI ----------
     Zapisujemy WSZYSTKIE kontrolki panelu, przechodząc po nich generycznie —
     dzięki temu kontrolka dodana w przyszłości jest pamiętana bez dopisywania
     czegokolwiek tutaj. Zapamiętana jest też otwarta zakładka i to, czy panel
     był zwinięty.

     Przywracanie działa przez wysłanie zdarzeń 'input'/'change', czyli tą samą
     drogą co ruch suwaka. Nie ma więc drugiej ścieżki stosowania ustawień,
     która mogłaby się rozjechać z pierwszą. */
  const KLUCZ_UST = 'mieszkanie-webgpu:ustawienia:1';
  const PROFIL_SWIATLA = 'z3a-1';
  const kontrolki = () => [...el.querySelectorAll('input, select')];

  function zapiszUstawienia(){
    try{
      const dane = {profilSwiatla: PROFIL_SWIATLA, pola: {}, zakladka: el.querySelector('.zakladki button[aria-selected=true]')?.dataset.z,
                    otwarty: el.open};
      for(const k of kontrolki()){
        if(!k.id || k.id === 'worldGI' || k.id === 'ssrWariant') continue;
        dane.pola[k.id] = k.type === 'checkbox' ? k.checked : k.value;
      }
      localStorage.setItem(KLUCZ_UST, JSON.stringify(dane));
    }catch(e){ /* brak pamięci nie może psuć panelu */ }
  }

  function wczytajUstawienia(){
    let d;
    try{ d = JSON.parse(localStorage.getItem(KLUCZ_UST) || 'null'); }catch(e){ return false; }
    if(!d || !d.pola || typeof d.pola !== 'object') return false;
    // Jednorazowo zastosuj uzgodnione światło; zachowaj pozostałe ustawienia.
    if(d.profilSwiatla !== PROFIL_SWIATLA){
      Object.assign(d.pola, {data:'2026-09-15', godzina:'16:30', cieplo:'45',
        rozproszenie:'90', gOkna:'100', gSlonce:'100', gKule:'30'});
    }
    for(const k of kontrolki()){
      if(!k.id || k.id === 'worldGI' || k.id === 'ssrWariant' || !(k.id in d.pola)) continue;
      const v = d.pola[k.id];
      if(k.type === 'checkbox'){
        if(typeof v !== 'boolean') continue;
        if(k.checked === v) continue;
        k.checked = v;
        k.dispatchEvent(new Event('change', {bubbles: true}));
      }else{
        if(typeof v !== 'string' || k.value === v) continue;
        k.value = v;
        k.dispatchEvent(new Event(k.tagName === 'SELECT' ? 'change' : 'input', {bubbles: true}));
      }
    }
    if(d.zakladka){
      const b = el.querySelector(`.zakladki button[data-z="${d.zakladka}"]`);
      if(b) b.click();
    }
    if(typeof d.otwarty === 'boolean') el.open = d.otwarty;
    const aaZUrl=new URLSearchParams(location.search).get('aa');
    if(['smaa','taau'].includes(aaZUrl)) aaSel.value=aaZUrl;
    const q=new URLSearchParams(location.search);
    if(['aces','neutral','agx'].includes(q.get('tone'))){toneSel.value=q.get('tone');toneSel.dispatchEvent(new Event('change'));}
    if(q.get('camera')==='arch'){trybKamery.value='arch_photo';trybKamery.dispatchEvent(new Event('change'));}
    giSel.value=q.get('gi')==='speedball'?'speedball':'ssgi';
    ssrSel.value=q.get('ssr')==='modern'?'modern':'current';
    if(['minimalna','srednia','wysoka','photo_raster','photo_path'].includes(q.get('quality'))) jakoscSel.value=q.get('quality');
    /* Data i godzina nie mają uchwytu 'input' — stosuje je dopiero przycisk,
       więc po przywróceniu wołamy to wprost. */
    zastosujCzas();
    return true;
  }

  /* Jeden nasłuch na cały panel: łapie każdą kontrolkę, także dodaną później. */
  el.addEventListener('input', zapiszUstawienia);
  el.addEventListener('change', zapiszUstawienia);
  el.addEventListener('click', e => { if(e.target.closest('button')) setTimeout(zapiszUstawienia, 0); });
  el.addEventListener('toggle', zapiszUstawienia);
  addEventListener('pagehide', zapiszUstawienia);

  function odswiezStan(s){
    $('#oczy').textContent = (s.wysokoscOczu ?? nawigacja.wysokoscOczu) + ' cm';
    $('#kolizje').checked = s.kolizje ?? nawigacja.kolizje;
    el.querySelectorAll('[data-tryb]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tryb === (s.tryb ?? nawigacja.tryb))));
    $('#stanPanelu').textContent =
      'Tryb: ' + (s.tryb ?? nawigacja.tryb) + ' · ' + (s.sposobPatrzenia || '');
  }
  odswiezStan({});
  zastosujCzas();
  /* Przywrócenie na końcu — po podpięciu wszystkich uchwytów, żeby wysłane
     zdarzenia faktycznie zadziałały. */
  const wznowione = wczytajUstawienia();
  zapiszUstawienia();
  odswiezRuchy();
  return {odswiezStan, odswiezMeble, odswiezRuchy, zapiszUstawienia, wznowione};
}
