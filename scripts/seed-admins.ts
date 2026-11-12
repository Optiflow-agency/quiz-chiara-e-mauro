// Syncs public.admins with ADMIN_EMAILS (comma or whitespace separated): listed addresses become
// admins, every other admin is removed. Unset or blank leaves the table alone. Runs before each
// Vercel build (vercel.json) and locally with `just seed-admins`.
// Needs PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.
import { createClient } from '@supabase/supabase-js';
import { parseAdminEmails, syncAdmins } from '../src/lib/server/admin.ts';

const emails = parseAdminEmails(process.env.ADMIN_EMAILS);
if (emails === null) {
	console.log('seed-admins: ADMIN_EMAILS is not set, admins left as they are');
} else {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY;
	if (!url || !key)
		throw new Error('seed-admins: PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required');
	const admin = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	await syncAdmins(admin, emails);
	console.log(`seed-admins: ${emails.length} admin(s) in place`);
}
