const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth01 = v => { v=clamp01(v); return v*v*(3-2*v); };

/* Jasność nieba obejmuje zmierzch cywilny (-6°..12°). Słońce kierunkowe
   gaśnie przy geometrycznym zachodzie; noc zachowuje 2% światła otoczenia. */
export function modelSwiatlaDziennego(wysokoscRad, godzina=12){
  const stopnie=wysokoscRad*180/Math.PI;
  const dzien=smooth01((stopnie+6)/18);
  const widocznoscSlonca=smooth01((stopnie+.833)/4.833);
  const niskieSlonce=1-smooth01((stopnie-4)/31);
  const odPoludnia=Math.abs(godzina-13);
  const poraBrzegowa=.55*smooth01((odPoludnia-3)/4);
  return {
    stopnie,
    jasnoscNieba:.02+.98*dzien,
    widocznoscSlonca,
    cieploNaturalne:Math.max(niskieSlonce,poraBrzegowa)
  };
}
