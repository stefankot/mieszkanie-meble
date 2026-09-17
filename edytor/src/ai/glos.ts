import { atom } from 'nanostores'

import { wykonaj, zNazwyAI } from '@/ops/rejestr'
import '@/ops/operacje'
import { narzedziaAI } from '@/ops/rejestr'

import { $rozmowa } from './agent'
import { najnowszyModelRealtime } from './klient'
import { $kluczOpenAI } from './klucz'

/* Rozmowa głosowa (Realtime przez WebRTC). Model dostaje te same narzędzia co agent tekstowy,
   więc mówienie „dodaj półkę” wykonuje operację, a nie tylko odpowiada. Klucz użytkownika
   idzie wprost do OpenAI — bez serwera pośredniczącego, tak jak przy renderze AI. */
export const $glos = atom<'rozlaczony' | 'laczenie' | 'polaczony' | 'blad'>('rozlaczony')
export const $bladGlosu = atom('')

let polaczenie: RTCPeerConnection | null = null
let kanal: RTCDataChannel | null = null
let mikrofon: MediaStream | null = null
let dzwiek: HTMLAudioElement | null = null

const INSTRUKCJE = 'Jesteś głosowym asystentem edytora wnętrza. Mów krótko po polsku. Zmiany wykonuj wyłącznie narzędziami; identyfikatorów nie zgaduj — najpierw scene.describe.'

function wyslij(zdarzenie: unknown) {
  if (kanal?.readyState === 'open') kanal.send(JSON.stringify(zdarzenie))
}

async function obsluz(zdarzenie: any) {
  if (zdarzenie.type === 'response.function_call_arguments.done') {
    let wynik: unknown
    try {
      wynik = await wykonaj(zNazwyAI(zdarzenie.name), JSON.parse(zdarzenie.arguments || '{}'))
      $rozmowa.set([...$rozmowa.get(), { rola: 'narzedzie', nazwa: zdarzenie.name, tekst: `${zdarzenie.name} (głos)`, czas: Date.now() }])
    } catch (e) {
      wynik = { blad: e instanceof Error ? e.message : String(e) }
    }
    wyslij({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: zdarzenie.call_id, output: JSON.stringify(wynik ?? null).slice(0, 4000) } })
    wyslij({ type: 'response.create' })
  } else if (zdarzenie.type === 'response.output_audio_transcript.done' && zdarzenie.transcript) {
    $rozmowa.set([...$rozmowa.get(), { rola: 'agent', tekst: zdarzenie.transcript, czas: Date.now() }])
  } else if (zdarzenie.type === 'conversation.item.input_audio_transcription.completed' && zdarzenie.transcript) {
    $rozmowa.set([...$rozmowa.get(), { rola: 'uzytkownik', tekst: zdarzenie.transcript, czas: Date.now() }])
  } else if (zdarzenie.type === 'error') {
    $bladGlosu.set(zdarzenie.error?.message ?? 'Błąd rozmowy')
  }
}

export async function polaczGlos() {
  if ($glos.get() !== 'rozlaczony') return
  const klucz = $kluczOpenAI.get()
  if (!klucz) {
    $bladGlosu.set('Brak klucza OpenAI.')
    return
  }
  $glos.set('laczenie')
  $bladGlosu.set('')
  try {
    const model = await najnowszyModelRealtime()
    polaczenie = new RTCPeerConnection()
    dzwiek = new Audio()
    dzwiek.autoplay = true
    polaczenie.ontrack = (e) => (dzwiek!.srcObject = e.streams[0])
    mikrofon = await navigator.mediaDevices.getUserMedia({ audio: true })
    for (const sciezka of mikrofon.getTracks()) polaczenie.addTrack(sciezka, mikrofon)
    kanal = polaczenie.createDataChannel('oai-events')
    kanal.onmessage = (e) => obsluz(JSON.parse(e.data))
    kanal.onopen = () => {
      wyslij({ type: 'session.update', session: { type: 'realtime', instructions: INSTRUKCJE, tools: narzedziaAI(), tool_choice: 'auto', audio: { input: { transcription: { model: 'whisper-1' } } } } })
      $glos.set('polaczony')
    }
    const oferta = await polaczenie.createOffer()
    await polaczenie.setLocalDescription(oferta)
    const odpowiedz = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      body: oferta.sdp,
      headers: { Authorization: `Bearer ${klucz}`, 'Content-Type': 'application/sdp' }
    })
    if (!odpowiedz.ok) throw new Error(`Realtime: ${odpowiedz.status} ${(await odpowiedz.text()).slice(0, 200)}`)
    await polaczenie.setRemoteDescription({ type: 'answer', sdp: await odpowiedz.text() })
  } catch (e) {
    $bladGlosu.set(e instanceof Error ? e.message : String(e))
    $glos.set('blad')
    rozlaczGlos()
  }
}

export function rozlaczGlos() {
  kanal?.close()
  polaczenie?.close()
  mikrofon?.getTracks().forEach((t) => t.stop())
  dzwiek?.pause()
  kanal = null
  polaczenie = null
  mikrofon = null
  dzwiek = null
  if ($glos.get() !== 'blad') $glos.set('rozlaczony')
}
