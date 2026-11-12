<script lang="ts">
	type Name =
		| 'arrow'
		| 'up'
		| 'down'
		| 'check'
		| 'alert'
		| 'user'
		| 'download'
		| 'shield'
		| 'mail'
		| 'clock'
		| 'exit'
		| 'info';
	let { name, size = 20 }: { name: Name; size?: number } = $props();

	const paths: Record<Name, string> = {
		arrow: 'M5 12h14M13 6l6 6-6 6',
		up: 'M6 15l6-6 6 6',
		down: 'M6 9l6 6 6-6',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		alert: 'M12 6v8M12 18h.01',
		user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
		download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
		shield: 'M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6l7-3zM9 12l2 2 4-4',
		mail: 'M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6',
		exit: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
		clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
		info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5.5M12 7.75h.01'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
