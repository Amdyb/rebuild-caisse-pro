import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('221') ? `+${digits}` : `+221${digits}`
}

const TEMPLATE_SIDS: Record<string, string | undefined> = {
  receipt:  process.env.WHATSAPP_TEMPLATE_RECEIPT,
  payment:  process.env.WHATSAPP_TEMPLATE_PAYMENT,
  reminder: process.env.WHATSAPP_TEMPLATE_REMINDER,
  order:    process.env.WHATSAPP_TEMPLATE_ORDER,
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.to || (!body?.body && !body?.template)) {
    return NextResponse.json({ error: 'Missing to or message' }, { status: 400 })
  }

  const { to, body: messageBody, template, variables } = body as {
    to: string
    body?: string
    template?: string
    variables?: Record<string, string>
  }

  const phone = normalizePhone(to)
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+12487030072'

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken)
      const contentSid = template ? TEMPLATE_SIDS[template] : undefined

      const msg = contentSid
        ? await client.messages.create({
            from,
            to: `whatsapp:${phone}`,
            contentSid,
            ...(variables ? { contentVariables: JSON.stringify(variables) } : {}),
          })
        : await client.messages.create({ from, to: `whatsapp:${phone}`, body: messageBody })

      return NextResponse.json({ success: true, method: contentSid ? 'template' : 'twilio', sid: msg.sid })
    } catch (err: any) {
      console.error(`[Twilio] error sending to ${phone}:`, err?.message || err)
      return NextResponse.json({ success: false, method: 'twilio_error', error: err?.message || 'Twilio error' })
    }
  }

  const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(messageBody || '')}`
  return NextResponse.json({ success: true, method: 'fallback', url })
}
