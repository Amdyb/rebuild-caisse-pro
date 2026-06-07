'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  HandCoins,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Supplier = {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  balance: number | null
  note: string | null
  total_owed: number | null
  total_paid: number | null
  remaining_balance: number | null
  last_payment_date: string | null
  created_at: string
}

type SupplierPayment = {
  id: string
  supplier_id: string
  amount: number
  payment_type: string | null
  payment_method: string | null
  note: string | null
  paid_at: string
}

type Product = { id: string; name: string }

const inputCls =
  'w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]'

export default function SuppliersPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [payments, setPayments] = useState<Record<string, SupplierPayment[]>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [partialAmount, setPartialAmount] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', balance: '', note: '' })

  const [reassortSupplier, setReassortSupplier] = useState<Supplier | null>(null)
  const [reassortProducts, setReassortProducts] = useState<Product[]>([])
  const [reassortForm, setReassortForm] = useState({ product_id: '', product_name: '', quantity: '', expected_date: '' })
  const [submittingReassort, setSubmittingReassort] = useState(false)

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 5000) }
  function setF(field: string, val: string) { setForm((f) => ({ ...f, [field]: val })) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return suppliers
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const totalRemaining = suppliers.reduce((s, x) => s + Number(x.remaining_balance ?? x.balance ?? 0), 0)
  const totalPaid = suppliers.reduce((s, x) => s + Number(x.total_paid || 0), 0)
  const withDebt = suppliers.filter((s) => Number(s.remaining_balance ?? s.balance ?? 0) > 0)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const stored = localStorage.getItem('caissepro_selected_business_id')
      if (stored) {
        setBusinessId(stored)
        await loadSuppliers(stored)
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
      await loadSuppliers(m.business_id)
      setLoading(false)
    }
    init()
  }, [router])

  async function loadSuppliers(id: string) {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
    setSuppliers((data || []) as Supplier[])
  }

  async function loadPayments(supplierId: string) {
    if (payments[supplierId]) return
    const { data } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('paid_at', { ascending: false })
      .limit(20)
    if (data) setPayments((prev) => ({ ...prev, [supplierId]: data as SupplierPayment[] }))
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadPayments(id)
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setAddingSupplier(true)
    const owed = Number(form.balance || 0)
    const { error } = await supabase.from('suppliers').insert({
      business_id: businessId,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      balance: owed,
      total_owed: owed,
      total_paid: 0,
      remaining_balance: owed,
      note: form.note || null,
    })
    setAddingSupplier(false)
    if (error) { flash(error.message); return }
    setForm({ name: '', phone: '', email: '', address: '', balance: '', note: '' })
    await loadSuppliers(businessId)
    flash('Fournisseur ajouté.')
    window.dispatchEvent(new Event('play-success'))
  }

  async function deleteSupplier(id: string) {
    if (!businessId || !confirm('Supprimer ce fournisseur ?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) { flash(error.message); return }
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }

  async function payFull(supplier: Supplier) {
    if (!businessId) return
    const remaining = Number(supplier.remaining_balance ?? supplier.balance ?? 0)
    if (remaining <= 0) return
    setSavingId(supplier.id)
    const { error: ie } = await supabase.from('supplier_payments').insert({
      business_id: businessId,
      supplier_id: supplier.id,
      amount: remaining,
      payment_type: 'full',
      payment_method: 'cash',
      paid_at: new Date().toISOString(),
    })
    if (ie) { setSavingId(null); flash(ie.message); return }
    await supabase.from('suppliers').update({
      remaining_balance: 0,
      total_paid: Number(supplier.total_paid || 0) + remaining,
      last_payment_date: new Date().toISOString(),
    }).eq('id', supplier.id)
    setSavingId(null)
    setPayments((prev) => ({
      ...prev,
      [supplier.id]: [
        { id: crypto.randomUUID(), supplier_id: supplier.id, amount: remaining, payment_type: 'full', payment_method: 'cash', note: null, paid_at: new Date().toISOString() },
        ...(prev[supplier.id] || []),
      ],
    }))
    await loadSuppliers(businessId)
    flash(`${remaining.toLocaleString('fr-FR')} CFA payé.`)
    window.dispatchEvent(new Event('play-success'))
  }

  async function payPartial(supplier: Supplier) {
    if (!businessId) return
    const remaining = Number(supplier.remaining_balance ?? supplier.balance ?? 0)
    const amt = Math.min(Number(partialAmount[supplier.id] || 0), remaining)
    if (!amt || amt <= 0) { flash('Montant invalide.'); return }
    setSavingId(supplier.id)
    const { error: ie } = await supabase.from('supplier_payments').insert({
      business_id: businessId,
      supplier_id: supplier.id,
      amount: amt,
      payment_type: 'partial',
      payment_method: 'cash',
      paid_at: new Date().toISOString(),
    })
    if (ie) { setSavingId(null); flash(ie.message); return }
    await supabase.from('suppliers').update({
      remaining_balance: remaining - amt,
      total_paid: Number(supplier.total_paid || 0) + amt,
      last_payment_date: new Date().toISOString(),
    }).eq('id', supplier.id)
    setSavingId(null)
    setPartialAmount((prev) => ({ ...prev, [supplier.id]: '' }))
    setPayments((prev) => ({
      ...prev,
      [supplier.id]: [
        { id: crypto.randomUUID(), supplier_id: supplier.id, amount: amt, payment_type: 'partial', payment_method: 'cash', note: null, paid_at: new Date().toISOString() },
        ...(prev[supplier.id] || []),
      ],
    }))
    await loadSuppliers(businessId)
    flash(`${amt.toLocaleString('fr-FR')} CFA payé.`)
  }

  async function openReassort(supplier: Supplier) {
    setReassortSupplier(supplier)
    setReassortForm({ product_id: '', product_name: '', quantity: '', expected_date: '' })
    if (businessId && reassortProducts.length === 0) {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('business_id', businessId)
        .not('archived', 'is', true)
        .order('name')
        .limit(200)
      setReassortProducts((data || []) as Product[])
    }
  }

  async function submitReassort(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !reassortSupplier) return
    const productName = reassortProducts.find((p) => p.id === reassortForm.product_id)?.name || reassortForm.product_name
    if (!productName) { flash('Sélectionnez ou saisissez un produit.'); return }
    if (!reassortForm.quantity || Number(reassortForm.quantity) <= 0) { flash('Quantité invalide.'); return }
    setSubmittingReassort(true)
    const { error } = await supabase.from('restock_orders').insert({
      business_id: businessId,
      supplier_id: reassortSupplier.id,
      supplier_name: reassortSupplier.name,
      product_id: reassortForm.product_id || null,
      product_name: productName,
      quantity: Number(reassortForm.quantity),
      expected_date: reassortForm.expected_date || null,
      status: 'pending',
    })
    setSubmittingReassort(false)
    if (error) { flash(error.message); return }
    setReassortSupplier(null)
    flash(`Commande créée : ${productName} × ${reassortForm.quantity} chez ${reassortSupplier.name}.`)
  }

  function sendWhatsApp(supplier: Supplier) {
    if (!supplier.phone) { flash('Aucun numéro de téléphone pour ce fournisseur.'); return }
    const remaining = Number(supplier.remaining_balance ?? supplier.balance ?? 0)
    const phone = supplier.phone.replace(/\D/g, '')
    const text = encodeURIComponent(
      `Bonjour ${supplier.name}, nous vous rappelons qu'il vous reste ${remaining.toLocaleString('fr-FR')} CFA à recevoir de notre part. Merci.`
    )
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  return (
    <AppShell title="Fournisseurs" subtitle={`${suppliers.length} fournisseur${suppliers.length !== 1 ? 's' : ''}`}
      action={
        <button onClick={() => businessId && loadSuppliers(businessId)}
          className="rounded-2xl border border-[var(--cp-border-strong)] px-4 py-2.5 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition">
          Actualiser
        </button>
      }>
      <div className="mx-auto max-w-7xl space-y-6">
        {toast && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Fournisseurs',
              value: String(suppliers.length),
              sub: `${withDebt.length} avec solde dû`,
              icon: Building2,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-900/30',
              border: 'border-[var(--cp-border-strong)]',
            },
            {
              label: 'Reste à payer',
              value: `${totalRemaining.toLocaleString('fr-FR')} CFA`,
              sub: `${withDebt.length} fournisseur${withDebt.length !== 1 ? 's' : ''}`,
              icon: HandCoins,
              color: 'text-red-600 dark:text-red-400',
              bg: 'bg-red-50 dark:bg-red-900/30',
              border: totalRemaining > 0 ? 'border-red-300/50 dark:border-red-800/50' : 'border-[var(--cp-border-strong)]',
            },
            {
              label: 'Total payé',
              value: `${totalPaid.toLocaleString('fr-FR')} CFA`,
              sub: 'tous fournisseurs',
              icon: Wallet,
              color: 'text-blue-600 dark:text-blue-400',
              bg: 'bg-blue-50 dark:bg-blue-900/30',
              border: 'border-[var(--cp-border-strong)]',
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`rounded-[2rem] border bg-[var(--cp-surface)] p-5 shadow-sm ${stat.border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black text-[var(--cp-text)]">{stat.value}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--cp-text-muted)]">{stat.sub}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${stat.bg}`}><Icon size={20} className={stat.color} /></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Add form */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6 shadow-sm">
            <h3 className="mb-5 text-base font-black text-[var(--cp-text)]">Ajouter un fournisseur</h3>
            <form onSubmit={addSupplier} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Nom *</label>
                <input required value={form.name} onChange={(e) => setF('name', e.target.value)}
                  placeholder="Ex: Grossiste Sandaga" className={inputCls} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Téléphone</label>
                  <input value={form.phone} onChange={(e) => setF('phone', e.target.value)}
                    placeholder="77 000 00 00" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)}
                    placeholder="contact@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Adresse</label>
                <input value={form.address} onChange={(e) => setF('address', e.target.value)}
                  placeholder="Marché, quartier..." className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Solde initial dû (CFA)</label>
                <input type="number" min="0" value={form.balance} onChange={(e) => setF('balance', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Note</label>
                <input value={form.note} onChange={(e) => setF('note', e.target.value)}
                  placeholder="Livraison, conditions paiement..." className={inputCls} />
              </div>
              <button type="submit" disabled={addingSupplier}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
                {addingSupplier ? <><Loader2 size={18} className="animate-spin" /> Ajout...</> : <><Plus size={18} /> Ajouter</>}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-black text-[var(--cp-text)]">
                {filtered.length} fournisseur{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-[var(--cp-text-muted)]" size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] py-3 pl-11 pr-4 text-sm font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)] sm:w-64" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-14 text-center">
                <Building2 className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                <h3 className="text-xl font-black text-[var(--cp-text)]">Aucun fournisseur</h3>
                <p className="mt-2 text-sm font-semibold text-[var(--cp-text-muted)]">
                  {search ? `Aucun résultat pour "${search}"` : 'Ajoutez votre premier fournisseur.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((supplier) => {
                  const remaining = Number(supplier.remaining_balance ?? supplier.balance ?? 0)
                  const paid = Number(supplier.total_paid || 0)
                  const owed = Number(supplier.total_owed ?? supplier.balance ?? 0)
                  const pct = owed > 0 ? Math.round((paid / owed) * 100) : remaining === 0 ? 100 : 0
                  const isExpanded = expandedId === supplier.id
                  const isSaving = savingId === supplier.id

                  return (
                    <div key={supplier.id} className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-5 shadow-sm">
                      {/* Header row */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-[var(--cp-text)] truncate">{supplier.name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[var(--cp-text-muted)]">
                            {supplier.phone && <span className="flex items-center gap-1"><Phone size={12} />{supplier.phone}</span>}
                            {supplier.email && <span className="flex items-center gap-1"><Mail size={12} />{supplier.email}</span>}
                            {supplier.address && <span className="flex items-center gap-1"><MapPin size={12} />{supplier.address}</span>}
                          </div>
                          {supplier.note && (
                            <p className="mt-1.5 text-xs font-semibold text-[var(--cp-text-muted)] italic">{supplier.note}</p>
                          )}

                          {/* Balances */}
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                            <div className="rounded-2xl bg-[var(--cp-surface-2)] p-2.5">
                              <p className="text-[var(--cp-text-muted)]">Dû initial</p>
                              <p className="mt-1 font-black text-[var(--cp-text)]">{owed.toLocaleString('fr-FR')} CFA</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-900/30">
                              <p className="text-emerald-600 dark:text-emerald-400">Payé</p>
                              <p className="mt-1 font-black text-emerald-700 dark:text-emerald-300">{paid.toLocaleString('fr-FR')} CFA</p>
                            </div>
                            <div className={`rounded-2xl p-2.5 ${remaining > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                              <p className={remaining > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>Restant</p>
                              <p className={`mt-1 font-black ${remaining > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                {remaining.toLocaleString('fr-FR')} CFA
                              </p>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {owed > 0 && (
                            <div className="mt-3">
                              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--cp-text-muted)]">
                                <span>Progression</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--cp-surface-2)]">
                                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openReassort(supplier)} title="Réassort"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition dark:hover:bg-blue-900/30 dark:hover:text-blue-400">
                            <ShoppingCart size={16} />
                          </button>
                          <button onClick={() => sendWhatsApp(supplier)} title="WhatsApp"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                            <MessageCircle size={16} />
                          </button>
                          <button onClick={() => deleteSupplier(supplier.id)} title="Supprimer"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition dark:hover:bg-red-900/30 dark:hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Pay actions */}
                      {remaining > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button onClick={() => payFull(supplier)} disabled={isSaving}
                            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm shadow-emerald-600/20">
                            {isSaving ? 'En cours...' : `Tout payer (${remaining.toLocaleString('fr-FR')} CFA)`}
                          </button>
                          <div className="flex gap-2">
                            <input type="number" min="0" placeholder="Montant partiel..."
                              value={partialAmount[supplier.id] || ''}
                              onChange={(e) => setPartialAmount((prev) => ({ ...prev, [supplier.id]: e.target.value }))}
                              className="w-40 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm font-black text-[var(--cp-text)] outline-none focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]" />
                            <button onClick={() => payPartial(supplier)}
                              disabled={isSaving || !partialAmount[supplier.id]}
                              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50">
                              Payer
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Payment history toggle */}
                      <button onClick={() => toggleExpand(supplier.id)}
                        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[var(--cp-border-strong)] px-4 py-3 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition">
                        <span>Historique des paiements</span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {(payments[supplier.id] || []).length === 0 ? (
                            <p className="rounded-2xl bg-[var(--cp-surface-2)] p-4 text-sm font-semibold text-[var(--cp-text-muted)]">
                              Aucun paiement enregistré.
                            </p>
                          ) : (
                            (payments[supplier.id] || []).map((p) => (
                              <div key={p.id} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
                                <div>
                                  <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                                    {Number(p.amount).toLocaleString('fr-FR')} CFA
                                  </p>
                                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                                    {new Date(p.paid_at).toLocaleDateString('fr-FR')}
                                    {' · '}
                                    {p.payment_type === 'full' ? 'Paiement total' : 'Paiement partiel'}
                                  </p>
                                </div>
                                {p.payment_method && (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    {p.payment_method}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock order modal */}
      {reassortSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-8 shadow-2xl">
            <button onClick={() => setReassortSupplier(null)}
              className="absolute right-4 top-4 rounded-full bg-[var(--cp-surface-2)] p-1.5 text-[var(--cp-text-subtle)]">
              <X size={16} />
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Package size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--cp-text)]">Commande de réassort</h2>
                <p className="text-sm font-semibold text-[var(--cp-text-muted)]">{reassortSupplier.name}</p>
              </div>
            </div>
            <form onSubmit={submitReassort} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Produit</label>
                {reassortProducts.length > 0 ? (
                  <select value={reassortForm.product_id}
                    onChange={(e) => {
                      const p = reassortProducts.find((x) => x.id === e.target.value)
                      setReassortForm((f) => ({ ...f, product_id: e.target.value, product_name: p?.name || '' }))
                    }}
                    className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none focus:border-[var(--cp-accent)]">
                    <option value="">— Sélectionner un produit —</option>
                    {reassortProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <input placeholder="Nom du produit" value={reassortForm.product_name}
                    onChange={(e) => setReassortForm((f) => ({ ...f, product_name: e.target.value }))}
                    className={inputCls} />
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Quantité *</label>
                <input type="number" min="1" required placeholder="Ex: 50" value={reassortForm.quantity}
                  onChange={(e) => setReassortForm((f) => ({ ...f, quantity: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-[var(--cp-text-subtle)]">
                  <CalendarDays size={14} /> Date de livraison prévue
                </label>
                <input type="date" value={reassortForm.expected_date}
                  onChange={(e) => setReassortForm((f) => ({ ...f, expected_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReassortSupplier(null)}
                  className="flex-1 rounded-2xl border border-[var(--cp-border-strong)] py-4 font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition">
                  Annuler
                </button>
                <button type="submit" disabled={submittingReassort}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white hover:bg-blue-700 disabled:opacity-60 transition">
                  {submittingReassort ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : 'Commander'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
