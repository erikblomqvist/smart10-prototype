<script>
	import { _ } from 'svelte-i18n';
	import { PLAYER_ICONS, getPlayerIconComponent } from '../lib/playerIcons.js';
	import { supabase } from '../lib/supabase.js';
	import { ChevronLeft, Plus, X, Shuffle, Layers } from 'lucide-svelte';

	/** @type {{ oncomplete: (setup: GameSetup) => void, onback: () => void }} */
	let { oncomplete, onback } = $props();

	/**
	 * @typedef {{ name: string, icon: string, seatPosition: number|null, turnOrder: number|null }} SetupPlayer
	 * @typedef {{ players: SetupPlayer[], selectedDeckIds: string[], startingPlayerIndex: number }} GameSetup
	 */

	// --- Navigation ---
	let step = $state(/** @type {'players'|'seating'|'decks'|'starting'} */ ('players'));

	function navigateStep(/** @type {'players'|'seating'|'decks'|'starting'} */ newStep) {
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				step = newStep;
			});
		} else {
			step = newStep;
		}
	}

	function goBack() {
		if (step === 'players') {
			onback();
		} else if (step === 'seating') {
			players = players.map((p) => ({ ...p, seatPosition: null, turnOrder: null }));
			currentSeatingIdx = 0;
			navigateStep('players');
		} else if (step === 'decks') {
			players = players.map((p) => ({ ...p, seatPosition: null, turnOrder: null }));
			currentSeatingIdx = 0;
			navigateStep('seating');
		} else if (step === 'starting') {
			navigateStep('decks');
		}
	}

	// --- Players step ---
	let players = $state(/** @type {SetupPlayer[]} */ ([]));
	let newName = $state('');
	let newIcon = $state(PLAYER_ICONS[0].id);

	const usedIcons = $derived(players.map((p) => p.icon));
	const canAddPlayer = $derived(
		newName.trim().length > 0 &&
			!players.some((p) => p.name.toLowerCase() === newName.trim().toLowerCase()) &&
			players.length < 8,
	);

	function addPlayer() {
		if (!canAddPlayer) return;
		const name = newName.trim();
		players = [...players, { name, icon: newIcon, seatPosition: null, turnOrder: null }];
		newName = '';
		const next = PLAYER_ICONS.find((i) => !players.map((p) => p.icon).includes(i.id));
		newIcon = next?.id ?? PLAYER_ICONS[0].id;
	}

	function removePlayer(/** @type {string} */ name) {
		players = players.filter((p) => p.name !== name);
		if (players.map((p) => p.icon).includes(newIcon)) {
			const next = PLAYER_ICONS.find((i) => !players.map((p) => p.icon).includes(i.id));
			if (next) newIcon = next.id;
		}
	}

	function goToSeating() {
		players = players.map((p) => ({ ...p, seatPosition: null, turnOrder: null }));
		currentSeatingIdx = 0;
		navigateStep('seating');
	}

	// --- Seating step ---
	let currentSeatingIdx = $state(0);
	const currentSeatingPlayer = $derived(players[currentSeatingIdx] ?? null);
	const takenSeats = $derived(
		players.filter((p) => p.seatPosition !== null).map((p) => p.seatPosition),
	);

	function claimSeat(/** @type {number} */ position) {
		players = players.map((p, i) =>
			i === currentSeatingIdx ? { ...p, seatPosition: position } : p,
		);
		if (currentSeatingIdx < players.length - 1) {
			currentSeatingIdx++;
		} else {
			const sorted = [...players].sort((a, b) => (a.seatPosition ?? 0) - (b.seatPosition ?? 0));
			players = players.map((p) => ({
				...p,
				turnOrder: sorted.findIndex((s) => s.name === p.name),
			}));
			navigateStep('decks');
		}
	}

	// --- Decks step ---
	/**
	 * @typedef {{ id: string, name: string, description: string|null, icon: string|null }} Deck
	 */
	/** @type {Deck[]} */
	let decks = $state([]);
	let decksLoading = $state(true);
	let selectedDeckIds = $state(/** @type {string[]} */ ([]));

	$effect(() => {
		if (!supabase) {
			decks = [
				{ id: 'mock-1', name: 'General Knowledge', description: 'A bit of everything', icon: null },
				{ id: 'mock-2', name: 'Music', description: 'Artists, albums, and songs', icon: null },
				{ id: 'mock-3', name: 'History', description: 'Journey through time', icon: null },
			];
			decksLoading = false;
			return;
		}
		supabase
			.from('decks')
			.select('id, name, description, icon')
			.order('name')
			.then(({ data }) => {
				decks = data ?? [];
				decksLoading = false;
			});
	});

	function toggleDeck(/** @type {string} */ id) {
		selectedDeckIds = selectedDeckIds.includes(id)
			? selectedDeckIds.filter((d) => d !== id)
			: [...selectedDeckIds, id];
	}

	// --- Starting player step ---
	let startingPlayerIdx = $state(/** @type {number|null} */ (null));
	const sortedPlayers = $derived(
		[...players].sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0)),
	);

	function randomize() {
		startingPlayerIdx = Math.floor(Math.random() * players.length);
	}

	function handleComplete() {
		const idx = startingPlayerIdx ?? Math.floor(Math.random() * players.length);
		oncomplete({ players, selectedDeckIds, startingPlayerIndex: idx });
	}
</script>

{#if step === 'players'}
	<div class="setup-step">
		<header class="setup-header">
			<button class="setup-back" onclick={goBack} type="button">
				<ChevronLeft size={18} />
				{$_('setup.back')}
			</button>
			<h1 class="setup-title">{$_('setup.players_title')}</h1>
		</header>

		<div class="setup-content">
			<div class="icon-picker" role="group" aria-label="Choose icon">
				{#each PLAYER_ICONS as { id, component: IconComp }}
					<button
						class="icon-option"
						class:icon-option--active={newIcon === id}
						class:icon-option--used={usedIcons.includes(id)}
						onclick={() => {
							if (!usedIcons.includes(id)) newIcon = id;
						}}
						type="button"
						aria-label={id}
						aria-pressed={newIcon === id}
						disabled={usedIcons.includes(id)}
					>
						<IconComp size={20} />
					</button>
				{/each}
			</div>

			<div class="player-input-row">
				<input
					class="player-name-input"
					type="text"
					placeholder={$_('setup.player_name_placeholder')}
					maxlength="20"
					bind:value={newName}
					onkeydown={(e) => e.key === 'Enter' && addPlayer()}
					autocomplete="off"
				/>
				<button
					class="add-player-btn"
					type="button"
					onclick={addPlayer}
					disabled={!canAddPlayer}
					aria-label={$_('setup.add_player_aria')}
				>
					<Plus size={20} />
				</button>
			</div>

			{#if players.length > 0}
				<ul class="player-list" role="list">
					{#each players as player}
						{@const Icon = getPlayerIconComponent(player.icon)}
						<li class="player-list-item">
							<span class="player-list-icon" aria-hidden="true">
								{#if Icon}
									<Icon size={18} />
								{/if}
							</span>
							<span class="player-list-name">{player.name}</span>
							<button
								class="remove-player-btn"
								type="button"
								onclick={() => removePlayer(player.name)}
								aria-label="Remove {player.name}"
							>
								<X size={16} />
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="setup-hint">{$_('setup.min_players_hint')}</p>
			{/if}
		</div>

		<footer class="setup-footer">
			<button class="setup-btn" type="button" onclick={goToSeating} disabled={players.length < 2}>
				{$_('setup.continue')}
			</button>
		</footer>
	</div>
{:else if step === 'seating'}
	<div class="seating-screen">
		<button class="seating-back" type="button" onclick={goBack} aria-label={$_('setup.back_to_players_aria')}>
			<ChevronLeft size={20} />
		</button>

		<div class="seating-center">
			<p class="seating-player-name">{currentSeatingPlayer?.name}</p>
			<p class="seating-prompt">{$_('setup.seated_prompt')}</p>
			<p class="seating-progress">{currentSeatingIdx + 1} / {players.length}</p>
		</div>

		{#each Array.from({ length: 8 }, (_, i) => i) as position}
			{@const claimers = players.filter((p) => p.seatPosition === position)}
			<button
				class="seat-btn seat-btn--{position}"
				class:seat-btn--claimed={claimers.length > 0}
				onclick={() => claimSeat(position)}
				type="button"
				aria-label={claimers.length > 0 ? claimers.map((p) => p.name).join(', ') : $_('setup.seat_aria', { values: { n: position + 1 } })}
			>
				{#if claimers.length > 0}
					<span class="seat-btn__stack">
						{#each claimers as claimer}
							{@const Icon = getPlayerIconComponent(claimer.icon)}
							<span class="seat-btn__avatar">
								{#if Icon}<Icon size={13} />{/if}
							</span>
						{/each}
					</span>
				{/if}
			</button>
		{/each}
	</div>
{:else if step === 'decks'}
	<div class="setup-step">
		<header class="setup-header">
			<button class="setup-back" onclick={goBack} type="button">
				<ChevronLeft size={18} />
				{$_('setup.back')}
			</button>
			<h1 class="setup-title">{$_('setup.choose_decks_title')}</h1>
		</header>

		<div class="setup-content">
			{#if decksLoading}
				<p class="setup-hint">{$_('setup.loading_decks')}</p>
			{:else if decks.length === 0}
				<p class="setup-hint">{$_('setup.no_decks')}</p>
			{:else}
				<ul class="deck-list" role="list">
					{#each decks as deck}
						{@const isSelected = selectedDeckIds.includes(deck.id)}
						<li>
							<button
								class="deck-card"
								class:deck-card--selected={isSelected}
								onclick={() => toggleDeck(deck.id)}
								type="button"
								role="checkbox"
								aria-checked={isSelected}
							>
								<span class="deck-card__icon" aria-hidden="true">
									<Layers size={22} />
								</span>
								<span class="deck-card__info">
									<span class="deck-card__name">{deck.name}</span>
									{#if deck.description}
										<span class="deck-card__desc">{deck.description}</span>
									{/if}
								</span>
								<span class="deck-card__check" aria-hidden="true">
									{#if isSelected}✓{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<footer class="setup-footer">
			<button
				class="setup-btn"
				type="button"
				onclick={() => navigateStep('starting')}
				disabled={selectedDeckIds.length === 0}
			>
				{$_('setup.continue')}
			</button>
		</footer>
	</div>
{:else if step === 'starting'}
	<div class="setup-step">
		<header class="setup-header">
			<button class="setup-back" onclick={goBack} type="button">
				<ChevronLeft size={18} />
				{$_('setup.back')}
			</button>
			<h1 class="setup-title">{$_('setup.who_goes_first_title')}</h1>
		</header>

		<div class="setup-content">
			<ul class="starting-list" role="list">
				{#each sortedPlayers as player}
					{@const idx = players.findIndex((p) => p.name === player.name)}
					{@const Icon = getPlayerIconComponent(player.icon)}
					<li>
						<button
							class="starting-card"
							class:starting-card--selected={startingPlayerIdx === idx}
							onclick={() => (startingPlayerIdx = idx)}
							type="button"
						>
							<span class="starting-card__icon" aria-hidden="true">
								{#if Icon}
									<Icon size={20} />
								{/if}
							</span>
							<span class="starting-card__name">{player.name}</span>
						</button>
					</li>
				{/each}
			</ul>

			<button class="randomize-btn" onclick={randomize} type="button">
				<Shuffle size={16} />
				{$_('setup.randomize')}
			</button>
		</div>

		<footer class="setup-footer">
			<button class="setup-btn" type="button" onclick={handleComplete}>
				{$_('setup.start_game')}
			</button>
		</footer>
	</div>
{/if}
