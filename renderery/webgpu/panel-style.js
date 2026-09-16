/* Static styles: no animated blur or extra work in the rendering loop. */
export const STYL_PANELU = `
#sterowanie{--ink:#25342e;--muted:#626e66;--line:#dce1db;--accent:#285a45;
 position:fixed;left:16px;top:16px;z-index:25;width:320px;max-width:calc(100vw - 32px);
 font:13px/1.5 system-ui,sans-serif;color:var(--ink);border:1px solid #cbd3cb;
 border-radius:16px;background:#f5f6f1;box-shadow:0 8px 28px #142a231f;overflow:hidden}
#sterowanie *{box-sizing:border-box}
#sterowanie [hidden],#sterowanie[data-panel-mode=simple] .dev-only:not(option){display:none!important}
#sterowanie>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;
 padding:16px 18px;cursor:pointer;background:#f5f6f1;user-select:none}
#sterowanie summary::-webkit-details-marker{display:none}
#sterowanie .panel-tytul strong{display:block;font-size:17px;line-height:1.2;letter-spacing:-.4px}
#sterowanie .panel-tytul small{display:block;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:var(--muted);margin-top:4px}
#sterowanie .panel-akcje{display:flex;align-items:center;gap:7px;margin-left:auto}
#sterowanie .panel-zwin{display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;width:28px;height:28px}
#sterowanie .ikona-okragla{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;min-width:28px!important;min-height:28px!important;padding:0!important;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--muted);font:700 11px/1 system-ui;cursor:pointer}
#sterowanie .ikona-okragla:hover:not(:disabled){border-color:#91a99a;background:#edf2eb;color:var(--accent)}
#sterowanie .ikona-okragla[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 0 0 2px #d8e4da}
#sterowanie .ikona-okragla svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#sterowanie:not([open]) .panel-zwin{transform:rotate(180deg)}
#sterowanie .panel{display:flex;flex-direction:column;max-height:calc(100dvh - 111px)}
#sterowanie:not([open]) .panel{display:none}
#sterowanie .panel-naglowek{padding:0 14px 12px;flex-shrink:0;border-bottom:1px solid var(--line)}
#sterowanie .zakladki{display:flex;gap:2px;flex-wrap:wrap}
#sterowanie .zakladki button{flex:1;min-height:36px;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--muted);font:600 12px/1.3 system-ui;cursor:pointer}
#sterowanie .zakladki button[aria-selected=true]{background:#dfe9df;color:#204b37}
#sterowanie .zakladki [data-z=dev]{flex-basis:100%;font-size:11px;min-height:30px}
#sterowanie .panel-tresc{padding:18px 14px;overflow-y:auto;overscroll-behavior:contain;min-height:0;scrollbar-width:thin;scrollbar-color:#bac6bb transparent}
#sterowanie section:focus-visible{outline:2px solid #528db7;outline-offset:2px}
#sterowanie .sekcja-wstep{padding:0 3px;margin-bottom:17px}
#sterowanie .naglowek-z-akcja{display:flex;align-items:center;justify-content:space-between;gap:10px}
#sterowanie .naglowek-z-akcja h2{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#sterowanie h2{font-size:21px;line-height:1.25;letter-spacing:-.6px;margin:0 0 7px;font-weight:650}
#sterowanie .sekcja-wstep p{color:var(--muted);margin:0;line-height:1.5;font-size:12px}
#sterowanie .karta{padding:14px;background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:12px}
#sterowanie h3{font-size:11px;font-weight:650;letter-spacing:.6px;text-transform:uppercase;margin:16px 0 10px;color:var(--muted)}
#sterowanie h3:first-child{margin-top:0}
#sterowanie button.dzialanie,#sterowanie select,#sterowanie input[type=text],#sterowanie input[type=date],#sterowanie input[type=time]{
 width:100%;min-width:0;min-height:38px;padding:8px 10px;border:1px solid #cbd4cc;border-radius:8px;background:#fff;
 color:var(--ink);font:inherit;line-height:1.4}
#sterowanie button,#sterowanie select{cursor:pointer}
#sterowanie button:disabled{opacity:.45;cursor:default}
#sterowanie button.dzialanie:hover:not(:disabled){background:#edf2eb;border-color:#a3b6a8}
#sterowanie button.glowna{display:flex;align-items:center;justify-content:space-between;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600;min-height:44px;margin-top:12px;padding:10px 13px}
#sterowanie button.glowna:hover:not(:disabled){background:#204b37;border-color:#204b37}
#sterowanie button.dzialanie[aria-pressed=true]{background:#e2ecdf;border-color:#799a81;color:#204b37}
#sterowanie button.tekstowa{border-color:transparent;background:transparent;color:var(--muted)}
#sterowanie button.niebezpieczna{color:#983d35}
#sterowanie :is(button,select,input,summary,a):focus-visible{outline:3px solid #528db7;outline-offset:2px}
#sterowanie .siatka{display:flex;gap:6px;flex-wrap:wrap}
#sterowanie .siatka>*{flex:1 1 0;min-width:0}
#sterowanie .siatka button{font-size:12px;padding:8px 5px}
#sterowanie .wiersz-z-ikona{display:flex;align-items:center;gap:7px}
#sterowanie .wiersz-z-ikona select{flex:1}
#sterowanie .strzalki{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#sterowanie .strzalki button{font-size:18px}
#sterowanie output{font-variant-numeric:tabular-nums}
#sterowanie .podsumowanie{font-size:11px;color:var(--muted);margin:8px 0 0}
#sterowanie .podsumowanie::before{content:'●';font-size:8px;color:#648768;margin-right:6px}
#sterowanie .grupa{border:1px solid var(--line);border-radius:10px;background:#fff;margin:10px 0 0;overflow:hidden}
#sterowanie .grupa>summary{display:flex;align-items:center;gap:8px;list-style:none;min-height:44px;padding:11px 12px;cursor:pointer;font-size:12px;font-weight:600}
#sterowanie .grupa>summary::after{content:'+';margin-left:auto;color:var(--muted);font-size:16px;font-weight:400}
#sterowanie .grupa[open]>summary::after{content:'−'}
#sterowanie .grupa[open]>summary{border-bottom:1px solid var(--line)}
#sterowanie .wnetrze{padding:12px}
#sterowanie .karta .grupa{border-left:0;border-right:0;border-bottom:0;border-radius:0;background:transparent}
#sterowanie .karta .grupa>summary{padding-left:0;padding-right:0}
#sterowanie .karta .grupa .wnetrze{padding:10px 0 0}
#sterowanie .licznik{border-radius:5px;background:#edf1e9;color:var(--muted);padding:0 6px;font-size:10px}
#sterowanie #ruchy{padding-top:8px}
#sterowanie #ruchy button{border:0;border-radius:6px;background:#f4f6f1;margin-bottom:4px!important;font-size:12px}
#sterowanie p.uwaga,#sterowanie .opis{font-size:11px;color:var(--muted);line-height:1.55;margin:8px 0 0;overflow-wrap:anywhere}
#sterowanie .opis:empty,#sterowanie p:empty{display:none}
#sterowanie label.pole{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;color:var(--muted);margin:12px 0 6px}
#sterowanie label.pole:first-child{margin-top:0}
#sterowanie input[type=checkbox]{accent-color:var(--accent);width:16px;height:16px;flex-shrink:0}
#sterowanie .suwak{margin:12px 0}
#sterowanie .suwak .naglowek{display:flex;justify-content:space-between;font-size:12px;gap:8px}
#sterowanie input[type=range]{width:100%;margin:6px 0 0;accent-color:var(--accent);height:20px}
#sterowanie .pora{display:grid;grid-template-columns:36px repeat(3,1fr);gap:6px;align-items:center}
#sterowanie .pora>strong{font-size:9px;letter-spacing:.7px;color:var(--muted)}
#sterowanie .pora button{padding:8px 4px;font-size:12px}
#sterowanie .mini-mapa{position:relative;padding:8px;aspect-ratio:1.32;overflow:hidden;cursor:zoom-out;background:#eef1eb}
#sterowanie .mini-mapa svg{display:block;width:100%;height:100%}
#sterowanie .mini-mapa-obrys{fill:#f9faf7;stroke:#55655b;stroke-width:10;stroke-linejoin:round}
#sterowanie .mini-mapa-pokoj{fill:#e4e9e1;stroke:#aeb9af;stroke-width:5}
#sterowanie .mini-mapa-punkty{position:absolute;inset:8px}
#sterowanie .mini-mapa-punkt{position:absolute;display:grid;place-items:center;transform:translate(-50%,-50%);width:27px;height:27px;padding:0;border:2px solid #fff;border-radius:50%;background:var(--accent);color:#fff;box-shadow:0 2px 6px #16271f4d;cursor:pointer}
#sterowanie .mini-mapa-punkt span{display:block;transform:rotate(var(--kierunek));font-size:13px;line-height:1}
#sterowanie .mini-mapa-punkt:hover{scale:1.08;background:#1f4735}
#sterowanie #suwakiJakosci>details{border-top:1px solid var(--line);padding:6px 0}
#sterowanie #suwakiJakosci summary{padding:6px 0;font-size:12px}
#sterowanie #informacje>:not(summary){margin:12px}
#sterowanie #informacje>button{width:calc(100% - 24px)}
#sterowanie #hud{font-size:11px;overflow-wrap:anywhere}
#sterowanie .panel-stopka{display:flex;align-items:center;justify-content:space-between;gap:6px;border-top:1px solid var(--line);padding:8px 14px;flex-shrink:0}
#sterowanie .panel-stopka>span{font-size:10px;color:var(--muted)}
#sterowanie .panel-stopka button{border:0;background:transparent;color:var(--accent);font:600 11px system-ui;min-height:30px;padding:4px}
#sterowanie .panel-stopka button[aria-pressed=true]{text-decoration:underline}
#sterowanie kbd{display:inline-block;border:1px solid var(--line);border-radius:4px;padding:0 3px;background:#f4f6f0;font:10px system-ui}
#sterowanie dl{margin:0;font-size:11px}
#sterowanie dl>div{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #edf0e9}
#sterowanie dt{flex:0 0 102px}#sterowanie dd{margin:0}
#sterowanie .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:600px){
 #sterowanie{left:10px;top:10px;width:300px;max-width:calc(100vw - 20px);border-radius:12px}
 #sterowanie>summary{padding:10px 14px}
 #sterowanie .panel{max-height:calc(65dvh - 62px)}
 #sterowanie .panel-tresc{padding:12px 10px}
 #sterowanie .panel-naglowek{padding:0 10px 8px}
 #sterowanie h2{font-size:19px}
 #sterowanie .tryby-panelu{margin-bottom:6px}
}
@media(max-height:500px){#sterowanie .panel{max-height:calc(100dvh - 92px)}}
`;
