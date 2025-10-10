import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
	Deno.env.get("SUPABASE_URL")!,
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	{ auth: { persistSession: false } },
);

const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

// Tiered pricing calculation - returns the FEE amount
function calculateFees(grossAmount: number): number {
	if (grossAmount >= 500 && grossAmount <= 999) return 50;
	if (grossAmount >= 1000 && grossAmount <= 1499) return 80;
	if (grossAmount >= 1500 && grossAmount <= 2499) return 100;
	if (grossAmount >= 2500 && grossAmount <= 3999) return 200;
	if (grossAmount >= 4000 && grossAmount <= 4999) return 225;
	if (grossAmount >= 5000 && grossAmount <= 7999) return 250;

	// For 8000 and above
	const base = 8000;
	const basePrice = 300;
	const rangeSize = 3000;
	const increment = 50;
	const steps = Math.floor((grossAmount - base) / rangeSize);
	return basePrice + steps * increment;
}

serve(async (req) => {
	console.log("➡️ Webhook triggered");

	if (req.method !== "POST") {
		console.log("❌ Invalid method:", req.method);
		return new Response("Method Not Allowed", { status: 405 });
	}

	const signature = req.headers.get("x-paystack-signature");
	if (!signature) {
		console.log("❌ Missing signature");
		return new Response("Unauthorized", { status: 401 });
	}

	const bodyArrayBuffer = await req.arrayBuffer();
	const rawBody = new TextDecoder().decode(bodyArrayBuffer);

	const valid = await verifyPaystackSignature(rawBody, signature);
	console.log("🔐 Signature valid:", valid);

	if (!valid) {
		console.log("❌ Invalid signature");
		return new Response("Unauthorized", { status: 401 });
	}

	let payload;
	try {
		payload = JSON.parse(rawBody);
	} catch (err) {
		console.error("❌ Failed to parse payload:", err);
		return new Response("Invalid payload", { status: 400 });
	}

	const event = payload?.event;
	const data = payload?.data;
	const reference = data?.reference;
	const email = data?.customer?.email || data?.customer?.[0]?.email;

	const grossAmountKobo = data?.amount ?? null;
	const grossAmount = grossAmountKobo / 100; // convert to naira
	const netAmount = calculateNetAmount(grossAmount);
	const fees = grossAmount - netAmount;

	console.log("📦 Event:", event);
	console.log("🔗 Reference:", reference);
	console.log("🔗 Payload data:", data);
	console.log("📧 Email:", email);
	console.log("💵 Gross Amount:", grossAmount);
	console.log("💸 Fees:", fees);
	console.log("🧾 Net Amount to save:", netAmount);

	if (!reference || !email || netAmount == null) {
		console.log("❌ Missing critical fields");
		return new Response("Missing fields", { status: 400 });
	}

	try {
		if (event === "charge.success" && data.status === "success") {
			console.log("✅ Payment success — attempting to update transaction");

			const MAX_RETRIES = 5;
			const RETRY_INTERVAL_MS = 2000;

			let tx = null;
			let txError = null;
			let attempt = 0;

			while (attempt < MAX_RETRIES) {
				attempt++;

				console.log(
					`🔍 Attempt ${attempt} — Searching for transaction with reference: ${reference}`,
				);

				const { data: existingTx, error: checkError } = await supabase
					.from("transactions")
					.select("*")
					.eq("reference", reference)
					.maybeSingle();

				console.log(`🔍 Query result:`, {
					found: !!existingTx,
					error: checkError?.message,
					transaction: existingTx
						? {
								id: existingTx.id,
								reference: existingTx.reference,
								status: existingTx.status,
								email: existingTx.user_email,
							}
						: null,
				});

				if (checkError) {
					console.error(
						`❌ Attempt ${attempt} — DB error checking transaction:`,
						checkError.message,
					);
					txError = checkError;
					break;
				}

				if (!existingTx) {
					console.warn(
						`⏳ Attempt ${attempt} — transaction not found in DB yet: ${reference}`,
					);
					if (attempt < MAX_RETRIES) {
						await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
						continue;
					}
				} else {
					console.log(`📍 Found transaction on attempt ${attempt}:`, {
						id: existingTx.id,
						status: existingTx.status,
						reference: existingTx.reference,
						email: existingTx.user_email,
					});

					if (existingTx.status === "success") {
						console.log("✅ Transaction already marked as success");
						return new Response("OK - Already processed", { status: 200 });
					}

					const { data: updatedTx, error: updateError } = await supabase
						.from("transactions")
						.update({
							status: "success",
							amount: netAmount,
							metadata: {
								...existingTx.metadata,
								verified_by: "paystack-webhook",
								gateway_response: data.gateway_response,
								channel: data.channel,
								paid_at: data.paid_at,
								paystack_id: data.id,
								fees,
								gross_amount: grossAmount,
								authorization: data.authorization,
							},
						})
						.eq("id", existingTx.id)
						.eq("status", "pending")
						.select("*")
						.maybeSingle();

					tx = updatedTx;
					txError = updateError;

					if (updateError) {
						console.error(
							`❌ Attempt ${attempt} — Update error:`,
							updateError.message,
						);
						break;
					}

					if (tx) {
						console.log(
							`✅ Transaction updated successfully on attempt ${attempt}`,
						);
						break;
					}
				}

				if (attempt < MAX_RETRIES) {
					console.log(`⏳ Waiting ${RETRY_INTERVAL_MS}ms before retry...`);
					await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
				}
			}

			if (txError) {
				console.error("❌ Final error after retries:", txError.message);
				return new Response("Transaction update error", { status: 500 });
			}

			if (!tx) {
				console.warn(
					`⚠️ Transaction still not found/updated after ${MAX_RETRIES} attempts: ${reference}`,
				);

				const { data: txsByEmailAmount } = await supabase
					.from("transactions")
					.select("*")
					.eq("user_email", email)
					.eq("amount", netAmount)
					.eq("status", "pending")
					.order("created_at", { ascending: false })
					.limit(5);

				if (txsByEmailAmount && txsByEmailAmount.length > 0) {
					const matchingTx = txsByEmailAmount[0];
					console.log(
						"🎯 Found potential matching transaction, attempting update...",
					);

					const { data: updatedTx, error: updateError } = await supabase
						.from("transactions")
						.update({
							status: "success",
							reference: reference,
							amount: netAmount,
							metadata: {
								...matchingTx.metadata,
								verified_by: "paystack-webhook",
								gateway_response: data.gateway_response,
								channel: data.channel,
								paid_at: data.paid_at,
								paystack_id: data.id,
								fees,
								gross_amount: grossAmount,
								authorization: data.authorization,
								original_reference: matchingTx.reference,
							},
						})
						.eq("id", matchingTx.id)
						.eq("status", "pending")
						.select("*")
						.maybeSingle();

					if (updateError) {
						console.error(
							"❌ Error updating matching transaction:",
							updateError.message,
						);
					} else if (updatedTx) {
						console.log("✅ Successfully updated matching transaction");
						return new Response("OK", { status: 200 });
					}
				}

				return new Response("Transaction not found or already processed", {
					status: 404,
				});
			}

			console.log(
				"✅ Transaction marked as success. Trigger will credit wallet.",
			);
			return new Response("OK", { status: 200 });
		}

		console.log("ℹ️ Event ignored:", event);
		return new Response("Ignored", { status: 200 });
	} catch (err) {
		console.error("🔥 Unhandled error:", err);
		return new Response("Internal Error", { status: 500 });
	}
});

async function verifyPaystackSignature(
	rawBody: string,
	signature: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = encoder.encode(paystackSecretKey);

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "HMAC", hash: "SHA-512" },
		false,
		["verify"],
	);

	const expectedSignatureBytes = hexToBytes(signature);
	const bodyBytes = encoder.encode(rawBody);

	return await crypto.subtle.verify(
		"HMAC",
		cryptoKey,
		expectedSignatureBytes,
		bodyBytes,
	);
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
	}
	return bytes;
}