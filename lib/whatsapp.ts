export interface SaleItem {
  product_name: string
  quantity: number
  price: number
  total: number
}

export interface SaleData {
  id: string
  total: number
  payment_method: string
  items: SaleItem[]
  created_at?: string
  customer_name?: string
}

export interface BusinessData {
  name: string
  phone?: string | null
}

export function formatPhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('221')) return `+${digits}`
  if (digits.length <= 9) return `+221${digits}`
  return `+${digits}`
}

function cfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    cash: 'Espèces',
    wave: 'Wave',
    orange_money: 'Orange Money',
    card: 'Carte bancaire',
    credit: 'Crédit client',
  }
  return map[method] || method
}

async function send(to: string, opts: { body: string; template?: string; variables?: Record<string, string>; silent?: boolean }): Promise<void> {
  const phone = formatPhone(to)
  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, body: opts.body, template: opts.template, variables: opts.variables }),
    })
    const data = await res.json().catch(() => ({}))
    if (!opts.silent && data.method === 'fallback' && data.url && typeof window !== 'undefined') {
      window.open(data.url, '_blank')
    }
  } catch {
    // WhatsApp failure is always non-blocking
  }
}

export async function sendReceipt(
  phone: string,
  saleData: SaleData,
  businessData: BusinessData
): Promise<void> {
  const date = new Date(saleData.created_at || Date.now()).toLocaleDateString('fr-FR')
  const receiptNumber = `REC-${saleData.id.slice(-6).toUpperCase()}`
  const lines = saleData.items
    .map((i) => `  - ${i.product_name} x${i.quantity}  ${cfa(i.total)}`)
    .join('\n')

  const body = [
    `*Reçu — ${businessData.name}*`,
    `Date : ${date}`,
    ``,
    lines,
    ``,
    `*Total : ${cfa(saleData.total)}*`,
    `Paiement : ${paymentLabel(saleData.payment_method)}`,
    ``,
    `Merci de votre confiance !`,
  ].join('\n')

  await send(phone, {
    body,
    template: 'receipt',
    variables: {
      '1': saleData.customer_name || 'Client',
      '2': businessData.name,
      '3': receiptNumber,
      '4': cfa(saleData.total),
      '5': paymentLabel(saleData.payment_method),
      '6': date,
    },
  })
}
