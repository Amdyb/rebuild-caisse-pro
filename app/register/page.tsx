'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { generateUniqueSlug } from '@/lib/generateUniqueSlug'
import { Loader2, Users } from 'lucide-react'

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

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('retail')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [agentCode, setAgentCode] = useState<string | null>(null)

  useEffect(() => {
    const urlAgent = searchParams.get('agent')
    if (urlAgent) {
      localStorage.setItem('caissepro_agent_code', urlAgent)
      setAgentCode(urlAgent)
    } else {
      const stored = localStorage.getItem('caissepro_agent_code')
      if (stored) setAgentCode(stored)
    }

    async function checkExistingMerchant() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { setChecking(false); return }

      const { data: memberships } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        router.replace('/dashboard')
        return
      }
      setChecking(false)
    }

    checkExistingMerchant()
  }, [router, searchParams])

  async function createBusinessAndMembership(userId: string): Promise<string | null> {
    const { data: existingMembership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (existingMembership) return null

    const safeSlug = await generateUniqueSlug(businessName)

    const { data: businessRows, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        slug: safeSlug,
        currency: 'CFA',
        business_type: businessType,
        business_phone: phone || null,
        phone: phone || null,
        onboarding_completed: false,
      })
      .select('id')
      .limit(1)

    const business = businessRows?.[0]
    if (businessError || !business) throw new Error(businessError?.message || 'Impossible de créer le commerce.')

    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: userId,
        full_name: fullName,
        email,
        role: 'owner',
        is_active: true,
        must_change_password: false,
      })

    if (memberError) throw new Error(memberError.message)

    return business.id
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }

    setLoading(true)

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, business_name: businessName } },
      })

      if (signUpError) throw new Error(signUpError.message)

      let user = signUpData.user

      if (!signUpData.session) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw new Error(loginError.message)
        user = loginData.user
      }

      if (!user) throw new Error('Compte créé mais connexion impossible.')

      const newBusinessId = await createBusinessAndMembership(user.id)

      // Track referral
      const ref = searchParams.get('ref')
      if (ref && newBusinessId) {
        const { data: referrer } = await supabase.from('businesses').select('id').eq('slug', ref).maybeSingle()
        if (referrer) {
          await supabase.from('referrals').insert({
            referrer_business_id: referrer.id,
            referred_business_id: newBusinessId,
            status: 'pending',
          })
        }
      }

      // Track agent lead
      const storedAgentCode = localStorage.getItem('caissepro_agent_code')
      if (storedAgentCode && newBusinessId) {
        const { data: agentRow } = await supabase
          .from('agents')
          .select('id')
          .eq('invite_code', storedAgentCode)
          .eq('status', 'active')
          .maybeSingle()
        if (agentRow) {
          await supabase.from('agent_leads').insert({
            agent_id: agentRow.id,
            business_id: newBusinessId,
            business_name: businessName,
            email,
            country: 'Sénégal',
            status: 'registered',
          })
          localStorage.removeItem('caissepro_agent_code')
        }
      }

      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Erreur pendant la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-12">
      <div className="pointer-events-none absolute right-1/4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-48 w-48 rounded-full bg-slate-700/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/caissepro-logo.png"
              alt="CaissePro"
              width={140}
              height={48}
              className="mx-auto mb-5 h-10 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <h1 className="text-3xl font-black text-white">Créer votre boutique</h1>
          <p className="mt-2 font-semibold text-white/50">Lancez votre commerce en 2 minutes.</p>
        </div>

        <div className="glass rounded-[2rem] p-8 shadow-2xl glow-emerald">
          {agentCode && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <Users size={18} className="shrink-0 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-300">Vous avez été invité par un agent CaissePro</p>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>
          )}
          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{message}</div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={googleLoading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
          </button>

          <div className="relative mb-5 flex items-center gap-3">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs font-black text-white/30">OU</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-black text-white/70">Votre nom complet</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amadou Diallo"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Nom du commerce</label>
              <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Mon Commerce"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Type de commerce</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/20 bg-slate-800 px-4 py-3.5 font-semibold text-white outline-none transition-all focus:border-emerald-400/60">
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Téléphone (optionnel)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caractères"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>
            <div>
              <label className="text-sm font-black text-white/70">Confirmer le mot de passe</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-emerald-500 py-4 font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Création en cours...
                </span>
              ) : 'Créer mon commerce'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-white/50">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-black text-emerald-400 transition-colors hover:text-emerald-300">Se connecter</Link>
          </p>
          <p className="mt-3 text-center text-xs text-white/30">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/legal" className="font-bold text-white/50 underline hover:text-white/70">mentions légales</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </main>
    }>
      <RegisterForm />
    </Suspense>
  )
}
