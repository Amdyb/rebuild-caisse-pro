'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { CalendarDays, Loader2, Plus, Receipt, Search, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Expense = {
  id: string
  title: string
  category: string | null
  amount: number | null
  note: string | null
  expense_date: string | null
  created_at: string
}

const CATEGORIES = ['Transport', 'Fournisseur', 'Salaire', 'Loyer', 'Electricité', 'Internet', 'Publicité', 'Réparation', 'Autre']
const todayISO = () => new Date().toISOString().slice(0, 10)
const monthStartISO = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function ExpensesPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ title: '', category: 'Transport', amount: '', note: '', expense_date: todayISO() })

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }
  function setF(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return expenses
    return expenses.filter((e) => e.title.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
  }, [expenses, search])

  const stats = useMemo(() => {
    const today = todayISO()
    const monthStart = monthStartISO()
    const todayExp = expenses.filter((e) => e.expense_date === today).reduce((s, e) => s + Number(e.amount || 0), 0)
    const monthExp = expenses.filter((e) => (e.expense_date || '') >= monthStart).reduce((s, e) => s + Number(e.amount || 0), 0)
    return { todayExp, monthExp, monthNet: monthRevenue - monthExp }
  }, [expenses, monthRevenue])

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      setUserId(userData.user.id)
      const stored = localStorage.getItem('caissepro_selected_business_id')
      if (stored) {
        setBusinessId(stored)
        await Promise.all([load(stored), loadRevenue(stored)])
        setLoading(false)
        return
      }
      const { data: m } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (!m) { setLoading(false); return }
      localStorage.setItem('caissepro_selected_business_id', m.business_id)
      setBusinessId(m.business_id)
      await Promise.all([load(m.business_id), loadRevenue(m.business_id)])
      setLoading(false)
    }
    init()
  }, [router])

  async function load(id: string) {
    const { data } = await supabase.from('expenses').select('*').eq('business_id', id)
      .order('expense_date', { ascending: false }).order('created_at', { ascending: false })
    setExpenses((data || []) as Expense[])
  }

  async function loadRevenue(id: string) {
    const { data } = await supabase.from('sales').select('total').eq('business_id', id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    setMonthRevenue((data || []).reduce((s, x) => s + Number(x.total || 0), 0))
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !userId) return
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      business_id: businessId, created_by: userId,
      title: form.title, category: form.category,
      amount: Number(form.amount || 0), note: form.note || null, expense_date: form.expense_date,
    })
    setSaving(false)
    if (error) { flash(error.message); return }
    setForm({ title: '', category: 'Transport', amount: '', note: '', expense_date: todayISO() })
    await load(businessId)
    flash('Dépense ajoutée.')
    window.dispatchEvent(new Event('play-success'))
  }

  async function deleteExpense(id: string) {
    if (!businessId || !confirm('Supprimer cette dépense ?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <AppShell title="Dépenses" subtitle="Charges, transport, salaires...">
      <div className="mx-auto max-w-7xl space-y-6">
        {toast && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">{toast}</div>}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Dépenses aujourd'hui", value: `${stats.todayExp.toLocaleString('fr-FR')} CFA`, icon: Receipt, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
            { label: 'Dépenses du mois', value: `${stats.monthExp.toLocaleString('fr-FR')} CFA`, icon: CalendarDays, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
            { label: 'Net du mois', value: `${stats.monthNet.toLocaleString('fr-FR')} CFA`, icon: stats.monthNet >= 0 ? TrendingUp : Wallet, color: stats.monthNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: stats.monthNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="cp-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black text-[var(--cp-text)]">{stat.value}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${stat.bg}`}><Icon size={20} className={stat.color} /></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Add form */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-5 text-base font-black text-slate-950 dark:text-white">Ajouter une dépense</h3>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Titre *</label>
                <input required value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Ex: Achat marchandise"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Catégorie</label>
                  <select value={form.category} onChange={(e) => setF('category', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Date</label>
                  <input type="date" required value={form.expense_date} onChange={(e) => setF('expense_date', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Montant (CFA) *</label>
                <input type="number" min="0" required value={form.amount} onChange={(e) => setF('amount', e.target.value)} placeholder="0"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Note</label>
                <input value={form.note} onChange={(e) => setF('note', e.target.value)} placeholder="Optionnel"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-black text-slate-950 dark:text-white">
                {expenses.length} dépense{expenses.length !== 1 ? 's' : ''}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm font-semibold outline-none sm:w-64 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-600 dark:bg-slate-700/50">
                <Receipt className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
                <p className="font-black text-slate-950 dark:text-white">Aucune dépense</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-950 dark:text-white truncate">{expense.title}</p>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {expense.category} · {expense.expense_date}
                        {expense.note ? ` · ${expense.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="rounded-2xl bg-red-50 px-4 py-2 text-right dark:bg-red-900/20">
                        <p className="text-[10px] font-bold text-red-500">Montant</p>
                        <p className="font-black text-red-700 dark:text-red-400">{Number(expense.amount || 0).toLocaleString('fr-FR')} CFA</p>
                      </div>
                      <button onClick={() => deleteExpense(expense.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition dark:hover:bg-red-900/20">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
