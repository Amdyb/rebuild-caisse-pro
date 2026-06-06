'use client'

import AmdyLabsBrand from '@/components/AmdyLabsBrand'
import DarkModeToggle from '@/components/DarkModeToggle'
import NetworkStatusBanner from '@/components/NetworkStatusBanner'
import SoundManager from '@/components/SoundManager'
import { supabase } from '@/lib/supabaseClient'
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  Droplets,
  FileText,
  Globe,
  HardHat,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lock,
  Menu,
  MessageCircle,
  Package,
  Plus,
  QrCode,
  Receipt,
  ReceiptText,
  RotateCcw,
  Scissors,
  Settings,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserCog,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, memo, useEffect, useState } from 'react'

type AppShellProps = { children: ReactNode; title: string; subtitle?: string; action?: ReactNode }

type NavItem = { label: string; href: string; icon: any; tourId?: string; lockedPlan?: string; readOnly?: boolean }

type SectionConfig = {
  key: string
  title: string
  borderColor: string
  bgColor: string
  textColor: string
  headerColor: string
  defaultOpen?: boolean
  items: NavItem[]
}

const PLAN_LEVELS: Record<string, number> = { free: 0, starter: 1, business: 2, premium: 3 }
const STAFF_ROLES = ['sales', 'staff', 'employee', 'cashier']
const MANAGER_ROLES = ['manager', 'admin', 'owner']
const SUPER_ADMIN_EMAILS = ['infos@dakarvapes.com', 'azzideejay@gmail.com']

const STAFF_ALLOWED_PATHS = ['/pos', '/checkout', '/register-shifts', '/profile', '/change-password', '/expenses', '/upgrade']
const MANAGER_ALLOWED_PATHS = [
  '/dashboard', '/pos', '/checkout', '/products', '/sales', '/refunds', '/register-shifts',
  '/customers', '/expenses', '/reports', '/finances', '/orders', '/debts',
  '/payment-links', '/purchases', '/stock-movements', '/activity',
  '/settings', '/payment-methods', '/employees', '/staff',
  '/storefront', '/categories', '/suppliers',
  '/profile', '/change-password', '/help', '/feedback', '/legal', '/upgrade',
]

const ROLE_LABELS: Record<string, string> = {
  sales: 'Vendeur', cashier: 'Caissier', staff: 'Employé', employee: 'Employé',
  manager: 'Manager', admin: 'Admin', owner: 'Propriétaire',
}

const STAFF_SECTION: SectionConfig = {
  key: 'staff', title: 'CAISSE',
  borderColor: 'border-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
  textColor: 'text-emerald-700 dark:text-emerald-400', headerColor: 'text-emerald-600 dark:text-emerald-400',
  defaultOpen: true,
  items: [
    { label: 'Vendre', href: '/pos', icon: ShoppingCart },
    { label: 'Produits', href: '/products', icon: Package, readOnly: true },
    { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet },
    { label: 'Dépenses', href: '/expenses', icon: Receipt },
  ],
}

const STAFF_PROFILE_SECTION: SectionConfig = {
  key: 'staff-profil', title: 'MON COMPTE',
  borderColor: 'border-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-700',
  textColor: 'text-slate-700 dark:text-slate-200', headerColor: 'text-slate-500 dark:text-slate-400',
  defaultOpen: false,
  items: [{ label: 'Mon profil', href: '/profile', icon: User }],
}

const PROFILE_SECTION: SectionConfig = {
  key: 'profil', title: 'PROFIL & PARAMETRES',
  borderColor: 'border-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700',
  textColor: 'text-slate-700 dark:text-slate-200', headerColor: 'text-slate-500 dark:text-slate-400',
  defaultOpen: false,
  items: [
    { label: 'Profil', href: '/profile', icon: User },
    { label: 'Parametres', href: '/settings', icon: Settings },
    { label: 'Modes de paiement', href: '/payment-methods', icon: CreditCard },
    { label: 'WhatsApp', href: '/settings/whatsapp', icon: MessageCircle },
    { label: 'Mentions légales', href: '/legal', icon: FileText },
    { label: 'Aide', href: '/help', icon: HelpCircle },
  ],
}

const SECURITY_SECTION: SectionConfig = {
  key: 'securite', title: 'ZONE DE SECURITE',
  borderColor: 'border-red-500', bgColor: 'bg-red-50 dark:bg-red-900/30',
  textColor: 'text-red-700 dark:text-red-400', headerColor: 'text-red-600 dark:text-red-400',
  defaultOpen: false,
  items: [
    { label: 'Réinitialiser produits', href: '/reset-products', icon: Trash2 },
    { label: 'Supprimer boutique', href: '/delete-store', icon: AlertTriangle },
  ],
}

const SUPER_ADMIN_SECTION: SectionConfig = {
  key: 'super-admin', title: 'SUPER ADMIN',
  borderColor: 'border-slate-900', bgColor: 'bg-slate-100 dark:bg-slate-700',
  textColor: 'text-slate-950 dark:text-white', headerColor: 'text-slate-700 dark:text-slate-300',
  defaultOpen: false,
  items: [
    { label: 'Tableau de bord', href: '/super-admin', icon: LayoutDashboard },
    { label: 'Agents', href: '/super-admin/agents', icon: Users },
    { label: 'Commerces', href: '/super-admin/businesses', icon: Store },
  ],
}

const BOTTOM_NAV = [
  { label: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Vendre', href: '/pos', icon: ShoppingCart },
  { label: 'Produits', href: '/products', icon: Package },
  { label: 'Rapports', href: '/reports', icon: TrendingUp },
]

const STAFF_BOTTOM_NAV = [
  { label: 'Vendre', href: '/pos', icon: ShoppingCart },
  { label: 'Produits', href: '/products', icon: Package },
  { label: 'Caisse', href: '/register-shifts', icon: Wallet },
  { label: 'Profil', href: '/profile', icon: User },
]

function getNavSections(businessType: string): SectionConfig[] {
  const CAISSE_BASE_ITEMS: NavItem[] = [
    { label: 'Vendre', href: '/pos', icon: ShoppingCart },
    { label: 'Historique des ventes', href: '/sales', icon: ReceiptText },
    { label: 'Remboursements', href: '/refunds', icon: RotateCcw },
    { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet },
  ]
  const GESTION_BASE: Omit<SectionConfig, 'items'> = {
    key: 'gestion', title: 'GESTION',
    borderColor: 'border-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-900/30',
    textColor: 'text-violet-700 dark:text-violet-400', headerColor: 'text-violet-600 dark:text-violet-400',
    defaultOpen: false,
  }
  const BOUTIQUE_BASE: Omit<SectionConfig, 'items'> = {
    key: 'boutique', title: 'BOUTIQUE EN LIGNE',
    borderColor: 'border-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400', headerColor: 'text-orange-600 dark:text-orange-400',
    defaultOpen: false,
  }
  const RAPPORTS: SectionConfig = {
    key: 'rapports', title: 'RAPPORTS',
    borderColor: 'border-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    textColor: 'text-teal-700 dark:text-teal-400', headerColor: 'text-teal-600 dark:text-teal-400',
    defaultOpen: false,
    items: [
      { label: 'Rapports', href: '/reports', icon: TrendingUp },
      { label: 'Dépenses', href: '/expenses', icon: Receipt },
      { label: 'Finances', href: '/finances', icon: DollarSign, lockedPlan: 'business' },
    ],
  }
  const BOUTIQUE_ITEMS: NavItem[] = [
    { label: 'Ma boutique en ligne', href: '/storefront', icon: Globe },
    { label: 'Commandes clients', href: '/orders', icon: ShoppingBag },
    { label: 'QR Code boutique', href: '/storefront/qr', icon: QrCode, lockedPlan: 'business' },
    { label: 'Partager boutique', href: '/storefront/share', icon: Share2 },
  ]
  const TAIL = [PROFILE_SECTION, SECURITY_SECTION]

  switch (businessType) {
    case 'restaurant':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-400', headerColor: 'text-orange-600 dark:text-orange-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Commandes', href: '/orders', icon: ShoppingBag }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Menu & Produits', href: '/products', icon: Package }, { label: 'Clients', href: '/customers', icon: Users }, { label: 'Employés', href: '/employees', icon: UserCog, lockedPlan: 'starter' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: BOUTIQUE_ITEMS }, RAPPORTS, ...TAIL,
      ]
    case 'beauty':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-900/30', textColor: 'text-pink-700 dark:text-pink-400', headerColor: 'text-pink-600 dark:text-pink-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Rendez-vous', href: '/appointments', icon: Calendar }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Services', href: '/products', icon: Scissors }, { label: 'Clients', href: '/customers', icon: Users }, { label: 'Employés', href: '/employees', icon: UserCog, lockedPlan: 'starter' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: [{ label: 'Ma boutique', href: '/storefront', icon: Globe }, { label: 'Réservations', href: '/appointments', icon: Calendar }, { label: 'QR Code boutique', href: '/storefront/qr', icon: QrCode, lockedPlan: 'business' }] },
        RAPPORTS, ...TAIL,
      ]
    case 'pharmacy':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400', headerColor: 'text-blue-600 dark:text-blue-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Ordonnances', href: '/prescriptions', icon: FileText }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Médicaments', href: '/products', icon: Package }, { label: 'Stock critique', href: '/products?filter=low', icon: AlertTriangle }, { label: 'Fournisseurs', href: '/suppliers', icon: Truck, lockedPlan: 'business' }, { label: 'Clients', href: '/customers', icon: Users }] },
        { ...BOUTIQUE_BASE, items: BOUTIQUE_ITEMS }, RAPPORTS, ...TAIL,
      ]
    case 'garage':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-700 dark:text-slate-300', headerColor: 'text-slate-600 dark:text-slate-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Interventions', href: '/services', icon: Wrench }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Pièces détachées', href: '/products', icon: Package }, { label: 'Clients', href: '/customers', icon: Users }, { label: 'Fournisseurs', href: '/suppliers', icon: Truck, lockedPlan: 'business' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: BOUTIQUE_ITEMS }, RAPPORTS, ...TAIL,
      ]
    case 'btp':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30', textColor: 'text-yellow-700 dark:text-yellow-400', headerColor: 'text-yellow-600 dark:text-yellow-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Chantiers', href: '/projects', icon: HardHat }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Matériaux', href: '/products', icon: Package }, { label: 'Clients', href: '/customers', icon: Users }, { label: 'Fournisseurs', href: '/suppliers', icon: Truck, lockedPlan: 'business' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: [{ label: 'Ma boutique', href: '/storefront', icon: Globe }, { label: 'Devis & Commandes', href: '/orders', icon: ShoppingBag }, { label: 'QR Code boutique', href: '/storefront/qr', icon: QrCode, lockedPlan: 'business' }] },
        RAPPORTS, ...TAIL,
      ]
    case 'tontine':
      return [
        { key: 'tontine', title: 'TONTINE', borderColor: 'border-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-900/30', textColor: 'text-violet-700 dark:text-violet-400', headerColor: 'text-violet-600 dark:text-violet-400', defaultOpen: true, items: [{ label: 'Tontines', href: '/tontines', icon: Users }, { label: 'Membres', href: '/employees', icon: UserCog }, { label: 'Historique', href: '/activity', icon: ReceiptText }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...RAPPORTS, items: [{ label: 'Rapports', href: '/reports', icon: TrendingUp }, { label: 'Finances', href: '/finances', icon: DollarSign, lockedPlan: 'business' }] },
        ...TAIL,
      ]
    case 'rental':
      return [
        { key: 'location', title: 'LOCATION & IMMOBILIER', borderColor: 'border-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-400', headerColor: 'text-emerald-600 dark:text-emerald-400', defaultOpen: true, items: [{ label: 'Propriétés', href: '/real-estate', icon: Home }, { label: 'Locataires', href: '/customers', icon: Users }, { label: 'Contrats', href: '/contracts', icon: FileText }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...RAPPORTS, items: [{ label: 'Rapports', href: '/reports', icon: TrendingUp }, { label: 'Finances', href: '/finances', icon: DollarSign, lockedPlan: 'business' }] },
        ...TAIL,
      ]
    case 'wholesale':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-900/30', textColor: 'text-teal-700 dark:text-teal-400', headerColor: 'text-teal-600 dark:text-teal-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'Commandes B2B', href: '/orders', icon: ShoppingBag }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Stock', href: '/products', icon: Package }, { label: 'Clients revendeurs', href: '/customers', icon: Users }, { label: 'Fournisseurs', href: '/suppliers', icon: Truck, lockedPlan: 'business' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: [{ label: 'Catalogue en ligne', href: '/storefront', icon: Globe }, { label: 'Commandes en ligne', href: '/orders', icon: ShoppingBag }, { label: 'QR Code boutique', href: '/storefront/qr', icon: QrCode, lockedPlan: 'business' }] },
        RAPPORTS, ...TAIL,
      ]
    case 'laundry':
      return [
        { key: 'caisse', title: 'CAISSE', borderColor: 'border-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30', textColor: 'text-cyan-700 dark:text-cyan-400', headerColor: 'text-cyan-600 dark:text-cyan-400', defaultOpen: true, items: [{ label: 'Caisse', href: '/pos', icon: ShoppingCart }, { label: 'En cours', href: '/active-orders', icon: Droplets }, { label: 'Historique', href: '/sales', icon: ReceiptText }, { label: 'Caisse du jour', href: '/register-shifts', icon: Wallet }] },
        { ...GESTION_BASE, items: [{ label: 'Tarifs', href: '/products', icon: Package }, { label: 'Clients', href: '/customers', icon: Users }, { label: 'Employés', href: '/employees', icon: UserCog, lockedPlan: 'starter' }, { label: 'Dépenses', href: '/expenses', icon: Receipt }] },
        { ...BOUTIQUE_BASE, items: BOUTIQUE_ITEMS }, RAPPORTS, ...TAIL,
      ]
    default:
      return [
        {
          key: 'caisse', title: 'CAISSE',
          borderColor: 'border-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
          textColor: 'text-emerald-700 dark:text-emerald-400', headerColor: 'text-emerald-600 dark:text-emerald-400',
          defaultOpen: true,
          items: CAISSE_BASE_ITEMS,
        },
        {
          ...GESTION_BASE,
          items: [
            { label: 'Produits', href: '/products', icon: Package },
            { label: 'Clients', href: '/customers', icon: Users },
            { label: 'Employés', href: '/employees', icon: UserCog, lockedPlan: 'starter' },
            { label: 'Fournisseurs', href: '/suppliers', icon: Truck, lockedPlan: 'business' },
            { label: 'Catégories', href: '/categories', icon: Tag },
          ],
        },
        { ...BOUTIQUE_BASE, items: BOUTIQUE_ITEMS },
        RAPPORTS,
        ...TAIL,
      ]
  }
}

const AppShell = memo(function AppShell({ children, title, subtitle, action }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessName, setBusinessName] = useState('CaissePro')
  const [businessLogo, setBusinessLogo] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState('retail')
  const [userRole, setUserRole] = useState('owner')
  const [userName, setUserName] = useState('')
  const [ready, setReady] = useState(false)
  const [subscription, setSubscription] = useState<{ plan: string; expires_at: string | null } | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function loadBranding() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { setReady(true); return }

      if (SUPER_ADMIN_EMAILS.includes(userData.user.email || '')) {
        setIsSuperAdmin(true)
      }

      const { data: membership } = await supabase
        .from('business_members')
        .select('business_id, role, full_name, businesses(name, logo_url, business_type)')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

      const member: any = membership
      if (member?.businesses) {
        setBusinessName(member.businesses.name || 'CaissePro')
        setBusinessLogo(member.businesses.logo_url || null)
        setBusinessType(member.businesses.business_type || 'retail')
      }
      setUserRole(member?.role || 'owner')
      setUserName(member?.full_name || userData.user.email?.split('@')[0] || '')

      if (member?.business_id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, expires_at')
          .eq('business_id', member.business_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (sub) setSubscription({ plan: sub.plan, expires_at: sub.expires_at })
      }

      setReady(true)
    }

    loadBranding()

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    function onBusinessTypeChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.businessType) setBusinessType(detail.businessType)
    }
    window.addEventListener('business-type-changed', onBusinessTypeChanged)
    return () => window.removeEventListener('business-type-changed', onBusinessTypeChanged)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (STAFF_ROLES.includes(userRole)) {
      const allowed =
        pathname === '/products' ||
        STAFF_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!allowed) router.replace('/pos')
    } else if (MANAGER_ROLES.includes(userRole) && userRole !== 'owner') {
      const allowed = MANAGER_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!allowed) router.replace('/dashboard')
    }
  }, [ready, userRole, pathname, router])

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="font-black text-slate-400 text-sm">Chargement...</p>
        </div>
      </main>
    )
  }

  const isStaff = STAFF_ROLES.includes(userRole)
  const isOwner = userRole === 'owner'
  const isManager = MANAGER_ROLES.includes(userRole)
  const isEmployee = isStaff || (isManager && !isOwner)
  const baseSections = isStaff
    ? [STAFF_SECTION, STAFF_PROFILE_SECTION]
    : isOwner
    ? getNavSections(businessType)
    : getNavSections(businessType).filter((s) => s.key !== 'securite')
  const navSections = isSuperAdmin ? [...baseSections, SUPER_ADMIN_SECTION] : baseSections
  const currentPlanLevel = PLAN_LEVELS[subscription?.plan || 'free'] ?? 0

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Business header */}
      <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-700">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 text-white">
          {businessLogo
            ? <Image src={businessLogo} alt={businessName} fill className="bg-white object-contain p-1" />
            : <Store size={22} />}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black text-slate-950 dark:text-white">{businessName}</h1>
          {isEmployee ? (
            <>
              <p className="truncate text-sm font-bold text-slate-600 dark:text-slate-300">{userName}</p>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
                isManager && !isOwner
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {ROLE_LABELS[userRole] || userRole}
              </span>
            </>
          ) : (
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Propulsé par CaissePro</p>
          )}
        </div>
      </div>

      {/* Subscription status (owners only) */}
      {isOwner && (
        <div className="px-4 pt-3">
          {(() => {
            const planName = subscription?.plan
            const exp = subscription?.expires_at
            const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : null
            const isActive = !!planName && planName !== 'free'
            const color = !isActive ? 'neutral' : days !== null && days > 30 ? 'green' : days !== null && days > 0 ? 'amber' : 'red'
            const bg: Record<string, string> = {
              neutral: 'bg-slate-50 dark:bg-slate-700/50',
              green: 'bg-emerald-50 dark:bg-emerald-900/30',
              amber: 'bg-amber-50 dark:bg-amber-900/30',
              red: 'bg-red-50 dark:bg-red-900/30',
            }
            const txt: Record<string, string> = {
              neutral: 'text-slate-500 dark:text-slate-400',
              green: 'text-emerald-700 dark:text-emerald-400',
              amber: 'text-amber-700 dark:text-amber-400',
              red: 'text-red-700 dark:text-red-400',
            }
            return (
              <div className={`flex items-center justify-between rounded-2xl px-3 py-2.5 ${bg[color]}`}>
                <div>
                  <p className={`text-xs font-black uppercase tracking-wide ${txt[color]}`}>
                    Plan {planName || 'Gratuit'}
                  </p>
                  {isActive && days !== null && (
                    <p className={`text-[10px] font-bold ${txt[color]}`}>
                      {days > 0 ? `${days} jours restants` : 'Expiré'}
                    </p>
                  )}
                </div>
                <Link href="/upgrade" className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-700">
                  {isActive && days !== null && days > 0 ? 'Renouveler' : 'Upgrader'}
                </Link>
              </div>
            )
          })()}
        </div>
      )}

      {/* VENDRE button */}
      <div className="px-4 pt-4">
        <Link
          href="/pos"
          onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('play-navigation')) }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95"
        >
          <ShoppingCart size={20} />
          VENDRE
        </Link>
      </div>

      {/* Dashboard link (non-staff) */}
      {!isStaff && (
        <div className="px-4 pt-3">
          <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">ACCUEIL</p>
          <Link
            href="/dashboard"
            onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('play-navigation')) }}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
              pathname === '/dashboard'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <LayoutDashboard size={17} />
            Tableau de bord
          </Link>
        </div>
      )}

      {/* Collapsible nav sections */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {navSections.map((section) => {
          const isOpen = openSections[section.key] ?? (section.defaultOpen ?? false)
          const itemHeight = 48
          return (
            <div
              key={section.key}
              className={`overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm dark:bg-slate-800 dark:shadow-none ${section.borderColor}`}
            >
              <button
                onClick={() => toggleSection(section.key)}
                className={`flex w-full items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${section.headerColor}`}
              >
                <span>{section.title}</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? `${section.items.length * itemHeight}px` : '0px' }}
              >
                <div className="space-y-0.5 px-2 pb-2">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href
                    const isLocked = item.lockedPlan
                      ? currentPlanLevel < (PLAN_LEVELS[item.lockedPlan] ?? 0)
                      : false
                    return (
                      <Link
                        key={`${section.key}-${item.href}-${item.label}`}
                        href={isLocked ? '/upgrade' : item.href}
                        id={item.tourId}
                        onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('play-navigation')) }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                          active
                            ? `${section.bgColor} ${section.textColor}`
                            : isLocked
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="flex-1">{item.label}</span>
                        {isLocked && <Lock size={12} className="shrink-0 text-amber-500" />}
                        {item.readOnly && !isLocked && <Lock size={11} className="shrink-0 text-slate-400" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-700">
        <button
          onClick={logout}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-white">
      <NetworkStatusBanner />
      <SoundManager />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-800 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-4 top-4 rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-700 dark:text-slate-300 lg:hidden"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <section className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
                {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              {action && <div>{action}</div>}
            </div>
          </div>
        </header>

        <div className="px-5 py-8 pb-28 lg:pb-8">{children}</div>

        <footer className="border-t border-slate-200 bg-white px-5 py-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col items-center gap-3">
            <AmdyLabsBrand />
            <div className="flex gap-4 text-xs font-bold text-slate-400 dark:text-slate-500">
              <Link href="/help" className="hover:text-slate-700 dark:hover:text-slate-300">Aide</Link>
              <span>·</span>
              <Link href="/legal" className="hover:text-slate-700 dark:hover:text-slate-300">Mentions légales</Link>
              <span>·</span>
              <Link href="/feedback" className="hover:text-slate-700 dark:hover:text-slate-300">Feedback</Link>
            </div>
          </div>
        </footer>
      </section>

      {/* Floating VENDRE FAB */}
      {pathname !== '/pos' && pathname !== '/checkout' && (
        <Link
          href="/pos"
          aria-label="Vendre"
          className="fixed bottom-24 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xl shadow-emerald-600/40 transition hover:scale-105 hover:bg-emerald-700 active:scale-95 lg:bottom-8 lg:right-8"
        >
          <Plus size={28} />
        </Link>
      )}

      {/* Bottom nav (mobile only) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:hidden">
        <div className="grid grid-cols-5">
          {(isStaff ? STAFF_BOTTOM_NAV : BOTTOM_NAV).map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => window.dispatchEvent(new Event('play-navigation'))}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-black transition-colors ${
                  active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <Menu size={20} />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </main>
  )
})

export default AppShell
