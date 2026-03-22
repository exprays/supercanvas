// ─────────────────────────────────────────────
// SuperCanvas — Clerk Webhook Handler
// Syncs Clerk user events to PostgreSQL users table
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { getDb, users } from "@supercanvas/db";
import { eq } from "drizzle-orm";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify webhook signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const db = getDb();
  const { type, data } = evt;

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const email = data.email_addresses[0]?.email_address || "";

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, data.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(users)
            .set({
              email,
              firstName: data.first_name,
              lastName: data.last_name,
              imageUrl: data.image_url,
              updatedAt: new Date(),
            })
            .where(eq(users.clerkId, data.id));
        } else {
          await db.insert(users).values({
            clerkId: data.id,
            email,
            firstName: data.first_name,
            lastName: data.last_name,
            imageUrl: data.image_url,
            plan: "free",
            creditsRemaining: 100,
          });
        }
        break;
      }

      case "user.deleted": {
        await db.delete(users).where(eq(users.clerkId, data.id));
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
