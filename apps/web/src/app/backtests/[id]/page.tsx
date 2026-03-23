// ─────────────────────────────────────────────
// SuperCanvas — Backtest Result Page
// /backtests/[id] — shows full backtest results
// ─────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BacktestResultClient } from "./BacktestResultClient";

export default async function BacktestResultPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <BacktestResultClient backtestId={params.id} />;
}

export const metadata = {
  title: "Backtest Results — SuperCanvas",
};
