/* Wyznacza ścianę zewnętrzną z oknami po aktualnej geometrii planu. Dzięki
   temu odbicie lub przesunięcie pokoju nie wymaga zakodowania lewej/prawej. */
export function wyznaczScianyZaslon(plan){
  const {APARTMENT:a}=plan;
  const otwory=[...a.windows,...a.doors.filter(o=>o.name==='Drzwi balkonowe')];
  const wynik=[];
  for(const pokoj of a.rooms){
    const salon=pokoj.name==='Salon';
    const sypialnia=pokoj.name==='Pokój' && Math.min(...pokoj.polygon.map(p=>p[1]))>500;
    if(!salon && !sypialnia) continue;
    const xs=pokoj.polygon.map(p=>p[0]),zs=pokoj.polygon.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),od=Math.min(...zs),doZ=Math.max(...zs);
    const kandydaci=[minX,maxX].map(xSciany=>({
      xSciany,
      otwory:otwory.filter(o=>{
        const [x,z,w,h]=o.rect;
        return w<h && Math.min(Math.abs(x-xSciany),Math.abs(x+w-xSciany))<.01
          && z>=od && z+h<=doZ;
      }).sort((a,b)=>a.rect[1]-b.rect[1])
    })).sort((a,b)=>b.otwory.length-a.otwory.length);
    const {xSciany,otwory:pasujace}=kandydaci[0];
    if(!pasujace.length) continue;
    const poczatek=Math.min(...pasujace.map(o=>o.rect[1]));
    const koniec=Math.max(...pasujace.map(o=>o.rect[1]+o.rect[3]));
    const doWnetrza=xSciany===minX?1:-1;
    wynik.push({id:salon?'salon':'sypialnia',nazwa:salon?'Salon':'Sypialnia',
      rodzaj:salon?'MAJGUL':'GLASÖRT',pary:salon?3:1,
      x:xSciany+doWnetrza*(salon?16:8),xSciany,od,do:doZ,
      szerokosc:doZ-od,pasStart:poczatek-od,pasKoniec:doZ-koniec,otwory:pasujace});
  }
  return wynik;
}
