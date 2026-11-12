<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import EmailField from './EmailField.svelte';
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';
	import Turnstile from './Turnstile.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import type { SurveySession } from '$lib/survey/session.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		session,
		hasSession,
		onGranted
	}: {
		session: SurveySession;
		/** Whether the respondent is already signed in (anonymously or verified). */
		hasSession: boolean;
		onGranted: () => void;
	} = $props();

	let email = $state('');
	let processing = $state(false);
	let attempted = $state(false);
	let pending = $state(false);
	let captcha = $state('');

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
	const outcome = $derived(page.form);
	const needsEmail = $derived(!hasSession);
	const serverError = $derived(outcome && 'error' in outcome ? outcome.error : null);

	// Validation lives here, not in `onsubmit`: `enhance` ignores `preventDefault`, only `cancel` stops it.
	const enhanceGate: SubmitFunction = ({ cancel }) => {
		attempted = true;
		if ((needsEmail && (!emailValid || !captcha)) || !processing) return cancel();
		pending = true;
		return async ({ result, update }) => {
			// No form reset: it would clear the bound fields and flash their errors while data reloads.
			await update({ reset: false });
			pending = false;
			if (result.type === 'success') onGranted();
		};
	};
</script>

{#if session.unlocked}
	<Heading
		id="gate-title"
		before={m.gate.grantedTitle}
		accent={m.gate.grantedAccent}
		size="sheet"
	/>
	<p class="intro granted" role="status">{m.gate.granted}</p>
{:else}
	<Heading id="gate-title" before={m.gate.title} accent={m.gate.accent} size="sheet" />
	<p class="intro">{needsEmail ? m.gate.intro : m.gate.introSession}</p>
	{#if serverError === 'send' || serverError === 'rate' || serverError === 'captcha'}
		<p class="error alert" role="alert">
			{serverError === 'rate'
				? m.gate.rateLimited
				: serverError === 'captcha'
					? m.securityCheck.failed
					: m.gate.sendFailed}
		</p>
	{/if}

	<form
		method="POST"
		action={needsEmail ? '?/signin' : '?/consent'}
		novalidate
		use:enhance={enhanceGate}
	>
		{#if needsEmail}
			<EmailField
				id="gate-email"
				label={m.gate.emailLabel}
				bind:value={email}
				error={attempted && !emailValid ? m.gate.emailInvalid : null}
			/>
			<Turnstile
				siteKey={env.PUBLIC_TURNSTILE_SITE_KEY}
				bind:token={captcha}
				unavailable={m.securityCheck.unavailable}
			/>
		{/if}

		<div class="check">
			<label>
				<input
					type="checkbox"
					name="processing"
					bind:checked={processing}
					aria-invalid={attempted && !processing}
					aria-describedby={attempted && !processing ? 'gate-processing-error' : undefined}
				/>
				<span>{m.gate.processing}</span>
			</label>
			{#if attempted && !processing}
				<p class="error" id="gate-processing-error">{m.gate.processingRequired}</p>
			{/if}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external legal page -->
			<a href={m.privacyUrl} target="_blank" rel="noopener">{m.gate.privacyLink}</a>
		</div>

		<button type="submit" class="btn" disabled={pending || (needsEmail && !captcha)}>
			{m.gate.submit}
			<Icon name="arrow" />
		</button>
	</form>
{/if}

<style>
	.intro {
		max-width: 52ch;
		margin-top: 24px;
		font-size: clamp(17px, 2.4vw, 19px);
		color: var(--text-on-dark);
	}
	.alert {
		margin: 16px 0 0;
	}
	.granted {
		font-weight: 700;
		color: #fff;
	}
	form {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 18px;
		margin-top: 32px;
	}
	.check {
		display: grid;
		gap: 6px;
	}
	.check label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-on-dark);
		cursor: pointer;
	}
	.check input {
		flex: none;
		width: 22px;
		height: 22px;
		margin: 1px 0 0;
		accent-color: var(--blue);
	}
	.check a {
		margin-left: 34px;
		font-size: 14px;
		font-weight: 700;
		color: var(--accent-on-dark);
		text-underline-offset: 3px;
	}
	.error {
		margin-left: 34px;
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
	button {
		justify-self: start;
		margin-top: 8px;
	}
</style>
