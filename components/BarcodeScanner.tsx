'use client'

import { Camera, FlipHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = { onScan: (barcode: string) => void; onClose: () => void }

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [flash, setFlash] = useState(false)
  const elementId = 'barcode-scanner-preview'

  async function startScanner(facing: 'environment' | 'user') {
    const { Html5Qrcode } = await import('html5-qrcode')
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { await scannerRef.current.clear() } catch {}
    }
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner
    setScanning(false)
    setError('')
    try {
      await scanner.start(
        { facingMode: facing },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded: string) => {
          setFlash(true)
          setTimeout(() => setFlash(false), 400)
          if (navigator.vibrate) navigator.vibrate(200)
          onScan(decoded)
          onClose()
        },
        () => {}
      )
      setScanning(true)
    } catch (err: any) {
      setError(
        err?.message?.includes('Permission')
          ? 'Permission caméra refusée. Veuillez autoriser l\'accès à la caméra.'
          : 'Impossible d\'accéder à la caméra.'
      )
    }
  }

  async function toggleCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await startScanner(next)
  }

  useEffect(() => {
    startScanner(facingMode)
    return () => { scannerRef.current?.stop().catch(() => {}) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={toggleCamera} className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur-sm">
          <FlipHorizontal size={16} /> Retourner
        </button>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div
          id={elementId}
          className={`w-full max-w-sm overflow-hidden rounded-3xl transition-all duration-200 ${flash ? 'brightness-150' : ''}`}
        />
        {scanning && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-72">
              <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-emerald-400" />
              <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-emerald-400" />
              <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-emerald-400" />
              <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-emerald-400/60" />
            </div>
          </div>
        )}
        {error && (
          <div className="mx-6 flex flex-col items-center gap-4 text-center">
            <Camera size={48} className="text-white/40" />
            <p className="text-base font-bold text-white/70">{error}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 text-center">
        <p className="text-sm font-semibold text-white/60">Pointez vers un code-barres ou QR code</p>
      </div>
    </div>
  )
}
