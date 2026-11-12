<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Heading from '$lib/components/Heading.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ProfileSignIn from '$lib/components/ProfileSignIn.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import { clearStoredAnswers } from '$lib/survey/session.svelte';

	let { data, form } = $props();

	let pending = $state(false);
	/** Which destructive action is waiting for its second click. */
	let confirming = $state<'withdraw' | 'deleteAccount' | null>(null);
	let confirmButton = $state<HTMLButtonElement>();
	let openers: Partial<Record<'withdraw' | 'deleteAccount', HTMLButtonElement>> = {};

	async function ask(action: 'withdraw' | 'deleteAccount') {
		confirming = action;
		await tick();
		confirmButton?.focus();
	}

	async function cancel() {
		const action = confirming;
		confirming = null;
		await tick();
		if (action) openers[action]?.focus();
	}

	/** Disables the buttons while pending; logging out and erasing also clear the copy kept on this device. */
	const track =
		(clearsDevice: boolean): SubmitFunction =>
		() => {
			pending = true;
			return async ({ result, update }) => {
				if (clearsDevice && (result.type === 'success' || result.type === 'redirect')) {
					try {
						clearStoredAnswers(localStorage);
					} catch {
						// storage unavailable: nothing to clear
					}
				}
				await update();
				confirming = null;
				pending = false;
			};
		};

	const canWithdraw = $derived(data.consents.processing === true || data.answerCount > 0);
</script>

<svelte:head>
	<title>{m.profile.pageTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet status(granted: boolean)}
	<span class="status" class:status--on={granted}>
		{#if granted}<Icon name="check" size={14} />{/if}
		{granted ? m.profile.granted : m.profile.notGranted}
	</span>
{/snippet}

{#snippet failure(action: string)}
	{#if form?.error === action}
		<p class="alert" role="alert"><Icon name="alert" size={14} />{m.profile.error}</p>
	{/if}
{/snippet}

{#snippet confirmPanel(action: 'withdraw' | 'deleteAccount', warning: string, label: string)}
	<form method="POST" action="?/{action}" class="confirm" use:enhance={track(true)}>
		<p>{warning}</p>
		<div class="confirm__actions">
			<button type="submit" class="btn btn--danger" disabled={pending} bind:this={confirmButton}>
				{pending ? m.profile.withdraw.pending : label}
			</button>
			<button type="button" class="link" disabled={pending} onclick={cancel}>
				{m.profile.withdraw.cancel}
			</button>
		</div>
	</form>
{/snippet}

<main>
	{#if data.state === 'login'}
		<Heading id="profile-title" before={m.profile.signIn.title} accent={m.profile.signIn.accent} />
		<ProfileSignIn
			intro={m.profile.signIn.intro}
			note={m.profile.signIn.note}
			initialEmail={data.prefill}
			codeEmail={data.codeEmail}
		/>
		<a href={resolve('/')} class="link back">{m.profile.backToSurvey}</a>
	{:else if data.state === 'verify'}
		<Heading id="profile-title" before={m.profile.verify.title} accent={m.profile.verify.accent} />
		<ProfileSignIn
			intro={m.profile.verify.intro}
			note={m.profile.verify.note}
			initialEmail={data.prefill}
			codeEmail={data.codeEmail}
		/>
		<a href={resolve('/')} class="link back">{m.profile.backToSurvey}</a>
	{:else}
		<Heading id="profile-title" before={m.profile.title} accent={m.profile.accent} />

		<section aria-labelledby="account-title">
			<h2 id="account-title">{m.profile.account.title}</h2>
			<div class="row">
				<div class="row__text">
					<p class="row__title">{data.email}</p>
					<p class="row__detail">
						{#if data.admin}
							<span class="status status--on"
								><Icon name="shield" size={15} />{m.profile.admin.role}</span
							>
						{/if}
						<span>{m.profile.account.signedIn}</span>
					</p>
				</div>
				<form method="POST" action="?/logout" use:enhance={track(true)}>
					<button type="submit" class="btn btn--ghost" disabled={pending}>
						{m.profile.account.logout}
					</button>
				</form>
			</div>
			{#if data.admin}
				<div class="row">
					<div class="row__text">
						<p class="row__title">{m.profile.admin.title}</p>
						<p class="row__detail">{m.profile.admin.detail}</p>
					</div>
					<a href={resolve('/admin')} class="btn btn--ghost">
						{m.profile.admin.open}
						<Icon name="arrow" size={16} />
					</a>
				</div>
				<div class="row">
					<div class="row__text">
						<p class="row__title">{m.profile.stats.title}</p>
						<p class="row__detail">{m.profile.stats.detail}</p>
					</div>
					<a href={resolve('/admin/statistiche')} class="btn btn--ghost">
						{m.profile.stats.open}
						<Icon name="arrow" size={16} />
					</a>
				</div>
			{/if}
		</section>

		<section aria-labelledby="consents-title">
			<h2 id="consents-title">{m.profile.consentsTitle}</h2>
			<p class="intro">{m.profile.consentsIntro}</p>

			<div class="row">
				<div class="row__text">
					<p class="row__title">{m.profile.consents.processing}</p>
					<p class="row__detail">
						{@render status(data.consents.processing === true)}
						<span>{m.profile.answers(data.answerCount)}</span>
					</p>
					{#if !canWithdraw}
						<p class="row__detail">
							{m.profile.processingOff}
							<a href={resolve('/')}>{m.profile.giveConsentAgain}</a>
						</p>
					{/if}
				</div>
				{#if canWithdraw && confirming !== 'withdraw'}
					<button
						type="button"
						class="btn btn--ghost btn--warn"
						disabled={pending}
						bind:this={openers.withdraw}
						onclick={() => ask('withdraw')}>{m.profile.revoke}</button
					>
				{/if}
				{#if confirming === 'withdraw'}
					{@render confirmPanel('withdraw', m.profile.withdraw.warning, m.profile.withdraw.confirm)}
				{/if}
				{@render failure('withdraw')}
			</div>
		</section>

		<section aria-labelledby="data-title">
			<h2 id="data-title">{m.profile.data.title}</h2>
			<div class="row">
				<div class="row__text">
					<p class="row__title">{m.profile.data.exportTitle}</p>
					<p class="row__detail">{m.profile.data.intro}</p>
				</div>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- file download, not a page -->
				<a href="/profilo/dati.json" class="btn btn--ghost" download>
					<Icon name="download" size={16} />
					{m.profile.data.download}
				</a>
			</div>
			<div class="row">
				<div class="row__text">
					<p class="row__title">{m.profile.deleteAccount.title}</p>
					<p class="row__detail">
						{data.admin ? m.profile.deleteAccount.staff : m.profile.deleteAccount.intro}
					</p>
				</div>
				{#if data.admin}
					<!-- Staff accounts are kept while listed as admins (also enforced on the server). -->
				{:else if confirming !== 'deleteAccount'}
					<button
						type="button"
						class="btn btn--ghost btn--warn"
						disabled={pending}
						bind:this={openers.deleteAccount}
						onclick={() => ask('deleteAccount')}>{m.profile.deleteAccount.button}</button
					>
				{:else}
					{@render confirmPanel(
						'deleteAccount',
						m.profile.deleteAccount.warning,
						m.profile.deleteAccount.confirm
					)}
				{/if}
				{@render failure('deleteAccount')}
			</div>
		</section>

		<section aria-labelledby="map-title">
			<h2 id="map-title">{m.profile.map.title}</h2>
			<p class="intro">{m.profile.map.pending}</p>
		</section>

		<a href={resolve('/')} class="btn back">
			{m.profile.backToSurvey}
			<Icon name="arrow" />
		</a>
	{/if}
</main>

<style>
	main {
		--rule: rgba(220, 230, 245, 0.14);
		max-width: 640px;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 64px var(--gutter) 96px;
		color: var(--text-on-dark);
	}
	section {
		margin-top: 56px;
	}
	h2 {
		font-size: 22px;
		font-weight: 600;
		line-height: 1.3;
		color: #fff;
	}
	.intro {
		margin-top: 8px;
		max-width: 52ch;
		font-size: 15px;
		color: var(--muted-on-dark);
	}
	h2 + .row,
	.intro + .row {
		margin-top: 16px;
	}

	/* One setting per row: what it is on the left, its single action on the right. */
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 12px 24px;
		padding: 20px 0;
		border-top: 1px solid var(--rule);
	}
	.row:last-of-type {
		border-bottom: 1px solid var(--rule);
	}
	.row__text {
		min-width: 0;
	}
	.row__title {
		font-weight: 700;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.row__detail {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 14px;
		margin-top: 4px;
		font-size: 14px;
		color: var(--muted-on-dark);
	}
	.row__detail a,
	.link {
		color: var(--accent-on-dark);
		font-weight: 700;
		text-underline-offset: 3px;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-weight: 700;
	}
	.status--on {
		color: var(--accent-on-dark);
	}

	/* Secondary actions: outline pills, quieter than the single blue CTA. */
	.btn {
		text-decoration: none;
	}
	.btn--ghost {
		gap: 8px;
		padding: 10px 18px;
		border-color: rgba(167, 187, 214, 0.45);
		background: transparent;
		color: var(--text-on-dark);
		font-size: 15px;
		white-space: nowrap;
	}
	.btn--ghost:hover:not(:disabled) {
		border-color: var(--accent-on-dark);
		background: rgba(111, 163, 255, 0.1);
	}
	.btn--warn {
		color: var(--error-on-dark);
		border-color: rgba(255, 179, 179, 0.4);
	}
	.btn--warn:hover:not(:disabled) {
		border-color: var(--error-on-dark);
		background: rgba(255, 179, 179, 0.08);
	}
	.btn--danger {
		padding: 12px 22px;
		border-color: var(--error);
		background: var(--error);
		font-size: 15px;
	}
	.btn--danger:hover:not(:disabled) {
		border-color: #a52828;
		background: #a52828;
	}

	.confirm {
		grid-column: 1 / -1;
		padding: 18px 20px;
		border: 1.5px solid rgba(255, 179, 179, 0.4);
		border-radius: var(--radius-card);
		font-size: 15px;
	}
	.confirm p {
		max-width: 60ch;
	}
	.confirm__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
		margin-top: 16px;
	}
	.link {
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

	.alert {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 8px;
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}

	.back {
		display: inline-flex;
		margin-top: 56px;
	}

	@media (max-width: 359px) {
		.row {
			grid-template-columns: 1fr;
			justify-items: start;
		}
	}
</style>
