// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/server';
import { PRODUCT_BY_PRICE_ID } from '@/lib/stripe/products';

// Use service role to bypass RLS (webhook runs server-side, not as a user)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stripe needs the raw body for signature verification.
// In Next.js App Router, req.text() provides this automatically.

export async function POST(req: NextRequest) {
  let event;

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing stripe signature or webhook secret');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Only process paid sessions
    if (session.payment_status !== 'paid') {
      console.log('Session not paid, skipping:', session.id);
      return NextResponse.json({ received: true });
    }

    const userId = session.metadata?.user_id;
    const productType = session.metadata?.product_type;
    const leavesAdded = parseInt(session.metadata?.leaves_added || '0', 10);
    const treesAdded = parseInt(session.metadata?.trees_added || '0', 10);

    if (!userId || !productType) {
      console.error('Missing metadata in session:', session.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    // Check for duplicate processing (idempotency)
    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single();

    if (existingPurchase) {
      console.log('Purchase already processed:', session.id);
      return NextResponse.json({ received: true });
    }

    // Record the purchase
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null,
        product_type: productType,
        amount_cents: session.amount_total || 0,
        status: 'completed',
      });

    if (purchaseError) {
      console.error('Failed to record purchase:', purchaseError);
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
    }

    // Update user's capacity
    // Fetch current values first
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('leaf_capacity, tree_limit')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const updates: Record<string, number> = {};
    if (leavesAdded > 0) {
      updates.leaf_capacity = (profile.leaf_capacity || 100) + leavesAdded;
    }
    if (treesAdded > 0) {
      updates.tree_limit = (profile.tree_limit || 2) + treesAdded;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile capacity:', updateError);
        return NextResponse.json({ error: 'Failed to update capacity' }, { status: 500 });
      }
    }

    console.log(`Purchase processed: ${productType} for user ${userId} — +${leavesAdded} leaves, +${treesAdded} trees`);
  }

  return NextResponse.json({ received: true });
}