'use client'

import AppShell from '@/components/AppShell'
import { SkeletonGrid } from '@/components/Skeleton'
import { useBusinessData } from '@/lib/hooks/useBusinessData'
import { supabase } from '@/lib/supabaseClient'
import { formatPhone, sendReceipt } from '@/lib/whatsapp'
import {
  CreditCard,
  ImageIcon,
  Minus,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  ShoppingCart,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

const POSCheckoutDrawer = dynamic(() => import('@/components/POSCheckoutDrawer'), { ssr: false })
const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

function dispatch(event: string) { window.dispatchEvent(new Event(event)) }

type Product = {
  id: string
  business_id: string
  name: string
  category: string | null
  barcode: string | null
  sell_price: number | null
  minimum_price: number | null
  stock: number | null
  image: string | null
}

type CartItem = { product: Product; quantity: number; price: number }
type Customer = { id: string; full_name: string; phone?: string | null }

type POSData = {
  products: Product[]
  customers: Customer[]
  plan: string
}

async function fetchPOSData(businessId: string): Promise<POSData> {
  const [productRes, customerRes, subRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, business_id, name, sell_price, minimum_price, stock, image, category, barcode')
      .eq('business_id', businessId)
      .not('is_active', 'is', false)
      .not('archived', 'is', true)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('business_id', businessId)
      .order('full_name'),
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    products: (productRes.data || []) as Product[],
    customers: (customerRes.data || []) as Customer[],
    plan: subRes.data?.plan || 'free',
  }
}

export default function POSPage() {
  const { businessId, businessName, businessPhone, loading: bizLoading, unauthenticated } = useBusinessData()

  const { data: posData, isLoading: posLoading } = useSWR(
    businessId ? `pos-data:${businessId}` : null,
    () => fetchPOSData(businessId!),
    { dedupingInterval: 2 * 60 * 1000, revalidateOnFocus: false }
  )

  // Local copies for optimistic mutations during checkout / add customer
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plan, setPlan] = useState('free')

  useEffect(() => {
    if (posData) {
      setProducts(posData.products)
      setCustomers(posData.customers)
      setPlan(posData.plan)
    }
  }, [posData])

  const loading = bizLoading || posLoading

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '' })
  const [showPlanLimit, setShowPlanLimit] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!bizLoading && unauthenticated) window.location.href = '/login'
  }, [bizLoading, unauthenticated])

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return products
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }, [products, search])

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 5000)
  }

  function addToCart(product: Product) {
    dispatch('play-click')
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1, price: Number(product.sell_price || 0) }]
    })
  }

  function updateQty(productId: string, delta: number) {
    dispatch('play-click')
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => i.product.id !== productId)
      return prev.map((i) => i.product.id === productId ? { ...i, quantity: newQty } : i)
    })
  }

  function removeItem(productId: string) {
    dispatch('play-click')
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function handleBarcodeScan(barcode: string) {
    const found = products.find((p) => p.barcode === barcode)
    if (found) {
      addToCart(found)
      flash(`${found.name} ajouté`)
    } else {
      setSearch(barcode)
      flash(`Produit "${barcode}" introuvable — recherche activée`)
    }
  }

  async function addCustomer() {
    if (!businessId || !newCustomer.full_name.trim()) return
    const { data, error } = await supabase
      .from('customers')
      .insert({ business_id: businessId, full_name: newCustomer.full_name, phone: newCustomer.phone || null })
      .select()
      .single()
    if (error) { flash(error.message); return }
    setCustomers((prev) => [data, ...prev])
    setSelectedCustomerId(data.id)
    setNewCustomer({ full_name: '', phone: '' })
    flash('Client ajouté.')
  }

  async function checkout() {
    if (!businessId || cart.length === 0) return

    if (plan === 'free') {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', monthStart.toISOString())
      if ((count || 0) >= 50) { setShowPlanLimit(true); return }
    }

    setCheckoutLoading(true)

    try {
      const isCredit = paymentMethod === 'credit'

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          business_id: businessId,
          total,
          paid_amount: isCredit ? 0 : total,
          remaining_amount: isCredit ? total : 0,
          customer_id: selectedCustomerId || null,
          payment_method: paymentMethod,
          status: 'completed',
        })
        .select()
        .single()

      if (saleError) throw saleError

      await supabase.from('sale_items').insert(
        cart.map((item) => ({
          sale_id: saleData.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image || null,
          unit_price: item.price,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        }))
      )

      await Promise.all(
        cart.map((item) =>
          supabase
            .from('products')
            .update({ stock: Math.max(0, Number(item.product.stock || 0) - item.quantity) })
            .eq('id', item.product.id)
        )
      )

      // Optimistic stock update on local copy
      setProducts((prev) =>
        prev.map((p) => {
          const ci = cart.find((i) => i.product.id === p.id)
          if (!ci) return p
          return { ...p, stock: p.stock !== null ? Math.max(0, p.stock - ci.quantity) : null }
        })
      )

      setConfirmedTotal(total)
      setLastSaleId(saleData.id)
      dispatch('play-cha-ching')

      const customer = customers.find((c) => c.id === selectedCustomerId)
      if (customer?.phone) {
        sendReceipt(
          formatPhone(customer.phone),
          {
            id: saleData.id,
            total,
            payment_method: paymentMethod,
            customer_name: customer.full_name,
            items: cart.map((item) => ({
              product_name: item.product.name,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            })),
            created_at: new Date().toISOString(),
          },
          { name: businessName, phone: businessPhone }
        ).catch(() => {})
      }

      setCart([])
    } catch (err: any) {
      dispatch('play-click')
      flash(err?.message || 'Erreur lors du paiement')
    }

    setCheckoutLoading(false)
  }

  function sendWhatsAppReceipt() {
    const customer = customers.find((c) => c.id === selectedCustomerId)
    if (!customer?.phone) { flash('Ajoutez un client avec téléphone.'); return }
    const lines = cart.map((i) => `• ${i.product.name} x${i.quantity} - ${(i.price * i.quantity).toLocaleString('fr-FR')} CFA`).join('%0A')
    const text = `🧾 ${businessName}%0A%0A${lines}%0A%0ATotal: ${confirmedTotal.toLocaleString('fr-FR')} CFA`
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  return (
    <AppShell title="Point de Vente" subtitle="Encaissement rapide.">
      {/* Plan limit modal */}
      {showPlanLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-[var(--cp-surface)] p-8 shadow-2xl border border-[var(--cp-border-strong)]">
            <button onClick={() => setShowPlanLimit(false)} className="absolute right-4 top-4 rounded-full bg-[var(--cp-surface-2)] p-1.5 text-[var(--cp-text-subtle)]">
              <X size={16} />
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                <ShoppingCart size={28} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-[var(--cp-accent)]">Limite du plan Gratuit</h2>
              <p className="text-sm font-semibold text-[var(--cp-text-muted)]">
                Vous avez atteint <strong>50 ventes ce mois-ci</strong>. Passez à un plan payant pour vendre sans limite.
              </p>
              <Link href="/upgrade" className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition text-center block">
                Upgrader maintenant
              </Link>
              <button onClick={() => setShowPlanLimit(false)} className="w-full rounded-2xl border border-[var(--cp-border-strong)] py-3 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition">
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

      <div className="mx-auto max-w-7xl space-y-5 pb-40">
        {toast && (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="text-sm font-black text-emerald-400">{toast}</p>
            {lastSaleId && (
              <Link href={`/sales/${lastSaleId}/receipt`} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition">
                <ReceiptText size={16} /> Voir le reçu
              </Link>
            )}
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-3 rounded-3xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-4">
          <div className="relative flex-1">
            <Zap className="absolute left-4 top-3.5 text-emerald-500" size={20} />
            <input
              ref={searchRef}
              className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] py-3 pl-12 pr-4 font-black text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] focus:bg-[var(--cp-surface-3)] placeholder:text-[var(--cp-text-muted)]"
              placeholder="Rechercher produit ou code-barres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3.5 text-[var(--cp-text-muted)] hover:text-[var(--cp-text)]">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            title="Scanner un code-barres"
            className="flex items-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 font-black text-[var(--cp-text-subtle)] transition hover:border-[var(--cp-accent)]/50 hover:bg-[var(--cp-accent-dim)] hover:text-[var(--cp-accent)]"
          >
            <ScanLine size={20} />
          </button>
        </div>

        {/* Product grid */}
        {loading ? (
          <SkeletonGrid count={8} />
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Package size={48} className="text-[var(--cp-text-muted)]" />
            <div>
              <p className="font-black text-[var(--cp-text-muted)]">
                {search ? `Aucun produit pour "${search}"` : 'Aucun produit actif'}
              </p>
              {!search && (
                <Link href="/products" className="mt-2 inline-block text-sm font-black text-emerald-400 hover:text-emerald-300">
                  Ajouter des produits
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.product.id === product.id)
              const outOfStock = Number(product.stock ?? 1) <= 0
              const lowStock = !outOfStock && product.stock !== null && Number(product.stock) <= 5

              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && addToCart(product)}
                  disabled={outOfStock}
                  className={`relative rounded-3xl border p-3 text-left transition active:scale-95 ${
                    outOfStock
                      ? 'cursor-not-allowed border-red-500/20 bg-[var(--cp-surface)] opacity-50'
                      : cartItem
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-emerald-500/10 shadow-md'
                      : 'border-[var(--cp-border-strong)] bg-[var(--cp-surface)] hover:border-emerald-500/40 hover:shadow-md'
                  }`}
                >
                  {outOfStock && (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">Rupture</span>
                  )}
                  {lowStock && (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">Faible</span>
                  )}
                  {cartItem && !outOfStock && (
                    <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                      {cartItem.quantity}
                    </span>
                  )}

                  <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-[var(--cp-surface-2)]">
                    {product.image
                      ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      : <ImageIcon className="text-[var(--cp-text-muted)]" size={32} />
                    }
                  </div>

                  <h3 className="mt-3 text-sm font-black leading-tight text-[var(--cp-text)] line-clamp-2">{product.name}</h3>
                  {product.category && (
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--cp-text-muted)] truncate">{product.category}</p>
                  )}
                  <p className="mt-2 text-base font-black text-emerald-400">
                    {Number(product.sell_price || 0).toLocaleString('fr-FR')} CFA
                  </p>
                  {product.stock !== null && (
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--cp-text-muted)]">Stock : {product.stock}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed cart bar */}
      {cart.length > 0 && !checkoutOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-[var(--cp-border-strong)] bg-[var(--cp-surface)] shadow-2xl lg:bottom-0 lg:left-72">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {cart.map((item) => (
                <div key={item.product.id} className="flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-3 py-2">
                  <span className="max-w-[100px] truncate text-xs font-black text-[var(--cp-text)]">{item.product.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--cp-surface-3)] text-[var(--cp-text-subtle)] hover:text-[var(--cp-text)]">
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-[var(--cp-text)]">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--cp-surface-3)] text-[var(--cp-text-subtle)] hover:text-[var(--cp-text)]">
                      <Plus size={10} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.product.id)}>
                    <X size={12} className="text-red-400 hover:text-red-300" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--cp-surface-2)] px-3 py-2">
                <ShoppingCart size={16} className="text-[var(--cp-text-muted)]" />
                <span className="text-xs font-black text-[var(--cp-text-subtle)]">{totalItems} art.</span>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 rounded-2xl border border-red-500/30 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 size={14} /> Vider
              </button>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-95"
              >
                <CreditCard size={16} />
                {total.toLocaleString('fr-FR')} CFA
              </button>
            </div>
          </div>
        </div>
      )}

      <POSCheckoutDrawer
        open={checkoutOpen}
        onClose={() => { setCheckoutOpen(false); if (lastSaleId) { setLastSaleId(null); setSelectedCustomerId('') } }}
        cart={cart}
        total={total}
        confirmedTotal={confirmedTotal}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        addCustomer={addCustomer}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        checkout={checkout}
        checkoutLoading={checkoutLoading}
        sendWhatsAppReceipt={sendWhatsAppReceipt}
        completedSaleId={lastSaleId}
      />
    </AppShell>
  )
}
