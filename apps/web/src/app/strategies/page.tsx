// ─────────────────────────────────────────────
// SuperCanvas — Strategies Page
// /strategies — list view with create, search, open canvas
// ─────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { StrategiesPageClient } from "./StrategiesPageClient";

export default async function StrategiesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <StrategiesPageClient />;
}

export const metadata = {
  title: "Strategies — SuperCanvas",
};
