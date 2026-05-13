'use client'

import { useState } from 'react'
import { sendTestSms } from '../login/actions'

export default function QuickTestForm() {
  const [loading, setLoading] = useState(false)

  // ক্লায়েন্ট সাইড অ্যাকশন হ্যান্ডলার
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await sendTestSms(formData)
    
    if (result?.error) {
      alert("❌ Error: " + result.error)
    } else if (result?.success) {
      alert("✅ " + result.success)
    }
    setLoading(false)
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input 
        type="text" 
        name="phone" 
        required 
        placeholder="Phone Number (e.g. 017...)" 
        className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-4 py-3 text-sm focus:border-[#0070F3] outline-none transition-all" 
      />
      <textarea 
        name="message" 
        required 
        placeholder="Your test message..." 
        rows={3} 
        className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-4 py-3 text-sm focus:border-[#0070F3] outline-none transition-all resize-none"
      ></textarea>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[#0070F3] text-white py-3 rounded-xl font-bold hover:bg-[#0060df] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending Request...' : 'Send Test SMS'}
      </button>
    </form>
  )
}