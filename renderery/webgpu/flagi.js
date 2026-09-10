/* P19 — przełączniki A/B zmian P19+.
   ?bez=aniso,luny wyłącza wskazane zmiany; ?bez=wszystko wraca do zachowania P18.
   Identyfikatory flag są wypisane w ZMIANY_P19_optymalizacja.md. */
const parametry = new URLSearchParams(globalThis.location?.search || '');
const wylaczone = new Set((parametry.get('bez') || '').split(',').map(s => s.trim()).filter(Boolean));

export const wlaczone = id => !wylaczone.has('wszystko') && !wylaczone.has(id);
