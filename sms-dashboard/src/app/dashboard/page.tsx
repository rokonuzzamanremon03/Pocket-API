import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateApiKey, signOut } from '../login/actions'
import ApiKeyCard from './ApiKeyCard'
import DeviceStatus from './DeviceStatus'
import QuickTestForm from './QuickTestForm'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const apiKey = await getOrCreateApiKey()
  
  // আপাতত ডেমো ইউজারনেম, সাইন-আপ পেজ ঠিক করার পর ডাটাবেস থেকে আসবে
  const demoUsername = user.email?.split('@')[0] || 'user'

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#0070F3]/30">
      {/* Navigation */}
      <nav className="border-b border-[#333333] bg-[#111111]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0070F3] rounded-lg flex items-center justify-center font-bold">P</div>
            <span className="font-bold text-xl tracking-tight text-white">Pocket API</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#" className="hover:text-[#0070F3] transition-colors">Overview</a>
            <a href="#" className="hover:text-[#0070F3] transition-colors">Subscription</a>
            <a href="#" className="hover:text-[#0070F3] transition-colors">Profile</a>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{user.email}</span>
            {/* SIGN OUT FORM */}
            <form action={signOut}>
              <button type="submit" className="px-4 py-1.5 rounded-full border border-[#333333] hover:bg-white hover:text-black transition-all">Sign Out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2 text-center md:text-left flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Developer Console</h1>
            <p className="text-gray-400">Manage your SMS gateway and integrations.</p>
          </div>
          
          {/* Phone Connection Status - Realtime Component */}
          <DeviceStatus apiKey={apiKey || ''} userId={user.id} />
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            
            {/* API KEY CARD COMPONENT */}
            <ApiKeyCard initialKey={apiKey || ''} userId={user.id} username={demoUsername} />

            {/* APK Download Card */}
            <div className="p-8 rounded-3xl border border-[#0070F3]/30 bg-[#0070F3]/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-xl font-bold">Download Gateway App</h3>
                <p className="text-sm text-gray-400">Install the APK on your Android phone to start sending SMS.</p>
              </div>
              {/* REAL APK DOWNLOAD LINK */}
              <a href="/downloads/PocketAPI_v1.0.apk" download className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414L20.355 18.1734L18.941 19.5874L16.109 16.7554L13.277 19.5874L11.863 18.1734L14.695 15.3414L11.863 12.5094L13.277 11.0954L16.109 13.9274L18.941 11.0954L20.355 12.5094L17.523 15.3414ZM16.5 1V3H13.5V1H10.5V3H7.5V1H4.5V23H19.5V1H16.5ZM18 21H6V5H18V21Z"/></svg>
                Download v1.0.0
              </a>
            </div>
          </div>

          {/* Quick Test Side Card */}
          <div className="p-8 rounded-3xl border border-[#333333] bg-[#111111] space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold">Quick SMS Test</h3>
            
            {/* QUICK TEST SMS FORM COMPONENT */}
            <QuickTestForm />
            
          </div>
        </div>
      </main>
    </div>
  )
}