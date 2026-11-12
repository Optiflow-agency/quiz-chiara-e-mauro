import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Mailer } from '$lib/server/mail';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			getUser: () => Promise<User | null>;
			/** Client on the secret key (acts as the service role, bypasses RLS). Created on demand; only for writes RLS cannot express. */
			createAdminClient: () => SupabaseClient;
			/** SMTP mailer, created on demand; null when SMTP is not configured. */
			createMailer: () => Mailer | null;
		}
		// interface PageData {}
		interface PageState {
			/** Id of the survey screen shown at this history entry, and how many in-app steps precede it. */
			screen?: string;
			step?: number;
		}
		// interface Platform {}
	}
}

export {};
