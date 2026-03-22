import Link from "next/link";
import {
  ArrowRight,
  Zap,
  BarChart3,
  Brain,
  Shield,
  Blocks,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-dark-0">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full glass border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center">
              <Blocks className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SuperCanvas</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="btn-ghost text-gray-300">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn-primary">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-600/20 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent-violet/20 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-accent-cyan/10 blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
            <Zap className="h-4 w-4" />
            <span>Phase 0 — Foundation Complete</span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white md:text-7xl">
            Build Smarter.{" "}
            <span className="gradient-text">Trade Better.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 md:text-xl">
            No-code algorithmic trading platform. Design strategies visually,
            backtest with millisecond precision, and deploy to live markets —
            all without writing a single line of code.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/sign-up" className="btn-primary px-8 py-3 text-base">
              Start Building Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="#features" className="btn-secondary px-8 py-3 text-base">
              See Features
            </Link>
          </div>
        </div>

        {/* Metrics bar */}
        <div className="relative z-10 mt-20 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { label: "Backtest Speed", value: "<200ms", icon: Zap },
            { label: "Strategy Nodes", value: "50+", icon: Blocks },
            { label: "ML Models", value: "Built-in", icon: Brain },
            { label: "Uptime", value: "99.9%", icon: Shield },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-hover flex flex-col items-center p-6 text-center dark:bg-surface-dark-1/50 dark:border-surface-dark-3/50"
            >
              <stat.icon className="mb-3 h-6 w-6 text-brand-400" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Everything you need to build{" "}
              <span className="gradient-text">winning strategies</span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              From visual design to live deployment — all in one platform.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Visual Strategy Builder",
                description:
                  "Drag-and-drop node editor with 50+ indicators, signals, and execution blocks. Type-safe connections prevent errors.",
                icon: Blocks,
                color: "text-brand-400",
                bg: "bg-brand-500/10",
              },
              {
                title: "Millisecond Backtesting",
                description:
                  "Tick-accurate historical replay with realistic slippage, fees, and market impact modeling. Results in under 200ms.",
                icon: Zap,
                color: "text-accent-cyan",
                bg: "bg-accent-cyan/10",
              },
              {
                title: "Built-in ML Pipelines",
                description:
                  "AutoML, XGBoost, LSTM, and more as drag-and-drop nodes. Train, evaluate, and deploy models without Python.",
                icon: Brain,
                color: "text-accent-violet",
                bg: "bg-accent-violet/10",
              },
              {
                title: "Strategy Marketplace",
                description:
                  "Buy, sell, and subscribe to verified strategies. Platform-verified backtest results and forward-test badges.",
                icon: TrendingUp,
                color: "text-accent-emerald",
                bg: "bg-accent-emerald/10",
              },
              {
                title: "Live Trading",
                description:
                  "One-click deploy to paper or live trading. Integrations with Alpaca, Zerodha, and Interactive Brokers.",
                icon: BarChart3,
                color: "text-accent-amber",
                bg: "bg-accent-amber/10",
              },
              {
                title: "Enterprise Security",
                description:
                  "AES-256 strategy encryption, sandboxed execution, RBAC, and SOC 2 compliant infrastructure.",
                icon: Shield,
                color: "text-red-400",
                bg: "bg-red-500/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card-hover group p-8 dark:bg-surface-dark-1/50 dark:border-surface-dark-3/50"
              >
                <div
                  className={`mb-4 inline-flex items-center justify-center rounded-xl ${feature.bg} p-3`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-brand-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-dark-3 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Blocks className="h-5 w-5 text-brand-400" />
            <span className="font-semibold text-white">SuperCanvas</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 SuperCanvas Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
