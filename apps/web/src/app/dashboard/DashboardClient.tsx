"use client";

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
  Search,
  LayoutGrid,
  Briefcase,
  Star,
  Activity,
  History,
  TrendingUp,
  Headphones,
  Settings,
  ChevronLeft,
  MoreVertical
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { trpc } from "../../lib/trpc";
import { formatDistanceToNow, format } from "date-fns";
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
    <div className="flex min-h-screen bg-[#0E0E12] text-white">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-[#1C1D22] bg-[#0E0E12] hidden lg:flex flex-col relative overflow-hidden shrink-0">
        {/* subtle gradient at top of sidebar */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#1E202B]/40 to-transparent pointer-events-none" />

        <div className="p-6 relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4A6BF3] to-[#8C52FE] flex items-center justify-center shadow-[0_0_15px_rgba(74,107,243,0.3)]">
              <Blocks className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-white tracking-wide leading-tight">SuperCanvas</div>
              <div className="text-[9px] text-[#8C93A1] uppercase tracking-widest mt-0.5 font-medium">Algorithmic Trading</div>
            </div>
          </Link>

          <div className="mb-6">
            <h2 className="text-[22px] font-medium text-white tracking-tight leading-[1.2]">
              Welcome<br />Back, {user?.firstName || "Trader"}
            </h2>
            {user?.lastSignInAt && (
              <p className="text-[11px] text-[#A0A5B1] mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                Last login: {format(new Date(user.lastSignInAt), "dd MMM yyyy")}
              </p>
            )}
            {!user?.lastSignInAt && (
              <p className="text-[11px] text-[#A0A5B1] mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                Online
              </p>
            )}
          </div>

          <button className="absolute top-6 right-[-12px] h-6 w-6 rounded-md bg-[#1C1D22] border border-[#2A2B32] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-20 cursor-pointer hover:bg-[#2A2B32] transition-colors">
            <ChevronLeft className="h-3 w-3 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 relative z-10 custom-scrollbar">
          {/* Base Navigation Group */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#8C93A1] font-semibold px-4 mb-3">Overview</div>
            <Link href="/dashboard" className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#22242D] to-[#12131A] text-white shadow-sm border border-[#313340] hover:-translate-y-[1px] transition-transform">
              <div className="flex items-center gap-3">
                <LayoutGrid className="h-4 w-4 text-white" />
                <span className="text-sm font-medium">Dashboard</span>
              </div>
              <div className="h-4 w-1 rounded-full bg-gradient-to-b from-[#FFF] to-[#8C93A1]"></div>
            </Link>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#8C93A1] font-semibold px-4 mb-3">Account</div>
            <div className="space-y-1">
              <Link href="/strategies" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <Briefcase className="h-[18px] w-[18px]" />
                <span className="text-sm">Strategies</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#627EEA] shadow-[0_0_8px_rgba(98,126,234,0.6)] ml-auto"></span>
              </Link>
              <Link href="/backtests" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <Activity className="h-[18px] w-[18px]" />
                <span className="text-sm">Backtests</span>
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <Star className="h-[18px] w-[18px]" />
                <span className="text-sm">Marketplace</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#8C93A1] font-semibold px-4 mb-3">Activity</div>
            <div className="space-y-1">
              <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <TrendingUp className="h-[18px] w-[18px]" />
                <span className="text-sm">Analytics</span>
                <span className="text-[10px] bg-[#1E202B] text-gray-300 px-1.5 py-0.5 rounded ml-auto border border-[#2A2B32]">Beta</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <History className="h-[18px] w-[18px]" />
                <span className="text-sm">History</span>
              </Link>
            </div>
          </div>

          <div className="pt-2 mt-2">
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#8C93A1] font-semibold px-4 mb-3">Others</div>
            <div className="space-y-1">
              <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <Headphones className="h-[18px] w-[18px]" />
                <span className="text-sm">Support</span>
                <span className="text-[10px] w-5 h-5 flex items-center justify-center rounded-md bg-[#22242D] border border-[#313340] ml-auto text-white">2</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
                <Settings className="h-[18px] w-[18px]" />
                <span className="text-sm">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden bg-[#0A0A0C]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1C1F33]/20 via-[#0A0A0C] to-[#0A0A0C] z-0 pointer-events-none" />

        {/* Top Header */}
        <header className="h-[76px] border-b border-[#1C1D22] flex items-center justify-between px-8 relative z-10 shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </Link>
            <span className="text-[#3A3B45]">/</span>
            <span className="text-[#8C93A1] font-medium">Overview</span>
            <span className="text-[#3A3B45]">/</span>
            <span className="font-semibold text-white">Dashboard</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C93A1]" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-[#121318] border border-[#22242D] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 outline-none focus:border-[#4A6BF3]/50 focus:bg-[#1A1C23] transition-all w-[240px] placeholder:text-[#5E6373] shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="flex items-center justify-center bg-[#22242D] border border-[#313340] rounded text-[10px] text-[#A0A5B1] px-1.5 py-0.5">⌘</span>
                <span className="flex items-center justify-center bg-[#22242D] border border-[#313340] rounded text-[10px] text-[#A0A5B1] px-1.5 py-0.5">K</span>
              </div>
            </div>

            {userProfile && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A2B32] bg-gradient-to-r from-[#1E202B] to-[#121318] shadow-sm text-xs font-semibold text-[#8C52FE]">
                <Zap className="h-[14px] w-[14px] text-[#8C52FE]" />
                {userProfile.creditsRemaining} CR
              </div>
            )}
            <div className="pl-4 border-l border-[#22242D] flex items-center">
              <UserButton afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-[34px] h-[34px] rounded-full ring-2 ring-[#22242D] shadow-md"
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 p-6 md:p-10 custom-scrollbar">

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]"></span>
                </span>
                <span className="text-[#8C93A1]">Last update: <strong className="text-white font-medium">2 min ago</strong></span>
              </div>

              <h1 className="text-[34px] font-semibold text-white leading-tight tracking-tight">SuperCanvas<br />Actions <span className="inline-block hover:scale-110 transition-transform cursor-pointer">🛠️</span></h1>
            </div>
          </div>

          {/* Big Action Cards Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 xl:grid-cols-[1fr_1fr_0.8fr] gap-6 mb-12 relative w-full">

            {/* 1) New Strategy Card */}
            <button
              onClick={() => createMutation.mutate({ name: "New Strategy" })}
              disabled={createMutation.isPending}
              className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-[#22242D] bg-gradient-to-b from-[#181A22] to-[#0F1015] p-6 text-left transition-all duration-300 hover:border-[#4A6BF3]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] box-border w-full h-[220px] flex flex-col justify-between"
            >
              <div className="absolute top-0 left-[-20%] w-[140%] h-[140%] bg-gradient-to-tr from-transparent via-[#E88C30]/5 to-[#E88C30]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#E88C30]/20 to-[#E88C30]/5 flex items-center justify-center border border-[#E88C30]/30 shadow-[0_0_15px_rgba(232,140,48,0.15)]">
                    <Plus className="h-[22px] w-[22px] text-[#E88C30]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Start Building</div>
                    <div className="text-[12px] text-[#8C93A1] font-medium">New Strategy</div>
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-[#1A1C23] border border-[#2A2B32] flex items-center justify-center text-[#8C93A1] group-hover:bg-[#22242D] group-hover:text-white transition-all shadow-sm">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-[#E88C30]" /> : <MoreVertical className="h-4 w-4" />}
                </div>
              </div>

              <div className="relative z-10 block mt-auto">
                <div className="text-[13px] text-[#8C93A1] mb-1 font-medium">Action</div>
                <div className="text-[28px] font-semibold tracking-tight text-white mb-5">Create Blank</div>

                {/* Decorative curve at the bottom */}
                <svg className="absolute bottom-[-24px] left-[-24px] w-[calc(100%+48px)] h-[80px] text-[#E88C30] pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 45 C40 30 60 50 100 25 C140 0 160 40 200 15 L200 60 L0 60 Z" fill="url(#grad_card1)" />
                  <path d="M0 45 C40 30 60 50 100 25 C140 0 160 40 200 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(232,140,48,0.5)]" />
                  <circle cx="100" cy="25" r="3" fill="#0A0A0C" stroke="currentColor" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(232,140,48,1)]" />
                  <circle cx="160" cy="32" r="2.5" fill="#0A0A0C" stroke="currentColor" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad_card1" x1="100" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
                      <stop stopColor="currentColor" stopOpacity="0.25" />
                      <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="flex gap-3 relative z-10">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#E88C30] bg-[#E88C30]/10 border border-[#E88C30]/20 px-2.5 py-1 rounded-[6px]">
                    <TrendingUp className="h-[10px] w-[10px]" /> Visual Editor
                  </span>
                </div>
              </div>
            </button>

            {/* 2) All Strategies Card */}
            <Link
              href="/strategies"
              className="group relative block overflow-hidden rounded-[24px] border border-[#22242D] bg-gradient-to-b from-[#181A22] to-[#0F1015] p-6 text-left transition-all duration-300 hover:border-[#627EEA]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] box-border w-full h-[220px] flex flex-col justify-between"
            >
              <div className="absolute top-0 left-[-20%] w-[140%] h-[140%] bg-gradient-to-tr from-transparent via-[#627EEA]/5 to-[#627EEA]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#627EEA]/20 to-[#627EEA]/5 flex items-center justify-center border border-[#627EEA]/30 shadow-[0_0_15px_rgba(98,126,234,0.15)]">
                    <BarChart3 className="h-[22px] w-[22px] text-[#627EEA]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">All Strategies</div>
                    <div className="text-[12px] text-[#8C93A1] font-medium">Workspace</div>
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-[#1A1C23] border border-[#2A2B32] flex items-center justify-center text-[#8C93A1] group-hover:bg-[#22242D] group-hover:text-white transition-all shadow-sm">
                  <MoreVertical className="h-4 w-4" />
                </div>
              </div>

              <div className="relative z-10 block mt-auto">
                <div className="text-[13px] text-[#8C93A1] mb-1 font-medium">Count</div>
                <div className="text-[28px] font-semibold tracking-tight text-white mb-5 flex items-baseline gap-2">
                  {isLoading ? "0" : (strategies?.length ?? "0")} <span className="text-base text-[#5E6373] font-medium">Models</span>
                </div>

                {/* Decorative fake chart curve */}
                <svg className="absolute bottom-[-24px] left-[-24px] w-[calc(100%+48px)] h-[80px] text-[#627EEA] pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 30 C30 20 60 40 100 15 C130 0 160 30 200 5 L200 60 L0 60 Z" fill="url(#grad_card2)" />
                  <path d="M0 30 C30 20 60 40 100 15 C130 0 160 30 200 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(98,126,234,0.5)]" />
                  <circle cx="100" cy="15" r="3" fill="#0A0A0C" stroke="currentColor" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(98,126,234,1)]" />
                  <circle cx="160" cy="23" r="2.5" fill="#0A0A0C" stroke="currentColor" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad_card2" x1="100" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
                      <stop stopColor="currentColor" stopOpacity="0.25" />
                      <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="flex gap-3 relative z-10">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2.5 py-1 rounded-[6px]">
                    <TrendingUp className="h-[10px] w-[10px] rotate-180" /> Manage
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#8C93A1] bg-[#1A1C23] border border-[#2A2B32] px-2.5 py-1 rounded-[6px]">
                    History
                  </span>
                </div>
              </div>
            </Link>

            {/* 3) Train ML Model Card (Hidden on small screens or full width) */}
            <div
              className="group relative overflow-hidden rounded-[24px] border border-[#22242D] bg-gradient-to-b from-[#181A22] to-[#0F1015] p-6 text-left opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-300 h-[220px] lg:col-span-2 xl:col-span-1 flex flex-col"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center border border-[#10B981]/30">
                    <Brain className="h-[22px] w-[22px] text-[#10B981]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Train ML Model</div>
                    <div className="text-[12px] text-[#8C93A1] font-medium">Coming Soon</div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-auto pb-4">
                <div className="text-sm font-medium text-[#5E6373]">Phase 4 Feature</div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="mt-6 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#5E6373]" />
              <span className="text-[13px] text-[#8C93A1] font-semibold uppercase tracking-wider">Live Updates</span>
            </div>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[24px] font-semibold text-white tracking-tight">Market Overview</h2>
              <Link
                href="/strategies"
                className="px-4 py-1.5 bg-[#1A1C23] border border-[#2A2B32] text-[13px] font-medium text-[#A0A5B1] rounded-[8px] hover:text-white hover:bg-[#22242D] transition-colors shadow-sm"
              >
                All
              </Link>
            </div>

            <div className="bg-[#121318] border border-[#1C1D22] rounded-[20px] overflow-hidden mt-2 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5E6373]" />
                </div>
              ) : recentStrategies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-16 w-16 mb-5 rounded-2xl bg-[#1A1C23] flex items-center justify-center border border-[#2A2B32] shadow-inner">
                    <Blocks className="h-8 w-8 text-[#5E6373]" />
                  </div>
                  <p className="text-[#A0A5B1] text-[15px] font-medium">No strategies yet.</p>
                  <p className="text-[13px] text-[#5E6373] mt-1 mb-8">
                    Create your first strategy to see it here.
                  </p>
                  <button
                    onClick={() => createMutation.mutate({ name: "My First Strategy" })}
                    className="px-6 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-gray-200 transition-colors shadow-[0_4px_14px_rgba(255,255,255,0.2)]"
                  >
                    Create now
                  </button>
                </div>
              ) : (
                <div className="w-full">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_2fr_1fr] md:grid-cols-[80px_2fr_1.5fr_1.5fr_1.5fr] items-center px-6 py-4 border-b border-[#1C1D22] text-[11px] font-bold text-[#5E6373] uppercase tracking-wider bg-[#0A0A0C]/40">
                    <div className="hidden md:block pl-2">No</div>
                    <div>Strategy name <span className="inline-block ml-1 opacity-50">↕</span></div>
                    <div>Price (Est) <span className="inline-block ml-1 opacity-50">↕</span></div>
                    <div className="hidden md:block">7D%</div>
                    <div className="text-right pr-4 hidden md:block">Status</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-[#1C1D22]">
                    {recentStrategies.map((strategy, idx) => (
                      <Link
                        key={strategy.id}
                        href={`/canvas/${strategy.id}`}
                        className="group grid grid-cols-[1fr_2fr_1fr] md:grid-cols-[80px_2fr_1.5fr_1.5fr_1.5fr] items-center px-6 py-[18px] hover:bg-[#181A22] transition-colors cursor-pointer"
                      >
                        <div className="text-[13px] font-medium text-[#5E6373] hidden md:block pl-2">#{idx + 1}</div>

                        <div className="flex items-center gap-3">
                          <div className="h-[34px] w-[34px] rounded-full bg-[#1A1C23] flex items-center justify-center border border-[#2A2B32] shadow-sm">
                            <Blocks className="h-[15px] w-[15px] text-[#4A6BF3]" />
                          </div>
                          <div>
                            <div className="text-[14px] font-semibold text-[#E2E8F0] group-hover:text-white transition-colors flex items-center gap-1.5">
                              {strategy.name} <span className="text-[10px] text-[#5E6373] font-medium bg-[#1A1C23] px-1.5 py-0.5 rounded border border-[#2A2B32]">v{strategy.version}</span>
                            </div>
                            <div className="text-[12px] text-[#8C93A1] md:hidden mt-0.5 truncate max-w-[120px]">
                              {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>

                        <div className="text-[14px] font-semibold text-white">
                          {/* Decorative price to match design visually, since Strategies don't have prices */}
                          $102,648.00
                        </div>

                        <div className="hidden md:block">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#10B981]/10 text-[#10B981] text-[11px] font-bold border border-[#10B981]/20">
                            +5.24%
                          </div>
                        </div>

                        <div className="text-[13px] font-medium text-[#8C93A1] truncate pr-4 text-right hidden md:block group-hover:text-white transition-colors">
                          {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
                        </div>

                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Global CSS overrides for scrollbar to match dark thin design */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1C1D22;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #2A2B32;
        }
      `}} />
    </div>
  );
}
