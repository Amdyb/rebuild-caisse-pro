'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import {
  Banknote,
  Calculator,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  TrendingDown,
  TrendingUp,
  Unlock,
  WalletCards,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Shift = {
  id: string
  business_id: string
  opened_by: string | null
  closed_by: string | null
  opening_cash: number | null
  cash_sales: number | null
  expected_cash: number | null
  actual_cash: number | null
  difference: number | null
  status: string | null
  opened_at: string
  closed_at: string | null
}

type Sale = {
  id: string
  total: number | null
  payment_method: string | null
  created_at: string
}

const inputCls =
  'w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]'

function fmt(n: number) {
  return n.toLocaleString('fr-FR')
}

export default function RegisterShiftsPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [openingCash, setOpeningCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'ok' as 'ok' | 'err' })

  function flash(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 5000)
  }

  const openShift = shifts.find((s) => s.status === 'open') ?? null

  const openShiftCashSales = useMemo(() => {
    if (!openShift) return 0
    const openedAt = new Date(openShift.opened_at)
    return sales
      .filter((s) => s.payment_method === 'cash' && new Date(s.created_at) >= openedAt)
      .reduce((sum, s) => sum + Number(s.total || 0), 0)
  }, [sales, openShift])

  const expectedCash = Number(openShift?.opening_cash || 0) + openShiftCashSales
  const difference = Number(actualCash || 0) - expectedCash

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      setUserId(userData.user.id)
      const stored = localStorage.getItem('caissepro_selected_business_id')
      if (stored) {
        setBusinessId(stored)
        await Promise.all([loadShifts(stored), loadSales(stored)])
        setLoading(false)
        return
      }
      const { data: m } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (!m) { setLoading(false); return }
      localStorage.setItem('caissepro_selected_business_id', m.business_id)
      setBusinessId(m.business_id)
      await Promise.all([loadShifts(m.business_id), loadSales(m.business_id)])
      setLoading(false)
    }
    init()
  }, [router])

  async function loadShifts(id: string) {
    const { data } = await supabase
      .from('cash_register_shifts')
      .select('*')
      .eq('business_id', id)
      .order('opened_at', { ascending: false })
      .limit(20)
    setShifts((data || []) as Shift[])
  }

  async function loadSales(id: string) {
    const { data } = await supabase
      .from('sales')
      .select('id, total, payment_method, created_at')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(500)
    setSales((data || []) as Sale[])
  }

  async function openRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !userId) return
    if (openShift) { flash('Une caisse est déjà ouverte.', 'err'); return }
    setSaving(true)
    const cash = Number(openingCash || 0)
    const { error } = await supabase.from('cash_register_shifts').insert({
      business_id: businessId,
      opened_by: userId,
      opening_cash: cash,
      expected_cash: cash,
      status: 'open',
    })
    setSaving(false)
    if (error) { flash(error.message, 'err'); return }
    setOpeningCash('')
    await loadShifts(businessId)
    flash('Caisse ouverte.')
    window.dispatchEvent(new Event('play-success'))
  }

  async function closeRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !userId || !openShift) return
    setSaving(true)
    const actual = Number(actualCash || 0)
    const diff = actual - expectedCash
    const { error } = await supabase
      .from('cash_register_shifts')
      .update({
        closed_by: userId,
        cash_sales: openShiftCashSales,
        expected_cash: expectedCash,
        actual_cash: actual,
        difference: diff,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', openShift.id)
    setSaving(false)
    if (error) { flash(error.message, 'err'); return }
    setActualCash('')
    await Promise.all([loadShifts(businessId), loadSales(businessId)])
    flash('Caisse fermée.')
    window.dispatchEvent(new Event('play-success'))
  }

  function diffColor(diff: number) {
    if (diff < 0) return 'text-red-600 dark:text-red-400'
    if (diff > 0) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  function diffBg(diff: number) {
    if (diff < 0) return 'bg-red-50 dark:bg-red-900/20'
    if (diff > 0) return 'bg-amber-50 dark:bg-amber-900/20'
    return 'bg-emerald-50 dark:bg-emerald-900/20'
  }

  const stats = [
    {
      label: 'Statut caisse',
      value: openShift ? 'Ouverte' : 'Fermée',
      icon: openShift ? Unlock : Lock,
      color: openShift ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
      bg: openShift ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700/50',
    },
    {
      label: 'Fond de caisse',
      value: `${fmt(Number(openShift?.opening_cash || 0))} CFA`,
      icon: Banknote,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Ventes cash',
      value: `${fmt(openShiftCashSales)} CFA`,
      icon: Calculator,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      label: 'Cash attendu',
      value: `${fmt(expectedCash)} CFA`,
      icon: WalletCards,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
  ]

  return (
    <AppShell
      title="Caisse du jour"
      subtitle="Ouverture et fermeture de caisse"
      action={
        <button
          onClick={() => businessId && Promise.all([loadShifts(businessId), loadSales(businessId)])}
          className="rounded-2xl border border-[var(--cp-border-strong)] px-4 py-2.5 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition"
        >
          Actualiser
        </button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {toast.msg && (
          <div className={`rounded-2xl border p-4 text-sm font-bold ${
            toast.type === 'err'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">{s.label}</p>
                    <p className="mt-2 text-xl font-black text-[var(--cp-text)]">{s.value}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${s.bg}`}>
                    <Icon size={20} className={s.color} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Open / Close panel */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6 shadow-sm">
            {!openShift ? (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-900/30">
                    <Unlock size={22} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--cp-text)]">Ouvrir la caisse</h2>
                    <p className="text-sm font-semibold text-[var(--cp-text-muted)]">Fond de caisse du début de journée.</p>
                  </div>
                </div>
                <form onSubmit={openRegister} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Fond de caisse (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Ex: 25 000"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {saving ? <><Loader2 size={18} className="animate-spin" /> Ouverture...</> : <><Unlock size={18} /> Ouvrir la caisse</>}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-red-50 p-3 dark:bg-red-900/30">
                    <Lock size={22} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--cp-text)]">Fermer la caisse</h2>
                    <p className="text-sm font-semibold text-[var(--cp-text-muted)]">Comptez l'argent réel dans la caisse.</p>
                  </div>
                </div>

                {/* Open shift info */}
                <div className="mb-5 rounded-2xl bg-[var(--cp-surface-2)] p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--cp-text-muted)]">Ouverture</span>
                    <span className="font-black text-[var(--cp-text)]">
                      {new Date(openShift.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--cp-text-muted)]">Fond initial</span>
                    <span className="font-black text-[var(--cp-text)]">{fmt(Number(openShift.opening_cash || 0))} CFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--cp-text-muted)]">Ventes cash</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">+{fmt(openShiftCashSales)} CFA</span>
                  </div>
                  <div className="border-t border-[var(--cp-border-strong)] pt-2 flex items-center justify-between">
                    <span className="font-black text-[var(--cp-text-subtle)]">Cash attendu</span>
                    <span className="text-lg font-black text-[var(--cp-text)]">{fmt(expectedCash)} CFA</span>
                  </div>
                </div>

                <form onSubmit={closeRegister} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Cash compté (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Montant réel dans la caisse"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {actualCash && (
                    <div className={`rounded-2xl p-4 ${diffBg(difference)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {difference < 0
                            ? <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
                            : difference > 0
                            ? <TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />
                            : <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                          }
                          <span className="text-sm font-black text-[var(--cp-text-subtle)]">Différence</span>
                        </div>
                        <span className={`text-2xl font-black ${diffColor(difference)}`}>
                          {difference > 0 ? '+' : ''}{fmt(difference)} CFA
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-[var(--cp-text-muted)]">
                        {difference < 0
                          ? 'Manque — vérifiez vos ventes ou dépenses.'
                          : difference > 0
                          ? 'Excédent — vérifiez les remises ou erreurs.'
                          : 'Parfait — caisse équilibrée.'}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-black text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-60 transition"
                  >
                    {saving ? <><Loader2 size={18} className="animate-spin" /> Fermeture...</> : <><Lock size={18} /> Fermer la caisse</>}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* History */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6 shadow-sm">
            <h3 className="mb-5 text-base font-black text-[var(--cp-text)]">Historique des caisses</h3>

            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : shifts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] p-14 text-center">
                <WalletCards className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                <h3 className="text-xl font-black text-[var(--cp-text)]">Aucun historique</h3>
                <p className="mt-2 text-sm font-semibold text-[var(--cp-text-muted)]">Les caisses ouvertes apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => {
                  const opened = new Date(shift.opened_at)
                  const closed = shift.closed_at ? new Date(shift.closed_at) : null
                  const isOpen = shift.status === 'open'
                  const diff = Number(shift.difference || 0)

                  return (
                    <div key={shift.id}
                      className={`rounded-2xl border p-4 transition ${isOpen ? 'border-emerald-400/40 bg-emerald-50/50 dark:border-emerald-700/40 dark:bg-emerald-900/10' : 'border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)]'}`}>
                      {/* Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-black text-[var(--cp-text)]">
                            {opened.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-xs font-semibold text-[var(--cp-text-muted)]">
                            <Clock size={10} className="inline mr-1" />
                            {opened.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {closed ? ` — ${closed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                          isOpen
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {isOpen ? 'En cours' : 'Fermée'}
                        </span>
                      </div>

                      {/* Numbers */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-[var(--cp-surface)] p-2.5 text-center">
                          <p className="text-[10px] font-bold text-[var(--cp-text-muted)]">Fond départ</p>
                          <p className="mt-0.5 text-sm font-black text-[var(--cp-text)]">{fmt(Number(shift.opening_cash || 0))}</p>
                        </div>
                        <div className="rounded-xl bg-[var(--cp-surface)] p-2.5 text-center">
                          <p className="text-[10px] font-bold text-[var(--cp-text-muted)]">Cash ventes</p>
                          <p className="mt-0.5 text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt(Number(shift.cash_sales || 0))}</p>
                        </div>
                        <div className="rounded-xl bg-[var(--cp-surface)] p-2.5 text-center">
                          <p className="text-[10px] font-bold text-[var(--cp-text-muted)]">Attendu</p>
                          <p className="mt-0.5 text-sm font-black text-[var(--cp-text)]">{fmt(Number(shift.expected_cash || 0))}</p>
                        </div>
                        <div className={`rounded-xl p-2.5 text-center ${isOpen ? 'bg-[var(--cp-surface)]' : diffBg(diff)}`}>
                          <p className="text-[10px] font-bold text-[var(--cp-text-muted)]">Différence</p>
                          <p className={`mt-0.5 text-sm font-black ${isOpen ? 'text-[var(--cp-text-muted)]' : diffColor(diff)}`}>
                            {isOpen ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
