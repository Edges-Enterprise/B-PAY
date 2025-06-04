import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import axios from "https://esm.sh/axios@1.6.8";

// Supabase client configuration (use environment variables in production)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Paystack secret key (store securely in environment variables)
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

serve(async (req: Request) => {
  // Verify the request is from Paystack
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const secret = paystackSecretKey; // Use your Paystack test or live secret key
  const hash = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest("hex");

  if (hash !== signature) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse the webhook payload
  const event = JSON.parse(payload);

  if (event.event !== "charge.success") {
    return new Response(JSON.stringify({ message: "Event not handled" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { reference, amount, customer } = event.data;
  const userEmail = customer.email;

  try {
    // Verify the transaction with Paystack
    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transactionData = verifyResponse.data.data;
    if (transactionData.status !== "success") {
      return new Response(JSON.stringify({ error: "Transaction not successful" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update transactions table
    const { error: txError } = await supabase
      .from("transactions")
      .update({ status: "success" })
      .eq("reference", reference)
      .eq("status", "pending");

    if (txError) throw txError;

    // Update or insert wallet balance
    const { error: walletError } = await supabase.rpc("update_wallet_balance", {
      p_user_email: userEmail,
      p_amount: amount / 100, // Convert kobo to Naira
    });

    if (walletError) throw walletError;

    return new Response(JSON.stringify({ message: "Transaction processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});