# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run type-check` - Run TypeScript type checking with vue-tsc
- `npm run preview` - Preview production build locally

## Project Architecture

Memorhythm is a musical memory game built with Vue 3 + TypeScript + Three.js. The game challenges players to replicate sequences of musical notes both positionally and rhythmically.

### Core Architecture

**Main Application (`App.vue`):**
- Central state management using Vue 3 Composition API
- Game state machine with 5 states: Idle, Playback, PlayerTurn, Calculating, Scoring
- Handles audio initialization, background music synchronization, and round progression
- Coordinates between GameCanvas (3D rendering) and UIOverlay (UI elements)

**Game State Flow:**
1. **Idle** → **Playback** (sequence demonstration with visual/audio)
2. **Playback** → **PlayerTurn** (player interaction phase)
3. **PlayerTurn** → **Calculating** (brief transition state)
4. **Calculating** → **Scoring** (score calculation and display)
5. **Scoring** → **Playback** (next round or restart on failure)

**Audio Architecture (`services/audioService.ts`):**
- Web Audio API implementation with AudioContext management
- Background music loop synchronization for sequence timing
- Real-time frequency mapping for player interactions (Y-coordinate → musical frequency)
- Continuous tone generation during player input with pitch bending
- Generated sound effects for level completion/failure

**Game Logic (`services/gameLogic.ts`):**
- Sequence generation using C Major Pentatonic scale (C4-C5)
- Dual scoring system: position accuracy (spatial) + rhythm accuracy (temporal)
- Y-coordinate mapping to musical frequencies with visual-to-audio correspondence
- Score calculation with configurable error tolerances

**3D Rendering (`components/GameCanvas.vue`):**
- Three.js integration with Vue 3 lifecycle management
- Orthographic camera setup for 2D-style gameplay
- Animation system for sequence playback and player feedback
- Ghost rendering system showing targets during player turn
- Mouse interaction handling with coordinate transformation

### Key Technical Details

**Audio-Visual Synchronization:**
- Background music provides timing reference for sequence playback
- `onNextLoop()` promise-based synchronization ensures sequences start on musical beats
- Player interactions generate real-time audio feedback with frequency mapped to cursor Y-position

**Coordinate Systems:**
- Canvas: Standard web coordinates (0,0 at top-left)
- Three.js: Centered coordinates with Y-axis flipped
- Audio: Y-coordinate inversely mapped to frequency (higher Y = lower pitch)

**Performance Considerations:**
- Three.js object disposal management to prevent memory leaks
- Animation frame optimization with performance.now() timing
- Shallow refs for Three.js objects to avoid Vue reactivity overhead

**Game Progression:**
- Sequence length increases with rounds (starts at 3, adds 1 per round)
- Failure conditions: total score < 50, position score < 30, or rhythm score < 30
- Persistent high scores tracking across sessions

**Constants Configuration (`constants.ts`):**
- Musical scale definition (C Major Pentatonic)
- Rhythm intervals based on 120 BPM
- Scoring tolerances and visual parameters
- Color palette for sequence visualization