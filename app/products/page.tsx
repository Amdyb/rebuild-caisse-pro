'use client'

import AppShell from '@/components/AppShell'
import { SkeletonGrid } from '@/components/Skeleton'
import { useBusinessData } from '@/lib/hooks/useBusinessData'
import { supabase } from '@/lib/supabaseClient'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Edit, Eye, ImageIcon, Package, PackagePlus, Plus, RefreshCw,
  ScanLine, Search, Trash2, X,
} from 'lucide-react'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

type Product = {
  id: string
  name: string
  barcode: string | null
  category: string | null
  cost_price: number | null
  sell_price: number | null
  stock: number | null
  image: string | null
  created_at: string
  is_active?: boolean | null
  archived?: boolean | null
  deleted_at?: string | null
}

function stockBadge(stock: number) {
  if (stock <= 0) return { label: 'Rupture', cls: 'bg-red-600 text-white' }
  if (stock <= 5) return { label: 'Stock faible', cls: 'bg-amber-500 text-white' }
  return { label: 'En stock', cls: 'bg-emerald-600 text-white' }
}

async function fetchProducts(businessId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return (data || []) as Product[]
}

export default function ProductsPage() {
  const router = useRouter()
  const { businessId, role, loading: bizLoading, unauthenticated } = useBusinessData()

  const {
    data: productsData,
    isLoading: productsLoading,
    mutate: refreshProducts,
  } = useSWR(
    businessId ? `products:${businessId}` : null,
    () => fetchProducts(businessId!),
    { dedupingInterval: 3 * 60 * 1000, revalidateOnFocus: false }
  )

  // Local copy so we can apply optimistic mutations (delete, restock)
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => {
    if (productsData) setProducts(productsData)
  }, [productsData])

  const [search, setSearch] = useState('')
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockSaving, setRestockSaving] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loading = bizLoading || productsLoading
  const isReadOnly = ['sales', 'staff', 'employee', 'cashier'].includes(role)

  useEffect(() => {
    if (!bizLoading && unauthenticated) router.push('/login')
  }, [bizLoading, unauthenticated, router])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const visible = !p.deleted_at && p.archived !== true && p.is_active !== false
      if (!visible) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
    })
  }, [products, search])

  async function deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    setDeleting(id)
    const now = new Date().toISOString()
    await supabase
      .from('products')
      .update({ is_active: false, archived: true, deleted_at: now })
      .eq('id', id)
    setProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, is_active: false, archived: true, deleted_at: now } : p)
    )
    setDeleting(null)
    window.dispatchEvent(new Event('play-click'))
  }

  async function saveRestock() {
    if (!restockProduct || restockQty === '') return
    setRestockSaving(true)
    const newStock = Number(restockQty)
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', restockProduct.id)
    setRestockSaving(false)
    if (error) { alert(error.message); return }
    setProducts((prev) =>
      prev.map((p) => p.id === restockProduct.id ? { ...p, stock: newStock } : p)
    )
    setRestockProduct(null)
    setRestockQty('')
    window.dispatchEvent(new Event('play-success'))
  }

  const action = !isReadOnly ? (
    <div className="flex gap-2">
      <button
        onClick={() => refreshProducts()}
        className="flex items-center gap-1.5 rounded-2xl border border-[var(--cp-border-strong)] px-3 py-2.5 text-sm font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition"
      >
        <RefreshCw size={15} />
      </button>
      <Link href="/products/new" className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition">
        <Plus size={18} /> Ajouter
      </Link>
    </div>
  ) : undefined

  return (
    <AppShell title="Produits" subtitle={`${filtered.length} produit${filtered.length !== 1 ? 's' : ''}`} action={action}>
      {/* Restock modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-[var(--cp-surface)] p-8 shadow-2xl border border-[var(--cp-border-strong)]">
            <button onClick={() => setRestockProduct(null)} className="absolute right-4 top-4 rounded-full bg-[var(--cp-surface-2)] p-1.5 text-[var(--cp-text-subtle)]">
              <X size={16} />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                <RefreshCw size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[var(--cp-accent)]">Réassort</h2>
                <p className="max-w-[200px] truncate text-sm font-semibold text-[var(--cp-text-muted)]">{restockProduct.name}</p>
              </div>
            </div>
            <label className="mb-2 block text-sm font-black text-[var(--cp-text-subtle)]">Nouveau stock</label>
            <input
              type="number" min="0" autoFocus
              value={restockQty} onChange={(e) => setRestockQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRestock()}
              className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-5 py-4 text-2xl font-black text-[var(--cp-text)] outline-none focus:border-[var(--cp-accent)]"
            />
            <p className="mt-1 text-xs font-semibold text-[var(--cp-text-muted)]">Stock actuel : {restockProduct.stock ?? 0}</p>
            <button onClick={saveRestock} disabled={restockSaving}
              className="mt-5 w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 transition">
              {restockSaving ? 'Enregistrement...' : 'Mettre à jour le stock'}
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onScan={(code) => { setSearch(code); setShowScanner(false) }} onClose={() => setShowScanner(false)} />
      )}

      <div className="mx-auto max-w-7xl space-y-5">
        {isReadOnly && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-400">
            <Eye size={16} className="shrink-0" /> Mode consultation uniquement
          </div>
        )}

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-[var(--cp-text-muted)]" size={18} />
            <input
              className="w-full rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] py-3.5 pl-12 pr-4 text-sm font-semibold text-[var(--cp-text)] outline-none transition focus:border-[var(--cp-accent)] placeholder:text-[var(--cp-text-muted)]"
              placeholder="Rechercher par nom, catégorie ou code-barres..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3.5 text-[var(--cp-text-muted)] hover:text-[var(--cp-text)]"><X size={16} /></button>
            )}
          </div>
          <button onClick={() => setShowScanner(true)} title="Scanner un code-barres"
            className="flex items-center gap-2 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] px-4 font-black text-[var(--cp-text-subtle)] hover:border-[var(--cp-accent)]/50 hover:text-[var(--cp-accent)] transition">
            <ScanLine size={20} />
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <SkeletonGrid count={8} />
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-14 text-center">
            <PackagePlus className="mx-auto mb-4 text-[var(--cp-text-muted)]" size={48} />
            <h3 className="text-xl font-black text-[var(--cp-text)]">Aucun produit</h3>
            <p className="mt-2 text-sm font-semibold text-[var(--cp-text-muted)]">
              {search ? `Aucun résultat pour "${search}"` : 'Ajoutez vos premiers produits.'}
            </p>
            {!isReadOnly && !search && (
              <Link href="/products/new" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 transition">
                <Plus size={16} /> Ajouter un produit
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const badge = stockBadge(Number(product.stock ?? 0))
              return (
                <div key={product.id} className="group overflow-hidden rounded-3xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] transition hover:shadow-md hover:shadow-black/20">
                  {/* Image */}
                  <div className="relative h-40 bg-[var(--cp-surface-2)]">
                    {product.image
                      ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center"><ImageIcon className="text-[var(--cp-text-muted)]" size={36} /></div>
                    }
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black ${badge.cls}`}>{badge.label}</span>
                    {!isReadOnly && (
                      <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => { setRestockProduct(product); setRestockQty(String(product.stock ?? 0)) }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--cp-surface)] shadow-md text-blue-400 hover:bg-blue-500/20"
                          title="Réassort"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <Link href={`/products/${product.id}/edit`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--cp-surface)] shadow-md text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)]"
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </Link>
                        <button onClick={() => deleteProduct(product.id)} disabled={deleting === product.id}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--cp-surface)] shadow-md text-red-400 hover:bg-red-500/20"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-black text-[var(--cp-text)] line-clamp-1">{product.name}</h3>
                    {product.category && <p className="mt-0.5 text-xs font-bold text-[var(--cp-text-muted)]">{product.category}</p>}
                    <p className="mt-2 text-xl font-black text-emerald-400">
                      {Number(product.sell_price || 0).toLocaleString('fr-FR')} CFA
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--cp-text-muted)]">Stock : {product.stock ?? '∞'}</p>
                      {product.cost_price && (
                        <p className="text-xs font-bold text-[var(--cp-text-muted)]">
                          Achat : {Number(product.cost_price).toLocaleString('fr-FR')} CFA
                        </p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => { setRestockProduct(product); setRestockQty(String(product.stock ?? 0)) }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--cp-border-strong)] py-2 text-xs font-black text-[var(--cp-text-subtle)] hover:bg-[var(--cp-surface-2)] transition"
                      >
                        <RefreshCw size={12} /> Réassort
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Stats bar */}
        {!loading && products.length > 0 && (
          <div className="flex flex-wrap gap-4 rounded-2xl border border-[var(--cp-border-strong)] bg-[var(--cp-surface)] p-4 text-sm">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[var(--cp-text-muted)]" />
              <span className="font-black text-[var(--cp-text)]">{filtered.length}</span>
              <span className="font-semibold text-[var(--cp-text-muted)]">produit{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="font-semibold text-[var(--cp-text-muted)]">{filtered.filter(p => Number(p.stock ?? 1) <= 0).length} rupture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-[var(--cp-text-muted)]">{filtered.filter(p => Number(p.stock ?? 1) > 0 && Number(p.stock ?? 1) <= 5).length} stock faible</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
