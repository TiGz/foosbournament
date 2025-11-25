# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Foosbournament is a foosball tournament management app built with React, TypeScript, and Vite. It allows users to create tournaments, manage player rosters, track matches with live scoring, and view leaderboards.

## Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build

## Architecture

### Key Files

- `App.tsx` - Main app component with all state management and handlers
- `types.ts` - TypeScript interfaces for all data structures
- `components/` - UI components (Lobby, PlayerSetup, Dashboard, MatchView)
- `services/tournamentLogic.ts` - Match generation and player stat calculations
- `services/storageService.ts` - localStorage persistence layer

### Data Model

- **GlobalPlayer** - Persistent player identity with lifetime stats
- **TournamentPlayer** - Player stats within a specific tournament
- **TournamentData** - Tournament with players, matches, and settings
- **Match** - A game between two teams (each with attacker + defender)
- **PlayerView** - Merged view of GlobalPlayer + TournamentPlayer for UI

### State Management

All state is managed in `App.tsx` using React hooks. Data is automatically persisted to localStorage via effects.

### Scoring System

- Win = 1 point
- Unicorn (10-0 shutout) = bonus point for winning team
- Games are played to 10 (defined by `WINNING_SCORE` constant)

## Deployment

The app deploys to GitHub Pages via GitHub Actions on push to `main`. The workflow is defined in `.github/workflows/deploy.yml`.

Live URL: https://tigz.github.io/foosbournament/
