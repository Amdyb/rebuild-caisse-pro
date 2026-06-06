import { supabase } from '@/lib/supabaseClient'

const SUPER_ADMIN_EMAILS = ['infos@dakarvapes.com', 'azzideejay@gmail.com']

export async function getNextRoute(userId: string, email: string): Promise<string> {
  if (SUPER_ADMIN_EMAILS.includes(email)) return '/super-admin'

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, businesses(onboarding_completed)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!membership) return '/register'

  const biz = membership as any
  if (!biz.businesses?.onboarding_completed) return '/onboarding'

  return '/dashboard'
}
