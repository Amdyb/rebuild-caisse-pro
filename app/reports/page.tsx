'use client'

import AppShell from '@/components/AppShell'
import { SkeletonDashboard } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { AlertTriangle, Banknote, CreditCard, DollarSign, Package, Receipt, ReceiptText, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Sale = { id: string; total: number | null; paid_amount: number | null; remaining_amount: number | null; payment_method: string | null; created_at: string }
type Expense = { id: string; amount: number | null; category: string | null; expense_date: string | null }
type Product = { id: string; name: string; stock: number | null }
type Customer = { id: string; debt_balance: number | null }

type Period = 'today' | 'week' | 'month' | 'year'

const todayISO = () => new Date().toISOString().slice(0, 10)
const weekStartISO = () => { const d = new Date(); const diff = d.getDay() === 0 ? 6 : d.getDay() - 1; d.setDate(d.getDate() - diff); return d.toISOString().slice(0, 10) }
const monthStartISO = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
const yearStartISO = () => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)

function MiniBar({ data, color = 'emerald' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const colors: Record<string, string> = { emerald: 'bg-emerald-500', red: 'bg-red-500', blue: 'bg-blue-500' }
  const bar = colors[color] || colors.emerald
  return (
    <div className="flex h-28 items-end gap-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          {d.value > 0 && <p className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{Math.round(d.value / 1000)}k</p>}
          <div className={`w-full rounded-t-md ${bar} transition-all`} style={{ height: `${Math.max((d.value / max) * 88, d.value > 0 ? 4 : 0)}px` }} />
          <p className="text-[8px] font-black text-slate-500 truncate w-full text-center">{d.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)

  const periodStart = useMemo(() => {
    if (period === 'today') return todayISO()
    if (period === 'week') return weekStartISO()
    if (period === 'month') return monthStartISO()
    return yearStartISO()
  }, [period])

  const report = useMemo(() => {
    const ps = sales.filter((s) => s.created_at.slice(0, 10) >= periodStart)
    const pe = expenses.filter((e) => (e.expense_date || '') >= periodStart)
    const totalSales = ps.reduce((s, x) => s + Number(x.total || 0), 0)
    const totalPaid = ps.reduce((s, x) => s + Number(x.paid_amount || 0), 0)
    const totalRemaining = ps.reduce((s, x) => s + Number(x.remaining_amount || 0), 0)
    const totalExpenses = pe.reduce((s, x) => s + Number(x.amount || 0), 0)
    const netProfit = totalSales - totalExpenses

    const paymentBreakdown = ps.reduce<Record<string, number>>((acc, s) => {
      const k = s.payment_method || 'unknown'
      acc[k] = (acc[k] || 0) + Number(s.total || 0)
      return acc
    }, {})

    const expenseBreakdown = pe.reduce<Record<string, number>>((acc, e) => {
      const k = e.category || 'Autre'
      acc[k] = (acc[k] || 0) + Number(e.amount || 0)
      return acc
    }, {})

    const lowStock = products.filter((p) => p.stock !== null && Number(p.stock) <= 5)
    const totalDebt = customers.reduce((s, c) => s + Number(c.debt_balance || 0), 0)

    return { ps, pe, totalSales, totalPaid, totalRemaining, totalExpenses, netProfit, paymentBreakdown, expenseBreakdown, lowStock, totalDebt }
  }, [sales, expenses, products, customers, periodStart])

  const chartBars = useMemo(() => {
    const ps = sales.filter((s) => s.created_at.slice(0, 10) >= periodStart)
    if (ps.length === 0) return []
    const byDay: Record<string, number> = {}
    ps.forEach((s) => {
      const d = s.created_at.slice(0, 10)
      byDay[d] = (byDay[d] || 0) + Number(s.total || 0)
    })
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([d, v]) => ({
      label: new Date(d).toLocaleDateString('fr-FR', period === 'year' ? { month: 'short' } : { weekday: 'short' }),
      value: v,
    }))
  }, [sales, periodStart, period])

  const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', card: 'Carte', credit: 'Crédit',
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const { data: m } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (!m) { setLoading(false); return }
      setBusinessId(m.business_id)
      const [s, e, p, c] = await Promise.all([
        supabase.from('sales').select('id,total,paid_amount,remaining_amount,payment_method,created_at').eq('business_id', m.business_id).order('created_at', { ascending: false }).limit(1000),
        supabase.from('expenses').select('id,amount,category,expense_date').eq('business_id', m.business_id),
        supabase.from('products').select('id,name,stock').eq('business_id', m.business_id).not('archived', 'is', true).not('is_active', 'is', false),
        supabase.from('customers').select('id,debt_balance').eq('business_id', m.business_id),
      ])
      setSales((s.data || []) as Sale[])
      setExpenses((e.data || []) as Expense[])
      setProducts((p.data || []) as Product[])
      setCustomers((c.data || []) as Customer[])
      setLoading(false)
    }
    init()
  }, [router])

  return (
    <AppShell title="Rapports" subtitle="Analyse des performances de votre commerce.">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Period selector */}
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 w-fit">
          {(['today', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${period === p ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
              {p === 'today' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>

        {loading ? <SkeletonDashboard /> : (
          <>
            {/* KPI grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Transactions', value: String(report.ps.length), icon: ReceiptText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
                { label: 'Chiffre d\'affaires', value: `${report.totalSales.toLocaleString('fr-FR')} CFA`, icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
                { label: 'Dépenses', value: `${report.totalExpenses.toLocaleString('fr-FR')} CFA`, icon: Receipt, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
                { label: 'Profit net', value: `${report.netProfit.toLocaleString('fr-FR')} CFA`, icon: report.netProfit >= 0 ? TrendingUp : TrendingDown, color: report.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: report.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Sales chart */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Ventes journalières</h3>
                {chartBars.length > 0 ? <MiniBar data={chartBars} color="emerald" /> : <p className="py-10 text-center text-sm text-slate-400">Aucune donnée</p>}
              </div>

              {/* Payment breakdown */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Modes de paiement</h3>
                {Object.keys(report.paymentBreakdown).length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">Aucune vente</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(report.paymentBreakdown).sort(([, a], [, b]) => b - a).map(([method, amount]) => {
                      const pct = report.totalSales > 0 ? Math.round((amount / report.totalSales) * 100) : 0
                      return (
                        <div key={method}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">{PAYMENT_LABELS[method] || method}</span>
                            <span className="text-sm font-black text-slate-950 dark:text-white">{amount.toLocaleString('fr-FR')} CFA <span className="text-slate-400 font-semibold">({pct}%)</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Expense breakdown */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Dépenses par catégorie</h3>
                {Object.keys(report.expenseBreakdown).length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">Aucune dépense</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(report.expenseBreakdown).sort(([, a], [, b]) => b - a).map(([cat, amount]) => {
                      const pct = report.totalExpenses > 0 ? Math.round((amount / report.totalExpenses) * 100) : 0
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">{cat}</span>
                            <span className="text-sm font-black text-slate-950 dark:text-white">{amount.toLocaleString('fr-FR')} CFA</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-2 rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Alerts: low stock + debt */}
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Stock faible</h3>
                    <AlertTriangle size={18} className={report.lowStock.length > 0 ? 'text-amber-500' : 'text-slate-300'} />
                  </div>
                  {report.lowStock.length === 0 ? (
                    <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tous les stocks sont OK</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {report.lowStock.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{p.name}</span>
                          <span className={`text-sm font-black ${Number(p.stock) <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock ?? 0}</span>
                        </div>
                      ))}
                      {report.lowStock.length > 5 && <p className="text-xs font-bold text-slate-400">+{report.lowStock.length - 5} autres</p>}
                    </div>
                  )}
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Créances clients</h3>
                    <Users size={18} className="text-slate-400" />
                  </div>
                  <p className={`mt-2 text-2xl font-black ${report.totalDebt > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {report.totalDebt.toLocaleString('fr-FR')} CFA
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Reste dû par les clients</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
