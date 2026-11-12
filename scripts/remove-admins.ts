// Removes admins, developer side. Addresses use the ADMIN_EMAILS format (comma or whitespace
// separated, validated); only addresses that are admins are touched.
//
//   node scripts/remove-admins.ts "a@x.it, b@x.it"           no longer admins: normal accounts
//   node scripts/remove-admins.ts "a@x.it" --purge           shows which accounts would be deleted
//   node scripts/remove-admins.ts "a@x.it" --purge --yes     deletes them and all their data
//
// Locally: `just remove-admins ...`. Needs PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY of the
// target database. Also take the addresses out of ADMIN_EMAILS, or the next deploy adds them back.
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { parseAdminEmails, removeAdmins, type AdminRemoval } from '../src/lib/server/admin.ts';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { purge: { type: 'boolean', default: false }, yes: { type: 'boolean', default: false } }
});
let emails: string[] | null;
try {
	emails = parseAdminEmails(positionals.join(' '));
} catch (error) {
	console.error(`remove-admins: ${(error as Error).message}`);
	process.exit(1);
}
if (!emails) {
	console.error('remove-admins: no addresses given (see the usage at the top of the script)');
	process.exit(1);
}
if (values.yes && !values.purge) {
	console.error('remove-admins: --yes only applies to --purge');
	process.exit(1);
}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
	console.error('remove-admins: PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required');
	process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const dryRun = values.purge && !values.yes;
console.log(`remove-admins: ${url}${dryRun ? ' (dry run: nothing is changed)' : ''}`);

const labels: Record<AdminRemoval, string> = {
	not_admin: 'not an admin, left alone',
	demoted: 'no longer an admin (normal account, or none yet)',
	purged: 'no longer an admin; account and its data deleted',
	would_demote: 'would stop being an admin (no account to delete)',
	would_purge: 'would stop being an admin; account and its data would be deleted'
};
const outcome = await removeAdmins(admin, emails, { purge: values.purge, dryRun });
for (const [email, result] of Object.entries(outcome)) console.log(`  ${email}: ${labels[result]}`);
if (dryRun && Object.values(outcome).includes('would_purge')) {
	console.log('Re-run with --yes to delete. This cannot be undone.');
}

const stillSeeded = emails.filter((e) => parseAdminEmails(process.env.ADMIN_EMAILS)?.includes(e));
if (stillSeeded.length > 0) {
	console.warn(
		`Warning: still in ADMIN_EMAILS, the next seed makes them admins again: ${stillSeeded.join(', ')}`
	);
}
