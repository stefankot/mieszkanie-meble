const STORAGE_KEY = 'mieszkanie-webgpu:panel:2';

/* View preferences are independent of rendering and furniture settings. */
export function utworzNawigacjePanelu(el, storage = localStorage){
  const tabs = [...el.querySelectorAll('[data-z]')];
  const panels = [...el.querySelectorAll('section[data-s]')];
  const modes = [...el.querySelectorAll('[data-panel-mode]')];
  const scroll = el.querySelector('.panel-tresc');
  let mode = 'simple', active = 'meble';
  const positions = new Map();
  function syncOptions(){
    for(const option of el.querySelectorAll('option.dev-only')){
      // A previously selected experimental profile remains visible until changed.
      option.hidden = option.disabled = mode === 'simple' && !option.selected;
    }
  }
  const save = () => {
    try{ storage.setItem(STORAGE_KEY, JSON.stringify({mode, active})); }catch{}
  };
  function select(id){
    if(!panels.some(p => p.dataset.s === id) || (id === 'dev' && mode !== 'dev')) id = 'meble';
    positions.set(active, scroll.scrollTop);
    active = id; el.dataset.activeTab = id;
    for(const b of tabs){
      const selected = b.dataset.z === id;
      if(b.getAttribute('role') === 'tab'){
        b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1;
      }else b.setAttribute('aria-pressed', String(selected));
    }
    // Keep the tablist reachable by keyboard while Help is open.
    if(id === 'pomoc') tabs[0].tabIndex = 0;
    for(const p of panels) p.hidden = p.dataset.s !== id;
    scroll.scrollTop = positions.get(id) || 0;
    save();
  }
  function setMode(value){
    mode = value === 'dev' ? 'dev' : 'simple'; el.dataset.panelMode = mode;
    for(const b of modes) b.setAttribute('aria-pressed', String(b.dataset.panelMode === mode));
    for(const b of tabs) if(b.dataset.z === 'dev') b.hidden = mode !== 'dev';
    el.querySelector('#panelTrybOpis').textContent = mode === 'dev' ? 'Pełne ustawienia' : 'Codzienne sterowanie';
    if(active === 'dev' && mode === 'simple') select('meble');
    syncOptions();
    save();
  }
  for(const p of panels){
    p.id = 'panel-' + p.dataset.s;
    if(p.dataset.s !== 'pomoc'){
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + p.dataset.s);
    }
    p.tabIndex = 0;
  }
  for(const b of tabs){
    b.id = 'tab-' + b.dataset.z; b.setAttribute('aria-controls', 'panel-' + b.dataset.z);
    b.addEventListener('click', () => select(b.dataset.z));
    if(b.getAttribute('role') !== 'tab') continue;
    b.addEventListener('keydown', e => {
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const available = tabs.filter(t => t.getAttribute('role') === 'tab' && !t.hidden);
      const index = available.indexOf(b);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? available.length-1
        : (index + (e.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
      select(available[next].dataset.z); available[next].focus();
    });
  }
  for(const b of modes) b.addEventListener('click', () => setMode(b.dataset.panelMode));
  el.addEventListener('change', syncOptions);
  el.addEventListener('keydown', e => {
    if(['Enter','Space'].includes(e.code) && e.target.closest('button,summary,input,select')) e.stopPropagation();
  });
  let saved;
  try{ saved = JSON.parse(storage.getItem(STORAGE_KEY)); }catch{}
  setMode(saved?.mode); select(saved?.active || 'meble');
  return {select, setMode, syncOptions};
}
