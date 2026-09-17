import { atom } from 'nanostores'
import { z } from 'zod'

/* Rejestr operacji: jedyna droga zmian w scenie. Z tych samych definicji korzystają
   przyciski UI, ⌘K, polecenia tekstowe (structured outputs) i rozmowa głosowa (Realtime tools).
   Zmiany projektu operacje wykonują przez dokument (`zmienProjekt`), więc działa Cofnij/Ponów. */
export interface Operacja<S extends z.ZodType = z.ZodType> {
  nazwa: string
  tytul: string
  grupa: string
  wejscie: S
  tylkoOdczyt?: boolean
  /* Dane domyślne (bieżące zaznaczenie, widok). Jeśli przechodzą walidację, operację można
     wywołać jednym kliknięciem z ⌘K; bez nich pozostaje dostępna dla AI z jawnymi argumentami. */
  domyslne?: () => unknown
  wykonaj?: (dane: z.infer<S>) => unknown
}

export interface WpisDziennika { nazwa: string; dane: unknown; wynik?: unknown; blad?: string; czas: number }
export const $dziennikOperacji = atom<WpisDziennika[]>([])

const operacje = new Map<string, Operacja>()

export function zdefiniuj<S extends z.ZodType>(op: Operacja<S>) {
  operacje.set(op.nazwa, op as unknown as Operacja)
  return op
}

export const lista = () => [...operacje.values()]

export function wykonaj(nazwa: string, surowe: unknown) {
  const op = operacje.get(nazwa)
  if (!op) throw new Error(`Nieznana operacja: ${nazwa}`)
  const dane = op.wejscie.parse(surowe)
  try {
    const wynik = op.wykonaj?.(dane)
    zapisz({ nazwa, dane, wynik: wynik instanceof Promise ? 'w toku' : wynik, czas: Date.now() })
    return wynik ?? dane
  } catch (e) {
    zapisz({ nazwa, dane, blad: e instanceof Error ? e.message : String(e), czas: Date.now() })
    throw e
  }
}

const zapisz = (wpis: WpisDziennika) => $dziennikOperacji.set([wpis, ...$dziennikOperacji.get()].slice(0, 50))

/* Operacje wykonalne jednym kliknięciem z ⌘K (mają komplet danych domyślnych). */
export function zDanymiDomyslnymi(op: Operacja) {
  const dane = op.domyslne?.() ?? {}
  const wynik = op.wejscie.safeParse(dane)
  return wynik.success ? wynik.data : null
}

/* Definicje narzędzi dla OpenAI (Realtime / Responses) — schemat JSON z zod.
   API dopuszcza w nazwach tylko litery, cyfry, „_” i „-”, więc kropka z nazwy operacji staje się „_”. */
const nazwaAI = (nazwa: string) => nazwa.replace(/\./g, '_')
export const zNazwyAI = (nazwa: string) => lista().find((op) => nazwaAI(op.nazwa) === nazwa)?.nazwa ?? nazwa
export const narzedziaAI = () =>
  lista().map((op) => ({ type: 'function' as const, name: nazwaAI(op.nazwa), description: op.tytul, parameters: z.toJSONSchema(op.wejscie) }))
