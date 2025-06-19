import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  console.log(`Edge Function invoked at: ${new Date().toISOString()}`, { method: req.method, url: req.url });

  try {
    // Log environment variables (mask sensitive parts)
    console.log("Environment variables:", {
      PAYSTACK_SECRET_KEY: PAYSTACK_SECRET_KEY ? "Set (sk_...)" : "Missing",
      SUPABASE_URL: SUPABASE_URL || "Missing",
      SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY ? "Set (eyJ...)" : "Missing",
    });

    // Validate environment variables
    if (!PAYSTACK_SECRET_KEY || !PAYSTACK_SECRET_KEY.startsWith("sk_")) {
      console.error("Missing or invalid Paystack secret key");
      return new Response(
        JSON.stringify({ error: "Missing or invalid Paystack secret key" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("Missing Supabase configuration", { SUPABASE_URL, SUPABASE_SERVICE_KEY });
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("Request body:", { reference: body.reference, expectedAmount: body.expectedAmount });
    } catch (error) {
      console.error("Failed to parse request body:", error.message);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { reference, expectedAmount } = body;
    if (!reference || typeof expectedAmount !== "number") {
      console.error("Invalid request parameters", { reference, expectedAmount });
      return new Response(
        JSON.stringify({ error: "Reference and expectedAmount required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    console.log("Initializing Supabase client");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify Paystack transaction
    console.log(`Verifying Paystack transaction: ${reference}`);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Paystack response:", {
      reference,
      status: data.status,
      paystackStatus: data.data?.status,
      paidAmount: data.data?.amount ? data.data.amount / 100 : null,
      expectedAmount,
    });

    if (data.status && data.data.status === "success") {
      const paidAmount = data.data.amount / 100;
      if (Math.abs(paidAmount - expectedAmount) <= 0.01) {
        console.log(`Updating transaction: ${reference}`);
        let attempts = 0;
        const maxAttempts = 3;
        let txUpdateError = null;

        while (attempts < maxAttempts) {
          // Begin transaction update
          const { data: txData, error } = await supabase
            .from("transactions")
            .update({
              status: "success",
              metadata: {
                ...data.data.metadata,
                paystack_response: data.data,
                verification_date: new Date().toISOString(),
                paid_amount: paidAmount,
                net_amount: paidAmount * 0.9,
                profit: paidAmount * 0.1,
              },
            })
            .eq("reference", reference)
            .select()
            .single();

          if (!error && txData) {
            console.log("Transaction updated:", { reference, transaction: txData });

            // Update wallet balance
            const { data: wallet, error: walletError } = await supabase
              .from("wallets")
              .select("balance")
              .eq("user_email", txData.user_email)
              .single();

            if (walletError && walletError.code !== "PGRST116") {
              console.error("Wallet query failed:", { error: walletError.message });
              return new Response(
                JSON.stringify({ error: `Wallet query failed: ${walletError.message}` }),
                { status: 500, headers: { "Content-Type": "application/json" } }
              );
            }

            const currentBalance = wallet?.balance || 0;
            const newBalance = currentBalance + paidAmount * 0.9;

            console.log("Updating wallet:", { userEmail: txData.user_email, newBalance });
            const { error: walletUpdateError } = await supabase
              .from("wallets")
              .upsert(
                { user_email: txData.user_email, balance: newBalance },
                { onConflict: ["user_email"] }
              );

            if (walletUpdateError) {
              console.error("Wallet update failed:", { error: walletUpdateError.message });
              return new Response(
                JSON.stringify({ error: `Wallet update failed: ${walletUpdateError.message}` }),
                { status: 500, headers: { "Content-Type": "application/json" } }
              );
            }

            // Insert deposit record
            console.log("Inserting deposit:", { transactionId: txData.id });
            const { error: depositError } = await supabase
              .from("deposits")
              .insert({
                transaction_id: txData.id,
                user_email: txData.user_email,
                amount: paidAmount,
                profit: paidAmount * 0.1,
                net_amount: paidAmount * 0.9,
                reference,
              });

            if (depositError) {
              console.error("Deposit insert failed:", { error: depositError.message });
              return new Response(
                JSON.stringify({ error: `Deposit insert failed: ${depositError.message}` }),
                { status: 500, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({ status: true, transaction: txData, balance: newBalance }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          txUpdateError = error;
          attempts++;
          console.warn(`Update attempt ${attempts} failed:`, { error: error?.message, reference });
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        console.error("Failed to update transaction:", { error: txUpdateError?.message, reference });
        return new Response(
          JSON.stringify({ error: `Failed to update transaction: ${txUpdateError?.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      } else {
        console.error("Amount mismatch:", { reference, paidAmount, expectedAmount });
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
          .eq("reference", reference);

        if (txUpdateError) {
          console.error("Failed to mark transaction as failed:", { error: txUpdateError.message });
        }

        return new Response(
          JSON.stringify({ status: false, error: `Amount mismatch: Expected ₦${expectedAmount}, Received ₦${paidAmount}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      console.error("Paystack verification failed:", { reference, message: data.message });
      const { error: txUpdateError } = await supabase
        .from("transactions")
        .update({
          status: "failed",
          metadata: {
            ...data.data?.metadata,
            error: data.message || "Verification failed",
            verification_date: new Date().toISOString(),
          },
        })
        .eq("reference", reference);

      if (txUpdateError) {
        console.error("Failed to mark transaction as failed:", { error: txUpdateError.message });
      }

      return new Response(
        JSON.stringify({ status: false, error: data.message || "Verification failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Edge Function error:", {
      message: error.message,
      stack: error.stack,
      reference: (await req.json().catch(() => ({ reference: "unknown" }))).reference,
    });
    return new Response(
      JSON.stringify({ error: "Server error: Failed to verify transaction" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});