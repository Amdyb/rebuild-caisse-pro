'use client'

import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function ProductBulkImporter({
  businessId,
  onImported,
}: {
  businessId: string
  onImported?: () => void
}) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  function flash(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 6000)
  }

  async function handleFile(file: File) {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    setRows(json as any[])
    flash(`${json.length} produit${json.length !== 1 ? 's' : ''} détecté${json.length !== 1 ? 's' : ''}.`)
  }

  async function importProducts() {
    if (!rows.length) return
    setLoading(true)
    const payload = rows.map((r) => ({
      business_id: businessId,
      name: r.name || r.nom || r.produit || 'Produit',
      category: r.category || r.categorie || null,
      barcode: r.barcode || r.codebarre || r.code_barre || null,
      cost_price: Number(r.cost_price || r.cout || r.prix_achat || 0) || null,
      sell_price: Number(r.sell_price || r.price || r.prix || r.prix_vente || 0) || null,
      minimum_price: Number(r.minimum_price || r.prix_minimum || r.minimum || 0) || null,
      stock: Number(r.stock || r.quantite || r.quantity || 0),
      image: r.image || r.image_url || null,
      is_active: true,
      archived: false,
    }))
    const { error } = await supabase.from('products').insert(payload)
    setLoading(false)
    if (error) { flash(error.message, false); return }
    setRows([])
    flash(`${payload.length} produit${payload.length !== 1 ? 's' : ''} importé${payload.length !== 1 ? 's' : ''} avec succès.`)
    window.dispatchEvent(new Event('play-success'))
    onImported?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-900/30">
          <FileSpreadsheet size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-black text-[var(--cp-text)]">Importer des produits</h3>
          <p className="text-sm font-semibold text-[var(--cp-text-muted)]">
            Colonnes acceptées : name/nom, prix, stock, categorie, barcode
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-6 py-10 text-center transition hover:border-[var(--cp-accent)] hover:bg-[var(--cp-accent-dim)]">
        <Upload size={32} className="text-[var(--cp-text-muted)]" />
        <p className="mt-3 font-black text-[var(--cp-text)]">Choisir un fichier</p>
        <p className="mt-1 text-xs font-semibold text-[var(--cp-text-muted)]">CSV, XLSX, XLS</p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--cp-border-strong)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--cp-border-strong)] text-sm">
              <thead className="bg-[var(--cp-surface-2)]">
                <tr>
                  {['Nom', 'Prix vente', 'Stock', 'Catégorie'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[var(--cp-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cp-border-strong)] bg-[var(--cp-surface)]">
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-bold text-[var(--cp-text)]">{r.name || r.nom || r.produit}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--cp-text)]">{r.sell_price || r.price || r.prix || r.prix_vente || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--cp-text)]">{r.stock || r.quantite || r.quantity || 0}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--cp-text-muted)]">{r.category || r.categorie || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && (
            <p className="border-t border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] px-4 py-2 text-xs font-semibold text-[var(--cp-text-muted)]">
              +{rows.length - 10} ligne{rows.length - 10 !== 1 ? 's' : ''} non affichée{rows.length - 10 !== 1 ? 's' : ''}
            </p>
          )}
          <div className="border-t border-[var(--cp-border-strong)] bg-[var(--cp-surface-2)] p-4">
            <button
              onClick={importProducts}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              <CheckCircle2 size={16} />
              {loading ? 'Importation...' : `Importer ${rows.length} produit${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {toast.msg && (
        <div className={`rounded-2xl border p-4 text-sm font-bold ${
          toast.ok
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
