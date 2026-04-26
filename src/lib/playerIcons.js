import {
	Crown,
	Car,
	Dog,
	Rocket,
	Gem,
	Sword,
	Ghost,
	Anchor,
	Trophy,
	Flame,
} from 'lucide-svelte';

/** @type {Array<{ id: string, component: import('svelte').Component }>} */
export const PLAYER_ICONS = [
	{ id: 'Crown', component: Crown },
	{ id: 'Car', component: Car },
	{ id: 'Dog', component: Dog },
	{ id: 'Rocket', component: Rocket },
	{ id: 'Gem', component: Gem },
	{ id: 'Sword', component: Sword },
	{ id: 'Ghost', component: Ghost },
	{ id: 'Anchor', component: Anchor },
	{ id: 'Trophy', component: Trophy },
	{ id: 'Flame', component: Flame },
];

/** @param {string} id */
export function getPlayerIconComponent(id) {
	return PLAYER_ICONS.find((i) => i.id === id)?.component ?? null;
}

/** @type {Array<{ id: string }>} */
export const PLAYER_COLORS = [
	{ id: 'player-color-1' },
	{ id: 'player-color-2' },
	{ id: 'player-color-3' },
	{ id: 'player-color-4' },
	{ id: 'player-color-5' },
	{ id: 'player-color-6' },
	{ id: 'player-color-7' },
	{ id: 'player-color-8' },
	{ id: 'player-color-9' },
	{ id: 'player-color-10' },
];
