// ─────────────────────────────────────────────
// SuperCanvas — Inngest Client
// Shared Inngest instance used across all functions
// ─────────────────────────────────────────────

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "supercanvas",
  name: "SuperCanvas",
});
