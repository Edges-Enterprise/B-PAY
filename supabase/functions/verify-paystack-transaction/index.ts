import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY");

serve(async (req: Request) => {
  try {
    // Validate environment variables
    if (!PAYSTACK_SECRET_KEY || !PAYSTACK_SECRET_KEY.startsWith("sk_")) {
      console.error("Missing or invalid Paystack secret key");
      return new Response(
        JSON.stringify({ error: "Missing or invalid Paystack secret key" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase configuration", { SUPABASE_URL, SUPABASE_ANON_KEY });
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { reference, expectedAmount } = await req.json();
    if (!reference || typeof expectedAmount !== "number") {
      console.error("Invalid request", { reference, expectedAmount });
      return new Response(
        JSON.stringify({ error: "Invalid request: reference and expectedAmount are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify Paystack transaction
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Paystack verification response:", {
      reference,
      status: data.status,
      paystackStatus: data.data?.status,
      paidAmount: data.data?.amount ? data.data.amount / 100 : null,
      expectedAmount,
      fullResponse: data,
    });

    if (data.status && data.data.status === "success") {
      const paidAmount = data.data.amount / 100; // Convert from kobo to NGN
      if (paidAmount === expectedAmount) {
        // Retry transaction update up to 3 times
        let attempts = 0;
        const maxAttempts = 3;
        let txUpdateError = null;

        while (attempts < maxAttempts) {
          const { data: txData, error } = await supabase
            .from("transactions")
            .update({
              status: "success",
              metadata: {
                ...data.data.metadata,
                paystack_response: data.data,
                verification_date: new Date().toISOString(),
              },
            })
            .eq("reference", reference)
            .eq("status", "pending")
            .select()
            .single();

          if (!error && txData) {
            console.log("Transaction updated successfully:", { reference, updatedTransaction: txData });
            return new Response(
              JSON.stringify({ status: true, transaction: txData }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          txUpdateError = error;
          attempts++;
          console.warn(`Transaction update attempt ${attempts} failed:`, {
            error: error?.message,
            reference,
          });
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }

        console.error("Failed to update transaction status after retries:", {
          error: txUpdateError?.message,
          reference,
        });
        return new Response(
          JSON.stringify({ error: `Failed to update transaction: ${txUpdateError?.message}` }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        // Update transaction status to failed due to amount mismatch
        const { error: txUpdateError } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            metadata: {
              ...data.data.metadata,
              error: `Amount mismatch: Expected ₦${expectedAmount}, Received ₦${paidAmount}`,
              verification_date: new Date().toISOString(),
            },
          })
          .eq("reference", reference)
          .eq("status", "pending");

        if (txUpdateError) {
          console.error("Failed to update transaction status to failed:", {
            error: txUpdateError.message,
            reference,
          });
        }

        console.error(`Amount mismatch for reference ${reference}: Expected ₦${expectedAmount}, Received ₦${paidAmount}`);
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
      // Update transaction status to failed
      const { error: txUpdateError } = await supabase
        .from("transactions")
        .update({
          status: "failed",
          metadata: {
            ...data.data?.metadata,
            error: data.message || "Transaction verification failed",
            verification_date: new Date().toISOString(),
          },
        })
        .eq("reference", reference)
        .eq("status", "pending");

      if (txUpdateError) {
        console.error("Failed to update transaction status to failed:", {
          error: txUpdateError.message,
          reference,
        });
      }

      console.error(`Transaction verification failed for reference ${reference}: ${data.message}`);
      return new Response(
        JSON.stringify({ status: false, error: data.message || "Transaction verification failed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error verifying Paystack transaction:", {
      error: error.message,
      stack: error.stack,
      reference: req.json().reference,
    });
    return new Response(
      JSON.stringify({ error: "Server error: Failed to verify transaction" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});