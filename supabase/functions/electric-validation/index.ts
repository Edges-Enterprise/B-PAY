// supabase/functions/electricity-validation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
	const url = new URL(req.url);
	const meter_number = url.searchParams.get("meter_number");
	const disco = url.searchParams.get("disco");
	const meter_type = url.searchParams.get("meter_type");

	if (!meter_number || !disco || !meter_type) {
		return new Response(
			JSON.stringify({ status: "error", message: "Missing parameters" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	try {
		const response = await fetch(
			`https://lizzysub.com/api/bill/bill-validation?meter_number=${meter_number}&disco=${disco}&meter_type=${meter_type}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Token ${Deno.env.get("LIZZYSUB_API_KEY")}`,
				},
			},
		);

		const data = await response.json();

		return new Response(JSON.stringify(data), {
			status: response.status,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ status: "error", message: err.message }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
});
