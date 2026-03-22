// ─────────────────────────────────────────────
// SuperCanvas — Inngest Package Exports
// ─────────────────────────────────────────────

export { inngest } from "./client";
export {
  helloWorld,
  validateStrategy,
  runBacktest,
  syncClerkUser,
} from "./functions";

// Convenience array of all functions for serve()
import { helloWorld, validateStrategy, runBacktest, syncClerkUser } from "./functions";

export const allFunctions = [
  helloWorld,
  validateStrategy,
  runBacktest,
  syncClerkUser,
];
