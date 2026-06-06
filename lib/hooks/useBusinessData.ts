import { supabase } from '@/lib/supabaseClient'
import useSWR from 'swr'

export type BusinessData = {
  userId: string
  businessId: string
  role: string
  isActive: boolean
  businessName: string
  businessType: string
  businessPhone: string | null
}

async function fetchBusinessData(): Promise<BusinessData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: m } = await supabase
    .from('business_members')
    .select('business_id, role, is_active, businesses(name, business_type, phone, business_phone)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!m?.business_id) return null

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
    'auth:business',
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
