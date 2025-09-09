// supabase/functions/cable-validation/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const iuc = url.searchParams.get("iuc");
    const cable = url.searchParams.get("cable");

    if (!iuc || !cable) {
      return new Response(
        JSON.stringify({ status: "error", message: "Missing iuc or cable parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiResponse = await fetch(
      `https://lizzysub.com/api/cable/cable-validation?iuc=${iuc}&cable=${cable}`,
      {
        method: "GET",
        headers: {
          Authorization: `Token ${Deno.env.get("LIZZYSUB_API_KEY")}`,
        },
      }
    );

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      status: apiResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
