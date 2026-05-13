'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?message=Could not authenticate user. Check your credentials.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const companyName = formData.get('companyName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        company_name: companyName,
        username: email.split('@')[0]
      }
    }
  })

  if (error) {
    redirect('/login?message=Could not sign up user. Try another email.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// actions.ts এ যোগ করুন
export async function getOrCreateApiKey() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // আগে থেকে কি আছে কি না দেখা
  let { data } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .single()

  if (data) return data.api_key

  // না থাকলে নতুন জেনারেট করা
  const newKey = `rzr_live_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  await supabase.from('user_api_keys').insert([{ user_id: user.id, api_key: newKey }])
  
  return newKey
}

// ... আগের কোডগুলো থাকবে ...

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function sendTestSms(formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const message = formData.get('message') as string
  
  // ইউজার ও তার API Key বের করা
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "User not found" }

  const { data: keyData } = await supabase.from('user_api_keys').select('api_key').eq('user_id', user.id).single()
  if (!keyData) return { error: "API Key not found" }

  // মেসেজটি ডাটাবেসে 'pending' স্ট্যাটাসে সেভ করা
  const { error } = await supabase.from('messages').insert([
    {
      phone_number: phone,
      message: message,
      status: 'pending',
      api_key: keyData.api_key // ইউজারের নিজস্ব কি দিয়ে সেভ হবে
    }
  ])

  if (error) return { error: "Failed to send message." }
  return { success: "Message sent to your phone!" }
}

// actions.ts এর একদম নিচে এটি যোগ করুন
export async function regenerateApiKey(username: string) {
  const supabase = await createClient()
  
  // কে রিকোয়েস্ট করছে তা ভেরিফাই করা (সিকিউরিটি)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "User not authenticated" }

  const newKey = `${username}_live_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  
  // সার্ভার সাইড থেকে ডাটাবেস আপডেট
  const { error } = await supabase
    .from('user_api_keys')
    .update({ api_key: newKey })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { newKey }
}