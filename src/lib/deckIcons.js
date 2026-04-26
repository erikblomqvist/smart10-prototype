import iconNodes from 'lucide-static/icon-nodes.json';
import iconTags from 'lucide-static/tags.json';

const FALLBACK_ICON_KEY = 'layers';

/** @param {string} value */
function titleCase(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/** @param {string} key */
function kebabToPascal(key) {
	return key.split('-').map(titleCase).join('');
}

/** @param {string} id */
function pascalToKebab(id) {
	return id
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase();
}

/** @param {string|null|undefined} id */
function toIconKey(id) {
	if (!id) return FALLBACK_ICON_KEY;
	return id.includes('-') ? id.toLowerCase() : pascalToKebab(id);
}

/** @param {string} key */
function getLabel(key) {
	return key.split('-').map(titleCase).join(' ');
}

export const DECK_ICONS = Object.entries(iconNodes)
	.map(([key, iconNode]) => {
		const id = kebabToPascal(key);
		const label = getLabel(key);
		const tags = iconTags[key] ?? [];

		return {
			id,
			label,
			iconNode,
			searchText: [id, label, key, ...tags].join(' ').toLowerCase(),
		};
	})
	.sort((a, b) => a.label.localeCompare(b.label));

/** @param {string|null|undefined} id */
export function getDeckIconNode(id) {
	return iconNodes[toIconKey(id)] ?? iconNodes[FALLBACK_ICON_KEY];
}
