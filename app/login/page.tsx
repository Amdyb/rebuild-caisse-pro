'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getNextRoute } from '@/lib/getNextRoute'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (searchParams.get('error') === 'deactivated') {
      setMessage('Votre compte a été désactivé. Contactez votre administrateur.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(
        error.message.toLowerCase().includes('invalid login')
          ? 'Email ou mot de passe incorrect.'
          : error.message
      )
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: membership } = await supabase
        .from('business_members')
        .select('is_active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (membership?.is_active === false) {
        await supabase.auth.signOut()
        setMessage('Votre compte a été désactivé. Contactez votre administrateur.')
        setLoading(false)
        return
      }
    }

    const nextRoute = data.user
      ? await getNextRoute(data.user.id, data.user.email || '')
      : '/onboarding'
    router.push(nextRoute)
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    })
    if (error) {
      setMessage(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-12">
      {/* Background orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-1/2 h-48 w-48 rounded-full bg-slate-700/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-1.5 text-xs font-black text-emerald-300 backdrop-blur-sm">
            Espace commerçant
          </div>
          <h1 className="text-3xl font-black text-white">Connexion</h1>
          <p className="mt-2 font-semibold text-white/50">Accédez à votre espace CaissePro.</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-[2rem] p-8 shadow-2xl glow-emerald">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-black text-white/70">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-white/70">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs font-black text-white/50 transition-colors hover:text-white">
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 font-semibold text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-emerald-400/60 focus:bg-white/15"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-500 py-4 font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Connexion...
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm font-semibold text-white/50">
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-black text-emerald-400 transition-colors hover:text-emerald-300">
                Créer un compte
              </Link>
            </p>
            <p className="text-sm font-semibold text-white/40">
              Employé avec un code temporaire ?{' '}
              <Link href="/employee-setup" className="font-black text-emerald-400 transition-colors hover:text-emerald-300">
                Activer mon compte
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-white/30">
          <Link href="/help" className="transition-colors hover:text-white/60">Aide</Link>
          {' · '}
          <Link href="/legal" className="transition-colors hover:text-white/60">Mentions légales</Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
