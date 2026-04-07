import Link from "next/link";
import {
  ArrowRight,
  Zap,
  BarChart3,
  Brain,
  Shield,
  Cloud,
  Terminal,
  Activity,
  LineChart,
  Workflow,
  Users,
  AlertOctagon,
  Sparkles,
  Database,
  CheckCircle2,
  Globe,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0B0E] text-white font-sans selection:bg-accent-violet/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0A0B0E]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="w-6 h-6 rounded bg-white text-[#0A0B0E] flex items-center justify-center font-bold text-xs">
              S
            </div>
            Supercanvas
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="#docs" className="hover:text-white transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/sign-in" className="text-gray-400 hover:text-white transition-colors">
              LOGIN
            </Link>
            <Link href="/sign-up" className="rounded-md bg-accent-violet px-4 py-2 text-white hover:bg-accent-violet/90 transition-colors shadow-lg shadow-accent-violet/20 font-semibold">
              START TRADING
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-20 mt-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-violet/20 blur-[120px] rounded-[100%] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-gray-400 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-accent-violet" />
            NOW ON BETA
          </div>

          <h1 className="mb-6 text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tight text-white leading-[1.1]">
            Build, Backtest, <span className="text-accent-violet drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]">Deploy Algos</span><br className="hidden md:block" />
            in Seconds.
          </h1>

          <p className="mb-10 max-w-2xl text-lg md:text-xl text-gray-400 font-light leading-relaxed px-4">
            The first cloud-native, ML-powered no-code trading platform. Drag-and-drop your way to market efficiency.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 relative z-20">
            <Link href="/sign-up" className="w-full sm:w-auto rounded-lg bg-accent-violet px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-5px_rgba(139,92,246,0.6)] hover:bg-accent-violet/90 transition-all">
              Start Building for Free
            </Link>
            <Link href="#marketplace" className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all backdrop-blur-md">
              Explore the Marketplace
            </Link>
          </div>
        </div>

        {/* Dashboard Mockup Center */}
        <div className="relative z-10 w-full max-w-[1000px] mx-auto mt-4 px-4 sm:px-0">
          <div className="absolute inset-0 top-10 rounded-3xl bg-gradient-to-b from-accent-violet/20 to-transparent blur-3xl opacity-80 translate-y-10" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0A0B0E]/90 p-2 shadow-2xl backdrop-blur-xl">
            {/* Window control bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#050505]/50 rounded-t-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Visual Algo Builder
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
              </div>
            </div>

            {/* The Builder Content from Original */}
            <div className="relative h-[400px] md:h-[500px] w-full rounded-b-xl bg-[#08090C] overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              {/* Nodes Mock */}
              <div className="absolute top-6 left-6 w-56 rounded-xl border border-white/10 bg-[#161821] shadow-2xl overflow-hidden z-20 group hover:-translate-y-1 transition-transform">
                <div className="bg-[#1C1E29] px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-accent-violet" />
                  <span className="font-semibold text-white tracking-wider text-[11px] uppercase">ML Nodes</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="rounded-md border border-white/5 bg-[#0A0B0E] p-2.5 text-xs text-gray-300 shadow-sm cursor-pointer hover:border-accent-violet/50 transition-colors">Sentiment Analysis</div>
                  <div className="rounded-md border border-white/5 bg-[#0A0B0E] p-2.5 text-xs text-gray-300 shadow-sm cursor-pointer hover:border-accent-violet/50 transition-colors">Volatility Predictor</div>
                  <div className="rounded-md border border-accent-violet/30 bg-[#0A0B0E] p-2.5 text-xs text-gray-300 shadow-sm z-30 relative ring-1 ring-accent-violet/20">Regime Filter</div>
                </div>
              </div>

              <div className="absolute top-24 left-[340px] flex w-40 flex-col items-center justify-center rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-xs z-20 shadow-[0_0_30px_rgba(92,124,250,0.15)] hover:bg-brand-500/20 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-brand-400 font-bold mb-2 flex items-center gap-1">INPUT</div>
                <div className="text-white font-medium">BTC-USD Stream</div>
                <div className="mt-2 text-[9px] text-gray-400">Live Tick Data</div>
              </div>

              <div className="absolute top-[280px] left-[400px] w-48 rounded-xl border border-red-500/30 bg-red-500/10 p-4 shadow-[0_0_30px_rgba(239,68,68,0.15)] text-xs z-20 hover:bg-red-500/20 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-red-500 font-bold mb-2 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> RISK CONTROL</div>
                <div className="text-white font-medium">Global Stop Loss</div>
                <div className="mt-2 text-[9px] text-gray-400 flex justify-between"><span>Threshold:</span><span className="text-red-400">-2.0%</span></div>
              </div>

              <div className="absolute top-[160px] left-[650px] flex w-48 flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs z-20 shadow-[0_0_40px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20 transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> EXECUTION</div>
                <div className="text-white font-medium text-sm">Auto-Execute</div>
                <div className="mt-3 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded w-full text-center text-[10px] font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> System Active
                </div>
              </div>

              {/* Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                {/* ML Nodes to Input */}
                <path d="M 248 110 C 290 110, 300 135, 340 135" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" strokeDasharray="4 4" className="animate-[pulse_2s_linear_infinite]" />
                {/* Input to Signal */}
                <path d="M 500 135 C 550 135, 580 190, 650 190" fill="none" stroke="rgba(92,124,250,0.5)" strokeWidth="2.5" />
                {/* ML Nodes to Risk Controls */}
                <path d="M 248 160 C 280 160, 320 310, 400 310" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" strokeDasharray="4 4" className="animate-[pulse_2s_linear_infinite]" />
                {/* Risk Controls to Signal */}
                <path d="M 592 310 C 620 310, 620 220, 650 220" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Cloud */}
      <section className="py-12 border-b border-white/5 opacity-70 mt-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-widest mb-8">Natively integrated with top exchanges</div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-20 grayscale opacity-80">
            <div className="text-xl font-bold font-serif italic text-white flex items-center gap-2"><Globe className="w-6 h-6" /> Binance</div>
            <div className="text-xl font-bold font-sans text-gray-300 flex items-center gap-2"><Cloud className="w-6 h-6" /> Coinbase Pro</div>
            <div className="text-xl font-extrabold tracking-tighter text-gray-300 flex items-center gap-2"><Activity className="w-6 h-6" /> Kraken</div>
            <div className="text-xl font-medium tracking-widest text-gray-300 flex items-center gap-2"><Terminal className="w-6 h-6" /> Bybit</div>
            <div className="text-xl text-gray-300 font-semibold flex items-center gap-2"><Database className="w-6 h-6" /> OKX</div>
          </div>
        </div>
      </section>

      {/* Features Centered Header */}
      <section id="features" className="py-24 px-6 relative cursor-default">
        <div className="max-w-3xl mx-auto text-center mb-24 relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-accent-violet">
            <Zap className="h-3.5 w-3.5" />
            Features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Visually intuitive.<br />
            <span className="text-brand-400">Blazingly fast.</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Design cutting-edge algorithms visually and test them against decades of historical data using our highly optimized engines.
          </p>
        </div>

        {/* Alternating Feature 1 */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
          <div className="pl-0 md:pl-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-400">
              <Activity className="h-4 w-4 text-emerald-400" />
              KINETIC VAULT ENGINE
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
              Millisecond <span className="text-emerald-400">Backtesting</span>
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              Run 10 years of tick data in under 400ms using our Kinetic Vault engine. Analyze performance deeply and uncover hidden edge in real historical scenarios effortlessly.
            </p>
          </div>

          {/* Backtest Mock Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
            <div className="relative rounded-3xl border border-white/10 bg-[#161821] p-8 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8">
                <Zap className="w-7 h-7 text-emerald-400" />
              </div>

              <div className="space-y-6 flex-1 flex flex-col justify-end relative z-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-5">
                  <span className="text-gray-400 text-sm">Execution Speed</span>
                  <span className="text-3xl font-bold text-emerald-400">0.38ms</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-5">
                  <span className="text-gray-400 text-sm">Sharpe Ratio</span>
                  <span className="text-3xl font-bold text-white">4.21</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-gray-400 text-sm">Max Drawdown</span>
                  <span className="text-3xl font-bold text-red-500">-2.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alternating Feature 2 */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32 md:flex-row-reverse">
          <div className="relative md:order-1">
            <div className="absolute inset-0 right-10 bg-brand-500/10 blur-3xl rounded-full" />
            {/* Marketplace Mocks */}
            <div className="relative space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#161821] p-6 shadow-2xl backdrop-blur-xl relative transform transition-transform hover:-translate-y-2 cursor-pointer z-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-[40px]" />
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                      <LineChart className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Momentum Scalper</h4>
                      <p className="text-xs text-gray-400">Neural net high freq scalper</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    +34.5% APY
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#161821] p-6 shadow-2xl backdrop-blur-xl relative transform transition-transform hover:-translate-y-2 cursor-pointer opacity-90 scale-[0.98] -translate-to-y-2 z-10 mx-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet">
                      <Workflow className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Alpha Arb</h4>
                      <p className="text-xs text-gray-400">Statistical arbitrage</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    +18.6% APY
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pr-0 md:pr-10 md:order-2">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-400">
              <Shield className="h-4 w-4 text-brand-400" />
              MARKETPLACE
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
              Algorithms, <span className="text-brand-400">ready to deploy.</span>
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              Deploy battle-tested community algos with a single click and absolute confidence. Never build from scratch unless you want to.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Bento Section */}
      <section className="px-6 py-20 pb-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Architecture that is <span className="text-accent-violet drop-shadow-sm">scalable.</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Enterprise-grade infrastructure giving you the edge in competitive markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px]">
            {/* Global Deployment */}
            <div className="md:col-span-2 rounded-3xl border border-white/5 bg-[#161821]/50 backdrop-blur-xl p-8 hover:border-white/10 transition-colors relative overflow-hidden group">
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="w-12 h-12 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Global Deployment</h3>
                  <p className="text-gray-400 text-sm max-w-md">Co-located servers next to 40+ global exchanges for absolute minimum latency.</p>
                </div>
              </div>
            </div>

            {/* Bank-Grade Vault */}
            <div className="md:col-span-1 rounded-3xl border border-white/5 bg-[#161821]/50 backdrop-blur-xl p-8 hover:border-white/10 transition-colors relative overflow-hidden group">
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Bank-Grade Vault</h3>
                  <p className="text-gray-400 text-sm">Multi-sig MPC infrastructure for API security and absolute fund safety.</p>
                </div>
              </div>
            </div>

            {/* 99.99% Uptime */}
            <div className="md:col-span-1 rounded-3xl border border-white/5 bg-[#161821]/50 backdrop-blur-xl p-8 hover:border-white/10 transition-colors relative overflow-hidden group">
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">99.99% Uptime</h3>
                  <p className="text-gray-400 text-sm">Self-healing docker architecture for 24/7 non-stop trading operations.</p>
                </div>
              </div>
            </div>

            {/* Extensible API */}
            <div className="md:col-span-2 rounded-3xl border border-white/5 bg-[#161821]/50 backdrop-blur-xl p-8 hover:border-white/10 transition-colors relative overflow-hidden group">
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Extensible API</h3>
                  <p className="text-gray-400 text-sm max-w-md">Connect custom data sources, proprietary endpoints, and private indicators seamlessly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-32 overflow-hidden bg-gradient-to-b from-[#0A0B0E] to-[#161821]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none hidden md:flex">
          <div className="w-[800px] h-[400px] bg-accent-violet/15 blur-[120px] rounded-full opacity-60 mix-blend-screen" />
        </div>

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-12 md:p-20 text-center relative overflow-hidden backdrop-blur-md transition-all duration-500 hover:border-white/10 hover:shadow-[0_0_80px_-20px_rgba(109,40,217,0.3)]">

            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 relative z-10">
              Ready to <span className="text-accent-violet drop-shadow-lg">Supercharge</span><br className="hidden md:block" /> Your Trading?
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 relative z-10 font-light">
              Join elite quants and start building automated, high-frequency algorithms with zero code. The future of trading is visual.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-accent-violet px-8 py-4 text-sm font-bold text-white shadow-[0_0_40px_-10px_rgba(109,40,217,0.5)] hover:shadow-[0_0_60px_-15px_rgba(109,40,217,0.7)] hover:-translate-y-1 hover:bg-accent-violet/90 transition-all duration-300">
                Get Started for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0A0B0E] border-t border-white/5 pt-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-0 lg:divide-x lg:divide-white/5 border-b border-white/5 pb-16">
            
            {/* Branding Column */}
            <div className="lg:col-span-4 lg:pr-12 flex flex-col justify-between h-full min-h-[240px]">
              <div>
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-6 h-6 rounded bg-white text-[#0A0B0E] flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <span className="text-sm font-bold tracking-widest text-white uppercase">
                    Supercanvas
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-medium text-gray-200 tracking-tight max-w-[280px] leading-tight mb-8 lg:mb-0">
                  High-frequency trading,<br />everywhere you look.
                </h3>
              </div>
              <div className="text-[11px] text-gray-500 font-medium tracking-wide">
                Builders of Supercanvas® apps
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3">
              
              {/* Column 1 */}
              <div className="lg:px-12 py-6 lg:py-0 border-t sm:border-t-0 border-white/5 sm:border-r border-white/5 sm:pr-8">
                <h4 className="text-[13px] font-semibold text-white mb-6">Products</h4>
                <ul className="space-y-4 text-[13.5px]">
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Supercanvas Go</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Algorithm Builder</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Data Vault</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Supercanvas API</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Agent Store</Link></li>
                </ul>
              </div>

              {/* Column 2 */}
              <div className="lg:px-12 py-6 lg:py-0 border-t sm:border-t-0 border-white/5 sm:border-r border-white/5 sm:px-8">
                <h4 className="text-[13px] font-semibold text-white mb-6">Company</h4>
                <ul className="space-y-4 text-[13.5px]">
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                  <li><Link href="#" className="group text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1">Careers <ArrowRight className="w-3 h-3 -rotate-45 opacity-50 group-hover:opacity-100 transition-opacity" /></Link></li>
                </ul>
              </div>

              {/* Column 3 */}
              <div className="lg:px-12 py-6 lg:py-0 border-t sm:border-t-0 border-white/5 sm:pl-8">
                <h4 className="text-[13px] font-semibold text-white mb-6">Legal</h4>
                <ul className="space-y-4 text-[13.5px]">
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Terms</Link></li>
                  <li><Link href="#" className="group text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1">Privacy Policy <ArrowRight className="w-3 h-3 -rotate-45 opacity-50 group-hover:opacity-100 transition-opacity" /></Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Trust</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Customer Business Agreement</Link></li>
                  <li className="pt-2">
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                       <div className="w-8 h-4 rounded-full bg-[#1A73E8] flex items-center justify-between p-[2px] shrink-0">
                         <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center">
                           <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] text-[#1A73E8] fill-current" ><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                         </div>
                         <div className="w-3 h-3 rounded-full flex items-center justify-center text-white shrink-0">
                           <svg viewBox="0 0 24 24" className="w-2 h-2 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                         </div>
                       </div>
                       Your Privacy Choices
                    </Link>
                  </li>
                </ul>
              </div>

            </div>
          </div>
          <div className="h-24 sm:h-32"></div> {/* Spacing to ensure the massive text fits below content nicely */}
        </div>

        {/* Massive Watermark Text */}
        <div className="absolute -bottom-4 sm:-bottom-8 inset-x-0 overflow-hidden pointer-events-none flex justify-center">
          <div className="text-[16vw] font-black text-white/[0.02] tracking-tighter leading-none select-none whitespace-nowrap">
            SUPERCANVAS
          </div>
        </div>
      </footer>
    </div>
  );
}
