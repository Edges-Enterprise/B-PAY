import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Push Notification Function initialized");

serve(async (req) => {
	try {
		const payload = await req.json();
		const { record } = payload;

		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
		const supabase = createClient(supabaseUrl, supabaseKey);

		// Fetch push token
		const { data: tokenData, error: tokenError } = await supabase
			.from("user_push_tokens")
			.select("push_token")
			.eq("user_id", record.user_id)
			.single();

		if (tokenError || !tokenData?.push_token) {
			throw new Error("No push token found for user");
		}

		const pushToken = tokenData.push_token;

		if (!pushToken.startsWith("ExponentPushToken")) {
			throw new Error("Invalid Expo push token");
		}

		// Send push notification to Expo
		const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Accept-encoding": "gzip, deflate",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				to: pushToken,
				sound: "default",
				title:
					record.notification_type?.replace("_", " ").toUpperCase() ||
					"NOTIFICATION",
				body: record.message,
				data: {
					notificationId: record.id,
					...record,
				},
			}),
		});

		const result = await expoRes.json();
		console.log("Expo response:", result);

		return new Response(JSON.stringify({ success: true, result }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error sending push notification:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { "Content-Type": "application/json" },
			status: 400,
		});
	}
});
