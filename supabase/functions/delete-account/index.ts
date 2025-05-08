// supabase/functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

	const { user_id } = await req.json();

	if (!user_id) {
		return new Response(JSON.stringify({ error: "User ID is required" }), {
			status: 400,
		});
	}

	const { error } = await supabase.auth.admin.deleteUser(user_id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}

	return new Response(JSON.stringify({ success: true }), { status: 200 });
});
