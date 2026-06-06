'use client'

import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, Crown, Gift, Loader2, Rocket, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '5 000', amount: 5000, icon: Rocket,
    features: ['POS complet', 'Ventes illimitées', 'Reçus WhatsApp', '3 employés', 'Boutique en ligne', 'Rapports basiques'],
  },
  {
    id: 'business', name: 'Business', price: '15 000', amount: 15000, icon: ShieldCheck, popular: true,
    features: ['Tout Starter +', '10 employés', 'Rapports avancés', 'Fournisseurs', 'Client Doit', 'QR Code boutique', 'Parrainage'],
  },
  {
    id: 'premium', name: 'Premium', price: '35 000', amount: 35000, icon: Crown,
    features: ['Tout Business +', 'Employés illimités', 'Multi-boutiques', 'Support prioritaire', 'Personnalisation', 'Capital global'],
  },
]

const PLAN_LEVELS: Record<string, number> = { free: 0, starter: 1, business: 2, premium: 3 }

export default function UpgradePage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [currentPlan, setCurrentPlan] = useState('free')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [toast, setToast] = useState('')

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 5000) }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { setLoading(false); return }
      setUserEmail(userData.user.email || '')
      const { data: m } = await supabase.from('business_members')
        .select('business_id, businesses(id, name)').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (m) {
        const biz = (m as any).businesses
        setBusinessId(m.business_id)
        setBusinessName(biz?.name || '')
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('business_id', m.business_id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
        setCurrentPlan(sub?.plan || 'free')
      }
      setLoading(false)
    }
    init()
  }, [])

  async function handleUpgrade() {
    if (!selectedPlan || !businessId) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/paydunya/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan.id, amount: selectedPlan.amount, businessId, email: userEmail, businessName }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        flash(data.error || 'Erreur lors du paiement. Contactez le support.')
      }
    } catch {
      flash('Erreur de connexion. Vérifiez votre connexion internet.')
    }
    setCheckoutLoading(false)
  }

  const currentLevel = PLAN_LEVELS[currentPlan] ?? 0

  return (
    <AppShell title="Choisir un plan" subtitle="Débloquez toutes les fonctionnalités CaissePro.">
      {/* Checkout confirmation modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-800">
            <button onClick={() => setSelectedPlan(null)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300"><X size={16} /></button>
            <div className="mb-6 text-center">
              <div className="mb-3 flex h-16 w-16 mx-auto items-center justify-center rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/30">
                <selectedPlan.icon size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-[var(--cp-accent)]">Plan {selectedPlan.name}</h2>
              <p className="mt-1 text-3xl font-black text-emerald-600">{selectedPlan.price} CFA<span className="text-base font-bold text-slate-400">/mois</span></p>
            </div>
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">Promo</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payez 1 mois, obtenez 2 mois !</p>
            </div>
            <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">Paiement sécurisé via Wave, Orange Money ou carte bancaire.</p>
            <button onClick={handleUpgrade} disabled={checkoutLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition">
              {checkoutLoading ? <><Loader2 size={18} className="animate-spin" /> Redirection...</> : `Payer ${selectedPlan.price} CFA`}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-8">
        {toast && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">{toast}</div>}

        {/* Promo banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <Sparkles size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="font-black text-emerald-700 dark:text-emerald-300">
            Offre spéciale : Payez 1 mois, obtenez 2 mois offerts !
          </p>
        </div>

        {/* Current plan */}
        {!loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--cp-surface-2)]">
              <Gift size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">Plan actuel</p>
              <p className="font-black text-[var(--cp-text)] capitalize">{currentPlan}</p>
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isActive = currentPlan === plan.id
            const isDowngrade = PLAN_LEVELS[plan.id] < currentLevel
            return (
              <div key={plan.id} className={`relative flex flex-col rounded-[2rem] border p-6 transition ${
                (plan as any).popular
                  ? 'border-[var(--cp-accent)]/50 bg-[var(--cp-accent-dim)] shadow-[0_0_30px_rgba(227,179,65,0.1)]'
                  : 'border-[var(--cp-border-strong)] bg-[var(--cp-surface)]'
              }`}>
                {(plan as any).popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-black text-white shadow-md">
                    Populaire
                  </div>
                )}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cp-surface-2)]">
                  <Icon size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-[var(--cp-accent)]">{plan.name}</h3>
                <p className="mt-1 text-3xl font-black text-[var(--cp-text)]">
                  {plan.price} <span className="text-base font-bold text-slate-400">CFA/mois</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-semibold text-[var(--cp-text-subtle)]">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isActive && !isDowngrade && setSelectedPlan(plan)}
                  disabled={isActive || isDowngrade}
                  className={`mt-6 w-full rounded-2xl py-3.5 text-sm font-black transition ${
                    isActive
                      ? 'bg-[var(--cp-surface-2)] text-[var(--cp-text-muted)] cursor-default'
                      : isDowngrade
                      ? 'bg-[var(--cp-surface-2)] text-[var(--cp-text-muted)] cursor-not-allowed'
                      : (plan as any).popular
                      ? 'bg-[var(--cp-accent)] text-slate-950 font-black hover:opacity-90 shadow-lg shadow-[var(--cp-accent)]/20'
                      : 'border border-emerald-500/50 text-emerald-400 hover:bg-[var(--cp-primary-dim)]'
                  }`}
                >
                  {isActive ? 'Plan actuel' : isDowngrade ? 'Plan inférieur' : 'Choisir ce plan'}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-base font-black text-slate-950 dark:text-white">Questions fréquentes</h3>
          <div className="space-y-4 text-sm">
            {[
              ['Comment payer ?', 'Wave, Orange Money, Free Money, ou carte bancaire. Paiement 100% sécurisé via PayDunya.'],
              ['Puis-je annuler ?', 'Oui, votre abonnement s\'arrête à la fin de la période payée. Aucun renouvellement automatique.'],
              ['Mes données sont-elles protégées ?', 'Oui, toutes les données restent les vôtres. CaissePro utilise Supabase avec chiffrement en transit.'],
            ].map(([q, a]) => (
              <div key={q}>
                <p className="font-black text-slate-950 dark:text-white">{q}</p>
                <p className="mt-1 font-semibold text-slate-500 dark:text-slate-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
