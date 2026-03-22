import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Blocks, BarChart3, Brain, Settings, Plus } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-surface-dark-0">
      {/* ── Dashboard Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-surface-dark-3 bg-surface-dark-0/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center">
                <Blocks className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SuperCanvas</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="btn-ghost text-sm text-white bg-surface-dark-2">
                Dashboard
              </Link>
              <Link href="/dashboard" className="btn-ghost text-sm text-gray-400">
                Strategies
              </Link>
              <Link href="/dashboard" className="btn-ghost text-sm text-gray-400">
                Backtests
              </Link>
              <Link href="/dashboard" className="btn-ghost text-sm text-gray-400">
                Marketplace
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="badge-info">
              100 credits
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* ── Dashboard Content ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user.firstName || "Trader"} 👋
          </h1>
          <p className="mt-1 text-gray-400">
            Build, test, and deploy your trading strategies.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <button className="card-hover group flex items-center gap-4 p-5 text-left dark:bg-surface-dark-1 dark:border-surface-dark-3">
            <div className="rounded-xl bg-brand-500/10 p-3">
              <Plus className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                New Strategy
              </div>
              <div className="text-sm text-gray-500">
                Create with node editor
              </div>
            </div>
          </button>

          <button className="card-hover group flex items-center gap-4 p-5 text-left dark:bg-surface-dark-1 dark:border-surface-dark-3">
            <div className="rounded-xl bg-accent-cyan/10 p-3">
              <BarChart3 className="h-6 w-6 text-accent-cyan" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-accent-cyan transition-colors">
                Run Backtest
              </div>
              <div className="text-sm text-gray-500">
                Test your strategies
              </div>
            </div>
          </button>

          <button className="card-hover group flex items-center gap-4 p-5 text-left dark:bg-surface-dark-1 dark:border-surface-dark-3">
            <div className="rounded-xl bg-accent-violet/10 p-3">
              <Brain className="h-6 w-6 text-accent-violet" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-accent-violet transition-colors">
                Train ML Model
              </div>
              <div className="text-sm text-gray-500">
                AutoML & deep learning
              </div>
            </div>
          </button>
        </div>

        {/* Activity + Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Strategies */}
          <div className="card dark:bg-surface-dark-1 dark:border-surface-dark-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Recent Strategies
              </h2>
              <button className="text-sm text-brand-400 hover:text-brand-300">
                View all
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-12 text-gray-500">
                <div className="text-center">
                  <Blocks className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                  <p className="text-sm">No strategies yet.</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Create your first strategy to get started.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Backtests */}
          <div className="card dark:bg-surface-dark-1 dark:border-surface-dark-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Recent Backtests
              </h2>
              <button className="text-sm text-brand-400 hover:text-brand-300">
                View all
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-12 text-gray-500">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                  <p className="text-sm">No backtests yet.</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Run your first backtest to see results here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
