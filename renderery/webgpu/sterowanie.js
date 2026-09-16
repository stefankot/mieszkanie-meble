import {PRESSETY_SWIATLA, DOMYSLNY_PRESET_SWIATLA, dataPresetuSwiatla} from './presety-swiatla.mjs';

import { utworzNawigacjePanelu } from './panel-navigation.js?panel-v3';
import { STYL_PANELU } from './panel-style.js?furniture-map-v1';
import { utworzMiniMape } from './mini-mapa.js?furniture-map-v1';

/* Panel według zadań. Tryb DEV zmienia tylko widoczność kontrolek. */

export function utworzSterowanie(api){
  const {THREE, renderer, camera, controls, nawigacja, plan, biblioteka, swiatlo, krycie, zielen, zaslony, archPhoto} = api;

  const styl = document.createElement('style');
  styl.textContent = STYL_PANELU;
  document.head.append(styl);

  const el = document.createElement('details');
  el.id = 'sterowanie'; el.open = true;
  el.dataset.panelMode = 'simple';
  el.innerHTML = `<summary class="panel-tytul"><span><strong>Mieszkanie</strong><small>Studio 3D</small></span>
    <span class="panel-akcje"><button type="button" class="ikona-okragla" data-panel-mode-toggle aria-pressed="false" aria-label="Tryb deweloperski" title="Tryb DEV">D</button><span class="panel-zwin" aria-hidden="true">⌃</span></span>
    <span class="sr-only">Zwiń lub rozwiń panel</span></summary>
  <div class="panel">
    <div class="panel-naglowek">
      <div class="zakladki" role="tablist" aria-label="Sterowanie mieszkaniem">
        <button role="tab" data-z="meble" aria-selected="true">Meble</button>
        <button role="tab" data-z="swiatlo" aria-selected="false">Światło</button>
        <button role="tab" data-z="jakosc" aria-selected="false">Obraz</button>
        <button role="tab" data-z="widok" aria-selected="false" class="dev-only">Ruch</button>
        <button role="tab" data-z="dev" aria-selected="false" class="dev-only">Laboratorium</button>
      </div>
    </div>
    <div class="panel-tresc">
    <section data-s="meble">
      <div class="sekcja-wstep naglowek-z-akcja"><h2 id="mebelNazwa">Mebel</h2>
        <button type="button" class="ikona-okragla ikona-drzwi" id="drzwiMebla" aria-pressed="false" aria-label="Otwórz wszystkie drzwi" title="Otwórz wszystkie drzwi"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 17V3h9v14M7 5l7-1v12l-7-1zM11.8 10h.1"/></svg></button>
      </div>
      <div id="miniMapa" class="karta"></div>
      <div class="karta"><label class="pole" for="mebelWybor">Projekt</label>
      <div class="wiersz-z-ikona"><select id="mebelWybor" aria-label="Wybrany mebel"></select>
        <button type="button" class="ikona-okragla dev-only" id="przeladujMebel" aria-label="Pobierz model ponownie" title="Pobierz model ponownie">↻</button></div>
      <label class="pole" for="mebelWersja">Wersja projektu</label>
      <div class="wiersz-z-ikona"><select id="mebelWersja" aria-label="Wersja wybranego mebla"></select>
        <button type="button" class="ikona-okragla" id="sprawdzWersje" aria-label="Sprawdź nowe wersje" title="Sprawdź nowe wersje">↻</button></div>
      <p class="uwaga dev-only" id="mebelStatus" role="status" aria-live="polite"></p>
      <button class="dzialanie glowna" id="kadrMebel">Pokaż mebel <span aria-hidden="true">↗</span></button>
      </div>
      <div class="karta dev-only" id="czesciMebla"><h3>Poszczególne części <span id="liczbaRuchow" class="licznik"></span></h3><div id="ruchy"></div></div>
    </section>
    <section data-s="widok" class="dev-only" hidden>
      <div class="sekcja-wstep"><h2>Ruch i wysokość</h2></div>
      <div class="karta"><div class="strzalki">
        <button class="dzialanie" data-krok="lewo" aria-label="Obróć kamerę w lewo"  title="A">←</button>
        <button class="dzialanie" data-krok="przod" aria-label="Idź do przodu" title="W">↑</button>
        <button class="dzialanie" data-krok="tyl" aria-label="Idź do tyłu"   title="S">↓</button>
        <button class="dzialanie" data-krok="prawo" aria-label="Obróć kamerę w prawo" title="D">→</button>
      </div>
      <div class="siatka" style="margin-top:6px;align-items:center">
        <button class="dzialanie" id="oczNizej" aria-label="Obniż kamerę o 5 cm" title="Niżej o 5 cm · −/_">−</button>
        <output id="oczy" style="text-align:center">160 cm</output>
        <button class="dzialanie" id="oczWyzej" aria-label="Podnieś kamerę o 5 cm" title="Wyżej o 5 cm · =/+">+</button>
      </div>
      </div>
    </section>
    <section data-s="swiatlo" hidden>
      <div class="sekcja-wstep naglowek-z-akcja"><h2>Światło</h2>
        <button type="button" class="ikona-okragla ikona-zaslony" id="zaslonyToggle" aria-pressed="false" aria-label="Zasłoń wszystkie zasłony" title="Zasłoń wszystkie zasłony"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 3h14M5 4v13M15 4v13M5 5c3 1 3 4 0 6m10-6c-3 1-3 4 0 6M3 17h14"/></svg></button>
      </div>
      <div class="karta">
      <h3>Pora dnia</h3>
      <input type="hidden" id="presetSwiatla" value="${DOMYSLNY_PRESET_SWIATLA}">
      <div class="pora" role="group" aria-label="Sezon i godzina światła">
        <strong>LATO</strong>
        <button class="dzialanie" data-preset-swiatla="lato-08">8.00</button>
        <button class="dzialanie" data-preset-swiatla="lato-14">14.00</button>
        <button class="dzialanie" data-preset-swiatla="lato-20">20.00</button>
        <strong>ZIMA</strong>
        <button class="dzialanie" data-preset-swiatla="zima-08">8.00</button>
        <button class="dzialanie" data-preset-swiatla="zima-14">14.00</button>
        <button class="dzialanie" data-preset-swiatla="zima-20">20.00</button>
      </div>
      <p class="uwaga" id="slonceInfo"></p>
      <h3>Charakter</h3>
      <div class="suwak"><div class="naglowek"><label for="cieplo">Ciepło</label><output id="cieploVal">45%</output></div>
        <input id="cieplo" type="range" min="0" max="100" value="45"></div>
      <div class="suwak"><div class="naglowek"><label for="rozproszenie">Rozproszenie</label><output id="rozproszenieVal">90%</output></div>
        <input id="rozproszenie" type="range" min="0" max="100" value="90"></div>
</div>
      <details class="grupa dev-only"><summary>Źródła światła i otoczenie</summary><div class="wnetrze">
      <div class="suwak"><div class="naglowek"><label for="gOkna">Okna</label><output id="gOknaVal">100%</output></div>
        <input id="gOkna" type="range" min="0" max="200" step="5" value="100"></div>
      <div class="suwak"><div class="naglowek"><label for="gSlonce">Słońce</label><output id="gSlonceVal">100%</output></div>
        <input id="gSlonce" type="range" min="0" max="200" step="5" value="100"></div>
      <div class="suwak"><div class="naglowek"><label for="gKule">Kule sufitowe</label><output id="gKuleVal">0%</output></div>
        <input id="gKule" type="range" min="0" max="200" step="5" value="0"></div>
      <label class="pole"><input type="checkbox" id="animacjaTla" checked>Animacja tła (wiatr w koronach)</label>
      <label class="pole"><input type="checkbox" id="cienLisci">Cień liści na ścianach (komorebi)</label>
</div></details>
    </section>
    <section data-s="jakosc" hidden>
      <div class="sekcja-wstep naglowek-z-akcja"><h2>Obraz</h2>
        <button type="button" class="ikona-okragla" id="widokToggle" aria-pressed="false" aria-label="Widok z góry" title="Widok z góry"><span aria-hidden="true">⌖</span></button>
      </div>
      <div class="karta">
      <label class="pole" for="jakoscPoziom">Priorytet renderowania</label><select id="jakoscPoziom">
        <option value="minimalna">Płynność</option>
        <option value="srednia">Zrównoważona</option>
        <option value="wysoka" selected>Wysoka jakość — zalecana</option>
        <option value="photo_raster">Zdjęcie — nieruchomy kadr</option>
        <option value="photo_path" class="dev-only">PHOTO_PATH — integration TEST</option>
      </select>
<p class="uwaga" id="jakoscProsta" role="status" aria-live="polite"></p></div>
      <div class="karta"><h3>Jasność</h3>
      <div class="suwak"><div class="naglowek"><label for="ekspozycja">Ekspozycja</label><output id="ekspozycjaVal">0,72</output></div>
        <input id="ekspozycja" type="range" min="0.35" max="2.2" step="0.01" value="0.72"></div>
</div>
      <div class="karta"><h3>Kadry i perspektywa</h3>
      <label class="pole" for="trybKamery">Perspektywa</label><select id="trybKamery">
        <option value="interactive">Kamera interaktywna</option>
        <option value="arch_photo">Proste piony — fotografia wnętrz</option>
      </select>
      <div class="suwak"><div class="naglowek"><label for="lensShiftY">Przesunięcie kadru</label><output id="lensShiftYVal">8%</output></div>
        <input id="lensShiftY" type="range" min="-20" max="20" value="8"></div>
      <div class="siatka"><input id="nazwaKadru" type="text" maxlength="48" value="Kadr 1" aria-label="Nazwa zapisanego kadru">
        <button class="dzialanie" id="zapiszKadr" style="flex:0 0 58px">Zapisz</button></div>
      <div class="siatka" style="margin-top:4px"><select id="archKadry" aria-label="Zapisane kadry ARCH_PHOTO"></select>
        <button class="dzialanie" id="wczytajKadr" style="flex:0 0 52px">Otwórz</button>
        <button class="dzialanie tekstowa niebezpieczna" id="usunKadr" style="flex:0 0 45px">Usuń</button></div>
      <div class="dev-only"><h3>Widoczność i kolizje</h3>
        <button class="dzialanie" id="pokazMieszkanie" aria-pressed="true" title="P">Mieszkanie widoczne</button>
        <div class="suwak"><div class="naglowek"><label for="krycie">Krycie</label><output id="krycieVal">100%</output></div>
          <input id="krycie" type="range" min="0" max="100" step="1" value="100"></div>
        <label class="pole"><input type="checkbox" id="kolizje" checked>Kolizje ze ścianami <kbd>K</kbd></label>
      </div></div>
      <div class="dev-only"><p class="uwaga" id="jakoscOpis"></p>
      <details class="grupa"><summary>Ustawienia renderera</summary><div class="wnetrze"><label class="pole" for="antyaliasing">Wygładzanie krawędzi</label><select id="antyaliasing" title="Porównanie wygładzania">
        <option value="taau" selected>TAA — domyślne (wysoka, ostre)</option>
        <option value="smaa">SMAA (P18)</option>
      </select>
      <label class="pole" for="toneMapping">Mapowanie kolorów</label><select id="toneMapping" title="Porównanie tone mappingu">
        <option value="aces" selected>ACES — baseline</option>
        <option value="neutral">Neutral</option>
        <option value="agx">AgX</option>
      </select>
      <label class="pole" for="worldGI">Światło pośrednie</label><select id="worldGI" title="Porównanie światła pośredniego">
        <option value="ssgi" selected>SSGI — baseline</option>
        <option value="speedball">SSGI + Speedball 0.7.0 — TEST (wysoka)</option>
      </select>
      <label class="pole" for="ssrWariant">Odbicia</label><select id="ssrWariant" title="Porównanie odbić ekranowych">
        <option value="current">SSR current — fallback</option>
        <option value="modern" selected>Stochastic SSR r185 — domyślne</option>
      </select>
      <p class="uwaga" id="worldGIInfo"></p>

      <p class="uwaga" id="photoRasterInfo"></p>
      <p class="uwaga" id="photoPathInfo"></p>
      <label class="pole"><input type="checkbox" id="cienie" checked>Cienie</label>
      <label class="pole"><input type="checkbox" id="szkloFiz" checked>Szkło fizyczne (refrakcja, IOR 1,52)</label>
      <h3>Parametry obrazu</h3>
      <div id="suwakiJakosci"><p class="uwaga">Suwaki pojawią się po zbudowaniu potoku efektów.</p></div>
</div></details></div>
    </section>
    <section data-s="dev" hidden>
      <div class="sekcja-wstep"><h2>Laboratorium</h2></div>
      <button class="dzialanie glowna" id="profilM2" type="button">Profil optymalny · MacBook Air M2 <span aria-hidden="true">✓</span></button>
      <div class="karta">
      <h3>Presety eksperymentalne</h3>
      <select id="devPreset" aria-label="Preset testowy funkcji">
        <option value="baseline">Baseline — wyłącz warianty</option>
        <option value="candidate-a">Kandydat A — TRAA + ACES</option>
        <option value="candidate-b">Kandydat B — TRAA + AgX</option>
        <option value="candidate-c">Kandydat C — TRAA + modern SSR</option>
        <option value="all-compatible">Wszystkie eksperymenty — stress test</option>
        <option value="p19-current">P19–P37 — wszystkie włączone</option>
        <option value="p19-off">P19–P37 — wszystkie wyłączone</option>
        <option value="taau">TAAU r185</option>
        <option value="ktx-etc1s">KTX2 — ETC1S albedo</option>
        <option value="ktx-uastc">KTX2 — UASTC albedo</option>
        <option value="speedball">Speedball GI 0.7.0</option>
        <option value="modern-ssr">Stochastic SSR r185</option>
        <option value="arch-aces">ARCH_PHOTO + ACES</option>
        <option value="arch-neutral">ARCH_PHOTO + Neutral</option>
        <option value="arch-agx">ARCH_PHOTO + AgX</option>
        <option value="photo-raster">PHOTO_RASTER</option>
        <option value="photo-path">PHOTO_PATH gate</option>
        <option value="navigation">Test nawigacji</option>
        <option value="furniture-v2">Furniture v2 POC</option>
      </select>
      <button class="dzialanie" id="devApply" type="button" style="margin-top:6px">Uruchom i przeładuj</button>
      <p class="uwaga" id="devOpis"></p>
      <a id="devUrl" href="#" style="display:block;margin-top:6px;overflow-wrap:anywhere">Adres presetu</a>
</div>
      <details class="grupa" id="informacje"><summary>Wydajność i diagnostyka</summary>
      <button class="dzialanie" id="pomiarWydajnosci" type="button">Porównaj płynność — 20 s</button>
      <p id="wynikWydajnosci" style="white-space:pre-line"></p>
    </details>
    </section>
    <section data-s="pomoc" hidden>
      <div class="sekcja-wstep"><h2>Pomoc i skróty</h2><p>Sterowanie klawiaturą, myszą i gładzikiem.</p></div>
      <div class="karta">
      <p class="uwaga" id="navigationRegressionInfo"></p>
      <h3>Skróty</h3>
      <dl>
        <div><dt><kbd>W S</kbd></dt><dd>Przód / tył</dd></div>
        <div><dt><kbd>A D</kbd> / <kbd>← →</kbd></dt><dd>Obrót kamery</dd></div>
        <div><dt><kbd>Shift</kbd> + <kbd>← →</kbd></dt><dd>Ruch bokiem</dd></div>
        <div><dt><kbd>Shift</kbd> + <kbd>↑ ↓</kbd></dt><dd>Spójrz wyżej / niżej</dd></div>
        <div><dt><kbd>= +</kbd> / <kbd>− _</kbd></dt><dd>Podnieś / obniż kamerę</dd></div>
        <div><dt><kbd>Shift</kbd> / <kbd>Spacja</kbd></dt><dd>Bieg / skok</dd></div>
        <div><dt><kbd>C</kbd></dt><dd>Kucanie</dd></div>
        <div><dt><kbd>B</kbd></dt><dd>Rozglądanie / z góry</dd></div>
        <div><dt><kbd>1</kbd>–<kbd>7</kbd></dt><dd>Pomieszczenia</dd></div>
        <div><dt>Dwa palce</dt><dd>Rozglądanie (jak panorama)</dd></div>
        <div><dt>Szczypanie</dt><dd>Podjazd do przodu / do tyłu</dd></div>
        <div><dt>Przeciągnięcie</dt><dd>Rozglądanie</dd></div>
        <div><dt>Klik</dt><dd>Podejdź w to miejsce</dd></div>
        <div><dt><kbd>K</kbd> / <kbd>Esc</kbd></dt><dd>Kolizje / wyjście</dd></div>
      </dl>
<div class="dev-only"><h3>Stan renderera</h3><p class="uwaga" id="stanPanelu"></p><p class="brak" id="brakujace"></p></div></div>
    </section></div>
    <div class="panel-stopka"><span id="panelTrybOpis">Codzienne sterowanie</span><button type="button" data-z="pomoc" aria-pressed="false">Pomoc i skróty <span aria-hidden="true">?</span></button></div>
  </div>`;
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

  /* Nawigacja panelu nie wysyła zdarzeń do ustawień sceny. */
  const panelNav = utworzNawigacjePanelu(el);
  const wybor = $('#mebelWybor');
  const miniMapa = utworzMiniMape({THREE, kontener:$('#miniMapa'), plan, nawigacja, biblioteka,
    przyWyborze:id => {
      wybor.value=id;
      wybor.dispatchEvent(new Event('change'));
    }});

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
  $('#widokToggle').addEventListener('click', () =>
    nawigacja.ustawTryb(nawigacja.tryb === nawigacja.TRYBY.PTAK
      ? nawigacja.TRYBY.ORBITA : nawigacja.TRYBY.PTAK));

  /* Jeden kontekst mebla: wersja, kadr, przeładowanie i mechanizmy. */
  const wersjaWybor = $('#mebelWersja');
  const kontrolkiWersji = [wersjaWybor, $('#przeladujMebel'), $('#sprawdzWersje')];
  function odswiezWersje(){
    const w = biblioteka.meble.get(wybor.value);
    wersjaWybor.innerHTML = '';
    $('#mebelNazwa').textContent = w?.nazwa || 'Mebel';
    if(!w?.manifest) return;
    for(const v of biblioteka.dostepneWersje(wybor.value)){
      const o = document.createElement('option');
      o.value = v.id; o.disabled = !v.confirmed;
      o.textContent = `${v.id}${v.current ? ' · najnowsza' : ''}${v.selected ? ' · w scenie' : ''}${v.confirmed ? '' : ' · niezatwierdzona'}`;
      o.title = v.summary;
      wersjaWybor.append(o);
    }
    wersjaWybor.value = w.wersja || w.przypieta || '';
  }
  function odswiezStanBiblioteki(tekst){
    const k = biblioteka.kontrola, w = biblioteka.meble.get(wybor.value);
    kontrolkiWersji.forEach(b => b.disabled = k.trwa);
    if(tekst){ $('#mebelStatus').textContent = tekst; return; }
    if(k.trwa){ $('#mebelStatus').textContent = 'Sprawdzanie manifestów i modeli…'; return; }
    const czas = k.ostatnia ? new Date(k.ostatnia).toLocaleTimeString('pl-PL') : 'brak';
    const nowe = k.noweWersje?.length
      ? ' · nowe: ' + k.noweWersje.map(x => `${x.id} ${x.poprzednia}→${x.nowa}`).join(', ') : '';
    const powod = k.powod === 'wymuszone' ? ' · przeładowano od nowa'
      : k.powod === 'start' ? ' · kontrola startowa' : '';
    $('#mebelStatus').textContent = k.blad ? `Błąd kontroli: ${k.blad}`
      : `Sprawdzono: ${czas} · ${w?.wersja || 'brak wersji'} · ${w?.status || 'brak statusu'}${powod}${nowe}`;
  }
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
    odswiezWersje();
    odswiezStanBiblioteki();
    odswiezRuchy?.();
    miniMapa.odswiez();
  }
  odswiezMeble();
  wybor.addEventListener('change', () => {
    $('#drzwiMebla').setAttribute('aria-pressed','false');
    odswiezWersje(); odswiezStanBiblioteki(); odswiezRuchy();
  });
  async function wykonajZmianeWersji(fn, komunikat){
    kontrolkiWersji.forEach(b => b.disabled = true);
    $('#mebelStatus').textContent = komunikat;
    try{ await fn(); odswiezMeble(); }
    catch(e){ odswiezStanBiblioteki('Nie zastosowano zmiany: ' + e.message); }
    finally{ if(!biblioteka.kontrola.trwa) kontrolkiWersji.forEach(b => b.disabled = false); }
  }
  wersjaWybor.addEventListener('change', () => wykonajZmianeWersji(
    () => biblioteka.przypnij(wybor.value, wersjaWybor.value), 'Wczytywanie i zapisywanie wybranej wersji…'));
  $('#przeladujMebel').addEventListener('click', () => wykonajZmianeWersji(
    () => biblioteka.wymusPrzeladowanie(wybor.value), 'Wymuszone pobieranie mebla od nowa…'));
  $('#sprawdzWersje').addEventListener('click', () => wykonajZmianeWersji(
    () => biblioteka.sprawdzWersje(wybor.value), 'Sprawdzanie wersji wybranego mebla…'));
  biblioteka.obserwuj(() => { odswiezMeble(); odswiezStanBiblioteki(); });
  $('#kadrMebel').addEventListener('click', () => {
    const w = biblioteka.meble.get(wybor.value);
    if(!w || !w.korzen) return;
    nawigacja.kadrujMebel(w.korzen);
  });

  /* ARCH_PHOTO: pozioma kamera i przesunięcie osi optycznej. Kadry są stanem
     użytkownika przeglądarki, nie trafiają do furniture.json. */
  const trybKamery=$('#trybKamery'), lensShiftY=$('#lensShiftY'), archKadry=$('#archKadry');
  trybKamery.value=archPhoto.tryb;
  function odswiezArchKadry(){
    const poprzedni=archKadry.value;archKadry.innerHTML='';
    for(const k of archPhoto.kadry){const o=document.createElement('option');o.value=o.textContent=k.name;archKadry.append(o);}
    if(poprzedni)archKadry.value=poprzedni;
    $('#wczytajKadr').disabled = $('#usunKadr').disabled = !archPhoto.kadry.length;
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

  /* Jedna kontrolka steruje wszystkimi szynami jednocześnie. */
  const zaslonyToggle=$('#zaslonyToggle');
  function odswiezZaslony(){
    const zasloniete=Boolean(zaslony?.sciany?.length) && zaslony.sciany.every(s=>s.cel===0);
    zaslonyToggle.setAttribute('aria-pressed',String(zasloniete));
    zaslonyToggle.setAttribute('aria-label',zasloniete?'Odsłoń wszystkie zasłony':'Zasłoń wszystkie zasłony');
    zaslonyToggle.title=zaslonyToggle.getAttribute('aria-label');
  }
  zaslonyToggle.addEventListener('click',()=>{
    const zasloniete=zaslony?.sciany?.every(s=>s.cel===0);
    for(const s of zaslony?.sciany || []) zaslony.ustaw(s,zasloniete?1:0);
  });
  zaslony?.obserwuj(odswiezZaslony);odswiezZaslony();

  /* Mechanizmy dotyczą wyłącznie mebla wybranego powyżej. */
  function odswiezRuchy(){
    const box = $('#ruchy'), lista = api.interakcje?.ruchy?.(wybor.value) || [];
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
    $('#liczbaRuchow').textContent = String(lista.length);
    $('#czesciMebla').hidden = !lista.length;
    $('#drzwiMebla').disabled = !lista.length;
  }
  $('#drzwiMebla').addEventListener('click', event => {
    const otwarte=event.currentTarget.getAttribute('aria-pressed')!=='true';
    event.currentTarget.setAttribute('aria-pressed',String(otwarte));
    event.currentTarget.setAttribute('aria-label',otwarte?'Zamknij wszystkie drzwi':'Otwórz wszystkie drzwi');
    event.currentTarget.title=event.currentTarget.getAttribute('aria-label');
    api.interakcje?.otworzWszystko(otwarte, wybor.value);
  });

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
  function zastosujPresetSwiatla(id){
    if(!PRESSETY_SWIATLA[id]) id = DOMYSLNY_PRESET_SWIATLA;
    $('#presetSwiatla').value = id;
    const wynik = swiatlo.ustawCzas(dataPresetuSwiatla(id));
    const p = PRESSETY_SWIATLA[id];
    const st = THREE.MathUtils.radToDeg(wynik.wysokosc);
    $('#slonceInfo').textContent = p.sezon + ' · ' + p.godzina + ' · ' + (st > 0
      ? 'słońce ' + st.toFixed(1) + '° nad horyzontem.'
      : 'słońce pod horyzontem; pozostaje światło nieba, okien i lamp.');
    el.querySelectorAll('[data-preset-swiatla]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.presetSwiatla === id)));
  }
  el.querySelectorAll('[data-preset-swiatla]').forEach(b => b.addEventListener('click', () => {
    zastosujPresetSwiatla(b.dataset.presetSwiatla);
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
  if(['smaa','taau'].includes(parametry.get('aa'))) aaSel.value=parametry.get('aa');
  if(['aces','neutral','agx'].includes(parametry.get('tone'))) toneSel.value=parametry.get('tone');
  if(parametry.get('gi')==='speedball') giSel.value='speedball';
  ssrSel.value=parametry.get('ssr')==='current'?'current':'modern';
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
    if(ssrSel.value === 'current') q.set('ssr','current'); else q.delete('ssr');
    q.set('quality','wysoka'); q.set('aa',aaSel.value); q.delete('gi');
    location.search = q.toString();
  });
  function opiszJakosc(){
    $('#jakoscProsta').textContent = ({minimalna:'Mniej efektów, większa płynność podczas zwiedzania.', srednia:'Kompromis między szczegółowością a płynnością.', wysoka:'Pełne oświetlenie i odbicia. Po zatrzymaniu obraz stopniowo się wygładza.', photo_raster:'Zatrzymaj kamerę i poczekaj na dopracowanie nieruchomego kadru.', photo_path:'Aktywny eksperymentalny profil. Szczegóły są dostępne w trybie DEV.'})[jakoscSel.value] || '';
    const j = window.__silnik.jakosc;
    const p = j?.POZIOMY?.[jakoscSel.value];
    $('#jakoscOpis').textContent = p
        ? p.opis + (['photo_raster','photo_path'].includes(jakoscSel.value)
        ? ' · TAAU 64 próbek, pełna rozdzielczość'
        : aaSel.value==='taau' && jakoscSel.value==='wysoka'
        ? ' · TAA (TRAA), skala 90% + wyostrzanie RCAS' : ' · SMAA')
        + (giSel.value==='speedball' ? ' · Speedball GI TEST' : ' · current SSGI')
        + (ssrSel.value==='modern' ? ' · stochastic SSR' : ' · current SSR fallback')
        + ' · przełączenie wymaga rekompilacji shaderów, potrwa chwilę'
      : '';
  }
  jakoscSel.addEventListener('change', () => {
    $('#jakoscProsta').textContent = $('#jakoscOpis').textContent = 'Przygotowywanie obrazu…';
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

  /* ---------- DEV: jawne, odwracalne presety query ---------- */
  const DEV_KEYS = ['quality','aa','tone','gi','ssr','ktx2','camera','navtest','bez','light',
    'furnitureV2','furnitureSource'];
  const DEV_PRESETS = {
    baseline: {quality:'srednia', aa:'smaa', tone:'aces', ssr:'current', camera:'interactive'},
    'candidate-a': {quality:'wysoka', aa:'taau', tone:'aces', ssr:'current', camera:'interactive'},
    'candidate-b': {quality:'wysoka', aa:'taau', tone:'agx', ssr:'current', camera:'interactive'},
    'candidate-c': {quality:'wysoka', aa:'taau', tone:'aces', ssr:'modern', camera:'interactive'},
    'all-compatible': {quality:'wysoka', aa:'taau', tone:'agx', gi:'speedball',
      ssr:'modern', ktx2:'etc1s', camera:'arch', furnitureV2:'regal-salon:v0007-poc-v2',
      furnitureSource:'local'},
    'p19-current': {quality:'wysoka', aa:'taau', tone:'aces', ssr:'modern'},
    'p19-off': {quality:'wysoka', aa:'smaa', tone:'aces', bez:'wszystko'},
    taau: {quality:'wysoka', aa:'taau', tone:'aces'},
    'ktx-etc1s': {quality:'wysoka', aa:'smaa', tone:'aces', ktx2:'etc1s'},
    'ktx-uastc': {quality:'wysoka', aa:'smaa', tone:'aces', ktx2:'uastc'},
    speedball: {quality:'wysoka', aa:'smaa', tone:'aces', gi:'speedball'},
    'modern-ssr': {quality:'wysoka', aa:'smaa', tone:'aces', ssr:'modern'},
    'arch-aces': {quality:'wysoka', aa:'smaa', tone:'aces', camera:'arch'},
    'arch-neutral': {quality:'wysoka', aa:'smaa', tone:'neutral', camera:'arch'},
    'arch-agx': {quality:'wysoka', aa:'smaa', tone:'agx', camera:'arch'},
    'photo-raster': {quality:'photo_raster', aa:'taau', tone:'aces'},
    'photo-path': {quality:'photo_path', aa:'taau', tone:'aces'},
    navigation: {quality:'minimalna', aa:'smaa', tone:'aces', navtest:'1'},
    'furniture-v2': {quality:'srednia', aa:'smaa', tone:'aces',
      furnitureV2:'regal-salon:v0007-poc-v2', furnitureSource:'local'}
  };
  const DEV_OPIS = {
    baseline: 'Bez eksperymentalnych parametrów; current SSGI/SSR, SMAA i ACES.',
    'candidate-a': '30–31 FPS w pomiarze lokalnym; najrówniejsze krawędzie i naturalna kompresja świateł.',
    'candidate-b': '30–31 FPS; ta sama geometria i AA, łagodniejszy kontrast AgX.',
    'candidate-c': '28,1 FPS; temporalnie stabilne krawędzie i stochastic SSR, lecz najmniejszy zapas wydajności.',
    'all-compatible': 'Stress test, nie kandydat realtime: Speedball i modern SSR nie osiągnęły 25 FPS osobno.',
    'photo-path': 'Eksperymentalna bramka integracji; r185 nie dostarcza produkcyjnego WebGPU path tracera.'
  };
  function devAdres(){
    const q = new URLSearchParams(location.search);
    for(const k of DEV_KEYS) q.delete(k);
    const preset = DEV_PRESETS[$('#devPreset').value] || DEV_PRESETS.baseline;
    for(const [k,v] of Object.entries(preset)) q.set(k,v);
    const url = new URL(location.href); url.search = q.toString(); url.hash = '';
    return url;
  }
  function odswiezDev(){
    const url = devAdres();
    $('#devUrl').href = url.href;
    $('#devUrl').textContent = url.href;
    $('#devOpis').textContent = DEV_OPIS[$('#devPreset').value]
      || 'Izolowany preset TEST/COMPARE; przeładowanie zachowuje pozostałe, niezależne parametry query.';
  }
  $('#devPreset').addEventListener('change', odswiezDev);
  $('#devApply').addEventListener('click', () => { location.href = devAdres().href; });
  $('#profilM2').addEventListener('click', () => {
    /* Profil rekomendowany na M2: wariant jakościowy, który w pomiarze zachował
       ponad 25 FPS. Czyścimy ręczne nadpisania potoku, aby przycisk rzeczywiście
       odtwarzał cały profil, a nie tylko trzy widoczne pola. */
    try{
      const zapis=JSON.parse(localStorage.getItem('mieszkanie-webgpu:ustawienia:1')||'{}');
      zapis.pola={...(zapis.pola||{}),jakoscPoziom:'wysoka',antyaliasing:'taau',
        toneMapping:'aces',presetSwiatla:DOMYSLNY_PRESET_SWIATLA,ekspozycja:'0.72',
        cieplo:'45',rozproszenie:'90',gOkna:'100',gSlonce:'100',gKule:'0',
        cienie:true,szkloFiz:true,animacjaTla:true,cienLisci:false};
      for(const id of window.__silnik?.suwakiJakosci?.pola || []) delete zapis.pola[id];
      localStorage.setItem('mieszkanie-webgpu:ustawienia:1',JSON.stringify(zapis));
    }catch{}
    const q=new URLSearchParams(location.search);
    for(const key of DEV_KEYS) q.delete(key);
    Object.entries({quality:'wysoka',aa:'taau',tone:'aces',ssr:'current',
      camera:'interactive',light:DOMYSLNY_PRESET_SWIATLA}).forEach(([key,value])=>q.set(key,value));
    location.search=q.toString();
  });
  odswiezDev();

  /* ---------- pomoc ---------- */
  $('#brakujace').textContent = '';

  /* ---------- PAMIĘĆ USTAWIEŃ MIĘDZY SESJAMI ----------
     Zapisujemy WSZYSTKIE kontrolki panelu, przechodząc po nich generycznie —
     dzięki temu kontrolka dodana w przyszłości jest pamiętana bez dopisywania
     czegokolwiek tutaj. Zapamiętana jest też otwarta zakładka i to, czy panel
     był zwinięty.

     Przywracanie działa przez wysłanie zdarzeń 'input'/'change', czyli tą samą
     drogą co ruch suwaka. Nie ma więc drugiej ścieżki stosowania ustawień,
     która mogłaby się rozjechać z pierwszą. */
  const KLUCZ_UST = 'mieszkanie-webgpu:ustawienia:1';
  const PROFIL_SWIATLA = 'daylight-2';
  const PROFIL_AA = 'p25-taau';   // P25: jednorazowo przełącza zapisane SMAA na TAAU
  const PROFIL_RENDER = 'candidate-c-1';
  const kontrolki = () => [...el.querySelectorAll('input, select')];

  function zapiszUstawienia(){
    try{
      const dane = {profilSwiatla: PROFIL_SWIATLA, profilAA: PROFIL_AA, profilRender: PROFIL_RENDER,
                    pola: {}, zakladka: el.dataset.activeTab,
                    otwarty: el.open};
      for(const k of kontrolki()){
        if(!k.id || k.id === 'worldGI' || k.id === 'ssrWariant' || k.id === 'mebelWersja') continue;
        dane.pola[k.id] = k.type === 'checkbox' ? k.checked : k.value;
      }
      localStorage.setItem(KLUCZ_UST, JSON.stringify(dane));
    }catch(e){ /* brak pamięci nie może psuć panelu */ }
  }

  function wczytajUstawienia(){
    let d;
    try{ d = JSON.parse(localStorage.getItem(KLUCZ_UST) || 'null'); }catch(e){ return false; }
    if(!d || !d.pola || typeof d.pola !== 'object') return false;
    if(d.profilAA !== PROFIL_AA) d.pola.antyaliasing = 'taau';   // P25
    if(d.profilRender !== PROFIL_RENDER)
      Object.assign(d.pola, {jakoscPoziom:'wysoka', antyaliasing:'taau', toneMapping:'aces'});
    // Jednorazowo zastosuj uzgodnione światło; zachowaj pozostałe ustawienia.
    if(d.profilSwiatla !== PROFIL_SWIATLA){
      Object.assign(d.pola, {presetSwiatla:DOMYSLNY_PRESET_SWIATLA, cieplo:'45',
        rozproszenie:'90', gOkna:'100', gSlonce:'100', gKule:'0'});
    }
    for(const k of kontrolki()){
      if(!k.id || k.id === 'worldGI' || k.id === 'ssrWariant' || k.id === 'mebelWersja' || !(k.id in d.pola)) continue;
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
    if(typeof d.otwarty === 'boolean') el.open = d.otwarty;
    const aaZUrl=new URLSearchParams(location.search).get('aa');
    if(['smaa','taau'].includes(aaZUrl)) aaSel.value=aaZUrl;
    const q=new URLSearchParams(location.search);
    if(['aces','neutral','agx'].includes(q.get('tone'))){toneSel.value=q.get('tone');toneSel.dispatchEvent(new Event('change'));}
    if(q.get('camera')==='arch'){trybKamery.value='arch_photo';trybKamery.dispatchEvent(new Event('change'));}
    giSel.value=q.get('gi')==='speedball'?'speedball':'ssgi';
    ssrSel.value=q.get('ssr')==='current'?'current':'modern';
    if(['minimalna','srednia','wysoka','photo_raster','photo_path'].includes(q.get('quality'))) jakoscSel.value=q.get('quality');
    zastosujPresetSwiatla(PRESSETY_SWIATLA[q.get('light')] ? q.get('light') : $('#presetSwiatla').value);
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
    const ptak=(s.tryb ?? nawigacja.tryb)===nawigacja.TRYBY.PTAK;
    $('#widokToggle').setAttribute('aria-pressed',String(ptak));
    $('#widokToggle').setAttribute('aria-label',ptak?'Wróć do rozglądania':'Widok z góry');
    $('#widokToggle').title=$('#widokToggle').getAttribute('aria-label');
    $('#stanPanelu').textContent =
      'Tryb: ' + (s.tryb ?? nawigacja.tryb) + ' · ' + (s.sposobPatrzenia || '');
  }
  odswiezStan({});
  const presetSwiatlaZUrl = new URLSearchParams(location.search).get('light');
  zastosujPresetSwiatla(PRESSETY_SWIATLA[presetSwiatlaZUrl]
    ? presetSwiatlaZUrl : DOMYSLNY_PRESET_SWIATLA);
  /* Przywrócenie na końcu — po podpięciu wszystkich uchwytów, żeby wysłane
     zdarzenia faktycznie zadziałały. */
  const wznowione = wczytajUstawienia();
  panelNav.syncOptions();
  zapiszUstawienia();
  odswiezRuchy();
  return {odswiezStan, odswiezMeble, odswiezRuchy, zapiszUstawienia, wznowione};
}
