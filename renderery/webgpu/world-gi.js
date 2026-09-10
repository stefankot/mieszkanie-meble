/* P13 — izolowany pilot światła pośredniego w przestrzeni świata.
   Pakiet jest ładowany dopiero dla ?gi=speedball. Baseline nie pobiera kodu,
   nie zmienia fabryki świateł Three i zachowuje dotychczasowe SSGI. */
export const SPEEDBALL_VERSION = '0.7.0';
export const SPEEDBALL_PARAM = 'speedball';

export function wybierzWorldGI(search = globalThis.location?.search || '') {
  return new URLSearchParams(search).get('gi') === SPEEDBALL_PARAM
    ? SPEEDBALL_PARAM : 'ssgi';
}

export async function utworzWorldGI({
  renderer, scene, camera, wariant = wybierzWorldGI(), profil = 'minimalna',
  loadSpeedball = () => import('speedball-gi'), onError = () => {}
}) {
  const start = performance.now();
  const stan = {
    wariant, wersja: wariant === SPEEDBALL_PARAM ? SPEEDBALL_VERSION : null,
    zainstalowany: false, aktywny: false, installMs: 0, firstDataMs: null,
    aktualizacje: 0, blad: null
  };
  if (wariant !== SPEEDBALL_PARAM) {
    return {
      stan, ustawProfil(){ return false; }, aktualizuj(){}, odczyt(){ return {...stan}; },
      dispose(){}
    };
  }

  let uchwyt;
  try {
    const { installSpeedballGI } = await loadSpeedball();
    uchwyt = installSpeedballGI({
      renderer, scene, camera,
      enabled: profil === 'wysoka',
      intensity: 2.0,
      divisions: 12,
      rays: 32,
      cascades: 1,
      continuous: false,
      jitterMode: 'gated',
      reflectionQuality: 'off',
      autoDetectChanges: true,
      onError(error){
        stan.blad = String(error?.message || error);
        onError(error);
      }
    });
    stan.zainstalowany = true;
    stan.aktywny = profil === 'wysoka';
    stan.installMs = +(performance.now() - start).toFixed(1);
  } catch (error) {
    stan.blad = String(error?.message || error);
    onError(error);
  }

  function ustawProfil(nazwa) {
    const aktywny = nazwa === 'wysoka' && Boolean(uchwyt);
    uchwyt?.setEnabled(aktywny);
    stan.aktywny = aktywny;
    return aktywny;
  }
  function aktualizuj() {
    if (!uchwyt || !stan.aktywny) return;
    stan.aktualizacje++;
    uchwyt.update({camera, playing:false});
    if (stan.firstDataMs === null && uchwyt.hasData()) {
      stan.firstDataMs = +(performance.now() - start).toFixed(1);
    }
  }
  function odczyt() {
    let stats = null;
    try { stats = uchwyt?.hasData() ? uchwyt.getStats() : null; } catch {}
    return {...stan, stats};
  }
  return {stan, ustawProfil, aktualizuj, odczyt, dispose(){ uchwyt?.dispose(); }};
}
