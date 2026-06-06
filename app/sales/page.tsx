'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { CreditCard, Eye, HandCoins, ReceiptText, RefreshCw, Search, ShoppingCart, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Sale = {
  id: string
  total: number | null
  paid_amount: number | null
  remaining_amount: number | null
  payment_method: string | null
  status: string | null
  created_at: string
  customers?: { full_name: string | null; phone: string | null } | null
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', card: 'Carte', credit: 'Client Doit',
}
const PAYMENT_BADGE: Record<string, string> = {
  cash: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  wave: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  orange_money: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  card: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  credit: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

type Period = 'today' | 'week' | 'month' | 'all'

export default function SalesPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('today')
  const [loading, setLoading] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const now = new Date()
    const start = new Date(now)
    if (period === 'today') start.setHours(0, 0, 0, 0)
    else if (period === 'week') { const d = start.getDay() === 0 ? 6 : start.getDay() - 1; start.setDate(start.getDate() - d); start.setHours(0, 0, 0, 0) }
    else if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
    return sales.filter((s) => {
      const dateOk = period === 'all' || new Date(s.created_at) >= start
      const searchOk = !q || s.id.toLowerCase().includes(q) ||
        (s.customers?.full_name || '').toLowerCase().includes(q) ||
        (s.customers?.phone || '').toLowerCase().includes(q) ||
        (s.payment_method || '').toLowerCase().includes(q)
      return dateOk && searchOk
    })
  }, [sales, search, period])

  const totalRevenue = filtered.reduce((s, x) => s + Number(x.total || 0), 0)
  const totalPaid = filtered.reduce((s, x) => s + Number(x.paid_amount || 0), 0)
  const totalRemaining = filtered.reduce((s, x) => s + Number(x.remaining_amount || 0), 0)
  const avgSale = filtered.length > 0 ? totalRevenue / filtered.length : 0

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const { data: m } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (!m) { setLoading(false); return }
      setBusinessId(m.business_id)
      await load(m.business_id)
      setLoading(false)
    }
    init()
  }, [router])

  async function load(id: string) {
    const { data } = await supabase.from('sales')
      .select('id,total,paid_amount,remaining_amount,payment_method,status,created_at,customers(full_name,phone)')
      .eq('business_id', id).order('created_at', { ascending: false }).limit(500)
    setSales((data || []) as unknown as Sale[])
  }

  const action = (
    <div className="flex gap-2">
      <button onClick={() => businessId && load(businessId)}
        className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition">
        <RefreshCw size={15} />
      </button>
      <Link href="/pos" className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition">
        <ShoppingCart size={15} /> Vendre
      </Link>
    </div>
  )

  return (
    <AppShell title="Ventes" subtitle="Historique et analyse des encaissements." action={action}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Transactions', value: filtered.length.toString(), icon: ReceiptText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Chiffre d\'affaires', value: `${totalRevenue.toLocaleString('fr-FR')} CFA`, icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Payé', value: `${totalPaid.toLocaleString('fr-FR')} CFA`, icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Reste à payer', value: `${totalRemaining.toLocaleString('fr-FR')} CFA`, icon: HandCoins, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', highlight: totalRemaining > 0 },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`rounded-[2rem] border bg-white p-5 shadow-sm dark:bg-slate-800 ${stat.highlight ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${stat.bg}`}><Icon size={20} className={stat.color} /></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Client, téléphone, paiement..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${period === p ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                {p === 'today' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Tout'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
            <ReceiptText className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Aucune vente</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Les ventes de la période sélectionnée apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((sale) => {
                const d = new Date(sale.created_at)
                const badge = PAYMENT_BADGE[sale.payment_method || ''] || PAYMENT_BADGE.card
                return (
                  <div key={sale.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <ReceiptText size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-950 dark:text-white">{sale.customers?.full_name || 'Client comptoir'}</p>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                          {d.toLocaleDateString('fr-FR')} à {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}#{sale.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-13 sm:pl-0">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${badge}`}>
                        {PAYMENT_LABELS[sale.payment_method || ''] || sale.payment_method}
                      </span>
                      <div className="text-right">
                        <p className="font-black text-slate-950 dark:text-white">{Number(sale.total || 0).toLocaleString('fr-FR')} CFA</p>
                        {Number(sale.remaining_amount || 0) > 0 && (
                          <p className="text-xs font-bold text-red-600 dark:text-red-400">Reste : {Number(sale.remaining_amount).toLocaleString('fr-FR')} CFA</p>
                        )}
                      </div>
                      <Link href={`/sales/${sale.id}/receipt`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition dark:border-slate-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400">
                        <Eye size={16} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Avg */}
        {filtered.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Panier moyen : </span>
            <span className="font-black text-slate-950 dark:text-white">{avgSale.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CFA</span>
          </div>
        )}
      </div>
    </AppShell>
  )
}
