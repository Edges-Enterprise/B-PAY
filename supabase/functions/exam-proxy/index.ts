import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LIZZYSUB_TOKEN = "b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c";
const ENDPOINT = "https://lizzysub.com/api/exam";

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
    console.log("[EXAM] Request:", body);

    const { exam, quantity } = body;
    if (!exam || !quantity || quantity < 1 || quantity > 10) {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid exam or quantity (1-10)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${LIZZYSUB_TOKEN}`,
      },
      body: JSON.stringify({ exam: Number(exam), quantity: Number(quantity) }),
    });

    const text = await response.text();
    console.log(`[EXAM] Lizzysub ${response.status}:`, text);

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
    console.error("[EXAM] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});