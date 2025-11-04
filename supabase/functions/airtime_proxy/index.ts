// supabase/functions/lizzysub-airtime-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LIZZYSUB_TOKEN = "b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c";
const ENDPOINT = "https://lizzysub.com/api/topup/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", message: "POST only" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    console.log("[AIRTIME] Request:", body);

    const required = ["network", "phone", "amount", "request-id"];
    const missing = required.filter((k) => !(k in body));
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ status: "error", message: `Missing: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${LIZZYSUB_TOKEN}`,
      },
      body: JSON.stringify({
        network: body.network,
        phone: body.phone,
        amount: body.amount,
        plan_type: body.plan_type || "VTU",
        bypass: body.bypass ?? false,
        "request-id": body["request-id"],
      }),
    });

    const text = await response.text();
    console.log(`[AIRTIME] Lizzysub ${response.status}:`, text);

    let data;
    try { data = JSON.parse(text); } catch {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid JSON from Lizzysub" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[AIRTIME] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});