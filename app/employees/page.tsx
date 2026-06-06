'use client'

import AppShell from '@/components/AppShell'
import { SkeletonRow } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import { Check, Copy, Loader2, Plus, ShieldCheck, Trash2, User, UserCog, Users, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Employee = {
  id: string
  full_name: string
  email: string | null
  role: string
  is_active: boolean | null
  temp_password: string | null
  created_at: string
}

const ROLES = [
  { value: 'manager', label: 'Manager', desc: 'Tout sauf Zone de sécurité', icon: ShieldCheck, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'cashier', label: 'Caissier', desc: 'Vendre, Produits (lecture), Caisse, Dépenses', icon: User, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300' },
]

const ROLE_LABELS: Record<string, string> = { owner: 'Propriétaire', manager: 'Manager', admin: 'Admin', cashier: 'Caissier', sales: 'Vendeur', staff: 'Employé', employee: 'Employé' }
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  manager: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cashier: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

function generateTempPassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function EmployeesPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', role: 'cashier' })

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }
  function setF(field: string, val: string) { setForm((f) => ({ ...f, [field]: val })) }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const { data: m } = await supabase.from('business_members').select('business_id, role').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (!m || m.role !== 'owner') { router.replace('/dashboard'); return }
      setBusinessId(m.business_id)
      await load(m.business_id)
      setLoading(false)
    }
    init()
  }, [router])

  async function load(id: string) {
    const { data } = await supabase.from('business_members').select('*').eq('business_id', id).neq('role', 'owner').order('created_at', { ascending: false })
    setEmployees((data || []) as Employee[])
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !form.full_name.trim()) return
    setSaving(true)

    const tempPwd = generateTempPassword()

    const { error } = await supabase.from('business_members').insert({
      business_id: businessId,
      full_name: form.full_name.trim(),
      email: form.email || null,
      role: form.role,
      is_active: true,
      must_change_password: true,
      temp_password: tempPwd,
      user_id: null,
    })

    setSaving(false)
    if (error) { flash(error.message); return }
    setForm({ full_name: '', email: '', role: 'cashier' })
    setShowForm(false)
    await load(businessId)
    flash('Employé ajouté. Partagez le code temporaire.')
    window.dispatchEvent(new Event('play-success'))
  }

  async function toggleActive(emp: Employee) {
    const { error } = await supabase.from('business_members').update({ is_active: !emp.is_active }).eq('id', emp.id)
    if (error) { flash(error.message); return }
    setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, is_active: !emp.is_active } : e))
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Supprimer cet employé ? L\'accès sera révoqué immédiatement.')) return
    await supabase.from('business_members').delete().eq('id', id)
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  function copyTempPwd(emp: Employee) {
    const text = `CaissePro — Accès employé\nNom : ${emp.full_name}\nCode temporaire : ${emp.temp_password}\nConnectez-vous sur : https://rebuild-caisse-pro.vercel.app/employee-setup`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(emp.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const action = (
    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition">
      <Plus size={18} /> Ajouter
    </button>
  )

  return (
    <AppShell title="Employés" subtitle="Gérez les accès de votre équipe." action={action}>
      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-800">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300"><X size={16} /></button>
            <h2 className="mb-6 text-xl font-black text-slate-950 dark:text-white">Nouvel employé</h2>
            <form onSubmit={addEmployee} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Nom complet *</label>
                <input required value={form.full_name} onChange={(e) => setF('full_name', e.target.value)} placeholder="Fatou Diallo"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-700 dark:text-slate-300">Email (optionnel)</label>
                <input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} placeholder="fatou@gmail.com"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 font-semibold outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-300">Rôle</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    return (
                      <button key={r.value} type="button" onClick={() => setF('role', r.value)}
                        className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${form.role === r.value ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={form.role === r.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                          <span className="text-sm font-black text-slate-950 dark:text-white">{r.label}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{r.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {saving ? 'Ajout...' : 'Ajouter l\'employé'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-5">
        {toast && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">{toast}</div>}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Employés actifs</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{employees.filter((e) => e.is_active).length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-900/30"><Users size={20} className="text-emerald-600 dark:text-emerald-400" /></div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Managers</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{employees.filter((e) => e.role === 'manager' || e.role === 'admin').length}</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-2.5 dark:bg-violet-900/30"><UserCog size={20} className="text-violet-600 dark:text-violet-400" /></div>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : employees.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
            <Users className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Aucun employé</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Ajoutez votre première équipe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-base font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {emp.full_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-950 dark:text-white">{emp.full_name}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${ROLE_COLORS[emp.role] || ROLE_COLORS.cashier}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                        {!emp.is_active && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-600 dark:bg-red-900/30 dark:text-red-400">Inactif</span>}
                      </div>
                      {emp.email && <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{emp.email}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-15 sm:pl-0">
                    {emp.temp_password && (
                      <button onClick={() => copyTempPwd(emp)}
                        className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-black transition ${copiedId === emp.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                        {copiedId === emp.id ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Code: {emp.temp_password}</>}
                      </button>
                    )}
                    <button onClick={() => toggleActive(emp)}
                      className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${emp.is_active ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                      {emp.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                    <button onClick={() => deleteEmployee(emp.id)} className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition dark:hover:bg-red-900/20">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Role guide */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">Guide des rôles</h3>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {[
              { role: 'Propriétaire', desc: 'Accès complet à tout', color: 'text-emerald-600' },
              { role: 'Manager', desc: 'Tout sauf Zone de sécurité', color: 'text-violet-600' },
              { role: 'Caissier', desc: 'Vendre, Produits (vue), Caisse, Dépenses', color: 'text-slate-600' },
            ].map((r) => (
              <div key={r.role}>
                <p className={`font-black ${r.color}`}>{r.role}</p>
                <p className="mt-0.5 font-semibold text-slate-500 dark:text-slate-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
