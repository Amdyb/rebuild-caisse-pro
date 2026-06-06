'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function NetworkStatusBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-xs font-black text-white">
      <WifiOff size={14} />
      Mode hors ligne — Certaines fonctions sont indisponibles
    </div>
  )
}
