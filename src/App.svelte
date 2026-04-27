<script>
	import { _ } from 'svelte-i18n';
	import HomeView from './components/HomeView.svelte';
	import SetupView from './views/SetupView.svelte';
	import GameView from './views/GameView.svelte';
	import PreviousGamesView from './views/PreviousGamesView.svelte';
	import { initGame, loadGame } from './lib/game.svelte.js';

	/** @type {'landing'|'setup'|'game'|'previousGames'} */
	let view = $state('landing');
	let loading = $state(false);
	/** @type {string|null} */
	let loadError = $state(null);

	function navigate(/** @type {'landing'|'setup'|'game'|'previousGames'} */ newView) {
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				view = newView;
			});
		} else {
			view = newView;
		}
	}

	/** @param {import('./views/SetupView.svelte').GameSetup} setup */
	async function handleSetupComplete(setup) {
		loading = true;
		await initGame(setup);
		navigate('game');
		loading = false;
	}

	/** @param {string} code */
	async function handleLoadGame(code) {
		loading = true;
		loadError = null;
		try {
			await loadGame(code);
			navigate('game');
		} catch (e) {
			loadError = /** @type {Error} */ (e).message ?? $_('app.load_error');
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="loading-overlay" aria-label={$_('app.loading_aria')} aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{/if}

{#if view === 'landing'}
	<main class="main--landing">
		<HomeView
			onnewgame={() => navigate('setup')}
			onloadgame={handleLoadGame}
			onpreviousgames={() => navigate('previousGames')}
			loaderror={loadError}
		/>
	</main>
{:else if view === 'setup'}
	<main class="main--setup">
		<SetupView oncomplete={handleSetupComplete} onback={() => navigate('landing')} />
	</main>
{:else if view === 'previousGames'}
	<main class="main--previous-games">
		<PreviousGamesView
			onback={() => navigate('landing')}
			onloadgame={handleLoadGame}
			loaderror={loadError}
		/>
	</main>
{:else if view === 'game'}
	<GameView onstartover={() => navigate('landing')} />
{/if}
