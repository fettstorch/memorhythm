# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run type-check` - Run TypeScript type checking with vue-tsc
- `npm run preview` - Preview production build locally

## Permissions

Claude is permitted to execute any npm script defined in package.json, except for deployment-related scripts. This includes development, build, test, lint, and type-checking commands.

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

## Gameplay Mechanics & Testing

### How to Play
1. **Start Game**: Click "Start Game" button to begin
2. **Watch Sequence**: Game shows "Watch Carefully..." and plays a sequence of colored circles with musical tones
3. **Memorize**: Each circle appears at specific coordinates with timing intervals (typically 500ms apart)
4. **Replicate**: During "Your Turn!" phase, click the same locations in the same rhythm
5. **Scoring**: Game calculates position accuracy, rhythm accuracy, and total score
6. **Progression**: Pass with total ≥50%, position ≥30%, rhythm ≥30% to advance rounds

### Debug Testing with Browser MCP
The game includes comprehensive debug logging (console.debug) for testing. This is ESSENTIAL for programmatic testing since the sequences are too fast to observe manually.

**Round Start Debug Info:**
```
🎮 DEBUG: Starting Round X with Y circles:
📍 Sequence coordinates and timing:
  Circle 1: x=79, y=95, time=0ms, color=#f87171, freq=523Hz
  Circle 2: x=893, y=448, time=500ms, color=#fb923c, freq=440Hz
  Circle 3: x=1615, y=937, time=1000ms, color=#fbbf24, freq=330Hz
```

**Playback Debug Info:**
```
🎵 DEBUG: Playing circle 1: x=79, y=95 at 0ms
🎵 DEBUG: Playing circle 2: x=893, y=448 at 500ms
🎵 DEBUG: Playing circle 3: x=1615, y=937 at 1000ms
🎵 DEBUG: Playback complete - switching to PlayerTurn
```

**Player Input Debug Info:**
```
👆 DEBUG: Player click 1:
  Clicked: x=82, y=98, time=1234ms
  Target:  x=79, y=95, time=0ms
  Distance: 5px, Time diff: 1234ms
```

**Scoring Debug Info:**
```
📊 DEBUG: Round 1 Results:
  Position Score: 85% (min: 30%)
  Rhythm Score: 72% (min: 30%)
  Total Score: 78% (min: 50%)
  Max Position Error: 100px
  Max Rhythm Error: 1000ms
```

### Game Rules
- **Round Length**: Round 1 = 3 circles, Round 2 = 4 circles, etc. (formula: 2 + round number)
- **Failure Conditions**: Total score <50%, position score <30%, or rhythm score <30%
- **Success**: Meet all minimum thresholds to advance to next round
- **Audio**: Y-coordinate maps to musical frequency (higher Y = lower pitch, lower Y = higher pitch)
- **Timing**: Sequences typically play with 500ms intervals between circles
- **Position Scoring**: Based on pixel distance from target (max error: 100px)
- **Rhythm Scoring**: Based on timing difference from expected intervals (max error: 1000ms)

### Testing Procedure with Browser MCP
1. Start development server: `npm run dev`
2. Open browser to `http://localhost:5173/`
3. Open browser console and enable debug logs
4. Click "Start Game"
5. **CRITICAL**: Read debug logs to get exact sequence coordinates and timing
6. During "Your Turn!" phase, click at the exact coordinates shown in debug logs
7. Verify scoring matches expected calculations based on accuracy
8. Test progression through multiple rounds
9. Test failure conditions by clicking wrong locations or timing

### Verification Commands
Before deployment, always run:
- `npm run type-check` - Verify TypeScript compilation
- `npm run build` - Ensure production build succeeds
- Browser MCP testing using debug logs to verify gameplay functionality