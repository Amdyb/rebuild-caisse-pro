import { supabase } from '@/lib/supabaseClient'
import useSWR, { mutate } from 'swr'

export type BusinessData = {
  userId: string
  businessId: string
  role: string
  isActive: boolean
  businessName: string
  businessType: string
  businessPhone: string | null
}

const SWR_KEY = 'auth:business'
export const LS_BUSINESS_KEY = 'caissepro_selected_business_id'

export function getStoredBusinessId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LS_BUSINESS_KEY)
}

export function setStoredBusinessId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_BUSINESS_KEY, id)
  mutate(SWR_KEY)
}

async function fetchBusinessData(): Promise<BusinessData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const storedId = getStoredBusinessId()

  let q = supabase
    .from('business_members')
    .select('business_id, role, is_active, businesses(name, business_type, phone, business_phone)')
    .eq('user_id', user.id)

  if (storedId) {
    q = q.eq('business_id', storedId)
  } else {
    q = q.limit(1)
  }

  const { data: m } = await q.maybeSingle()
  if (!m?.business_id) return null

  localStorage.setItem(LS_BUSINESS_KEY, m.business_id)

  const biz = (m as any).businesses
  return {
    userId: user.id,
    businessId: m.business_id,
    role: (m as any).role || 'owner',
    isActive: (m as any).is_active !== false,
    businessName: biz?.name || 'CaissePro',
    businessType: biz?.business_type || 'retail',
    businessPhone: biz?.phone || biz?.business_phone || null,
  }
}

export function useBusinessData() {
  const { data, error, isLoading } = useSWR<BusinessData | null>(
    SWR_KEY,
    fetchBusinessData,
    {
      dedupingInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    userId: data?.userId ?? null,
    businessId: data?.businessId ?? null,
    selectedBusinessId: data?.businessId ?? getStoredBusinessId(),
    role: data?.role ?? 'owner',
    isActive: data?.isActive ?? true,
    businessName: data?.businessName ?? 'CaissePro',
    businessType: data?.businessType ?? 'retail',
    businessPhone: data?.businessPhone ?? null,
    loading: isLoading,
    unauthenticated: !isLoading && data === null,
    error,
  }
}
