import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, Brain, Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-[#0A0B0E] text-white font-sans">
      {/* Left Column: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#161821] to-[#0A0B0E] flex-col justify-between p-12 border-r border-white/5 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-accent-violet/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-brand-500/5 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white mb-16 w-max">
            <div className="w-8 h-8 rounded bg-white text-[#0A0B0E] flex items-center justify-center font-bold text-sm">
              S
            </div>
            Supercanvas
          </Link>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-6 leading-tight">
            Welcome back to the<br/><span className="text-accent-violet drop-shadow-md">Future of Trading</span>.
          </h1>
          <p className="text-gray-400 text-lg max-w-md font-light leading-relaxed">
            Log in to manage your algorithms, check your backtests, and monitor your live deployments on the Kinetic Vault engine.
          </p>
        </div>
        
        {/* Mock Stats / Social Proof */}
        <div className="relative z-10 flex gap-4">
           <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
              <div className="w-10 h-10 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet mb-4">
                 <Brain className="w-5 h-5" />
              </div>
              <div className="font-bold text-white text-xl mb-1">Visual Builder</div>
              <div className="text-xs text-gray-500">Pick up right where you left off.</div>
           </div>
           <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                 <Shield className="w-5 h-5" />
              </div>
              <div className="font-bold text-white text-xl mb-1">Secure Vault</div>
              <div className="text-xs text-gray-500">Your API keys are encrypted.</div>
           </div>
        </div>
      </div>

      {/* Right Column: Auth */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative bg-[#0A0B0E]">
        <div className="absolute inset-x-0 bottom-0 h-[400px] w-full rounded-full bg-accent-violet/5 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile Logo */}
          <Link href="/" className="flex lg:hidden items-center justify-center gap-2 text-xl font-bold tracking-tight text-white mb-8">
            <div className="w-8 h-8 rounded bg-white text-[#0A0B0E] flex items-center justify-center font-bold text-sm">
              S
            </div>
            Supercanvas
          </Link>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full mx-auto",
                card: "bg-surface-dark-1 border border-surface-dark-3 shadow-2xl rounded-2xl w-full",
                headerTitle: "text-white",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton: "border-white/10 hover:bg-white/5 text-gray-300",
                socialButtonsBlockButtonText: "font-semibold text-sm",
                dividerLine: "bg-white/10",
                dividerText: "text-gray-500",
                formFieldLabel: "text-gray-300",
                formFieldInput: "bg-[#0A0B0E] border-white/10 text-white focus:border-accent-violet",
                formButtonPrimary: "bg-accent-violet hover:bg-accent-violet/90 text-white font-semibold",
                footerActionText: "text-gray-400",
                footerActionLink: "text-accent-violet hover:text-accent-violet/80",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
