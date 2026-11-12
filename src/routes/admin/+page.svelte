<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Heading from '$lib/components/Heading.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { messages as m } from '$lib/content/messages.it';

	let { data, form } = $props();

	/** The respondent whose map is being emailed right now. */
	let sending = $state<string | null>(null);

	const a = m.admin;
	// Fixed zone, so the server render and the browser agree.
	const day = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeZone: 'Europe/Rome' });

	/** The line above the list: how many, or why there is nothing. */
	const status = $derived.by(() => {
		const rows = data.respondents ?? [];
		if (rows.length === 0) {
			if (data.page > 1) return a.pastEnd;
			return data.search ? a.noMatches : data.requestedOnly ? a.noRequests : a.empty;
		}
		if (data.search) return a.matches(data.total, data.search);
		return data.requestedOnly ? a.countRequested(data.total) : a.count(data.total);
	});
</script>

<!-- A GET form per page change, so the search travels with it and no script is needed. -->
{#snippet pageButton(page: number, label: string, rel?: 'prev' | 'next')}
	<form method="GET" class:next={rel === 'next'}>
		{#if data.search}<input type="hidden" name="q" value={data.search} />{/if}
		{#if data.requestedOnly}<input type="hidden" name="colloquio" value="1" />{/if}
		<button type="submit" name="pagina" value={page} class="link">{label}</button>
	</form>
{/snippet}

<svelte:head>
	<title>{a.pageTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<!-- The ways out sit above the work, not after a long list. -->
	<nav class="exits" aria-label={a.navigation}>
		<a href={resolve('/profilo')} class="exit">
			<span class="exit__back"><Icon name="arrow" size={16} /></span>
			{a.backToProfile}
		</a>
		<a href={resolve('/')} class="exit">
			{a.backToSurvey}
			<Icon name="arrow" size={16} />
		</a>
	</nav>

	<Heading id="admin-title" before={a.title} accent={a.accent} />
	<p class="intro">{a.intro}</p>
	<p class="intro">
		<a href={resolve('/admin/statistiche')} class="link">{m.stats.open}</a>
		<span> · {m.stats.openDetail}</span>
	</p>

	<form id="admin-search-form" method="GET" class="search" role="search">
		<label for="admin-search">{a.searchLabel}</label>
		<div class="search__row">
			<input id="admin-search" type="search" name="q" value={data.search} maxlength="100" />
			<button type="submit" class="btn btn--ghost">{a.search}</button>
		</div>
		<p class="hint">{a.searchHint}</p>
	</form>

	{#if data.respondents === null}
		<p class="alert" role="alert"><Icon name="alert" size={14} />{a.error}</p>
	{:else}
		<!-- What the list holds on the left, what narrows it on the right. -->
		<div class="results">
			<p class="results__status" role="status">{status}</p>
			<div class="results__tools">
				<!-- Part of the search form, so the search travels with it. Applies at once where
				     scripts run; elsewhere with the search button. -->
				<label class="filter">
					<input
						type="checkbox"
						form="admin-search-form"
						name="colloquio"
						value="1"
						checked={data.requestedOnly}
						onchange={(event) => event.currentTarget.form?.requestSubmit()}
					/>
					{a.requestedOnly}
				</label>
				{#if data.search || data.requestedOnly}
					<a href={resolve('/admin')} class="link">{a.clear}</a>
				{/if}
			</div>
		</div>
		{#if data.respondents.length === 0 && data.page > 1}
			{@render pageButton(1, a.firstPage)}
		{/if}
	{/if}

	{#if data.respondents?.length}
		<ul>
			{#each data.respondents as r (r.id)}
				<li class="row">
					<div class="row__text">
						<p class="row__title">{r.email}</p>
						<p class="row__detail">
							<span>{a.answered(r.answered)}</span>
							{#if r.last_answer}<span>{a.lastAnswer(day.format(new Date(r.last_answer)))}</span
								>{/if}
							{#if r.requested_at}<span class="requested">{a.requested}</span>{/if}
						</p>
					</div>
					{#if r.answered > 0}
						<div class="actions">
							<form
								method="POST"
								action="?/sendMap"
								use:enhance={() => {
									sending = r.id;
									return async ({ update }) => {
										await update({ reset: false });
										sending = null;
									};
								}}
							>
								<input type="hidden" name="id" value={r.id} />
								<button type="submit" class="btn btn--ghost" disabled={sending !== null}>
									<Icon name="mail" size={16} />
									{sending === r.id ? a.sending : a.sendMap}
								</button>
							</form>
							<a
								href={resolve('/admin/mappa/[id]', { id: r.id })}
								class="btn btn--ghost"
								target="_blank"
								rel="noopener"
							>
								<Icon name="download" size={16} />
								{a.openMap}
							</a>
						</div>
						{#if form?.id === r.id}
							{#if 'sent' in form}
								<p class="outcome" role="status">
									<Icon name="check" size={14} />{a.sent(r.email)}
								</p>
							{:else if 'error' in form}
								<p class="outcome outcome--error" role="alert">
									<Icon name="alert" size={14} />{a.sendFailed[form.error]}
								</p>
							{/if}
						{/if}
					{:else}
						<span class="row__detail">{a.noAnswers}</span>
					{/if}
				</li>
			{/each}
		</ul>
		{#if data.pages > 1}
			<nav class="pager" aria-label={a.pagination}>
				{#if data.page > 1}
					{@render pageButton(data.page - 1, a.previous, 'prev')}
				{:else}
					<span></span>
				{/if}
				<span aria-current="page">{a.pageOf(data.page, data.pages)}</span>
				{#if data.page < data.pages}
					{@render pageButton(data.page + 1, a.next, 'next')}
				{:else}
					<span></span>
				{/if}
			</nav>
		{/if}
	{/if}
</main>

<style>
	main {
		--rule: rgba(220, 230, 245, 0.14);
		max-width: 800px;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 32px var(--gutter) 96px;
		color: var(--text-on-dark);
	}
	.intro {
		margin-top: 16px;
		max-width: 60ch;
		color: var(--muted-on-dark);
	}

	/* Search: label, field and hint form one tight unit across the list's full width. */
	.search {
		display: grid;
		gap: 8px;
		margin-top: 40px;
	}
	.search label {
		font-size: 14px;
		font-weight: 700;
	}
	.search__row {
		display: flex;
		gap: 12px;
	}
	.search input {
		flex: 1;
		min-width: 0;
		padding: 12px 14px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-field);
		background: #fff;
		color: var(--navy);
	}
	.hint {
		font-size: 14px;
		color: var(--muted-on-dark);
	}

	/* Results bar: sits on the list, set apart from the search by the larger interval. */
	.results {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 24px;
		margin-top: 48px;
		padding-bottom: 14px;
		font-size: 14px;
	}
	.results__status {
		color: var(--muted-on-dark);
	}
	.results__tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
	}
	.results .link {
		font-size: 14px;
	}
	.filter {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.filter input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--blue);
		cursor: pointer;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 16px;
		margin-top: 24px;
		font-size: 14px;
		color: var(--muted-on-dark);
		font-variant-numeric: tabular-nums;
	}
	.pager .next {
		justify-self: end;
	}
	button.link {
		padding: 10px 0;
		border: 0;
		background: none;
		font: 700 15px var(--font-body);
		text-decoration: underline;
		cursor: pointer;
	}

	ul {
		margin-top: 0;
		padding: 0;
		list-style: none;
	}

	/* Same row as the profile page: who on the left, the one action on the right. */
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 12px 24px;
		padding: 16px 0;
		border-top: 1px solid var(--rule);
	}
	.row:last-child {
		border-bottom: 1px solid var(--rule);
	}
	.row__text {
		min-width: 0;
	}
	.row__title {
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.row__detail {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		margin-top: 4px;
		font-size: 14px;
		color: var(--muted-on-dark);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.btn--ghost:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.outcome {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 700;
		color: var(--accent-on-dark);
	}
	.outcome--error {
		color: var(--error-on-dark);
	}
	.requested {
		font-weight: 700;
		color: var(--accent-on-dark);
	}

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
	.link {
		color: var(--accent-on-dark);
		font-weight: 700;
		text-underline-offset: 3px;
	}
	.alert {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 32px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
	.exits {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 24px;
		margin-bottom: 40px;
	}
	.exit {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		/* Comfortable target without a visible box. */
		padding: 10px 0;
		color: var(--muted-on-dark);
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
		transition: color 0.15s ease-out;
	}
	.exit:hover {
		color: #fff;
	}
	.exit__back {
		display: inline-flex;
		transform: scaleX(-1);
	}

	@media (max-width: 479px) {
		.row {
			grid-template-columns: 1fr;
			justify-items: start;
		}
	}
</style>
