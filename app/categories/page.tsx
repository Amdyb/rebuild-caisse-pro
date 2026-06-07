'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { Edit2, FolderTree, Loader2, Plus, Save, Search, Tag, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Category = { id: string; business_id: string; name: string; created_at: string }
type Product = { id: string; category: string | null }

export default function CategoriesPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState({ msg: '', type: 'ok' })
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')

  function flash(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 5000)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return !q ? categories : categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const categorised = products.filter((p) => p.category).length
  const uncategorised = products.length - categorised

  function productCount(catName: string) {
    return products.filter((p) => p.category === catName).length
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const stored = localStorage.getItem('caissepro_selected_business_id')
      if (stored) {
        setBusinessId(stored)
        await Promise.all([loadCategories(stored), loadProducts(stored)])
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
      await Promise.all([loadCategories(m.business_id), loadProducts(m.business_id)])
      setLoading(false)
    }
    init()
  }, [router])

  async function loadCategories(id: string) {
    const { data } = await supabase.from('product_categories').select('*').eq('business_id', id).order('name')
    setCategories((data || []) as Category[])
  }

  async function loadProducts(id: string) {
    const { data } = await supabase.from('products').select('id, category').eq('business_id', id)
    setProducts((data || []) as Product[])
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    const cleanName = name.trim()
    if (!cleanName) { flash('Entrez un nom de catégorie.', 'err'); return }
    if (categories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      flash('Cette catégorie existe déjà.', 'err'); return
    }
    setSaving(true)
    const { error } = await supabase.from('product_categories').insert({ business_id: businessId, name: cleanName })
    setSaving(false)
    if (error) { flash(error.message, 'err'); return }
    setName('')
    await loadCategories(businessId)
    flash('Catégorie ajoutée.')
    window.dispatchEvent(new Event('play-success'))
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditingName(cat.name)
  }

  async function saveEdit(cat: Category) {
    if (!businessId) return
    const newName = editingName.trim()
    if (!newName) { flash('Le nom ne peut pas être vide.', 'err'); return }
    if (
      newName.toLowerCase() !== cat.name.toLowerCase() &&
      categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === newName.toLowerCase())
    ) {
      flash('Une catégorie avec ce nom existe déjà.', 'err'); return
    }
    setSaving(true)
    const { error: catErr } = await supabase
      .from('product_categories').update({ name: newName }).eq('id', cat.id)
    if (catErr) { setSaving(false); flash(catErr.message, 'err'); return }
    await supabase.from('products').update({ category: newName }).eq('business_id', businessId).eq('category', cat.name)
    setSaving(false)
    setEditingId('')
    setEditingName('')
    await Promise.all([loadCategories(businessId), loadProducts(businessId)])
    flash('Catégorie renommée. Produits mis à jour.')
  }

  async function deleteCategory(cat: Category) {
    if (!businessId) return
    const count = productCount(cat.name)
    if (count > 0) {
      flash(`Impossible : ${count} produit${count > 1 ? 's' : ''} utilisent cette catégorie.`, 'err'); return
    }
    if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return
    const { error } = await supabase.from('product_categories').delete().eq('id', cat.id)
    if (error) { flash(error.message, 'err'); return }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    flash('Catégorie supprimée.')
  }

  const inputCls = 'w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]'

  return (
    <AppShell title="Catégories" subtitle={`${categories.length} catégorie${categories.length !== 1 ? 's' : ''}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        {toast.msg && (
          <div className={`rounded-2xl border p-4 text-sm font-bold ${
            toast.type === 'err'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400'
          }`}>{toast.msg}</div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Catégories', value: String(categories.length), icon: FolderTree, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Produits catégorisés', value: String(categorised), icon: Tag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Sans catégorie', value: String(uncategorised), icon: Tag, color: uncategorised > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400', bg: uncategorised > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">{s.label}</p>
                    <p className="mt-2 text-3xl font-black text-[var(--cp-text)]">{s.value}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${s.bg}`}><Icon size={20} className={s.color} /></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Add form */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6 shadow-sm">
            <h3 className="mb-5 text-base font-black text-[var(--cp-text)]">Nouvelle catégorie</h3>
            <form onSubmit={addCategory} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Nom *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Boissons, Accessoires..."
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
                {saving ? <><Loader2 size={18} className="animate-spin" /> Ajout...</> : <><Plus size={18} /> Ajouter</>}
              </button>
            </form>

            {categories.length > 0 && (
              <div className="mt-6 rounded-2xl bg-[var(--cp-surface-2)] p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--cp-text-muted)]">Rappel</p>
                <p className="text-xs font-semibold text-[var(--cp-text-muted)] leading-relaxed">
                  Renommer une catégorie met à jour automatiquement tous les produits liés.
                  Supprimer n'est possible que si aucun produit ne l'utilise.
                </p>
              </div>
            )}
          </div>

          {/* List */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-black text-[var(--cp-text)]">
                {filtered.length} catégorie{filtered.length !== 1 ? 's' : ''}
              </h3>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-[var(--cp-text-muted)]" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] py-3 pl-11 pr-4 text-sm font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)] sm:w-56"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] p-14 text-center">
                <FolderTree className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                <h3 className="text-xl font-black text-[var(--cp-text)]">Aucune catégorie</h3>
                <p className="mt-2 text-sm font-semibold text-[var(--cp-text-muted)]">
                  {search ? `Aucun résultat pour "${search}"` : 'Ajoutez votre première catégorie.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((cat) => {
                  const count = productCount(cat.name)
                  const isEditing = editingId === cat.id
                  return (
                    <div key={cat.id}
                      className="flex items-center gap-4 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 transition hover:border-[var(--cp-accent)]/40">
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
                        <FolderTree size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>

                      {/* Name / edit input */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') { setEditingId(''); setEditingName('') } }}
                            className="w-full rounded-xl border border-[var(--cp-accent)] bg-[var(--cp-surface)] px-3 py-1.5 text-sm font-black text-[var(--cp-text)] outline-none"
                          />
                        ) : (
                          <p className="font-black text-[var(--cp-text)] truncate">{cat.name}</p>
                        )}
                        <p className="text-xs font-semibold text-[var(--cp-text-muted)]">
                          {count} produit{count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(cat)}
                              disabled={saving}
                              title="Enregistrer"
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            </button>
                            <button
                              onClick={() => { setEditingId(''); setEditingName('') }}
                              title="Annuler"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface)] transition">
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(cat)}
                            title="Renommer"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface)] hover:text-[var(--cp-accent)] transition">
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteCategory(cat)}
                          title={count > 0 ? `${count} produit(s) — suppression bloquée` : 'Supprimer'}
                          disabled={isEditing}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                            count > 0
                              ? 'cursor-not-allowed border-[var(--cp-border-strong)] text-[var(--cp-text-muted)] opacity-40'
                              : 'border-[var(--cp-border-strong)] text-[var(--cp-text-subtle)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                          }`}>
                          <Trash2 size={15} />
                        </button>
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
