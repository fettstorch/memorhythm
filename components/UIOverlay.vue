<script setup lang="ts">
import { GameState, Score } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: Score | null;
  round: number;
  clicksRemaining: number;
  isMuted: boolean;
  isMusicSetup: boolean;
}

defineProps<UIOverlayProps>();
const emit = defineEmits(['start', 'nextRound', 'toggleMute']);

const VolumeUpIcon = () => (
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>'
);

const VolumeOffIcon = () => (
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l4-4m0 0l-4-4m4 4l-4 4" /></svg>'
);

const failed = (score: Score | null) => score && (score.total < 50 || score.position < 30 || score.rhythm < 30);
</script>

<template>
  <div class="absolute inset-0 pointer-events-none">
    <!-- Top-left Mute button -->
    <div v-if="isMusicSetup" class="absolute top-5 left-5 pointer-events-auto">
      <button
        @click="emit('toggleMute')"
        class="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-3 rounded-full text-white shadow-lg hover:bg-gray-700 transition-colors"
        :aria-label="isMuted ? 'Unmute' : 'Mute'"
        v-html="isMuted ? VolumeOffIcon() : VolumeUpIcon()"
      ></button>
    </div>

    <!-- Top-right HUD for round/clicks info -->
    <div v-if="gameState === GameState.Playback || gameState === GameState.PlayerTurn" class="absolute top-5 right-5 bg-gray-800 bg-opacity-70 backdrop-blur-sm p-4 rounded-xl shadow-lg flex items-center space-x-4">
      <div>
        <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Round</div>
        <div class="text-3xl font-bold text-white">{{ round }}</div>
      </div>
      <template v-if="gameState === GameState.PlayerTurn">
        <div class="h-10 border-l border-gray-600"></div>
        <div>
          <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Clicks Left</div>
          <div class="text-3xl font-bold text-white">{{ clicksRemaining }}</div>
        </div>
      </template>
    </div>

    <!-- Centered UI for major state changes -->
    <div class="w-full h-full flex items-center justify-center">
      <div class="p-4" :class="{ 'pointer-events-auto': gameState === GameState.Idle || gameState === GameState.Scoring, 'pointer-events-none': gameState !== GameState.Idle && gameState !== GameState.Scoring }">
        <div v-if="gameState === GameState.Idle" class="text-center">
          <h1 class="text-6xl font-bold mb-4 text-white drop-shadow-lg">Memorhythm</h1>
          <p class="text-xl text-gray-300 mb-8">Test your memory and sense of rhythm.</p>
          <button @click="emit('start')" class="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105">Start Game</button>
        </div>
        <div v-else-if="gameState === GameState.Playback" class="text-center">
          <h2 class="text-4xl font-bold text-white animate-pulse">Watch Carefully...</h2>
        </div>
        <div v-else-if="gameState === GameState.PlayerTurn" class="text-center">
          <h2 class="text-5xl font-bold text-emerald-400">Your Turn!</h2>
        </div>
        <div v-else-if="gameState === GameState.Calculating" class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-400 mx-auto mb-6"></div>
          <h2 class="text-3xl font-bold text-white">Calculating...</h2>
        </div>
        <div v-else-if="gameState === GameState.Scoring" class="flex flex-col items-center space-y-8">
            <div v-if="score" class="bg-gray-800 bg-opacity-80 p-8 rounded-2xl shadow-2xl w-full max-w-md text-left backdrop-blur-sm">
                <h2 class="text-4xl font-bold mb-6 text-center" :class="failed(score) ? 'text-red-400' : 'text-emerald-400'">
                    {{ failed(score) ? 'Try Again' : 'Round Complete!' }}
                </h2>
                <div class="space-y-4">
                    <div class="text-2xl">
                        <span class="text-gray-300">Position Accuracy:</span>
                        <span class="font-bold" :class="score.position >= 30 ? 'text-emerald-400' : 'text-red-400'"> {{score.position}}%</span>
                        <span class="text-gray-400"> / 30%</span>
                    </div>
                    <div class="text-2xl">
                        <span class="text-gray-300">Rhythm Accuracy:</span>
                        <span class="font-bold" :class="score.rhythm >= 30 ? 'text-emerald-400' : 'text-red-400'"> {{score.rhythm}}%</span>
                        <span class="text-gray-400"> / 30%</span>
                    </div>
                    <div class="border-t border-gray-600 my-4"></div>
                    <div class="text-3xl">
                        <span class="font-bold" :class="score.total >= 50 ? 'text-emerald-400' : 'text-red-400'">Total Score:</span>
                        <span class="font-bold" :class="score.total >= 50 ? 'text-emerald-400' : 'text-red-400'"> {{score.total}}%</span>
                        <span class="text-gray-400"> / 50%</span>
                    </div>
                </div>
            </div>
            <button @click="emit('nextRound')" class="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105">
                {{ failed(score) ? 'Restart from Round 1' : 'Next Round' }}
            </button>
        </div>
      </div>
    </div>
  </div>
</template> 