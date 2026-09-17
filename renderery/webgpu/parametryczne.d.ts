/* Typy dla edytora (TypeScript) — moduł silnika jest czystym JS. */
export type RozkladSilnika = 'equal' | 'fibonacci' | 'random' | 'custom'
export interface OpcjeRozkladu { distribution?: RozkladSilnika; custom?: string; seed?: number; reverse?: boolean }
export function parsujWlasny(tekst: string): number[] | null
export function rozloz(wnetrze: number, grubosc: number, n: number, opcje?: OpcjeRozkladu): { dlugosci: number[]; poczatki: number[] }
export interface NadpisaniaParametryczne { rows?: OpcjeRozkladu & { count?: number }; columns?: OpcjeRozkladu & { count?: number }; instances?: Record<string, { count?: number }> }
export function sprawdzParametryczny(p: unknown): true
export function rozwinParametryczny(p: unknown, nadpisania?: NadpisaniaParametryczne): { parts: any[]; joints: any[]; komorki: { r: number; c: number; w: number; h: number; d: number; x: number; y: number }[] }
