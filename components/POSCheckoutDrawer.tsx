'use client'

import { CheckCircle, CreditCard, MessageCircle, Minus, Plus, ReceiptText, Trash2, X } from 'lucide-react'
import Link from 'next/link'

type CartItem = {
  product: { id: string; name: string; image?: string | null }
  quantity: number
  price: number
}

type Customer = { id: string; full_name: string; phone?: string | null }

type Props = {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  total: number
  confirmedTotal: number
  customers: Customer[]
  selectedCustomerId: string
  setSelectedCustomerId: (id: string) => void
  newCustomer: { full_name: string; phone: string }
  setNewCustomer: (c: { full_name: string; phone: string }) => void
  addCustomer: () => void
  paymentMethod: string
  setPaymentMethod: (m: string) => void
  onUpdateQty: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
  checkout: () => void
  checkoutLoading: boolean
  sendWhatsAppReceipt: () => void
  completedSaleId: string | null
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'card', label: 'Carte' },
  { id: 'credit', label: 'Client Doit' },
]

export default function POSCheckoutDrawer({
  open, onClose, cart, total, confirmedTotal,
  customers, selectedCustomerId, setSelectedCustomerId,
  newCustomer, setNewCustomer, addCustomer,
  paymentMethod, setPaymentMethod,
  onUpdateQty, onRemoveItem,
  checkout, checkoutLoading, sendWhatsAppReceipt, completedSaleId,
}: Props) {
  if (!open) return null

  const customer = customers.find((c) => c.id === selectedCustomerId)

  // Success screen
  if (completedSaleId) {
    return (
      <>
        <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed right-0 top-0 z-[999] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Vente confirmée</h2>
            <button onClick={onClose} className="rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-emerald-600 text-white shadow-xl shadow-emerald-600/20">
              <CheckCircle size={40} />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-950 dark:text-white">
                {Number(confirmedTotal || 0).toLocaleString('fr-FR')} CFA
              </p>
              {customer && (
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{customer.full_name}</p>
              )}
              <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Paiement enregistré</p>
            </div>

            <div className="w-full space-y-3">
              <Link
                href={`/sales/${completedSaleId}/receipt`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition"
              >
                <ReceiptText size={20} /> Voir le reçu
              </Link>
              {customer?.phone && (
                <button
                  onClick={sendWhatsAppReceipt}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-base font-black text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  <MessageCircle size={20} /> Envoyer sur WhatsApp
                </button>
              )}
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-950 py-4 text-base font-black text-white hover:bg-slate-800 transition dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 z-[999] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Checkout</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Finaliser la vente</p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Total */}
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl dark:bg-slate-700">
            <p className="text-sm font-bold text-slate-300">Total à payer</p>
            <p className="mt-2 text-5xl font-black">{Number(total || 0).toLocaleString('fr-FR')} CFA</p>
          </div>

          {/* Cart items */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Articles</h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.product.name}</p>
                    <p className="text-xs font-bold text-slate-400">{item.price.toLocaleString('fr-FR')} CFA</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-slate-950 dark:text-white">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="w-24 shrink-0 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {(item.price * item.quantity).toLocaleString('fr-FR')} CFA
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-base font-black text-slate-950 dark:text-white">Client</h3>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-950 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Vente sans client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` • ${c.phone}` : ''}</option>
              ))}
            </select>

            <div className="mt-3 grid gap-2">
              <input
                value={newCustomer.full_name}
                onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                placeholder="Nouveau client"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
              />
              <input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Téléphone WhatsApp"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={addCustomer}
                disabled={!newCustomer.full_name.trim()}
                className="rounded-2xl bg-slate-950 px-4 py-3 font-black text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Ajouter client
              </button>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-base font-black text-slate-950 dark:text-white">Mode de paiement</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`rounded-2xl px-4 py-3.5 text-sm font-black transition ${
                    paymentMethod === method.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'credit' && (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                Le montant sera ajouté à la dette du client sélectionné.
              </p>
            )}
          </div>
        </div>

        {/* Confirm button */}
        <div className="border-t border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={checkout}
            disabled={checkoutLoading || cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-5 text-lg font-black text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <CreditCard size={22} />
            {checkoutLoading ? 'Validation...' : `Confirmer — ${total.toLocaleString('fr-FR')} CFA`}
          </button>
        </div>
      </div>
    </>
  )
}
