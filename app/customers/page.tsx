'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { DollarSign, Loader2, Phone, Plus, Search, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Customer = {
  id: string
  full_name: string
  phone: string | null
  debt_balance: number | null
  total_spent: number | null
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [toast, setToast] = useState('')

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return customers
    return customers.filter((c) => c.full_name.toLowerCase().includes(q) || (c.phone || '').includes(q))
  }, [customers, search])

  const totalDebt = customers.reduce((s, c) => s + Number(c.debt_balance || 0), 0)
  const totalSpent = customers.reduce((s, c) => s + Number(c.total_spent || 0), 0)

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
    const { data } = await supabase.from('customers').select('*').eq('business_id', id).order('full_name')
    setCustomers((data || []) as Customer[])
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('customers').insert({ business_id: businessId, full_name: name.trim(), phone: phone || null, debt_balance: 0 })
    setSaving(false)
    if (error) { flash(error.message); return }
    setName(''); setPhone(''); setShowForm(false)
    await load(businessId)
    flash('Client ajouté.')
    window.dispatchEvent(new Event('play-success'))
  }

  const action = (
    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition">
      <Plus size={18} /> Ajouter
    </button>
  )

  return (
    <AppShell title="Clients" subtitle={`${customers.length} client${customers.length !== 1 ? 's' : ''}`} action={action}>
      {/* Add customer modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-[var(--cp-surface)] p-8 shadow-2xl border border-[var(--cp-border-strong)]">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 rounded-full bg-[var(--cp-surface-2)] p-1.5 text-[var(--cp-text-subtle)]"><X size={16} /></button>
            <h2 className="mb-6 text-xl font-black text-[var(--cp-accent)]">Nouveau client</h2>
            <form onSubmit={addCustomer} className="space-y-4">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet"
                className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (optionnel)"
                className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]" />
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        {toast && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">{toast}</div>}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Total clients', value: String(customers.length), icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Total dépensé', value: `${totalSpent.toLocaleString('fr-FR')} CFA`, icon: DollarSign, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Total dettes', value: `${totalDebt.toLocaleString('fr-FR')} CFA`, icon: DollarSign, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', highlight: totalDebt > 0 },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`rounded-[2rem] border bg-[var(--cp-surface)] p-5 ${(stat as any).highlight ? 'border-red-500/30' : 'border-[var(--cp-border-strong)]'}`}>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] py-3.5 pl-12 pr-4 text-sm font-semibold text-[var(--cp-text)] shadow-sm outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]"
            placeholder="Rechercher par nom ou téléphone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-14 text-center">
            <Users className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Aucun client</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {search ? `Aucun résultat pour "${search}"` : 'Ajoutez votre premier client.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((customer, i) => (
              <div key={customer.id} className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {customer.full_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-950 dark:text-white">{customer.full_name}</h4>
                      {i < 3 && customers.length > 3 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Top</span>
                      )}
                    </div>
                    {customer.phone && (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        <Phone size={12} /> {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-16 sm:pl-0">
                  {Number(customer.debt_balance || 0) > 0 && (
                    <div className="rounded-2xl bg-red-50 px-4 py-2 text-center dark:bg-red-900/20">
                      <p className="text-[10px] font-bold text-slate-400">Doit</p>
                      <p className="font-black text-red-700 dark:text-red-400">{Number(customer.debt_balance).toLocaleString('fr-FR')} CFA</p>
                    </div>
                  )}
                  <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center dark:bg-slate-700">
                    <p className="text-[10px] font-bold text-slate-400">Dépensé</p>
                    <p className="font-black text-slate-950 dark:text-white">{Number(customer.total_spent || 0).toLocaleString('fr-FR')} CFA</p>
                  </div>
                  <Link href={`/customers/${customer.id}`}
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 transition dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                    Profil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
