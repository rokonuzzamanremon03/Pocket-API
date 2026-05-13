'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export default function DeviceStatus({ apiKey, userId }: { apiKey: string, userId: string }) {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!apiKey) return;

    // ১. প্রথমে ডিভাইসটি ডাটাবেসে রেজিস্টার করা (যদি না থাকে)
    const initDevice = async () => {
      const { data } = await supabase.from('devices').select('is_online').eq('api_key', apiKey).single()
      if (data) {
        setIsOnline(data.is_online)
      } else {
        await supabase.from('devices').insert([{ api_key: apiKey, user_id: userId, is_online: false }])
      }
    }
    initDevice()

    // ২. রিয়েল-টাইম লিসেনার (১ সেকেন্ডের কম সময়ে আপডেট ধরবে)
    const channel = supabase.channel('device_status')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'devices', 
        filter: `api_key=eq.${apiKey}` 
      }, (payload) => {
        setIsOnline(payload.new.is_online)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [apiKey, userId])

  return (
    <div className={`px-4 py-2 border rounded-full flex items-center gap-2 transition-colors duration-300 ${isOnline ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/20'}`}>
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
      <span className={`text-sm font-bold tracking-wide ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
        {isOnline ? 'Gateway Online' : 'Phone Offline'}
      </span>
    </div>
  )
}