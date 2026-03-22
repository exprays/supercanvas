// ─────────────────────────────────────────────
// SuperCanvas — Marketplace Types
// ─────────────────────────────────────────────

/** Marketplace listing type */
export type ListingType = "signal_subscription" | "strategy_clone" | "parameter_locked";

/** Marketplace listing status */
export type ListingStatus = "draft" | "pending_review" | "active" | "suspended" | "deprecated";

/** Marketplace listing */
export interface MarketplaceListing {
  id: string;
  strategyId: string;
  creatorId: string;
  name: string;
  description: string;
  listingType: ListingType;
  status: ListingStatus;
  price: number;
  currency: string;
  tags: string[];
  assetClass: string[];
  metrics?: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalReturn: number;
  };
  hasForwardTestBadge: boolean;
  forwardTestEnd?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}
