'use client'

import { redirect } from 'next/navigation'

// Onboarding wizard — placeholder that redirects to dashboard for now
// Full 3-step onboarding will be built next
export default function OnboardingPage() {
  redirect('/dashboard')
}
