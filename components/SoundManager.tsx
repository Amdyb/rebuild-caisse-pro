'use client'

import { useEffect } from 'react'

function createTone(ctx: AudioContext, freq: number, dur: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = type
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + dur)
}

function playChaChing(ctx: AudioContext) {
  createTone(ctx, 1046, 0.08, 'triangle')
  setTimeout(() => createTone(ctx, 1318, 0.1, 'triangle'), 80)
  setTimeout(() => createTone(ctx, 1568, 0.15, 'triangle'), 160)
}

function playClick(ctx: AudioContext) {
  createTone(ctx, 800, 0.05, 'sine')
}

function playSuccess(ctx: AudioContext) {
  createTone(ctx, 523, 0.08)
  setTimeout(() => createTone(ctx, 659, 0.08), 100)
  setTimeout(() => createTone(ctx, 784, 0.15), 200)
}

function playNavigation(ctx: AudioContext) {
  createTone(ctx, 600, 0.04, 'sine')
}

export default function SoundManager() {
  useEffect(() => {
    let ctx: AudioContext | null = null

    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      return ctx
    }

    const handlers: Record<string, () => void> = {
      'play-cha-ching': () => playChaChing(getCtx()),
      'play-click': () => playClick(getCtx()),
      'play-success': () => playSuccess(getCtx()),
      'play-navigation': () => playNavigation(getCtx()),
    }

    for (const [event, handler] of Object.entries(handlers)) {
      window.addEventListener(event, handler)
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        window.removeEventListener(event, handler)
      }
    }
  }, [])

  return null
}
