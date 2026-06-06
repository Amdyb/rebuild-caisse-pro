'use client'

import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, ImageIcon, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const CATEGORIES = ['Alimentaire', 'Boissons', 'Beauté', 'Électronique', 'Mode', 'Maison', 'Santé', 'Services', 'Autre']

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
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
    supabase.from('products').select('*').eq('id', id).single().then(({ data, error: e }) => {
      if (e || !data) { router.push('/products'); return }
      setForm({
        name: data.name || '', category: data.category || '', barcode: data.barcode || '',
        sell_price: data.sell_price != null ? String(data.sell_price) : '',
        cost_price: data.cost_price != null ? String(data.cost_price) : '',
        minimum_price: data.minimum_price != null ? String(data.minimum_price) : '',
        stock: data.stock != null ? String(data.stock) : '', description: data.description || '',
      })
      if (data.image) setImagePreview(data.image)
      setLoading(false)
    })
  }, [id, router])

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
    if (error) return null
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return }
    setSaving(true)
    setError('')

    const { data: prod } = await supabase.from('products').select('business_id, image').eq('id', id).single()
    const imageUrl = imageFile ? await uploadImage(prod?.business_id || '') : imagePreview

    const { error: updateError } = await supabase.from('products').update({
      name: form.name.trim(),
      category: form.category || null,
      barcode: form.barcode || null,
      sell_price: form.sell_price ? Number(form.sell_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      minimum_price: form.minimum_price ? Number(form.minimum_price) : null,
      stock: form.stock !== '' ? Number(form.stock) : null,
      description: form.description || null,
      image: imageUrl,
    }).eq('id', id)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    window.dispatchEvent(new Event('play-success'))
    router.push('/products')
  }

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400'

  if (loading) return (
    <AppShell title="Modifier produit">
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    </AppShell>
  )

  return (
    <AppShell title="Modifier le produit"
      action={<Link href="/products" className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><ArrowLeft size={16} /> Retour</Link>}>
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}
        <form onSubmit={save} className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">Photo</h3>
            <div onClick={() => fileRef.current?.click()}
              className="flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition dark:border-slate-600 dark:bg-slate-700">
              {imagePreview ? <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                : <><ImageIcon size={36} className="text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-400">Changer la photo</p></>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {imagePreview && <button type="button" onClick={() => { setImagePreview(null); setImageFile(null) }} className="mt-2 text-xs font-bold text-red-500 hover:text-red-700">Supprimer</button>}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">Informations</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Nom *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
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
                  <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">Prix (CFA)</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[['sell_price', 'Prix de vente'], ['cost_price', "Prix d'achat"], ['minimum_price', 'Prix minimum']].map(([field, label]) => (
                <div key={field}>
                  <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">{label}</label>
                  <input type="number" min="0" value={form[field as keyof typeof form]} onChange={(e) => set(field, e.target.value)} placeholder="0" className={inputCls} />
                </div>
              ))}
            </div>
            {form.sell_price && form.cost_price && (
              <p className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Marge : {(Number(form.sell_price) - Number(form.cost_price)).toLocaleString('fr-FR')} CFA
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">Stock</h3>
            <input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="Laisser vide si illimité" className={inputCls} />
          </div>

          <button type="submit" disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</> : <><Save size={18} /> Enregistrer les modifications</>}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
