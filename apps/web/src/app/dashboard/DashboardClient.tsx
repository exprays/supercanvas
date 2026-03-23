"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Dashboard Page (Client)
// Shows real strategy data + quick actions
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Blocks,
  BarChart3,
  Brain,
  Plus,
  Clock,
  ArrowRight,
  Loader2,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { trpc } from "../../lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@supercanvas/ui";

export function DashboardClient() {
  const router = useRouter();
  const { user } = useUser();
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery();
  const { data: userProfile } = trpc.user.me.useQuery();
  const createMutation = trpc.strategy.create.useMutation({
    onSuccess: (strategy) => router.push(`/canvas/${strategy.id}`),
  });

  const recentStrategies = strategies?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen bg-surface-dark-0">
      {/* Nav */}
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
              <Link href="/strategies" className="btn-ghost text-sm text-gray-400">
                Strategies
              </Link>
              <Link href="/backtests" className="btn-ghost text-sm text-gray-400">
                Backtests
              </Link>
              <Link href="/dashboard" className="btn-ghost text-sm text-gray-400">
                Marketplace
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="badge-info flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                {userProfile.creditsRemaining} credits
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.firstName || "Trader"} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Build, test, and deploy your trading strategies.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <button
            onClick={() =>
              createMutation.mutate({ name: "New Strategy" })
            }
            disabled={createMutation.isPending}
            className="card-hover group flex items-center gap-4 p-5 text-left dark:bg-surface-dark-1 dark:border-surface-dark-3 disabled:opacity-60"
          >
            <div className="rounded-xl bg-brand-500/10 p-3">
              {createMutation.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
              ) : (
                <Plus className="h-6 w-6 text-brand-400" />
              )}
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                New Strategy
              </div>
              <div className="text-sm text-gray-500">Create with node editor</div>
            </div>
          </button>

          <Link
            href="/strategies"
            className="card-hover group flex items-center gap-4 p-5 dark:bg-surface-dark-1 dark:border-surface-dark-3"
          >
            <div className="rounded-xl bg-accent-cyan/10 p-3">
              <BarChart3 className="h-6 w-6 text-accent-cyan" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-accent-cyan transition-colors">
                All Strategies
              </div>
              <div className="text-sm text-gray-500">
                {strategies?.length ?? "–"} strategies
              </div>
            </div>
          </Link>

          <button className="card-hover group flex items-center gap-4 p-5 text-left dark:bg-surface-dark-1 dark:border-surface-dark-3 opacity-50 cursor-not-allowed">
            <div className="rounded-xl bg-accent-violet/10 p-3">
              <Brain className="h-6 w-6 text-accent-violet" />
            </div>
            <div>
              <div className="font-semibold text-white">Train ML Model</div>
              <div className="text-sm text-gray-500">Coming in Phase 4</div>
            </div>
          </button>
        </div>

        {/* Recent Strategies */}
        <div className="card dark:bg-surface-dark-1 dark:border-surface-dark-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Recent Strategies</h2>
            <Link
              href="/strategies"
              className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : recentStrategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Blocks className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-500">No strategies yet.</p>
              <p className="text-xs text-gray-600 mt-1">
                Create your first strategy to get started.
              </p>
              <button
                onClick={() => createMutation.mutate({ name: "My First Strategy" })}
                className="mt-4 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                + Create now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStrategies.map((strategy) => (
                <Link
                  key={strategy.id}
                  href={`/canvas/${strategy.id}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3",
                    "hover:bg-surface-dark-2 transition-colors group"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                      <Blocks className="h-4 w-4 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">
                        {strategy.name}
                      </p>
                      <p className="text-xs text-gray-600">v{strategy.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(strategy.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
