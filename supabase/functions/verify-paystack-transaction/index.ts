// Supabase Edge Function: functions/verify-paystack-transaction/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req: Request) => {
  try {
    // Ensure PAYSTACK_SECRET_KEY is defined
    if (!PAYSTACK_SECRET_KEY || !PAYSTACK_SECRET_KEY.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Paystack secret key" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { reference, expectedAmount } = await req.json();
    if (!reference || typeof expectedAmount !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid request: reference and expectedAmount are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify Paystack transaction
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.status && data.data.status === "success") {
      const paidAmount = data.data.amount / 100; // Paystack returns amount in kobo
      if (paidAmount === expectedAmount) {
        return new Response(
          JSON.stringify({ status: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            status: false,
            error: `Amount mismatch: Expected ₦${expectedAmount}, Received ₦${paidAmount}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ status: false, error: data.message || "Transaction verification failed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error verifying Paystack transaction:", error);
    return new Response(
      JSON.stringify({ error: "Server error: Failed to verify transaction" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});