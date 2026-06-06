'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { getThemePreference, setThemePreference } from '@/components/DarkModeProvider'

export default function DarkModeToggle() {
  const [pref, setPref] = useState<'auto' | 'light' | 'dark'>('auto')

  useEffect(() => {
    setPref(getThemePreference() as 'auto' | 'light' | 'dark')
    function onThemeChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.preference) setPref(detail.preference)
    }
    window.addEventListener('theme-changed', onThemeChanged)
    return () => window.removeEventListener('theme-changed', onThemeChanged)
  }, [])

  function cycle() {
    const next = pref === 'auto' ? 'light' : pref === 'light' ? 'dark' : 'auto'
    setThemePreference(next)
    setPref(next)
  }

  const Icon = pref === 'dark' ? Moon : pref === 'light' ? Sun : SunMoon

  return (
    <button
      onClick={cycle}
      title={`Mode: ${pref}`}
      className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
    >
      <Icon size={18} />
    </button>
  )
}
