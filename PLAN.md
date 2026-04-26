For this game, we've only prototyped the basic layout and some interactions. I now want to make into a game that is actually playable.

## Tech stack
- Svelte
- Vite
- Supabase
- Native CSS (not Tailwind)

## Landing page
On the landing page, you should either be able to start a new game or load an existing one.
On the bottom right, you should be able to switch language (default `en-US`, but also Swedish (sv-SE) and Norwegian (nb-NO)). Translations should be supported across the gaming part of the app (not the admin part for now) using "General Translation" (https://generaltranslation.com/en-US/ ). I need help configuring this.

### Start a new game
Enter the names of the players (min 2, max 8). The must be unique. You should also be able to pick from a list of 10 fun icons, using the `lucide-svelte` library to represent the player.
Once you've entered all players, there should be a new screen, where each player should "point out" where they are sitting around the table based on the current orientation of the unit they're playing on. This will later on be reflected with rotating the `.container` correctly once it's their turn. Just present the player's name, a text underneath that says "Where are you seated?" and X number of circles near the edge that the user can click on. These settings should later be changable inside @src/components/GameMenu.svelte 
The next screen should be choosing which decks you want to use.
Once a game has started/loaded, the screen shouldn't adapt to rotating the screen from portrait to landscape and vice versa.
A game ID, a mix of A-Z/0-9, five characters long, should be generated once the game has started.

### Load a game
Enter the 5 character ID to load the game with all its configuration (player location/rotation included).

## Existing setup
I've already created a first version of this game in `~/Dev/Projects/smart10`. This one is a bit different. Instead of all players playing on the same device (this project), the previous one lets you connect to one and you play remotely. We don't want that anymore.

Everything inside the old project's `/admin` logic should be kept as is, but needs to be ported from Next.js/React to Svelte.
For the game part, the game layout is defined in this project. If you ever lack components in the game logic that exist in the old project that we need in the new one, ask me about it first. They should draw inspiration from the old one, but not copy it.

---

I want to be able to make a copy of the old game's Supabase database and turn it into a new one we can use here. All questions and decks should be transferred.

As a general rule: the new project "wins" over the old one.

---

There's a renaming of question types between the old and the new system (technical names only, not to be reflected in the UI):

```
Old | New
----------
blue | standard
orange | boolean
green | timeline
red | chooseBetween
pink | colors
yellow | numbers
purple | centuryDecade
```