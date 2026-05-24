import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, purchases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const userId = session.user.id;

  let body: { bookId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bookId } = body;
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  // Look up the book
  const [book] = await db
    .select({
      id: books.id,
      slug: books.slug,
      title: books.title,
      priceCents: books.priceCents,
      currency: books.currency,
    })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.published, true)))
    .limit(1);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.priceCents == null) {
    return NextResponse.json(
      { error: "This book is not yet available for purchase" },
      { status: 400 }
    );
  }

  // Check if already purchased
  const [existing] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.bookId, bookId)))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "You already own this book" },
      { status: 409 }
    );
  }

  // Create Stripe Checkout Session for a one-time payment
  const origin =
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: book.currency.toLowerCase(),
          unit_amount: book.priceCents,
          product_data: {
            name: book.title,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      bookId: book.id,
    },
    success_url: `${origin}/library/${book.slug}?purchased=1`,
    cancel_url: `${origin}/books/${book.slug}`,
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
