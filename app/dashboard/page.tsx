'use client'

import AppShell from '@/components/AppShell'
import { SkeletonDashboard } from '@/components/Skeleton'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowRight,
  CreditCard,
  DollarSign,
  Globe,
  Package,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Truck,
  User,
  UserCog,
  Users,
  Wallet,
  AlertTriangle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const CACHE_KEY = 'caissepro_dashboard_v3'
const CACHE_TTL = 5 * 60 * 1000

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(data: any) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

function cfa(value: number) {
  return `${value.toLocaleString('fr-FR')} CFA`
}

function getWeekStart() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const QUICK_LINKS = [
  { label: 'Vendre', href: '/pos', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { label: 'Produits', href: '/products', icon: Package, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { label: 'Clients', href: '/customers', icon: Users, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { label: 'Ventes', href: '/sales', icon: ReceiptText, color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
  { label: 'Dépenses', href: '/expenses', icon: Receipt, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { label: 'Rapports', href: '/reports', icon: TrendingUp, color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  { label: 'Boutique', href: '/storefront', icon: Globe, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { label: 'Caisse', href: '/register-shifts', icon: Wallet, color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
]

type BusinessInfo = {
  id: string
  name?: string | null
  slogan?: string | null
  banner_url?: string | null
  logo_url?: string | null
  business_type?: string | null
  onboarding_completed?: boolean | null
  slug?: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [plan, setPlan] = useState('free')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayTotal, setTodayTotal] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [totalDebt, setTotalDebt] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [rewardCount, setRewardCount] = useState(0)

  useEffect(() => {
    // Prefetch key pages
    ;['/pos', '/products', '/sales'].forEach((href) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = href
      document.head.appendChild(link)
    })
  }, [])

  useEffect(() => {
    async function init() {
      const cached = readCache()
      if (cached) {
        setBusiness(cached.business)
        setPlan(cached.plan || 'free')
        setExpiresAt(cached.expiresAt || null)
        setTodayTotal(cached.todayTotal || 0)
        setWeekTotal(cached.weekTotal || 0)
        setTotalDebt(cached.totalDebt || 0)
        setLowStockCount(cached.lowStockCount || 0)
        setReferralCount(cached.referralCount || 0)
        setRewardCount(cached.rewardCount || 0)
        setLoading(false)
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }

      const { data: memberships, error } = await supabase
        .from('business_members')
        .select('business_id, role, is_active')
        .eq('user_id', userData.user.id)

      if (error || !memberships || memberships.length === 0) { router.push('/onboarding'); return }

      const sorted = (memberships as any[]).sort((a, b) => {
        const p: Record<string, number> = { owner: 0, admin: 1 }
        return (p[a.role] ?? 2) - (p[b.role] ?? 2)
      })
      const member: any = sorted[0]

      if (member.is_active === false) {
        await supabase.auth.signOut()
        router.push('/login?error=deactivated')
        return
      }

      const businessId = member.business_id
      const memberRole: string = member.role || 'staff'
      localStorage.setItem('caissepro_selected_business_id', businessId)

      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle()

      const STAFF_ROLES_CHECK = ['sales', 'staff', 'cashier', 'employee']
      if (!STAFF_ROLES_CHECK.includes(memberRole) && !businessData?.onboarding_completed) {
        router.push('/onboarding')
        return
      }

      setBusiness((businessData as BusinessInfo | null) || { id: businessId })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekStart = getWeekStart()

      const [
        todaySalesResult,
        weekSalesResult,
        productsResult,
        debtsResult,
        subscriptionResult,
        referralsResult,
      ] = await Promise.all([
        supabase.from('sales').select('total').eq('business_id', businessId).gte('created_at', today.toISOString()),
        supabase.from('sales').select('total').eq('business_id', businessId).gte('created_at', weekStart.toISOString()),
        supabase.from('products').select('id,stock').eq('business_id', businessId).not('archived', 'is', true).not('is_active', 'is', false),
        supabase.from('customers').select('debt_balance').eq('business_id', businessId),
        supabase.from('subscriptions').select('plan,expires_at').eq('business_id', businessId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('referrals').select('id,reward_granted').eq('referrer_business_id', businessId),
      ])

      const todayAmount = (todaySalesResult.data || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0)
      const weekAmount = (weekSalesResult.data || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0)
      const debtAmount = (debtsResult.data || []).reduce((s: number, c: any) => s + Number(c.debt_balance || 0), 0)
      const lowStock = (productsResult.data || []).filter((p: any) => p.stock !== null && Number(p.stock) <= 5).length
      const refs = referralsResult.data || []

      const planVal = subscriptionResult.data?.plan || 'free'
      const expiresVal = subscriptionResult.data?.expires_at || null

      setPlan(planVal)
      setExpiresAt(expiresVal)
      setTodayTotal(todayAmount)
      setWeekTotal(weekAmount)
      setTotalDebt(debtAmount)
      setLowStockCount(lowStock)
      setReferralCount(refs.length)
      setRewardCount(refs.filter((r: any) => r.reward_granted).length)

      writeCache({
        business: (businessData as BusinessInfo | null) || { id: businessId },
        plan: planVal,
        expiresAt: expiresVal,
        todayTotal: todayAmount,
        weekTotal: weekAmount,
        totalDebt: debtAmount,
        lowStockCount: lowStock,
        referralCount: refs.length,
        rewardCount: refs.filter((r: any) => r.reward_granted).length,
      })

      setLoading(false)
    }

    init()
  }, [router])

  const planDays = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000) : null
  const planIsActive = plan !== 'free'

  const PLAN_LABELS: Record<string, string> = {
    free: 'Gratuit', starter: 'Starter', business: 'Business', premium: 'Premium',
  }

  return (
    <AppShell title="Tableau de bord" subtitle={business?.name || 'Chargement...'}>
      {loading ? (
        <SkeletonDashboard />
      ) : (
        <div className="space-y-8 animate-slide-up">
          {/* Hero banner */}
          <div className="relative -mx-5 -mt-8 overflow-hidden">
            {business?.banner_url ? (
              <Image src={business.banner_url} alt={business.name || ''} width={800} height={200} className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
                <Store size={48} className="text-white/40" />
              </div>
            )}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-5">
              <div className="flex items-center gap-3">
                {business?.logo_url && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border-2 border-white/30">
                    <Image src={business.logo_url} alt={business.name || ''} fill className="object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-white">{business?.name}</h3>
                  {business?.slogan && <p className="text-sm text-white/70">{business.slogan}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription alert */}
          {planIsActive && planDays !== null && planDays <= 7 && (
            <div className={`flex items-center justify-between rounded-[2rem] border p-4 ${
              planDays <= 0
                ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20'
            }`}>
              <div>
                <p className={`font-black ${planDays <= 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {planDays <= 0 ? 'Abonnement expiré' : `Abonnement expire dans ${planDays} jour${planDays > 1 ? 's' : ''}`}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Renouvelez pour garder l'accès complet</p>
              </div>
              <Link href="/upgrade" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">
                Renouveler
              </Link>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Ventes aujourd'hui", value: cfa(todayTotal), icon: ShoppingCart, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Ventes cette semaine', value: cfa(weekTotal), icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
              { label: 'Dettes clients', value: cfa(totalDebt), icon: DollarSign, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
              { label: 'Stock faible', value: `${lowStockCount} produit${lowStockCount !== 1 ? 's' : ''}`, icon: AlertTriangle, color: lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', bg: lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-700/50' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="cp-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">{stat.label}</p>
                      <p className="mt-2 text-2xl font-black text-[var(--cp-text)]">{stat.value}</p>
                    </div>
                    <div className={`rounded-2xl p-2.5 ${stat.bg}`}>
                      <Icon size={20} className={stat.color} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick links */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Raccourcis</h3>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-center gap-2 flex flex-col items-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-3 text-center transition hover:scale-105 hover:shadow-md"
                  >
                    <div className={`rounded-xl p-2.5 ${link.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-black text-[var(--cp-text-subtle)]">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Plan & referral card */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Subscription card */}
            <div className="cp-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">Abonnement actuel</p>
                  <p className="mt-1 text-xl font-black text-[var(--cp-text)]">Plan {PLAN_LABELS[plan] || plan}</p>
                  {planIsActive && planDays !== null && (
                    <p className="mt-1 text-sm font-semibold text-[var(--cp-text-muted)]">
                      {planDays > 0 ? `${planDays} jours restants` : 'Expiré'}
                    </p>
                  )}
                  {!planIsActive && (
                    <p className="mt-1 text-sm font-semibold text-[var(--cp-text-muted)]">Fonctionnalités limitées</p>
                  )}
                </div>
                <CreditCard size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <Link
                href="/upgrade"
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                {planIsActive && planDays !== null && planDays > 0 ? 'Gérer l\'abonnement' : 'Upgrader maintenant'}
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Referral card */}
            <div className="cp-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--cp-accent)]">Parrainage</p>
                  <p className="mt-1 text-xl font-black text-[var(--cp-text)]">{referralCount} parrainé{referralCount !== 1 ? 's' : ''}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--cp-text-muted)]">
                    {rewardCount} mois offert{rewardCount !== 1 ? 's' : ''} gagnés
                  </p>
                </div>
                <Users size={28} className="text-violet-600 dark:text-violet-400" />
              </div>
              <Link
                href="/referrals"
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] py-3 text-sm font-black text-[var(--cp-text-subtle)] transition hover:bg-[var(--cp-surface-2)]"
              >
                Inviter des amis
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Footer powered */}
          <div className="pt-4 text-center">
            <p className="text-xs font-semibold text-slate-300 dark:text-slate-600">
              Propulsé par{' '}
              <span className="font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                CaissePro v3
              </span>
            </p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
