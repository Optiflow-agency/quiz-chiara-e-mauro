<script lang="ts">
	import { resolve } from '$app/paths';
	import Heading from '$lib/components/Heading.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { messages as m } from '$lib/content/messages.it';

	let { data } = $props();

	const s = m.stats;

	/** The same filters as the page, for the CSV link of one view. */
	const query = $derived(
		new URLSearchParams({
			dal: data.filters.from,
			al: data.filters.to,
			dispositivo: data.filters.device,
			versione: data.filters.version
		}).toString()
	);
</script>

<svelte:head>
	<title>{s.pageTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<nav class="exits" aria-label={m.admin.navigation}>
		<a href={resolve('/admin')} class="exit">
			<span class="exit__back"><Icon name="arrow" size={16} /></span>
			{s.back}
		</a>
	</nav>

	<Heading id="stats-title" before={s.title} accent={s.accent} />
	<p class="intro">{s.intro}</p>
	<p class="intro">{s.staffNote}</p>

	<form method="GET" class="filters">
		<fieldset>
			<legend>{s.filters.legend}</legend>
			<label>{s.filters.from}<input type="date" name="dal" value={data.filters.from} /></label>
			<label>{s.filters.to}<input type="date" name="al" value={data.filters.to} /></label>
			<label>
				{s.filters.device}
				<select name="dispositivo" value={data.filters.device}>
					<option value="all">{s.filters.allDevices}</option>
					{#each Object.entries(s.devices) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
			<label>
				{s.filters.version}
				<select name="versione" value={data.filters.version}>
					<option value="all">{s.filters.allVersions}</option>
					{#each data.versions as version (version)}
						<option value={version}>{version}</option>
					{/each}
				</select>
			</label>
		</fieldset>
		<div class="filters__actions">
			<button type="submit" class="btn btn--ghost">{s.filters.apply}</button>
			<a href={resolve('/admin/statistiche')} class="link">{s.filters.reset}</a>
		</div>
	</form>

	{#if data.views === null}
		<p class="alert" role="alert"><Icon name="alert" size={14} />{s.error}</p>
	{:else}
		{#each data.order as name (name)}
			{@const view = s.views[name]}
			{@const table = data.views[name]}
			<section aria-labelledby="view-{name}">
				<div class="head">
					<h2 id="view-{name}">{view.title}</h2>
					<a
						href="{resolve('/admin/statistiche/[vista].csv', { vista: name })}?{query}"
						class="link"
						download
					>
						<Icon name="download" size={14} />
						{s.download}
					</a>
				</div>
				<p class="note">{view.note}</p>
				<div class="scroll">
					<table>
						<thead>
							<tr>
								{#each table.columns as column, i (column)}
									<th scope="col" class:num={i > 0}>{column}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each table.rows as row, i (i)}
								<tr>
									{#each row as cell, j (j)}
										{#if j === 0}
											<th scope="row">
												{cell}
												{#if table.bars}
													<span class="bar" aria-hidden="true">
														<span style:width="{(table.bars[i] ?? 0) * 100}%"></span>
													</span>
												{/if}
											</th>
										{:else}
											<td class="num">{cell}</td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	{/if}
</main>

<style>
	main {
		--rule: rgba(220, 230, 245, 0.14);
		max-width: 1000px;
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
	.exits {
		margin-bottom: 40px;
	}
	.exit {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 0;
		color: var(--muted-on-dark);
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}
	.exit:hover {
		color: #fff;
	}
	.exit__back {
		display: inline-flex;
		transform: scaleX(-1);
	}

	.filters {
		margin-top: 32px;
	}
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 700;
	}
	.filters label {
		display: grid;
		gap: 4px;
		font-size: 14px;
		font-weight: 700;
	}
	.filters input,
	.filters select {
		padding: 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-field);
		background: #fff;
		color: var(--navy);
		font-weight: 400;
	}
	.filters__actions {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-top: 16px;
	}
	.btn--ghost {
		gap: 8px;
		padding: 10px 18px;
		border-color: rgba(167, 187, 214, 0.45);
		background: transparent;
		color: var(--text-on-dark);
		font-size: 15px;
	}
	.btn--ghost:hover {
		border-color: var(--accent-on-dark);
		background: rgba(111, 163, 255, 0.1);
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
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

	section {
		margin-top: 56px;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px 24px;
	}
	h2 {
		font-size: 22px;
		font-weight: 700;
	}
	.note {
		margin-top: 8px;
		max-width: 70ch;
		font-size: 14px;
		color: var(--muted-on-dark);
	}
	.scroll {
		margin-top: 16px;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 10px 12px 10px 0;
		border-top: 1px solid var(--rule);
		text-align: left;
		vertical-align: top;
	}
	thead th {
		border-top: 0;
		font-size: 13px;
		color: var(--muted-on-dark);
	}
	tbody th {
		font-weight: 400;
	}
	.num {
		text-align: right;
		white-space: nowrap;
	}
	.bar {
		display: block;
		height: 6px;
		margin-top: 6px;
		border-radius: 3px;
		background: var(--rule);
	}
	.bar > span {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: var(--accent-on-dark);
	}
</style>
