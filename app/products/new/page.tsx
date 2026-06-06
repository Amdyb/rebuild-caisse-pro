'use client'

import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, ImageIcon, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const CATEGORIES = ['Alimentaire', 'Boissons', 'Beauté', 'Électronique', 'Mode', 'Maison', 'Santé', 'Services', 'Autre']

export default function NewProductPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', category: '', barcode: '',
    sell_price: '', cost_price: '', minimum_price: '',
    stock: '', description: '',
  })

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      supabase.from('business_members').select('business_id').eq('user_id', data.user.id).limit(1).maybeSingle()
        .then(({ data: m }) => { if (m?.business_id) setBusinessId(m.business_id) })
    })
  }, [router])

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(bId: string): Promise<string | null> {
    if (!imageFile) return null
    const ext = imageFile.name.split('.').pop()
    const path = `${bId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: true })
    if (error) { console.error('Image upload:', error.message); return null }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return }
    setSaving(true)
    setError('')

    const imageUrl = await uploadImage(businessId)

    const { error: insertError } = await supabase.from('products').insert({
      business_id: businessId,
      name: form.name.trim(),
      category: form.category || null,
      barcode: form.barcode || null,
      sell_price: form.sell_price ? Number(form.sell_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      minimum_price: form.minimum_price ? Number(form.minimum_price) : null,
      stock: form.stock !== '' ? Number(form.stock) : null,
      description: form.description || null,
      image: imageUrl,
      is_active: true,
      archived: false,
    })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    window.dispatchEvent(new Event('play-success'))
    router.push('/products')
  }

  const inputCls = 'w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]'

  return (
    <AppShell title="Nouveau produit" subtitle="Ajoutez un produit à votre catalogue."
      action={<Link href="/products" className="flex items-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] px-4 py-2.5 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)]"><ArrowLeft size={16} /> Retour</Link>}>
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}
        <form onSubmit={save} className="space-y-5">
          {/* Image */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Photo du produit</h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] transition hover:border-[var(--cp-accent)] hover:bg-[var(--cp-accent-dim)]"
            >
              {imagePreview
                ? <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                : <>
                  <ImageIcon size={36} className="text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm font-bold text-slate-400">Cliquer pour ajouter une photo</p>
                </>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {imagePreview && (
              <button type="button" onClick={() => { setImagePreview(null); setImageFile(null) }}
                className="mt-2 text-xs font-bold text-red-500 hover:text-red-700">Supprimer la photo</button>
            )}
          </div>

          {/* Info */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Informations</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Nom du produit *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Coca-Cola 50cl" className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Catégorie</label>
                  <select value={form.category} onChange={(e) => set('category', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <option value="">-- Choisir --</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Code-barres</label>
                  <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Ex: 3760020503014" className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Prix (CFA)</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Prix de vente</label>
                <input type="number" min="0" value={form.sell_price} onChange={(e) => set('sell_price', e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Prix d'achat</label>
                <input type="number" min="0" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Prix minimum</label>
                <input type="number" min="0" value={form.minimum_price} onChange={(e) => set('minimum_price', e.target.value)} placeholder="0" className={inputCls} />
              </div>
            </div>
            {form.sell_price && form.cost_price && (
              <p className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Marge : {(Number(form.sell_price) - Number(form.cost_price)).toLocaleString('fr-FR')} CFA
                {' '}({Math.round(((Number(form.sell_price) - Number(form.cost_price)) / Number(form.sell_price)) * 100)}%)
              </p>
            )}
          </div>

          {/* Stock */}
          <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Stock</h3>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Quantité en stock</label>
              <input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="Laisser vide si illimité" className={inputCls} />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</> : <><Save size={18} /> Enregistrer le produit</>}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
