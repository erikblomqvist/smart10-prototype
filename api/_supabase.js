import { createClient } from '@supabase/supabase-js';

let adminClient = null;

export function getSupabaseAdmin() {
	const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY;
	if (!url || !secretKey) return null;

	if (!adminClient) {
		adminClient = createClient(url, secretKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		});
	}

	return adminClient;
}

/** @param {Record<string, unknown>} event */
export async function recordAiImportEvent(event) {
	const supabase = getSupabaseAdmin();
	if (!supabase) {
		console.warn(JSON.stringify({
			event: 'ai_import_monitoring_unavailable',
			reason: 'missing_supabase_server_env',
			request_id: event.request_id,
		}));
		return;
	}

	const { error } = await supabase.from('ai_import_events').insert(event);
	if (error) {
		console.warn(JSON.stringify({
			event: 'ai_import_monitoring_insert_failed',
			request_id: event.request_id,
			error: error.message,
		}));
	}
}

/** @param {string | undefined} authorization */
export async function getUserIdFromAuthorization(authorization) {
	const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
	if (!token) return null;

	const supabase = getSupabaseAdmin();
	if (!supabase) return null;

	const { data, error } = await supabase.auth.getUser(token);
	if (error) {
		console.warn(JSON.stringify({
			event: 'ai_import_user_lookup_failed',
			error: error.message,
		}));
		return null;
	}

	return data.user?.id ?? null;
}
