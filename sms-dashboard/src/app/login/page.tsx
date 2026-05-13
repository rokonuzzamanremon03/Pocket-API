import AuthForm from './AuthForm'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 font-sans selection:bg-[#0070F3]/30">
      <div className="w-full max-w-md space-y-2 rounded-3xl border border-[#333333] bg-[#111111] p-10 shadow-2xl relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0070F3] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="text-center relative z-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0070F3]/10 border border-[#0070F3]/20">
            <span className="font-extrabold text-2xl text-[#0070F3]">P</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            Pocket API
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            The ultimate developer SMS gateway
          </p>
        </div>

        {resolvedParams?.message && (
          <div className="rounded-xl bg-red-500/10 p-4 text-center text-sm text-red-500 border border-red-500/20 mt-4">
            {resolvedParams.message}
          </div>
        )}

        <AuthForm />
        
      </div>
    </div>
  )
}