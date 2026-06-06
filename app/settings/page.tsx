'use client'

import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { Building2, Check, Globe, Loader2, Phone, Save, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Commerce & Boutique' },
  { value: 'restaurant', label: 'Restaurant & Fast Food' },
  { value: 'beauty', label: 'Salon & Beauté' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'garage', label: 'Garage & Auto' },
  { value: 'btp', label: 'BTP & Services' },
  { value: 'tontine', label: 'Tontine & Épargne' },
  { value: 'rental', label: 'Location & Immobilier' },
  { value: 'wholesale', label: 'Grossiste' },
  { value: 'laundry', label: 'Laverie & Pressing' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const logoRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp_number: '', address: '',
    business_type: 'retail', slogan: '', website: '', currency: 'CFA',
  })

  function setF(field: string, val: string) { setForm((f) => ({ ...f, [field]: val })) }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const { data: m } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (!m) { setLoading(false); return }
      setBusinessId(m.business_id)
      const { data: biz } = await supabase.from('businesses').select('*').eq('id', m.business_id).single()
      if (biz) {
        setForm({
          name: biz.name || '', phone: biz.phone || biz.business_phone || '',
          whatsapp_number: biz.whatsapp_number || '', address: biz.address || '',
          business_type: biz.business_type || 'retail', slogan: biz.slogan || '',
          website: biz.website || '', currency: biz.currency || 'CFA',
        })
        if (biz.logo_url) setLogoPreview(biz.logo_url)
      }
      setLoading(false)
    }
    init()
  }, [router])

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setSaving(true)

    let logoUrl = logoPreview
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${businessId}/logo.${ext}`
      const { error } = await supabase.storage.from('business-assets').upload(path, logoFile, { upsert: true })
      if (!error) logoUrl = supabase.storage.from('business-assets').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('businesses').update({
      name: form.name, phone: form.phone, whatsapp_number: form.whatsapp_number || null,
      address: form.address || null, business_type: form.business_type,
      slogan: form.slogan || null, website: form.website || null,
      currency: form.currency, logo_url: logoUrl,
    }).eq('id', businessId)

    setSaving(false)
    if (error) { alert(error.message); return }

    window.dispatchEvent(new CustomEvent('business-type-changed', { detail: { businessType: form.business_type } }))
    window.dispatchEvent(new Event('play-success'))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400'

  if (loading) return (
    <AppShell title="Paramètres">
      <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>
    </AppShell>
  )

  return (
    <AppShell title="Paramètres" subtitle="Configurez votre commerce.">
      <div className="mx-auto max-w-2xl">
        {saved && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-900/20">
            <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
            <p className="font-black text-emerald-700 dark:text-emerald-300">Paramètres enregistrés.</p>
          </div>
        )}

        <form onSubmit={save} className="space-y-5">
          {/* Logo */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">Logo du commerce</h3>
            <div className="flex items-center gap-4">
              <div onClick={() => logoRef.current?.click()}
                className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-400 transition dark:border-slate-600 dark:bg-slate-700">
                {logoPreview ? <img src={logoPreview} alt="logo" className="h-full w-full object-contain p-1" /> : <Store size={24} className="text-slate-300" />}
              </div>
              <div>
                <button type="button" onClick={() => logoRef.current?.click()} className="text-sm font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">Changer le logo</button>
                {logoPreview && <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null) }} className="ml-3 text-sm font-bold text-red-400 hover:text-red-600">Supprimer</button>}
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>

          {/* Business info */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Informations</h3>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Nom du commerce *</label>
              <input required value={form.name} onChange={(e) => setF('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Type de commerce</label>
              <select value={form.business_type} onChange={(e) => setF('business_type', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Slogan</label>
              <input value={form.slogan} onChange={(e) => setF('slogan', e.target.value)} placeholder="Ex: La qualité à votre service" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Adresse</label>
              <input value={form.address} onChange={(e) => setF('address', e.target.value)} placeholder="Ex: Dakar, Sénégal" className={inputCls} />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Téléphone</label>
                <input value={form.phone} onChange={(e) => setF('phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">WhatsApp</label>
                <input value={form.whatsapp_number} onChange={(e) => setF('whatsapp_number', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Site web</label>
              <input value={form.website} onChange={(e) => setF('website', e.target.value)} placeholder="https://moncommerce.sn" className={inputCls} />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</> : <><Save size={18} /> Enregistrer</>}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
