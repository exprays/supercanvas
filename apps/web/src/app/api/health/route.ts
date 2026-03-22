// ─────────────────────────────────────────────
// SuperCanvas — Health Check API
// Used by monitoring and load balancers
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "supercanvas-web",
    version: "0.0.1",
    timestamp: new Date().toISOString(),
  });
}
