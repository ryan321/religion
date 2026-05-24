import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/db";
import { purchases, bookStarts } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Only handle our book purchase sessions
        const userId = session.metadata?.userId;
        const bookId = session.metadata?.bookId;
        if (!userId || !bookId) break;

        const amountCents = session.amount_total ?? 0;
        const currency = session.currency?.toUpperCase() ?? "USD";

        // Record the purchase (idempotent via unique constraint)
        await db
          .insert(purchases)
          .values({
            userId,
            bookId,
            stripeSessionId: session.id,
            amountCents,
            currency,
          })
          .onConflictDoNothing();

        // Also add to library if not already there
        await db
          .insert(bookStarts)
          .values({ userId, bookId })
          .onConflictDoNothing();

        console.log(
          `[stripe] Purchase recorded: user=${userId} book=${bookId} amount=${amountCents} ${currency}`
        );
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe] Error handling ${event.type}:`, err);
    // Return 200 to prevent Stripe from retrying endlessly.
  }

  return NextResponse.json({ received: true });
}
