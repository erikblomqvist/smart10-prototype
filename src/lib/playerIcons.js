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
