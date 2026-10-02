DON'T LOOK AWAY

Watch the screen. Survive as long as you can. Wait for it.

DON'T LOOK AWAY is a fullscreen browser horror game built around one idea: suspense is scarier than the scare. You stare into a dark hallway, nothing happens, and then something small changes. A chair turns. A light flickers. A shadow is there, and then it isn't. Somewhere in the run a real jumpscare is waiting, and you never know when.

No menus, no accounts, no leaderboard. You open the page and you're in.

⚠️ Warning: This game contains sudden loud sounds, flashing lights, strobing effects and intense imagery. It may not be suitable for people with photosensitive epilepsy, heart conditions or anxiety disorders. Headphones are recommended, but turn the volume down before your first run.

How it plays
Black screen. The title fades in, then Put on headphones., then Click anywhere to begin.
Click: the game goes fullscreen, audio starts, and you're staring into a dark hallway.
The only UI is a tiny timer and a mute toggle.
Survive as long as you can. Sooner or later, the real jumpscare hits.
Black screen, your survival time, BUT YOU LOOKED AWAY., then TRY AGAIN for a brand new randomized run.
What makes it tense
Slow-burn escalation. The first 10 seconds are almost empty. From 10 to 20 seconds something is clearly wrong. By 20 to 40 you're paranoid. After 40 seconds the game goes into nightmare mode.
Subtle events. Light flickers, a chair that now faces you, a crooked picture frame, a door that shifts, a distant silhouette, a faint face in the dark, something in your peripheral vision.
Medium events. A shadow walking the hallway, footsteps, breathing, whispers, strobing lights, a figure that is suddenly closer after a blackout, a 100 ms face, the room briefly changing.
Fake scares. Loud bangs, white flashes and faces that make you think it's over, followed by silence while the game continues.
Deliberate silence. Long stretches of nothing at random, so every quiet moment feels like a setup.
Unpredictable jumpscare. There's no fixed timestamp. The chance of the real scare rises the longer you survive, so it can come at 7 seconds or at 70.
The jumpscare

When the real one fires, the sequence is:

All audio cuts to silence.
The frame freezes and glitches.
A tiny breath.
A distorted face slams into the screen with a loud scream and impact, RGB split, camera shake, red and white flashes, static and glitch slices.
After about 1.5 seconds, everything goes black.
Tech stack
	
Framework	Next.js 15 (App Router)
UI	React 19, TypeScript, Tailwind CSS 4
Rendering	HTML Canvas 2D (procedural hallway, creature and effects)
Audio	Web Audio API (all sounds are synthesized, with no audio files)
Storage	localStorage for your personal best only

There are no external image or audio assets. There's no backend, no database and no network requests.

Getting started

Requires Node.js 18.18 or later.

bash
git clone https://github.com/kakshabc123/dont-look-away.git
cd dont-look-away
npm install
npm run dev

Open http://localhost:3000, click, and don't look away.

For a production build:

bash
npm run build
npm start
Project structure
app/
  layout.tsx        Root layout and page metadata
  page.tsx          Renders the game
  globals.css       Tailwind import, scanlines, fade-in animations
components/
  Game.tsx          The whole game: title flow, engine, audio, event system, jumpscare
Tuning the game

Everything lives in components/Game.tsx:

Jumpscare odds: look for Math.min(.1, .008 + .0012 * (tp - 6)). Raise the numbers for earlier scares, lower them for longer runs. The first 6 seconds are always safe.
Event pacing: the gap calculation in the main loop controls how long the game waits between events.
Event types and weights: the ev array holds every event. Each has four weights, one per escalation stage, so you can add or remove events and rebalance the stages.
Jumpscare audio and visuals: see the scream and boom functions.
Browser notes
Audio only starts after the first click, which is a browser requirement.
Fullscreen is requested on click and is skipped silently if the browser blocks it.
Best experienced in a current desktop browser such as Chrome, Edge, Firefox or Safari.
Contributing

Ideas welcome, for example new events, new environments or a better creature. Open an issue or a pull request.

License

Add a license of your choice, such as MIT, before sharing the project widely.
