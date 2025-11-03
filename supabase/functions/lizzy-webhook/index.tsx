// supabase/functions/lizzy-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === CONFIG ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIZZY_REFUND_WALLET = "lizzy-refunds@edges.app"; // Your internal wallet
const NOTIFICATION_TITLE_SUCCESS = "Data Delivered";
const NOTIFICATION_TITLE_FAILED = "Delivery Failed – Refunded";
const NOTIFICATION_TITLE_PENDING = "Processing...";

// === MAIN HANDLER ===
serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { "request-id": requestId, status, response, refund_amount } = payload;

  // === VALIDATION ===
  if (!requestId || !status) {
    return jsonResponse({ error: "Missing request-id or status" }, 400);
  }

  if (!requestId.startsWith("Data_")) {
    return jsonResponse({ error: "Invalid request-id format" }, 400);
  }

  const reference = requestId.slice(5);
  const isSuccess = status === "success";

  // === SUPABASE CLIENT ===
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // === FIND TRANSACTION ===
  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("id, amount, user_email, status, metadata")
    .eq("reference", reference)
    .single();

  if (txError || !tx) {
    console.warn(`[Webhook] Transaction not found: ${reference}`);
    return jsonResponse({ status: "ignored", reason: "tx_not_found" }, 200);
  }

  const userPaidAmount = Math.abs(tx.amount);
  const wasSuccess = tx.status === "success";
  const wasPending = tx.status === "pending" || tx.status === "processing";

  // === LOG INCOMING WEBHOOK ===
  console.log(`[Webhook] ${reference} | Lizzy: ${status} | UserPaid: ₦${userPaidAmount} | Prev: ${tx.status}`);

  // === CASE 1: SUCCESS (Delivered) ===
  if (isSuccess) {
    if (!wasSuccess && !wasPending) {
      // Deduct if not already charged (rare retry)
      await deductUserWallet(supabase, tx.user_email, userPaidAmount);
    }

    await updateTransaction(supabase, tx.id, "success", payload);
    await sendNotification(supabase, tx.user_email, {
      title: NOTIFICATION_TITLE_SUCCESS,
      message: extractSuccessMessage(response) || "Your data has been delivered.",
      type: "success",
    });

    return jsonResponse({ status: "success", action: "delivered" }, 200);
  }

  // === CASE 2: FAILURE (Not Delivered) ===
  if (!isSuccess) {
    // If no refund_amount → hold funds, mark pending
    if (refund_amount === undefined || refund_amount === null) {
      await updateTransaction(supabase, tx.id, "pending_refund", payload);
      await sendNotification(supabase, tx.user_email, {
        title: "Delivery Issue",
        message: "We're checking your data purchase. Funds are on hold until resolved.",
        type: "warning",
      });
      return jsonResponse({ status: "pending", note: "awaiting_refund_amount" }, 200);
    }

    const lizzyRefund = Number(refund_amount);
    if (isNaN(lizzyRefund) || lizzyRefund < 0) {
      return jsonResponse({ error: "Invalid refund_amount" }, 400);
    }

    // Refund user FULL amount
    if (wasSuccess || wasPending) {
      await refundUserWallet(supabase, tx.user_email, userPaidAmount);
    }

    // Credit your internal wallet
    await creditLizzyRefundWallet(supabase, lizzyRefund);

    // Update transaction
    await updateTransaction(supabase, tx.id, "failed", payload);

    // Notify user
    const planName = tx.metadata?.plan || "data bundle";
    await sendNotification(supabase, tx.user_email, {
      title: NOTIFICATION_TITLE_FAILED,
      message: `Your ${planName} (₦${userPaidAmount}) failed to deliver. Full amount refunded to your wallet.`,
      type: "refund",
    });

    console.log(`[Refund] User: +₦${userPaidAmount} | Lizzy: +₦${lizzyRefund} | Ref: ${reference}`);
    return jsonResponse({
      status: "refunded",
      user_refunded: userPaidAmount,
      lizzy_refunded: lizzyRefund,
    }, 200);
  }

  return jsonResponse({ status: "no_action" }, 200);
});

// === HELPER FUNCTIONS ===
function jsonResponse(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refundUserWallet(supabase: any, email: string, amount: number) {
  const { error } = await supabase
    .from("wallet")
    .update({ balance: supabase.raw(`balance + ${amount}`) })
    .eq("user_email", email);
  if (error) console.error("[Refund Error]", error);
}

async function deductUserWallet(supabase: any, email: string, amount: number) {
  const { error } = await supabase
    .from("wallet")
    .update({ balance: supabase.raw(`balance - ${amount}`) })
    .eq("user_email", email);
  if (error) console.error("[Deduct Error]", error);
}

async function creditLizzyRefundWallet(supabase: any, amount: number) {
  const { error } = await supabase
    .from("wallet")
    .update({ balance: supabase.raw(`balance + ${amount}`) })
    .eq("user_email", LIZZY_REFUND_WALLET);
  if (error) console.error("[Lizzy Credit Error]", error);
}

async function updateTransaction(supabase: any, txId: number, status: string, payload: any) {
  const { error } = await supabase
    .from("transactions")
    .update({
      status,
      metadata: supabase.raw(
        `metadata || '{"lizzy_webhook": ${JSON.stringify(payload)}, "updated_at": "${new Date().toISOString()}"}'::jsonb`
      ),
    })
    .eq("id", txId);
  if (error) console.error("[Update Tx Error]", error);
}

async function sendNotification(supabase: any, email: string, notif: { title: string; message: string; type: string }) {
  const { error } = await supabase.from("notifications").insert({
    user_email: email,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    read: false,
  });
  if (error) console.error("[Notification Error]", error);
}

function extractSuccessMessage(response: string): string | null {
  if (!response) return null;
  const match = response.match(/(congratulations|success|delivered|credited|gift).{0,100}/i);
  return match ? match[0].trim() : null;
}