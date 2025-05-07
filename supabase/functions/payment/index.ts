import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`Request [${requestId}]:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.error(`Method error [${requestId}]: Method not allowed`);
      return jsonResponse(
        { status: "error", message: "Method not allowed", httpStatus: 405 },
        405,
        corsHeaders,
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error(`Authentication error [${requestId}]: Missing authorization header`);
      return jsonResponse(
        { status: "error", message: "Missing authorization header", httpStatus: 401 },
        401,
        corsHeaders,
      );
    }
    const { user, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      console.error(`Authentication error [${requestId}]:`, authError?.message || "No user found");
      return jsonResponse(
        { status: "error", message: "Invalid or expired token", httpStatus: 401 },
        401,
        corsHeaders,
      );
    }

    let payload;
    try {
      payload = await req.json();
    } catch (err) {
      console.error(`Payload parse error [${requestId}]:`, err.message);
      return jsonResponse(
        { status: "error", message: "Invalid JSON payload", httpStatus: 400 },
        400,
        corsHeaders,
      );
    }
    const { amount, email, name } = payload;
    console.log(`Request payload [${requestId}]:`, { amount, email, name });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!amount || !email || !emailRegex.test(email)) {
      console.error(`Validation error [${requestId}]: Invalid amount or email`);
      return jsonResponse(
        { status: "error", message: "Valid amount and email are required", httpStatus: 400 },
        400,
        corsHeaders,
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error(`Validation error [${requestId}]: Invalid amount`);
      return jsonResponse(
        { status: "error", message: "Amount must be a positive number", httpStatus: 400 },
        400,
        corsHeaders,
      );
    }

    if (numericAmount < 500) {
      console.error(`Validation error [${requestId}]: Amount below minimum`);
      return jsonResponse(
        { status: "error", message: "Minimum amount is ₦500", httpStatus: 400 },
        400,
        corsHeaders,
      );
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    console.log(`Environment variables [${requestId}]:`, {
      PAYSTACK_SECRET_KEY: paystackKey ? "Key present" : "Key missing",
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "Present" : "Missing",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ? "Present" : "Missing",
      PAYSTACK_CALLBACK_URL: Deno.env.get("PAYSTACK_CALLBACK_URL") || "Not set",
      SITE_URL: Deno.env.get("SITE_URL") || "Not set",
    });

    if (!paystackKey) {
      console.error(`Configuration error [${requestId}]: Missing Paystack key`);
      return jsonResponse(
        { status: "error", message: "Server configuration error: Missing Paystack key", httpStatus: 500 },
        500,
        corsHeaders,
      );
    }

    const reference = `ref-${Date.now()}-${crypto.randomUUID()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Math.round(numericAmount * 100), // Convert to kobo
          currency: "NGN",
          reference,
          metadata: {
            customer_name: name || "Unknown User",
            service_fee: (numericAmount * 0.1).toFixed(2),
            original_amount: numericAmount.toFixed(2),
          },
          callback_url:
            Deno.env.get("PAYSTACK_CALLBACK_URL") ||
            `${Deno.env.get("SITE_URL")}/payment-callback`,
        }),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeout));

    const paystackData = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackData.status || !paystackData.data) {
      console.error(`Paystack API Error [${requestId}]:`, {
        status: paystackResponse.status,
        message: paystackData.message || "Unknown error",
        rawResponse: JSON.stringify(paystackData),
        requestBody: JSON.stringify({
          email,
          amount: Math.round(numericAmount * 100),
          currency: "NGN",
          reference,
          metadata: {
            customer_name: name || "Unknown User",
            service_fee: (numericAmount * 0.1).toFixed(2),
            original_amount: numericAmount.toFixed(2),
          },
          callback_url:
            Deno.env.get("PAYSTACK_CALLBACK_URL") ||
            `${Deno.env.get("SITE_URL")}/payment-callback`,
        }),
      });
      return jsonResponse(
        {
          status: "failed",
          message: paystackData.message || "Payment initialization failed",
          code: paystackData.status || "unknown_error",
          httpStatus: paystackResponse.status || 400,
        },
        paystackResponse.status || 400,
        corsHeaders,
      );
    }

    console.log(`Paystack success [${requestId}]:`, paystackData.data);
    return jsonResponse(
      {
        status: "success",
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
        amount: numericAmount,
        fee: (numericAmount * 0.1).toFixed(2),
        httpStatus: 200,
      },
      200,
      corsHeaders,
    );
  } catch (err: any) {
    console.error(`Server Error [${requestId}]:`, {
      message: err.message,
      stack: err.stack,
    });
    return jsonResponse(
      {
        status: "error",
        message: "Internal server error",
        error: Deno.env.get("DENO_ENV") === "development" ? err.message : undefined,
        httpStatus: 500,
      },
      500,
      corsHeaders,
    );
  }
});

function jsonResponse(data: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}