/* P19 — pomiar wydajności.
   ?perf=1 włącza timestamp-query i nakładkę: FPS rysowanych klatek, czas CPU klatki
   (JS: logika + wysłanie poleceń) i czas GPU (suma przebiegów renderowania).
   Pomiar ma sens tylko przy WIDOCZNEJ karcie — ukryta nie rysuje klatek.
   Konsola: await __silnik.perf.probka(5) → średnie z 5 s. */
export const PERF = new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';

export function utworzPomiar(renderer){
  const okno = {klatki: 0, cpu: 0, gpu: 0, gpuN: 0, t0: performance.now()};
  const stan = {fps: 0, cpuMs: 0, gpuMs: NaN, drawCalls: 0, trojkaty: 0};
  let czekaGPU = false, zbior = null, el = null, odRozwiazania = 0;
  if(PERF){
    el = document.createElement('div');
    el.style.cssText = 'position:fixed;right:8px;top:8px;z-index:30;background:#25241fd9;color:#f8f7f1;'
      + 'font:11px/1.4 ui-monospace,monospace;padding:5px 8px;border-radius:6px;white-space:pre;pointer-events:none';
    document.body.append(el);
  }

  function poKlatce(cpuMs){
    okno.klatki++; okno.cpu += cpuMs; odRozwiazania++;
    stan.drawCalls = renderer.info.render.drawCalls;
    stan.trojkaty = renderer.info.render.triangles;
    if(PERF && !czekaGPU){
      /* Pula zapytań sumuje wszystkie klatki od poprzedniego odczytu — dzielimy przez ich liczbę. */
      czekaGPU = true;
      const klatek = odRozwiazania; odRozwiazania = 0;
      renderer.resolveTimestampsAsync('render')
        .then(ms => { if(Number.isFinite(ms) && ms > 0){ okno.gpu += ms / klatek; okno.gpuN++; } })
        .catch(() => {}).finally(() => { czekaGPU = false; });
    }
    const teraz = performance.now(), dt = teraz - okno.t0;
    if(dt < 500) return;
    stan.fps = 1000 * okno.klatki / dt;
    stan.cpuMs = okno.cpu / okno.klatki;
    stan.gpuMs = okno.gpuN ? okno.gpu / okno.gpuN : NaN;
    zbior?.push({...stan});
    if(el) el.textContent = `FPS ${stan.fps.toFixed(1)} · CPU ${stan.cpuMs.toFixed(1)} ms · GPU ${
      Number.isFinite(stan.gpuMs) ? stan.gpuMs.toFixed(1) + ' ms' : '—'}\ndraw ${stan.drawCalls} · tri ${(stan.trojkaty/1000).toFixed(0)}k`;
    Object.assign(okno, {klatki: 0, cpu: 0, gpu: 0, gpuN: 0, t0: teraz});
  }

  async function probka(sekundy = 5){
    zbior = [];
    await new Promise(r => setTimeout(r, sekundy * 1000));
    const z = zbior; zbior = null;
    const sr = k => { const v = z.map(s => s[k]).filter(Number.isFinite); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null; };
    return {okna: z.length, fps: sr('fps'), cpuMs: sr('cpuMs'), gpuMs: sr('gpuMs'), drawCalls: sr('drawCalls'), ukryta: document.hidden};
  }

  return {poKlatce, probka, stan};
}
