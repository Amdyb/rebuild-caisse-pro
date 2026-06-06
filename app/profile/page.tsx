'use client'

import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { Check, KeyRound, Loader2, LogOut, Save, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPwd, setSavedPwd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pwdError, setPwdError] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      setEmail(userData.user.email || '')
      const { data: m } = await supabase.from('business_members').select('id, full_name, business_id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (m) {
        setBusinessId(m.business_id)
        setMemberId(m.id)
        setFullName(m.full_name || '')
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId) return
    setSaving(true)
    await supabase.from('business_members').update({ full_name: fullName }).eq('id', memberId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    window.dispatchEvent(new Event('play-success'))
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdError('')
    if (newPassword !== confirmPassword) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    if (newPassword.length < 6) { setPwdError('Minimum 6 caractères.'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPwd(false)
    if (error) { setPwdError(error.message); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setSavedPwd(true)
    setTimeout(() => setSavedPwd(false), 3000)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const inputCls = 'w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-3.5 font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]'

  if (loading) return (
    <AppShell title="Profil">
      <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>
    </AppShell>
  )

  return (
    <AppShell title="Mon profil" subtitle="Gérez vos informations personnelles.">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4 rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-black text-white">
            {fullName ? fullName[0].toUpperCase() : email[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="font-black text-[var(--cp-accent)]">{fullName || 'Mon profil'}</h3>
            <p className="text-sm font-semibold text-[var(--cp-text-muted)]">{email}</p>
          </div>
        </div>

        {/* Profile form */}
        <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <User size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Informations</h3>
          </div>
          {saved && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Check size={16} /> Profil mis à jour.
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Nom complet</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Email</label>
              <input value={email} disabled className={inputCls + ' opacity-60 cursor-not-allowed'} />
            </div>
            <button type="submit" disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-black text-white hover:bg-emerald-700 disabled:opacity-60 transition">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>

        {/* Password change */}
        <div className="rounded-[2rem] border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-wide text-[var(--cp-accent)]">Mot de passe</h3>
          </div>
          {savedPwd && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Check size={16} /> Mot de passe mis à jour.
            </div>
          )}
          {pwdError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">{pwdError}</div>
          )}
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Nouveau mot de passe</label>
              <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-black text-[var(--cp-text-subtle)]">Confirmer</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
            </div>
            <button type="submit" disabled={savingPwd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3.5 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              {savingPwd ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {savingPwd ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-black text-white hover:bg-slate-800 transition dark:bg-slate-700 dark:hover:bg-slate-600">
          <LogOut size={18} /> Déconnexion
        </button>
      </div>
    </AppShell>
  )
}
