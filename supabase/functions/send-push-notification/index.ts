import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Push Notification Function initialized");

serve(async (req) => {
	try {
		const payload = await req.json();
		const { record } = payload;

		if (
			!record?.user_id ||
			!record?.id ||
			!record?.message ||
			!record?.notification_type
		) {
			throw new Error("Invalid payload: missing required fields");
		}

		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

		if (!supabaseUrl || !supabaseKey) {
			throw new Error("Missing Supabase environment variables");
		}

		const supabase = createClient(supabaseUrl, supabaseKey);

		// Check if notifications are enabled for the user
		const { data: profileData, error: profileError } = await supabase
			.from("profiles")
			.select("notifications_enabled")
			.eq("id", record.user_id)
			.single();

		if (profileError || profileData?.notifications_enabled === false) {
			console.log(`Notifications disabled for user ${record.user_id}`);
			return new Response(
				JSON.stringify({
					success: true,
					message: "Notifications disabled for user",
				}),
				{
					headers: { "Content-Type": "application/json" },
					status: 200,
				},
			);
		}

		// Fetch push token
		const { data: tokenData, error: tokenError } = await supabase
			.from("user_push_tokens")
			.select("push_token")
			.eq("user_id", record.user_id)
			.single();

		if (tokenError || !tokenData?.push_token) {
			console.log(`No push token found for user ${record.user_id}`);
			return new Response(
				JSON.stringify({ success: true, message: "No push token found" }),
				{
					headers: { "Content-Type": "application/json" },
					status: 200,
				},
			);
		}

		const pushToken = tokenData.push_token;

		if (!pushToken.startsWith("ExponentPushToken")) {
			throw new Error(`Invalid Expo push token for user ${record.user_id}`);
		}

		// Customize notification title based on type
		const notificationTitles: { [key: string]: string } = {
			transaction: "Transaction Successful",
			deposit: "Deposit Received",
			app_update: "New App Update Available",
			advertisement: "Hot Deal Alert!",
			hot_data: "Hot Data Deal!",
			special_data: "Special Data Offer!",
			weekend_plan: "Weekend Plan Available!",
			weekly_plan: "Weekly Plan Available!",
		};

		const title =
			notificationTitles[record.notification_type] ||
			record.notification_type.replace("_", " ").toUpperCase() ||
			"NOTIFICATION";

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
				title,
				body: record.message,
				data: {
					notificationId: record.id,
					type: record.notification_type,
					transactionId: record.transaction_id || null,
					metadata: record.metadata || {},
				},
			}),
		});

		const result = await expoRes.json();

		if (!expoRes.ok) {
			throw new Error(`Expo API error: ${JSON.stringify(result)}`);
		}

		console.log(`Push notification sent for user ${record.user_id}:`, result);

		return new Response(JSON.stringify({ success: true, result }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error sending push notification:", error);
		return new Response(
			JSON.stringify({ success: false, error: error.message }),
			{
				headers: { "Content-Type": "application/json" },
				status: 400,
			},
		);
	}
});