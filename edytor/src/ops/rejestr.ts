import { z } from 'zod'

/* Rejestr operacji: jedyna droga zmian w scenie. Z tych samych definicji korzystają
   przyciski UI, ⌘K, polecenia tekstowe (structured outputs) i rozmowa głosowa (Realtime tools).
   Makieta: `wykonaj` tylko waliduje i loguje — silnik nie jest jeszcze podłączony. */
export interface Operacja<S extends z.ZodType = z.ZodType> {
  nazwa: string
  tytul: string
  grupa: string
  wejscie: S
  tylkoOdczyt?: boolean
  wykonaj?: (dane: z.infer<S>) => void
}

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
  op.wykonaj?.(dane)
  console.info('[operacja]', nazwa, dane)
  return dane
}

/* Definicje narzędzi dla OpenAI (Realtime / Responses) — schemat JSON z zod. */
export const narzedziaAI = () =>
  lista().map((op) => ({ type: 'function' as const, name: op.nazwa, description: op.tytul, parameters: z.toJSONSchema(op.wejscie) }))
