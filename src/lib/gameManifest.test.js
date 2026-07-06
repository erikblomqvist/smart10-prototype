import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const staticDir = join(process.cwd(), 'static');

const readManifest = (name) =>
	JSON.parse(readFileSync(join(staticDir, name), 'utf8'));

/**
 * The game/landing routes need their own root-scoped manifest so that an
 * iPadOS process-kill relaunch reads as a dark blink instead of a white flash.
 * The Inbox keeps a separate, narrower-scoped manifest; the two must not fight
 * over scope (see issue #84).
 */
describe('game web app manifest', () => {
	const manifest = readManifest('game.webmanifest');

	it('claims the root scope so a home-screen game app covers the whole game', () => {
		expect(manifest.scope).toBe('/');
		expect(manifest.start_url).toBe('/');
	});

	it('launches with a dark background so a forced relaunch never flashes white', () => {
		// A dark, near-black launch background — must not be a light color.
		expect(manifest.background_color).toBe('#0f1115');
		expect(manifest.theme_color).toBe('#0f1115');
	});

	it('is a standalone, installable app', () => {
		expect(manifest.display).toBe('standalone');
		expect(manifest.name).toMatch(/clever 11/i);
	});

	it('ships the game icons at 192 and 512', () => {
		const sizes = manifest.icons.map((i) => i.sizes);
		expect(sizes).toContain('192x192');
		expect(sizes).toContain('512x512');
		for (const icon of manifest.icons) {
			expect(icon.src.startsWith('/')).toBe(true);
			expect(icon.type).toBe('image/png');
		}
	});

	it('does not collide with the Inbox manifest scope or id', () => {
		const inbox = readManifest('manifest.webmanifest');
		expect(inbox.scope).toBe('/inbox/');
		// Distinct app identities so the OS treats them as separate installs.
		expect(manifest.id).not.toBe(inbox.id);
	});
});
