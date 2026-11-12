<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import EmailField from './EmailField.svelte';
	import Icon from './Icon.svelte';
	import Turnstile from './Turnstile.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		intro,
		note,
		initialEmail,
		codeEmail
	}: {
		intro: string;
		note: string;
		/** Prefilled in the email field. */
		initialEmail: string;
		/** Set while a code is outstanding: the page then shows the code step. */
		codeEmail: string | null;
	} = $props();

	// Only the starting value: the respondent edits it from there.
	let email = $state(untrack(() => initialEmail));
	let code = $state('');
	let captcha = $state('');
	let attempted = $state(false);
	let pending = $state(false);

	const s = m.profile.signIn;
	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
	const codeValid = $derived(/^\d{6}$/.test(code.replace(/\s+/g, '')));
	const error = $derived(page.form && 'error' in page.form ? page.form.error : null);
	const errorText = $derived(
		{
			rate: s.rateLimited,
			send: s.sendFailed,
			captcha: m.securityCheck.failed,
			invalid: s.wrongCode,
			expired: s.expired
		}[String(error)] ?? null
	);

	/**
	 * Enhances a form, optionally validating it first. Validation lives here, not in `onsubmit`:
	 * `enhance` ignores `preventDefault`, only `cancel` stops it.
	 */
	function track(valid?: () => boolean): SubmitFunction {
		return ({ cancel }) => {
			if (valid) {
				attempted = true;
				if (!valid()) return cancel();
			}
			pending = true;
			return async ({ update }) => {
				// No form reset: it would clear the bound fields and flash their errors while data reloads.
				await update({ reset: false });
				pending = false;
				code = '';
				attempted = false;
			};
		};
	}
</script>

{#snippet failure()}
	{#if errorText}
		<p class="alert" role="alert">{errorText}</p>
	{/if}
{/snippet}

{#if codeEmail}
	<p class="intro sent" role="status">{s.codeSent(codeEmail)}</p>
	<p class="spam">{s.spamHint}</p>
	{@render failure()}
	<form method="POST" action="?/verify" novalidate use:enhance={track(() => codeValid)}>
		<label class="field">
			<span class="field__label">{s.codeLabel}</span>
			<input
				type="text"
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				required
				bind:value={code}
				aria-invalid={error === 'code' || (attempted && !codeValid)}
				aria-describedby={error === 'code' || (attempted && !codeValid)
					? 'signin-code-error'
					: undefined}
			/>
			{#if error === 'code' || (attempted && !codeValid)}
				<span class="error" id="signin-code-error">{s.codeInvalid}</span>
			{/if}
		</label>
		<button type="submit" class="btn" disabled={pending}>
			{s.verify}
			<Icon name="arrow" />
		</button>
	</form>

	<form method="POST" action="?/sendCode" class="again" use:enhance={track()}>
		<input type="hidden" name="email" value={codeEmail} />
		<Turnstile
			siteKey={env.PUBLIC_TURNSTILE_SITE_KEY}
			bind:token={captcha}
			unavailable={m.securityCheck.unavailable}
		/>
		<p class="note">{s.resendWarning}</p>
		<div class="again__actions">
			<button type="submit" class="link" disabled={pending || !captcha}>{s.resend}</button>
		</div>
	</form>
	<form method="POST" action="?/changeEmail" class="again" use:enhance={track()}>
		<button type="submit" class="link" disabled={pending}>{s.changeEmail}</button>
	</form>
{:else}
	<p class="intro">{intro}</p>
	{@render failure()}
	<form
		method="POST"
		action="?/sendCode"
		novalidate
		use:enhance={track(() => emailValid && captcha !== '')}
	>
		<EmailField
			id="signin-email"
			label={s.emailLabel}
			bind:value={email}
			error={attempted && !emailValid ? s.emailInvalid : null}
		/>
		<Turnstile
			siteKey={env.PUBLIC_TURNSTILE_SITE_KEY}
			bind:token={captcha}
			unavailable={m.securityCheck.unavailable}
		/>
		<p class="note">
			{note}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external legal page -->
			<a href={m.privacyUrl} target="_blank" rel="noopener">{s.privacyLink}</a>
		</p>
		<button type="submit" class="btn" disabled={pending || !captcha}>
			{s.button}
			<Icon name="arrow" />
		</button>
	</form>
{/if}

<style>
	.intro {
		max-width: 52ch;
		margin-top: 24px;
		font-size: clamp(17px, 2.4vw, 19px);
	}
	.sent {
		font-weight: 700;
		color: #fff;
	}
	.spam {
		max-width: 52ch;
		margin-top: 12px;
		padding: 12px 16px;
		border-left: 3px solid var(--accent-on-dark);
		border-radius: 8px;
		background: rgba(111, 163, 255, 0.12);
		font-size: 16px;
		font-weight: 700;
		color: #fff;
	}
	.alert {
		margin-top: 16px;
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
	form {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 18px;
		max-width: 480px;
		margin-top: 32px;
	}
	.again {
		gap: 10px;
		margin-top: 24px;
	}
	.field {
		display: grid;
		gap: 8px;
	}
	.field__label {
		font-size: 14px;
		font-weight: 700;
	}
	input[name='code'] {
		width: 100%;
		padding: 15px 16px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-field);
		background: #fff;
		color: var(--navy);
		font:
			700 24px/1.2 ui-monospace,
			Menlo,
			Consolas,
			monospace;
		letter-spacing: 0.3em;
	}
	input[name='code']:focus {
		border-color: var(--blue);
		box-shadow: 0 0 0 3px rgba(111, 163, 255, 0.35);
		outline: none;
	}
	input[name='code'][aria-invalid='true'] {
		border-color: var(--error-on-dark);
	}
	.error {
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
	.note {
		font-size: 14px;
		color: var(--muted-on-dark);
	}
	.note a,
	.link {
		font-weight: 700;
		color: var(--accent-on-dark);
		text-underline-offset: 3px;
	}
	.link {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		font: 700 15px var(--font-body);
		text-decoration: underline;
		cursor: pointer;
	}
	.link:disabled {
		color: var(--muted-on-dark);
		text-decoration: none;
		cursor: not-allowed;
	}
	button.btn {
		justify-self: start;
		margin-top: 8px;
	}
</style>
