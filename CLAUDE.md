# CaissePro v3 (Rebuild) — Claude Code Instructions

## WHO I AM
- Name: Amdy Boubacar (TonTon Amdy / AmdyLabs)
- Based in Portland, USA with roots in Dakar, Senegal
- I am NOT a coder — I give directions, you execute everything
- Languages: French, Wolof, English

## THE PROJECT
- Name: CaissePro v3 (clean rebuild)
- GitHub: github.com/Amdyb/rebuild-caisse-pro
- Vercel: vercel.com/azzideejay-6482s-projects/rebuild-caisse-pro
- Domain: caissepro.app
- Same Supabase database as v2: kmhhmuwpajwpjxivnlqa

## TECH STACK
- Framework: Next.js 15, App Router, TypeScript
- Styling: Tailwind CSS v3
- Database: Supabase (existing project kmhhmuwpajwpjxivnlqa)
- Auth: Supabase Auth
- Icons: Lucide React ONLY — never use emojis in UI
- Hosting: Vercel (auto-deploy from GitHub main)
- Payments: PayDunya (Wave, Orange Money)
- Messaging: Twilio WhatsApp Business API
- Charts: Recharts
- QR Scanning: html5-qrcode

## SUPABASE
- Project URL: https://kmhhmuwpajwpjxivnlqa.supabase.co
- Key tables: profiles, businesses, business_members, subscriptions, products, sales,
  sale_items, customers, employees, suppliers, categories, expenses, orders, tickets,
  refunds, register_shifts, upgrade_requests, agents, agent_leads, agent_commissions,
  referrals, payment_links, debts

## DESIGN SYSTEM — NEVER BREAK THESE RULES
- Background: white / slate-50 (light), slate-900 (dark)
- Primary color: emerald-600 (#16a34a)
- Rounded corners: rounded-[2rem] for cards, rounded-2xl for items, rounded-full for buttons
- Font weight: font-black for ALL headings and labels
- Card style: rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800
- Primary button: bg-emerald-600 text-white font-black rounded-2xl px-5 py-3 hover:bg-emerald-700
- NO emojis anywhere — Lucide React icons only
- Dark mode always supported via DarkModeProvider (auto 19:00-6:00, manual toggle)
- Mobile-first always

## ARCHITECTURE
- app/ — Next.js App Router pages
- components/ — Shared UI (AppShell is the main layout wrapper)
- lib/ — Utilities (supabaseClient, getNextRoute, generateUniqueSlug, etc.)
- public/ — Static assets (caissepro-logo.png, sw.js, manifest.json)

## APPSHELL
Every authenticated page uses <AppShell title="..." subtitle="...">
It handles: auth + role loading, sidebar navigation by business type, bottom nav mobile, dark mode.

## SUPER ADMIN
Emails: infos@dakarvapes.com, azzideejay@gmail.com
Routes: /super-admin, /super-admin/agents, /super-admin/businesses

## PERFORMANCE RULES
- Cache dashboard data in localStorage with 5-min TTL (key: caissepro_dashboard_v3)
- Promise.all for ALL parallel queries — never sequential
- Skeleton loaders on every page — no blank screens
- Prefetch /pos, /products, /sales on dashboard load
- Never call Twilio on page load or login
- Wrap ALL Twilio calls in try/catch

## BUSINESS TYPES (10)
retail (default), restaurant, beauty, pharmacy, garage, btp, tontine, rental, wholesale, laundry

## ROLES
- owner: full access
- manager/admin: all except security zone
- sales/cashier/staff/employee: POS only

## PLANS
- free: 0 XOF
- starter: 5,000 XOF/mois
- business: 15,000 XOF/mois
- premium: 35,000 XOF/mois

## PAGES BUILT (v3)
- /login — Glassmorphism login
- /register — Account + business creation
- /onboarding — (placeholder, redirects to /dashboard)
- /dashboard — Stats, quick links, subscription, referrals

## PAGES TO BUILD NEXT
- /onboarding — 3-step wizard
- /pos — Point of sale
- /products — Product management
- /sales — Sales history
- /customers — Customer management
- /expenses — Expense tracking
- /reports — Reports & analytics
- /employees — Employee management
- /storefront — Online shop
- /upgrade — Subscription upgrade
- All other pages from v2 reference

## INTEGRATION KEYS
- Supabase URL: https://kmhhmuwpajwpjxivnlqa.supabase.co
- Twilio FROM: whatsapp:+12487030072
- WhatsApp templates: RECEIPT, PAYMENT, REMINDER, ORDER
- PayDunya: test mode (live keys coming soon)

## GIT WORKFLOW
- Remote: https://github.com/Amdyb/rebuild-caisse-pro.git
- Branch: main
- Vercel auto-deploys on push to main
- Push after every working feature

## CODING CONVENTIONS
- All UI text in French
- font-black for all headings, labels, button text
- rounded-[2rem] for cards
- rounded-2xl for buttons/items
- Emerald green primary (#16a34a)
- slate-950 for dark text, slate-500 for subtitles
- No emojis in UI
- AppShell wraps all authenticated pages
- Mobile bottom nav: Accueil, Vendre, Produits, Rapports + Plus (opens sidebar)
