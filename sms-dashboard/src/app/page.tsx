import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ইউজার লগইন করা থাকলে ড্যাশবোর্ডে যাবে, না থাকলে লগইন পেজে
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}