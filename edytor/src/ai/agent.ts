import { atom } from 'nanostores'

import { lista, wykonaj, zNazwyAI } from '@/ops/rejestr'
import '@/ops/operacje'
import { narzedziaAI } from '@/ops/rejestr'

import { zinterpretuj } from './jezyk'
import { najnowszyModelTekstowy, openai } from './klient'
import { zbierzKontekst } from './kontekst'
import { $kluczOpenAI } from './klucz'

/* Agent: najpierw interpreter offline (leksykon + słownik ze sceny) — działa bez klucza, natychmiast
   i bez kosztów. Model językowy jest zapasem dla zdań, których leksykon nie rozpoznał.
   Obie drogi wykonują WYŁĄCZNIE operacje z rejestru, więc każda zmiana ma Cofnij/Ponów. */
export interface WiadomoscAgenta { rola: 'uzytkownik' | 'agent' | 'narzedzie' | 'blad'; tekst: string; czas: number; nazwa?: string; opcje?: { etykieta: string; tekst: string }[] }
export const $rozmowa = atom<WiadomoscAgenta[]>([])
export const $agentPracuje = atom(false)

const INSTRUKCJE = [
  'Jesteś asystentem edytora wnętrza mieszkania (renderer 3D).',
  'Zmiany wprowadzasz wyłącznie dostępnymi narzędziami — nie opisuj zmian, których nie wykonałeś.',
  'Nie zgaduj identyfikatorów mebli ani świateł: najpierw wywołaj scene.describe.',
  'Gdy polecenie dotyczy „tego mebla”, użyj zaznaczenia (pomiń argument mebel).',
  'Odpowiadaj krótko po polsku i mów, co zrobiłeś (np. „Ustawiłem 6 półek w regale w salonie”).'
].join(' ')

const dopisz = (w: WiadomoscAgenta) => $rozmowa.set([...$rozmowa.get(), w])
const teraz = () => Date.now()

export async function zapytajAgenta(tekst: string) {
  if (!tekst.trim() || $agentPracuje.get()) return
  dopisz({ rola: 'uzytkownik', tekst, czas: teraz() })
  if (lokalnie(tekst)) return
  if (!$kluczOpenAI.get()) {
    dopisz({ rola: 'blad', tekst: 'Nie rozumiem tego polecenia, a bez klucza OpenAI nie mam zapasowego modelu. Spróbuj prościej, np. „zielony materac w łóżku”, „6 półek w regale w salonie”, „zgaś światła”.', czas: teraz() })
    return
  }
  $agentPracuje.set(true)
  try {
    const klient = await openai()
    const model = await najnowszyModelTekstowy()
    const narzedzia = narzedziaAI()
    let odpowiedz = await klient.responses.create({ model, instructions: INSTRUKCJE, tools: narzedzia, input: [{ role: 'user', content: tekst }] })
    // Pętla narzędzi: model prosi o operacje, my je wykonujemy i oddajemy wyniki.
    for (let runda = 0; runda < 6; runda++) {
      const wywolania = (odpowiedz.output ?? []).filter((o: any) => o.type === 'function_call')
      if (!wywolania.length) break
      const wyniki = []
      for (const w of wywolania as any[]) {
        let wynik: unknown
        try {
          wynik = await wykonaj(zNazwyAI(w.name), JSON.parse(w.arguments || '{}'))
          dopisz({ rola: 'narzedzie', nazwa: w.name, tekst: podsumuj(zNazwyAI(w.name), w.arguments), czas: teraz() })
        } catch (e) {
          wynik = { blad: e instanceof Error ? e.message : String(e) }
          dopisz({ rola: 'blad', nazwa: w.name, tekst: `${w.name}: ${(wynik as any).blad}`, czas: teraz() })
        }
        wyniki.push({ type: 'function_call_output' as const, call_id: w.call_id, output: JSON.stringify(wynik ?? null).slice(0, 4000) })
      }
      odpowiedz = await klient.responses.create({ model, instructions: INSTRUKCJE, tools: narzedzia, input: wyniki, previous_response_id: odpowiedz.id })
    }
    const tekstOdpowiedzi = odpowiedz.output_text?.trim()
    if (tekstOdpowiedzi) dopisz({ rola: 'agent', tekst: tekstOdpowiedzi, czas: teraz() })
  } catch (e) {
    dopisz({ rola: 'blad', tekst: e instanceof Error ? e.message : String(e), czas: teraz() })
  } finally {
    $agentPracuje.set(false)
  }
}

/* Interpreter offline. Zwraca true, gdy polecenie zostało obsłużone (wykonane albo zadane pytanie). */
function lokalnie(tekst: string) {
  let wynik
  try {
    wynik = zinterpretuj(tekst, zbierzKontekst())
  } catch (e) {
    console.warn('[jezyk]', e)
    return false
  }
  if (wynik.pytanie) {
    dopisz({ rola: 'agent', tekst: wynik.pytanie.tekst, opcje: wynik.pytanie.opcje, czas: teraz() })
    return true
  }
  if (!wynik.operacje.length) return false
  const zrobione: string[] = []
  const bledy: string[] = []
  for (const o of wynik.operacje) {
    try {
      const r = wykonaj(o.nazwa, o.dane)
      if (r instanceof Promise) r.catch((e) => dopisz({ rola: 'blad', nazwa: o.nazwa, tekst: `${o.nazwa}: ${e instanceof Error ? e.message : String(e)}`, czas: teraz() }))
      dopisz({ rola: 'narzedzie', nazwa: o.nazwa, tekst: podsumuj(o.nazwa, JSON.stringify(o.dane)), czas: teraz() })
      zrobione.push(o.nazwa)
    } catch (e) {
      bledy.push(e instanceof Error ? e.message : String(e))
    }
  }
  if (!zrobione.length && bledy.length) {
    dopisz({ rola: 'blad', tekst: bledy[0], czas: teraz() })
    return true
  }
  dopisz({ rola: 'agent', tekst: `Zrobione: ${wynik.wyjasnienie || zrobione.join(', ')}.${bledy.length ? ` Nie udało się: ${bledy[0]}` : ''}`, czas: teraz() })
  return true
}

export const podsumuj = (nazwa: string, argumenty?: string) => {
  const op = lista().find((o) => o.nazwa === nazwa)
  const dane = argumenty && argumenty !== '{}' ? ` (${argumenty.slice(0, 80)})` : ''
  return `${op?.tytul ?? nazwa}${dane}`
}
