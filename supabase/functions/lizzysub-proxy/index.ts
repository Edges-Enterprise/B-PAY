// supabase/functions/lizzysub-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Hardcoded API token (server-side only, not exposed to clients)
const LIZZYSUB_TOKEN =
	"b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c";
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};
serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}
	try {
		if (req.method !== "POST") {
			return new Response(
				JSON.stringify({
					status: "error",
					message: "Only POST method is allowed",
				}),
				{
					status: 405,
					headers: {
						...corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		}
		const body = await req.json();
		console.log("Request body:", JSON.stringify(body));
		// Forward the request to the Lizzysub API with proper authorization
		const response = await fetch("https://lizzysub.com/api/data", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Token ${LIZZYSUB_TOKEN}`,
			},
			body: JSON.stringify(body),
		});
		const responseText = await response.text();
		console.log("Lizzysub response status:", response.status);
		console.log("Lizzysub response body:", responseText);
		// Parse the response to check for errors
		let responseData;
		try {
			responseData = JSON.parse(responseText);
		} catch (parseError) {
			console.error("Failed to parse Lizzysub response:", parseError);
			return new Response(
				JSON.stringify({
					status: "error",
					message: "Invalid response from Lizzysub API",
				}),
				{
					status: 500,
					headers: {
						...corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		}
		// Return the response with appropriate status code and CORS headers
		return new Response(JSON.stringify(responseData), {
			status: response.status,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
		});
	} catch (err) {
		console.error("Lizzysub proxy error:", err);
		return new Response(
			JSON.stringify({
				status: "error",
				message: err instanceof Error ? err.message : "Unknown error occurred",
			}),
			{
				status: 500,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}
});
