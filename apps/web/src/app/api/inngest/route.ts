// ─────────────────────────────────────────────
// SuperCanvas — Inngest API Route
// Serves all Inngest functions via Next.js API route
// ─────────────────────────────────────────────

import { serve } from "inngest/next";
import { inngest, allFunctions } from "@supercanvas/inngest-fns";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
