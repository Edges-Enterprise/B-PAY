// supabase/functions/lizzysub-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === CONFIG ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIZZYSUB_TOKEN = "b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c";
const LIZZY_USER_ENDPOINT = "https://lizzysub.com/api/user";

const SERVICE_PREFIXES = {
  AIRTIME: "Airtime_",
  DATA: "Data_",
  CABLE: "Cable_",
  ELECTRICITY: "Electricity_",
  EXAM: "Exam_",
} as const;

type ServiceType = keyof typeof SERVICE_PREFIXES;

const NOTIFICATION = {
  SUCCESS: "Service Delivered",
  FAILED_REFUNDED: "Delivery Failed – Refunded",
  PENDING: "Processing...",
};

let lizzyUser: any = null;

// === MAIN HANDLER ===
serve(async (req) => {
  // Fetch Lizzysub user context
  try {
    lizzyUser = await fetchLizzyUser();
    console.log(`[Lizzysub User] Logged in as: ${lizzyUser?.username || 'Unknown'} (Balance: ₦${lizzyUser?.balance || 0})`);
  } catch (error) {
    console.error("[Lizzysub User Fetch Error]", error);
    lizzyUser = { username: "Unknown", balance: 0 };
  }

  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { "request-id": requestId, status, response, refund_amount, service } = payload;

  // === VALIDATION ===
  if (!requestId || !status) {
    return jsonResponse({ error: "Missing request-id or status" }, 400);
  }

  const serviceType = detectServiceFromRequestId(requestId);
  if (!serviceType) {
    return jsonResponse({ error: "Invalid or unsupported request-id prefix" }, 400);
  }

  const reference = requestId.slice(SERVICE_PREFIXES[serviceType].length);
  const isSuccess = status === "success" || status === "delivered";

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
  const wasPending = ["pending", "processing"].includes(tx.status);

  console.log(
    `[Webhook] ${serviceType} | LizzyUser: ${lizzyUser.username} | Ref: ${reference} | Lizzy: ${status} | UserPaid: ₦${userPaidAmount} | Prev: ${tx.status}`
  );

  // === CASE 1: SUCCESS ===
  if (isSuccess) {
    if (!wasSuccess && wasPending) {
      await updateTransaction(supabase, tx.id, "success", payload, lizzyUser);
    }

    await sendNotification(supabase, tx.user_email, {
      title: NOTIFICATION.SUCCESS,
      message: extractSuccessMessage(response) || `Your ${serviceType.toLowerCase()} has been delivered.`,
      type: "success",
    });

    return jsonResponse(
      { status: "success", action: "delivered", lizzy_user: lizzyUser.username },
      200
    );
  }

  // === CASE 2: FAILURE ===
  if (!isSuccess) {
    if (refund_amount === undefined || refund_amount === null) {
      await updateTransaction(supabase, tx.id, "pending_refund", payload, lizzyUser);
      await sendNotification(supabase, tx.user_email, {
        title: "Delivery Issue",
        message: `We're checking your ${serviceType.toLowerCase()} purchase. Funds are on hold.`,
        type: "warning",
      });
      return jsonResponse({ status: "pending", note: "awaiting_refund_amount" }, 200);
    }

    const lizzyRefund = Number(refund_amount);
    if (isNaN(lizzyRefund) || lizzyRefund < 0) {
      return jsonResponse({ error: "Invalid refund_amount" }, 400);
    }

    if (wasSuccess || wasPending) {
      await refundUserWallet(supabase, tx.user_email, userPaidAmount);
    }

    await creditLizzyRefundWallet(supabase, lizzyRefund);

    await updateTransaction(supabase, tx.id, "failed", payload, lizzyUser);

    const serviceName = getServiceName(serviceType, tx.metadata);
    await sendNotification(supabase, tx.user_email, {
      title: NOTIFICATION.FAILED_REFUNDED,
      message: `${serviceName} (₦${userPaidAmount}) failed. Full amount refunded to your wallet.`,
      type: "refund",
    });

    console.log(
      `[Refund] ${serviceType} | LizzyUser: ${lizzyUser.username} | User: +₦${userPaidAmount} | Lizzy: +₦${lizzyRefund} | Ref: ${reference}`
    );

    return jsonResponse(
      {
        status: "refunded",
        service: serviceType,
        lizzy_user: lizzyUser.username,
        user_refunded: userPaidAmount,
        lizzy_refunded: lizzyRefund,
      },
      200
    );
  }

  return jsonResponse({ status: "no_action" }, 200);
});

// === HELPERS ===
async function fetchLizzyUser(): Promise<any> {
  const response = await fetch(LIZZY_USER_ENDPOINT, {
    method: "GET",
    headers: {
      "Authorization": `Token ${LIZZYSUB_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Lizzysub user: ${response.status}`);
  }
  return await response.json();
}

function jsonResponse(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectServiceFromRequestId(requestId: string): ServiceType | null {
  for (const [type, prefix] of Object.entries(SERVICE_PREFIXES)) {
    if (requestId.startsWith(prefix)) {
      return type as ServiceType;
    }
  }
  return null;
}

function getServiceName(type: ServiceType, metadata: any): string {
  switch (type) {
    case "AIRTIME":
      return `Airtime ₦${metadata?.amount || ""} on ${metadata?.phone_number || "unknown"}`;
    case "DATA":
      return `${metadata?.plan || "Data"} on ${metadata?.phone_number || "unknown"}`;
    case "CABLE":
      return `Cable TV (${metadata?.provider || "unknown"})`;
    case "ELECTRICITY":
      return `Electricity Bill (${metadata?.meter_number || "unknown"})`;
    case "EXAM":
      return `${metadata?.exam_name || "Exam"} Pin x${metadata?.quantity || 1}`;
    default:
      return type.toLowerCase();
  }
}

async function refundUserWallet(supabase: any, email: string, amount: number) {
  const { error } = await supabase
    .from("wallet")
    .update({ balance: supabase.raw(`balance + ${amount}`) })
    .eq("user_email", email);
  if (error) console.error("[Refund Error]", error);
}

async function creditLizzyRefundWallet(supabase: any, amount: number) {
  const { error } = await supabase
    .from("wallet")
    .update({ balance: supabase.raw(`balance + ${amount}`) })
    .eq("user_email", LIZZY_REFUND_WALLET);
  if (error) console.error("[Lizzy Credit Error]", error);
}

async function updateTransaction(
  supabase: any,
  txId: number,
  status: string,
  payload: any,
  lizzyUser: any
) {
  const { error } = await supabase
    .from("transactions")
    .update({
      status,
      metadata: supabase.raw(
        `COALESCE(metadata, '{}') || '{"lizzy_webhook": ${JSON.stringify(
          payload
        )}, "lizzy_user": ${JSON.stringify(lizzyUser)}, "updated_at": "${new Date().toISOString()}"}'::jsonb`
      ),
    })
    .eq("id", txId);

  if (error) console.error("[Update Tx Error]", error);
}

async function sendNotification(
  supabase: any,
  email: string,
  notif: { title: string; message: string; type: string }
) {
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
  const match = response.match(/(congratulations|success|delivered|credited|gift|pin|token).{0,100}/i);
  return match ? match[0].trim() : null;
}