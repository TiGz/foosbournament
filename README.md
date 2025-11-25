# Foosbournament

A foosball tournament management app for tracking matches, player stats, and leaderboards.

**Live Demo:** https://tigz.github.io/foosbournament/

## Features

- **Tournament Management** - Create and manage multiple tournaments
- **Player Roster** - Add players with nicknames and photos
- **Match Tracking** - Score matches with undo/redo support
- **Leaderboards** - Track wins, losses, goals, and points
- **Position Mode** - Optionally track attacker/defender positions
- **Unicorns** - Bonus points for shutout victories (10-0)
- **Match Queue** - Generate balanced match rounds automatically
- **Data Export** - Export tournament data as JSON
- **Persistent Storage** - All data saved to localStorage

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```

2. (Optional) Set `GEMINI_API_KEY` in `.env.local` for AI features

3. Run the app:
   ```
   npm run dev
   ```

4. Open http://localhost:3000

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
