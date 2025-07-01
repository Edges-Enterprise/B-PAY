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
  const secret = paystackSecretKey;

  // Validate Paystack signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  if (hash !== signature) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse webhook payload
  const event = JSON.parse(payload);

  if (event.event !== "charge.success") {
    return new Response(JSON.stringify({ message: "Event not handled" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { reference, amount, customer } = event.data;
  const userEmail = customer.email.toLowerCase(); // standardize email
  const depositAmount = amount / 100; // Convert kobo to Naira

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

    // Check if wallet exists
    const { data: wallet, error: walletFetchError } = await supabase
      .from("wallet")
      .select("*")
      .eq("user_email", userEmail)
      .single();

    if (walletFetchError && walletFetchError.code !== "PGRST116") {
      // If error is not "No rows found", throw
      throw walletFetchError;
    }

    if (wallet) {
      // Wallet exists, update balance
      const { error: updateError } = await supabase
        .from("wallet")
        .update({ balance: wallet.balance + depositAmount })
        .eq("user_email", userEmail);

      if (updateError) throw updateError;
    } else {
      // Wallet doesn't exist, create it
      const { error: insertError } = await supabase
        .from("wallet")
        .insert([{ user_email: userEmail, balance: depositAmount }]);

      if (insertError) throw insertError;
    }

    console.log(`✅ Wallet successfully updated for ${userEmail}`);

    return new Response(JSON.stringify({ message: "Transaction processed and wallet updated" }), {
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
