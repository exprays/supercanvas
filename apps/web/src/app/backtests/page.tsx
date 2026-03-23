// ─────────────────────────────────────────────
// SuperCanvas — Backtests Page
// /backtests — list view of all backtests
// ─────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BacktestsPageClient } from "./BacktestsPageClient";

export default async function BacktestsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <BacktestsPageClient />;
}

export const metadata = {
  title: "Backtests — SuperCanvas",
};
