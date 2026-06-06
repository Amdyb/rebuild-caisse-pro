import { supabase } from './supabaseClient'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name) || `shop-${Date.now()}`
  let candidate = base

  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (!data) return candidate
    candidate = `${base}-${randomSuffix()}`
  }

  return `${base}-${Date.now().toString(36)}`
}
