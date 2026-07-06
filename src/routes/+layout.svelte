<script>
	import { onMount } from 'svelte';
	import { waitLocale } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import GameToaster from '$lib/components/GameToaster.svelte';

	import '@fontsource/erica-one/latin-400.css';
	import '@fontsource/bricolage-grotesque/latin.css';
	import '@fontsource/inter/latin.css';
	import '@fontsource/nunito/latin.css';
	import '@fontsource/sometype-mono/latin.css';
	import '@fontsource/im-fell-english-sc/latin-400.css';

	import '../app.css';

	let { data, children } = $props();
	const { supabase, session } = $derived(data);
	let i18nReady = $state(import.meta.env.SSR); // Ready by default on server

	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
	const isInbox = $derived(page.url.pathname.startsWith('/inbox'));
	const skipShell = $derived(isAdmin || isInbox);

	$effect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});

	onMount(async () => {
		// On the client, we ensure the locale is loaded before showing translated content
		await waitLocale();
		i18nReady = true;
	});
</script>

<!--
	Game/landing scope owns a root-scoped web app manifest so an iPadOS
	process-kill relaunch reads as a dark blink instead of a white flash.
	The Inbox ships its own narrower-scoped manifest (see its +layout.svelte);
	gate on !skipShell so the two never fight over scope. See issue #84.
-->
<svelte:head>
	{#if !skipShell}
		<link rel="manifest" href="/game.webmanifest" />
		<meta name="mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta
			name="apple-mobile-web-app-status-bar-style"
			content="black-translucent"
		/>
		<meta name="apple-mobile-web-app-title" content="Clever 11" />
	{/if}
</svelte:head>

{#if i18nReady}
	<GameToaster />
	{#if skipShell}
		{@render children()}
	{:else}
		<div class="main-app">
			{@render children()}
		</div>
	{/if}
{:else}
	<div class="loading-overlay" aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{/if}
