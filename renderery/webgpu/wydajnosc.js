/* Pomiar wydajności renderera.
   ?perf=1 włącza timestamp-query i nakładkę. Czas GPU z Three r185 opisuje
   ostatnią rozwiązaną klatkę, a nie sumę klatek od poprzedniego odczytu.
   Konsola: await __silnik.perf.probka(10) → statystyki z 10 s. */
export const PERF = new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';

export function percentyl(wartosci,p){
  const v=wartosci.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!v.length)return null;
  const i=Math.max(0,Math.min(v.length-1,Math.ceil(p*v.length)-1));
  return +v[i].toFixed(2);
}

function statystyki(zbior,odstepy,fazy){
  const pola=klucz=>zbior.map(s=>s[klucz]).filter(Number.isFinite);
  const srednia=klucz=>{const v=pola(klucz);return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2):null;};
  return {probki:zbior.length,fps:srednia('fps'),cpuMs:srednia('cpuMs'),gpuMs:srednia('gpuMs'),
    frameMsP50:percentyl(odstepy,.50),frameMsP95:percentyl(odstepy,.95),frameMsP99:percentyl(odstepy,.99),
    przerwyPonad100ms:odstepy.filter(v=>v>100).length,drawCalls:srednia('drawCalls'),
    trojkaty:srednia('trojkaty'),fazy};
}

export function utworzPomiar(renderer,{wlaczony=PERF,dokument=globalThis.document,zegar=globalThis.performance}={}){
  const teraz=()=>zegar.now();
  const okno={klatki:0,cpu:0,gpu:0,gpuN:0,frameMs:[],fazy:{},t0:teraz()};
  const stan={fps:0,cpuMs:0,gpuMs:NaN,frameMs:NaN,drawCalls:0,trojkaty:0,faza:'rozruch'};
  let czekaGPU=false,zbior=null,probkaOdstepy=null,probkaFazy=null,el=null,ostatniaKlatka=null;
  if(wlaczony&&dokument){
    el=dokument.createElement('div');
    el.style.cssText='position:fixed;right:8px;top:8px;z-index:30;background:#25241fd9;color:#f8f7f1;'
      +'font:11px/1.4 ui-monospace,monospace;padding:5px 8px;border-radius:6px;white-space:pre;pointer-events:none';
    dokument.body.append(el);
  }

  function poKlatce(cpuMs,{faza='ustalony'}={}){
    const t=teraz(),frameMs=ostatniaKlatka===null?NaN:t-ostatniaKlatka;
    ostatniaKlatka=t;okno.klatki++;okno.cpu+=cpuMs;okno.fazy[faza]=(okno.fazy[faza]||0)+1;
    if(Number.isFinite(frameMs))okno.frameMs.push(frameMs);
    if(probkaOdstepy&&Number.isFinite(frameMs))probkaOdstepy.push(frameMs);
    if(probkaFazy)probkaFazy[faza]=(probkaFazy[faza]||0)+1;
    stan.drawCalls=renderer.info.render.drawCalls;stan.trojkaty=renderer.info.render.triangles;stan.faza=faza;
    if(wlaczony&&!czekaGPU){
      czekaGPU=true;
      renderer.resolveTimestampsAsync('render')
        .then(ms=>{if(Number.isFinite(ms)&&ms>0){okno.gpu+=ms;okno.gpuN++;}})
        .catch(()=>{}).finally(()=>{czekaGPU=false;});
    }
    const dt=t-okno.t0;if(dt<500)return;
    stan.fps=1000*okno.klatki/dt;stan.cpuMs=okno.cpu/okno.klatki;
    stan.gpuMs=okno.gpuN?okno.gpu/okno.gpuN:NaN;
    stan.frameMs=okno.frameMs.length?okno.frameMs.reduce((a,b)=>a+b,0)/okno.frameMs.length:NaN;
    const wpis={...stan,faza:Object.entries(okno.fazy).sort((a,b)=>b[1]-a[1])[0]?.[0]||faza};
    zbior?.push(wpis);
    if(el)el.textContent=`FPS ${stan.fps.toFixed(1)} · frame ${Number.isFinite(stan.frameMs)?stan.frameMs.toFixed(1):'—'} ms\n`
      +`CPU ${stan.cpuMs.toFixed(1)} ms · GPU ${Number.isFinite(stan.gpuMs)?stan.gpuMs.toFixed(1)+' ms':'—'} · ${wpis.faza}\n`
      +`draw ${stan.drawCalls} · tri ${(stan.trojkaty/1000).toFixed(0)}k`;
    Object.assign(okno,{klatki:0,cpu:0,gpu:0,gpuN:0,frameMs:[],fazy:{},t0:t});
  }

  async function probka(sekundy=5){
    zbior=[];probkaOdstepy=[];probkaFazy={};
    await new Promise(r=>setTimeout(r,sekundy*1000));
    const z=zbior,odstepy=probkaOdstepy,fazy=probkaFazy;
    zbior=null;probkaOdstepy=null;probkaFazy=null;
    const cel={set(x,y){this.x=x;this.y=y;return this;}};
    const rozmiar=renderer.getDrawingBufferSize?.(cel)||{};
    return {...statystyki(z,odstepy,fazy),ukryta:Boolean(dokument?.hidden),
      bufor:{szerokosc:rozmiar.width??rozmiar.x??null,wysokosc:rozmiar.height??rozmiar.y??null},
      pixelRatio:renderer.getPixelRatio?.()??null,pamiec:{...(renderer.info?.memory||{})}};
  }
  return {poKlatce,probka,stan};
}
