"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Blocks,
  Clock,
  Tag,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronLeft,
  Zap,
  LayoutGrid,
  Briefcase,
  Star,
  Activity,
  History,
  TrendingUp,
  Headphones,
  Settings,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { trpc } from "../../lib/trpc";
import { cn } from "@supercanvas/ui";
import { formatDistanceToNow, format } from "date-fns";

export function StrategiesPageClient() {
  const router = useRouter();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { data: userProfile } = trpc.user.me.useQuery();
  const { data: strategies, isLoading, refetch } = trpc.strategy.list.useQuery();
  const createMutation = trpc.strategy.create.useMutation({
    onSuccess: (strategy) => {
      router.push(`/canvas/${strategy.id}`);
    },
  });
  const deleteMutation = trpc.strategy.delete.useMutation({
    onSuccess: () => {
      setDeleteTargetId(null);
      refetch();
    },
  });

  const filtered = (strategies ?? []).filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

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
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-[#1A1C23] transition-colors font-medium">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#8C93A1] font-semibold px-4 mb-3">Account</div>
            <div className="space-y-1">
              <Link href="/strategies" className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#22242D] to-[#12131A] text-white shadow-sm border border-[#313340] hover:-translate-y-[1px] transition-transform">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-[18px] w-[18px] text-white" />
                  <span className="text-sm font-medium">Strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#627EEA] shadow-[0_0_8px_rgba(98,126,234,0.6)]"></span>
                  <div className="h-4 w-1 rounded-full bg-gradient-to-b from-[#FFF] to-[#8C93A1]"></div>
                </div>
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
         <header className="h-[76px] border-b border-[#1C1D22] flex items-center justify-between px-8 relative z-10 shrink-0 bg-[#0E0E12]/50 backdrop-blur-md">
           <div className="flex items-center gap-3 text-sm">
             <Link href="/dashboard" className="text-[#8C93A1] hover:text-white transition-colors flex items-center gap-1.5">
               <ChevronLeft className="h-4 w-4" />
               <span className="hidden sm:inline">Overview</span>
             </Link>
             <span className="text-[#3A3B45]">/</span>
             <span className="text-[#8C93A1] font-medium hidden sm:inline">Workspace</span>
             <span className="text-[#3A3B45] hidden sm:inline">/</span>
             <span className="font-semibold text-white cursor-pointer hover:underline text-[15px]">Strategies</span>
           </div>

           <div className="flex items-center gap-6">
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

         {/* Strategies Content */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 p-6 md:p-10 custom-scrollbar">
           
           {/* Page Header */}
           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
             <div>
               <div className="flex items-center gap-2 mb-1.5 text-sm">
                 <Briefcase className="h-4 w-4 text-[#627EEA]" />
                 <span className="text-[#8C93A1] font-medium tracking-wide uppercase text-[12px]">Workspace</span>
               </div>
               <h1 className="text-[34px] font-semibold text-white leading-tight tracking-tight">Your Strategies</h1>
               <p className="mt-1 text-[#5E6373] text-[15px]">
                 {strategies?.length ?? 0} strateg{strategies?.length === 1 ? "y" : "ies"} found
               </p>
             </div>
             
             <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative text-sm">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C93A1]" />
                  <input
                    type="text"
                    placeholder="Search name or tag..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-[220px] rounded-[10px] border border-[#22242D] bg-[#121318] py-2.5 pl-10 pr-4 text-[13px] font-medium text-white placeholder:text-[#5E6373] focus:border-[#627EEA]/50 focus:bg-[#1A1C23] focus:outline-none focus:ring-1 focus:ring-[#627EEA]/20 transition-all shadow-inner"
                  />
                </div>
               <button
                 onClick={() => setShowCreateModal(true)}
                 className="flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#627EEA] to-[#4A6BF3] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:shadow-[0_4px_16px_rgba(98,126,234,0.4)] transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
               >
                 <Plus className="h-4 w-4" />
                 New Strategy
               </button>
             </div>
           </div>

           {/* Strategy grid */}
           {isLoading ? (
             <div className="flex items-center justify-center py-32">
               <Loader2 className="h-8 w-8 animate-spin text-[#5E6373]" />
             </div>
           ) : filtered.length === 0 ? (
             <EmptyState
               hasSearch={!!search}
               onCreate={() => setShowCreateModal(true)}
             />
           ) : (
             <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
               {filtered.map((strategy) => (
                 <StrategyCard
                   key={strategy.id}
                   strategy={strategy}
                   menuOpen={menuOpenId === strategy.id}
                   onMenuToggle={(id) => setMenuOpenId(menuOpenId === id ? null : id)}
                   onDelete={() => setDeleteTargetId(strategy.id)}
                 />
               ))}
             </div>
           )}
         </div>

      </main>

      {/* Create modal */}
      {showCreateModal && (
        <CreateStrategyModal
          isLoading={createMutation.isPending}
          onCreate={(name, description) =>
            createMutation.mutate({ name, description })
          }
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteTargetId && (
        <DeleteConfirmModal
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: deleteTargetId })}
          onClose={() => setDeleteTargetId(null)}
        />
      )}
      
      {/* Global CSS overrides for scrollbar to match dark thin design */}
      <style dangerouslySetInnerHTML={{__html:`
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

// ── Strategy Card ─────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
  menuOpen,
  onMenuToggle,
  onDelete,
}: {
  strategy: {
    id: string;
    name: string;
    description?: string | null;
    version: number;
    tags?: string[] | null;
    updatedAt: Date;
  };
  menuOpen: boolean;
  onMenuToggle: (id: string) => void;
  onDelete: () => void;
}) {
  return (
    <Link
      href={`/canvas/${strategy.id}`}
      className={cn(
        "group relative flex flex-col rounded-[20px] border border-[#1C1D22] bg-[#121318] p-6 shrink-0",
        "hover:border-[#627EEA]/40 hover:bg-[#15161C] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
        "transition-all duration-300"
      )}
    >
      {/* Icon + menu */}
      <div className="mb-5 flex items-start justify-between relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22242D] to-[#1A1C23] border border-[#2A2B32] shadow-inner group-hover:border-[#627EEA]/30 transition-colors">
          <Blocks className="h-5 w-5 text-[#627EEA]" />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onMenuToggle(strategy.id);
          }}
          className="rounded-lg p-2 text-[#8C93A1] opacity-60 group-hover:opacity-100 hover:bg-[#22242D] hover:text-white transition-all border border-transparent hover:border-[#313340]"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            onClick={(e) => e.preventDefault()}
            className="absolute right-0 top-12 z-50 min-w-[160px] rounded-xl border border-[#313340] bg-[#1A1C23] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2"
          >
            <Link
              href={`/canvas/${strategy.id}`}
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#E2E8F0] hover:bg-[#22242D] hover:text-white transition-colors"
            >
              <ExternalLink className="h-[14px] w-[14px] text-[#627EEA]" />
              Open Canvas
            </Link>
            <div className="my-[2px] h-px bg-[#313340] mx-2" />
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
            >
              <Trash2 className="h-[14px] w-[14px]" />
              Delete Strategy
            </button>
          </div>
        )}
      </div>

      {/* Name + description */}
      <h3 className="mb-2 text-[18px] font-semibold text-white group-hover:text-[#627EEA] transition-colors line-clamp-1 decoration-[#627EEA]/30 group-hover:underline underline-offset-4">
        {strategy.name}
      </h3>
      {strategy.description ? (
        <p className="mb-5 text-[13px] text-[#8C93A1] line-clamp-2 leading-relaxed">
          {strategy.description}
        </p>
      ) : (
        <p className="mb-5 text-[13px] text-[#5E6373] italic">
          No description provided.
        </p>
      )}

      {/* Tags */}
      {strategy.tags && strategy.tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {strategy.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2A2B32] bg-[#1A1C23] px-2 py-1 text-[10px] font-semibold text-[#A0A5B1] uppercase tracking-wider shadow-sm"
            >
              <Tag className="h-2.5 w-2.5 text-[#5E6373]" />
              {tag}
            </span>
          ))}
          {strategy.tags.length > 3 && (
            <span className="inline-flex items-center rounded-md border border-[#2A2B32] bg-[#1A1C23] px-1.5 py-1 text-[10px] font-semibold text-[#5E6373]">
              +{strategy.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-[#1C1D22] flex items-center justify-between text-[11px] font-medium text-[#5E6373] group-hover:text-[#8C93A1] transition-colors">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
        </span>
        <span className="bg-[#1A1C23] px-1.5 py-0.5 rounded border border-[#2A2B32]">v{strategy.version}.0</span>
      </div>
    </Link>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  onCreate,
}: {
  hasSearch: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center bg-[#121318] border border-[#1C1D22] rounded-[24px]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-dashed border-[#313340] bg-[#1A1C23]">
        <Blocks className="h-10 w-10 text-[#5E6373]" />
      </div>
      {hasSearch ? (
        <p className="text-[15px] font-medium text-[#8C93A1]">No strategies match "<strong>{hasSearch}</strong>"</p>
      ) : (
        <>
          <p className="mb-2 text-lg font-semibold text-white">
            Workspace is empty
          </p>
          <p className="mb-8 text-[14px] text-[#5E6373] max-w-sm">
            Create your first algorithmic trading strategy to start building without code.
          </p>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#627EEA] to-[#4A6BF3] px-6 py-3 text-[14px] font-semibold text-white hover:shadow-[0_4px_20px_rgba(98,126,234,0.4)] transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-[18px] w-[18px]" />
            Create First Strategy
          </button>
        </>
      )}
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────

function CreateStrategyModal({
  isLoading,
  onCreate,
  onClose,
}: {
  isLoading: boolean;
  onCreate: (name: string, description?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-[24px] border border-[#313340] bg-[#121318] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
        <h2 className="mb-1 text-xl font-semibold text-white tracking-tight">New Strategy</h2>
        <p className="mb-6 text-[13px] text-[#8C93A1]">
          Launch a new blank canvas.
        </p>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-bold text-[#A0A5B1] uppercase tracking-wider">
              Strategy Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Golden Cross RSI Filter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onCreate(name.trim(), description || undefined);
              }}
              maxLength={255}
              className="w-full rounded-[12px] border border-[#313340] bg-[#1A1C23] px-4 py-3 text-[14px] text-white placeholder:text-[#5E6373] focus:border-[#627EEA] focus:outline-none focus:ring-2 focus:ring-[#627EEA]/20 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="mb-2 block text-[12px] font-bold text-[#A0A5B1] uppercase tracking-wider">
              Description{" "}
              <span className="text-[#5E6373] font-medium lowercase tracking-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="What does this strategy do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[12px] border border-[#313340] bg-[#1A1C23] px-4 py-3 text-[14px] text-white placeholder:text-[#5E6373] focus:border-[#627EEA] focus:outline-none focus:ring-2 focus:ring-[#627EEA]/20 transition-all shadow-inner resize-none custom-scrollbar"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-[10px] px-5 py-2.5 text-[14px] font-medium text-[#A0A5B1] hover:bg-[#22242D] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), description || undefined)}
            disabled={!name.trim() || isLoading}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#627EEA] to-[#4A6BF3] px-5 py-2.5 text-[14px] font-semibold text-white hover:shadow-[0_4px_16px_rgba(98,126,234,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────

function DeleteConfirmModal({
  isLoading,
  onConfirm,
  onClose,
}: {
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[24px] border border-[#313340] bg-[#121318] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
        <h2 className="mb-2 text-xl font-semibold text-white">Delete Strategy?</h2>
        <p className="mb-8 text-[14px] text-[#A0A5B1] leading-relaxed">
          This will <strong className="text-white">permanently delete</strong> the strategy, all version history, and associated backtests. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-[10px] px-4 py-2.5 text-[14px] font-medium text-[#A0A5B1] hover:bg-[#22242D] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-[10px] bg-[#EF4444] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#DC2626] hover:shadow-[0_4px_16px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
