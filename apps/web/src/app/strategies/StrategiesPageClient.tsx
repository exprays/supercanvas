"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Strategies Page Client
// Lists strategies, create/delete/open flows
// ─────────────────────────────────────────────

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
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { trpc } from "../../lib/trpc";
import { cn } from "@supercanvas/ui";
import { formatDistanceToNow } from "date-fns";

export function StrategiesPageClient() {
  const router = useRouter();
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
    <div className="min-h-screen bg-surface-dark-0">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-surface-dark-3 bg-surface-dark-0/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors text-sm">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-4 w-px bg-surface-dark-3" />
            <span className="text-sm font-semibold text-white">Strategies</span>
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Strategies</h1>
            <p className="mt-1 text-sm text-gray-500">
              {strategies?.length ?? 0} strateg{strategies?.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-1 py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        {/* Strategy grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasSearch={!!search}
            onCreate={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        "group relative flex flex-col rounded-xl border border-surface-dark-3 bg-surface-dark-1 p-5",
        "hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5",
        "transition-all duration-200"
      )}
    >
      {/* Icon + menu */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
          <Blocks className="h-5 w-5 text-brand-400" />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onMenuToggle(strategy.id);
          }}
          className="rounded-lg p-1.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-surface-dark-2 hover:text-gray-300 transition-all"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            onClick={(e) => e.preventDefault()}
            className="absolute right-3 top-12 z-50 min-w-[140px] rounded-xl border border-surface-dark-3 bg-surface-dark-2 py-1 shadow-xl"
          >
            <Link
              href={`/canvas/${strategy.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-surface-dark-3 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Canvas
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-dark-3 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Name + description */}
      <h3 className="mb-1 text-sm font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
        {strategy.name}
      </h3>
      {strategy.description && (
        <p className="mb-3 text-xs text-gray-500 line-clamp-2">
          {strategy.description}
        </p>
      )}

      {/* Tags */}
      {strategy.tags && strategy.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {strategy.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-surface-dark-2 px-2 py-0.5 text-[10px] text-gray-500"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between text-[11px] text-gray-600">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
        </span>
        <span>v{strategy.version}</span>
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
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-surface-dark-3">
        <Blocks className="h-7 w-7 text-gray-600" />
      </div>
      {hasSearch ? (
        <p className="text-sm text-gray-500">No strategies match your search</p>
      ) : (
        <>
          <p className="mb-1 text-sm font-medium text-gray-400">
            No strategies yet
          </p>
          <p className="mb-6 text-xs text-gray-600">
            Create your first strategy to start building
          </p>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Strategy
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface-dark-3 bg-surface-dark-1 p-6 shadow-2xl animate-scale-in">
        <h2 className="mb-1 text-lg font-bold text-white">New Strategy</h2>
        <p className="mb-5 text-sm text-gray-500">
          Give your strategy a name to get started
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Strategy Name <span className="text-red-400">*</span>
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
              className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3.5 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Description{" "}
              <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What does this strategy do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3.5 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-surface-dark-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), description || undefined)}
            disabled={!name.trim() || isLoading}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create & Open Canvas
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-surface-dark-3 bg-surface-dark-1 p-6 shadow-2xl">
        <h2 className="mb-2 text-base font-bold text-white">Delete Strategy?</h2>
        <p className="mb-6 text-sm text-gray-500">
          This will permanently delete the strategy, all version history, and
          associated backtests. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:bg-surface-dark-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete Strategy
          </button>
        </div>
      </div>
    </div>
  );
}
