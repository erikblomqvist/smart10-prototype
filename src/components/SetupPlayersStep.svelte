<script>
	import { _ } from 'svelte-i18n';
	import { Plus, X } from 'lucide-svelte';
	import {
		PLAYER_ICONS,
		getPlayerIconComponent,
	} from '../lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: import('../views/SetupView.svelte').SetupPlayer[],
	 *   newName: string,
	 *   newIcon: string,
	 *   usedIcons: string[],
	 *   canAddPlayer: boolean,
	 *   onaddplayer: () => void,
	 *   onremoveplayer: (name: string) => void,
	 * }}
	 */
	let {
		players,
		newName = $bindable(),
		newIcon = $bindable(),
		usedIcons,
		canAddPlayer,
		onaddplayer,
		onremoveplayer,
	} = $props();
</script>

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
		onkeydown={(e) => e.key === 'Enter' && onaddplayer()}
		autocomplete="off"
	/>
	<button
		class="add-player-btn"
		type="button"
		onclick={onaddplayer}
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
					onclick={() => onremoveplayer(player.name)}
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

<style>
	.icon-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.icon-option {
		display: grid;
		place-items: center;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.5rem;
		width: 2.75rem;
		height: 2.75rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		transition:
			background-color 0.1s,
			border-color 0.1s;
	}

	.icon-option:hover:not(:disabled) {
		background-color: hsl(0 0% 100% / 0.25);
		border-color: var(--white);
	}

	.icon-option--active {
		background-color: var(--orange-700);
		border-color: var(--orange-800);
	}

	.icon-option--active:hover {
		background-color: var(--orange-800);
	}

	.icon-option--used {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.player-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.player-name-input {
		flex: 1;
		border: 3px solid var(--orange-700);
		border-radius: 0.5rem;
		padding: 0.625rem 0.875rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.player-name-input:focus {
		outline: 3px solid var(--orange-700);
		outline-offset: 2px;
	}

	.add-player-btn {
		display: grid;
		place-items: center;
		border: none;
		border-radius: 0.5rem;
		width: 2.75rem;
		height: 2.75rem;
		background-color: var(--orange-700);
		color: var(--white);
		cursor: pointer;
		flex-shrink: 0;
		transition: background-color 0.15s;
	}

	.add-player-btn:hover {
		background-color: var(--orange-800);
	}

	.add-player-btn:disabled {
		background-color: var(--orange-300);
		cursor: not-allowed;
	}

	.player-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.player-list-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: hsl(0 0% 100% / 0.15);
		color: var(--white);
	}

	.player-list-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.player-list-name {
		flex: 1;
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.remove-player-btn {
		display: grid;
		place-items: center;
		border: none;
		border-radius: 0.375rem;
		width: 1.75rem;
		height: 1.75rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		flex-shrink: 0;
		transition: background-color 0.15s;
	}

	.remove-player-btn:hover {
		background-color: hsl(0 86% 58% / 0.4);
	}

	.setup-hint {
		margin: 0;
		color: hsl(0 0% 100% / 0.7);
		font-size: var(--font-size-base);
		text-align: center;
	}
</style>
