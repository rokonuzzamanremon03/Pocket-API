'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { regenerateApiKey } from '../login/actions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export default function ApiKeyCard({ initialKey, userId, username }: { initialKey: string, userId: string, username: string }) {
  const [apiKey, setApiKey] = useState(initialKey)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!window.confirm("Are you sure? Your old API Key will stop working immediately.")) return;
    
    setLoading(true)
    
    // সিকিউর সার্ভার অ্যাকশন কল করে ডাটাবেস আপডেট
    const result = await regenerateApiKey(username)

    if (result.error) {
      alert("Failed to regenerate key: " + result.error)
    } else if (result.newKey) {
      setApiKey(result.newKey)
    }
    
    setLoading(false)
  }

  return (
    <div className="p-8 rounded-3xl border border-[#333333] bg-[#111111] shadow-xl relative overflow-hidden group">
      <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Secret API Key
        </span>
        <button onClick={handleRegenerate} disabled={loading} className="text-sm text-[#0070F3] hover:text-white transition-colors disabled:opacity-50">
          {loading ? 'Generating...' : 'Regenerate Key'}
        </button>
      </h3>
      
      <div className="flex items-center gap-3 bg-[#0A0A0A] p-4 rounded-2xl border border-[#333333]">
        <code className="text-[#0070F3] font-mono text-sm break-all flex-1">{apiKey}</code>
        <button 
          onClick={handleCopy} 
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] rounded-xl text-xs font-medium border border-[#333333] transition-all active:scale-95"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-500">Keep this key secret. Use it in your Gateway Android app to link your phone.</p>
    </div>
  )
}