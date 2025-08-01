<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { GameState, Score, LeaderboardResponse } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: Score | null;
  bestScores: { position: number; rhythm: number; total: number };
  round: number;
  clicksRemaining: number;
  isMuted: boolean;
  isMusicSetup: boolean;
  showInfoModal: boolean;
  playerName: string;
  leaderboardData: LeaderboardResponse | null;
  isLoadingLeaderboard: boolean;
  activeLeaderboardTab: 'total' | 'position' | 'rhythm';
}

// Check if we're in test mode to hide leaderboard button
const isTestMode = new URLSearchParams(window.location.search).get('test') === 'true';

const props = defineProps<UIOverlayProps>();
const emit = defineEmits(['start', 'nextRound', 'toggleMute', 'toggleInfoModal', 'updatePlayerName', 'switchLeaderboardTab']);

const VolumeUpIcon = () => (
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>'
);

const VolumeOffIcon = () => (
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l4-4m0 0l-4-4m4 4l-4 4" /></svg>'
);

const InfoIcon = () => (
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
);

const failed = (score: Score | null) => score && (score.total < 50 || score.position < 30 || score.rhythm < 30);

// Handle keyboard events for modal
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.showInfoModal) {
    emit('toggleInfoModal');
  }
};

// Add keyboard event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.scrollbar-hide {
  /* Hide scrollbar for Chrome, Safari and Opera */
  -webkit-scrollbar: none;
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<template>
  <div class="absolute inset-0 pointer-events-none">
    <!-- Top-left Controls -->
    <div class="absolute top-5 left-5 pointer-events-auto flex space-x-3">
      <!-- Mute button (only shown when music is setup) -->
      <button
        v-if="isMusicSetup"
        @click="emit('toggleMute')"
        class="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-3 rounded-full text-white shadow-lg hover:bg-gray-700 transition-colors"
        :aria-label="isMuted ? 'Unmute' : 'Mute'"
        v-html="isMuted ? VolumeOffIcon() : VolumeUpIcon()"
      ></button>
      <!-- Info button (always visible) -->
      <button
        @click="emit('toggleInfoModal')"
        class="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-3 rounded-full text-white shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Game rules and information"
        v-html="InfoIcon()"
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
    <div class="w-full h-full flex items-center justify-center overflow-y-auto">
      <div class="p-4 w-full max-h-full overflow-y-auto" :class="{ 'pointer-events-auto': gameState === GameState.Idle || gameState === GameState.Scoring, 'pointer-events-none': gameState !== GameState.Idle && gameState !== GameState.Scoring }">
        <div v-if="gameState === GameState.Idle" class="text-center max-w-4xl mx-auto px-4 py-8">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">Memorhythm</h1>
          <p class="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">Test your memory and sense of rhythm.</p>
          
          <!-- Player Name Input -->
          <div class="mb-6 sm:mb-8">
            <label for="playerNameInput" class="block text-base sm:text-lg font-semibold text-gray-300 mb-2">Player Name:</label>
            <input
              id="playerNameInput"
              :value="playerName"
              @input="emit('updatePlayerName', ($event.target as HTMLInputElement).value)"
              type="text"
              maxlength="20"
              placeholder="Enter your name"
              class="bg-gray-800 text-white border-2 border-gray-600 rounded-lg px-4 py-2 text-center text-base sm:text-lg focus:border-emerald-400 focus:outline-none w-full max-w-xs mx-auto"
            />
          </div>
          
          <!-- Start Game Button -->
          <div class="mb-6 sm:mb-8">
            <button @click="emit('start')" class="bg-emerald-500 text-white font-bold py-3 px-6 sm:px-8 rounded-full text-lg sm:text-xl shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105">Start Game</button>
          </div>
          
          <!-- Leaderboard Section -->
          <div v-if="!isTestMode" class="bg-gray-800 bg-opacity-80 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 mb-3 sm:mb-4">🏆 Leaderboards</h2>
            
            <!-- Leaderboard Tabs -->
            <div class="flex space-x-1 mb-4 bg-gray-700 bg-opacity-50 rounded-lg p-1">
              <button 
                @click="emit('switchLeaderboardTab', 'total')"
                :class="activeLeaderboardTab === 'total' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'"
                class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
              >
                Total
              </button>
              <button 
                @click="emit('switchLeaderboardTab', 'position')"
                :class="activeLeaderboardTab === 'position' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'"
                class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
              >
                Position
              </button>
              <button 
                @click="emit('switchLeaderboardTab', 'rhythm')"
                :class="activeLeaderboardTab === 'rhythm' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'"
                class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
              >
                Rhythm
              </button>
            </div>
            
            <div class="max-h-64 overflow-y-auto scrollbar-hide">
              <div v-if="isLoadingLeaderboard" class="text-gray-400">
                Loading leaderboard...
              </div>
              
              <div v-else-if="!leaderboardData || !leaderboardData.entries || leaderboardData.entries.length === 0" class="text-gray-400">
                No scores yet - be the first!
              </div>
              
              <div v-else class="space-y-2">
              <div 
                v-for="(entry, index) in leaderboardData.entries" 
                :key="`${entry.user}-${entry.score}-${entry.round}`"
                class="flex justify-between items-center bg-gray-700 bg-opacity-50 rounded-lg px-3 sm:px-4 py-2"
                :class="{ 
                  'border-l-4 border-yellow-400': index === 0,
                  'border-l-4 border-gray-300': index === 1,
                  'border-l-4 border-amber-600': index === 2
                }"
              >
                <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <span class="font-bold text-emerald-400 text-sm sm:text-base">#{{ index + 1 }}</span>
                  <span v-if="index === 0" class="text-lg">🥇</span>
                  <span v-else-if="index === 1" class="text-lg">🥈</span>
                  <span v-else-if="index === 2" class="text-lg">🥉</span>
                  <span class="text-white font-medium text-sm sm:text-base truncate">{{ entry.user }}</span>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="text-yellow-400 font-bold text-base sm:text-lg">{{ entry.score }}%</span>
                  <span class="text-gray-400 text-xs sm:text-sm ml-1 sm:ml-2 block sm:inline">Round {{ entry.round }}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="gameState === GameState.Playback" class="text-center">
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white animate-pulse">Watch Carefully...</h2>
        </div>
        <div v-else-if="gameState === GameState.PlayerTurn" class="text-center">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400">Your Turn!</h2>
        </div>
        <div v-else-if="gameState === GameState.Calculating" class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-emerald-400 mx-auto mb-4 sm:mb-6"></div>
          <h2 class="text-2xl sm:text-3xl font-bold text-white">Calculating...</h2>
        </div>
        <div v-else-if="gameState === GameState.Scoring" class="flex flex-col items-center space-y-6 sm:space-y-8 px-4">
            <div v-if="score" class="bg-gray-800 bg-opacity-80 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl w-full max-w-md text-left backdrop-blur-sm">
                <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-center" :class="failed(score) ? 'text-red-400' : 'text-emerald-400'">
                    {{ failed(score) ? 'Try Again' : 'Round Complete!' }}
                </h2>
                <div class="space-y-3 sm:space-y-4">
                    <div class="text-lg sm:text-xl lg:text-2xl">
                        <span class="text-gray-300">Position Accuracy:</span>
                        <span class="font-bold" :class="score.position >= 30 ? 'text-emerald-400' : 'text-red-400'"> {{score.position}}%</span>
                        <span class="text-gray-400"> / 30%</span>
                        <span v-if="score.position === bestScores.position && bestScores.position > 0" class="text-yellow-400 text-xs sm:text-sm ml-2">✨ BEST!</span>
                    </div>
                    <div class="text-lg sm:text-xl lg:text-2xl">
                        <span class="text-gray-300">Rhythm Accuracy:</span>
                        <span class="font-bold" :class="score.rhythm >= 30 ? 'text-emerald-400' : 'text-red-400'"> {{score.rhythm}}%</span>
                        <span class="text-gray-400"> / 30%</span>
                        <span v-if="score.rhythm === bestScores.rhythm && bestScores.rhythm > 0" class="text-yellow-400 text-xs sm:text-sm ml-2">✨ BEST!</span>
                    </div>
                    <div class="border-t border-gray-600 my-3 sm:my-4"></div>
                    <div class="text-xl sm:text-2xl lg:text-3xl">
                        <span class="font-bold" :class="score.total >= 50 ? 'text-emerald-400' : 'text-red-400'">Total Score:</span>
                        <span class="font-bold" :class="score.total >= 50 ? 'text-emerald-400' : 'text-red-400'"> {{score.total}}%</span>
                        <span class="text-gray-400"> / 50%</span>
                        <span v-if="score.total === bestScores.total && bestScores.total > 0" class="text-yellow-400 text-xs sm:text-sm ml-2">✨ BEST!</span>
                    </div>
                    
                    <!-- Session Best Scores -->
                    <div v-if="bestScores.total > 0" class="border-t border-gray-600 mt-6 pt-4">
                        <h3 class="text-lg font-bold text-emerald-400 mb-3">Session Best</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-300">Position:</span>
                                <span class="text-white font-semibold">{{bestScores.position}}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Rhythm:</span>
                                <span class="text-white font-semibold">{{bestScores.rhythm}}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Total:</span>
                                <span class="text-white font-semibold">{{bestScores.total}}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <button @click="emit('nextRound')" class="bg-emerald-500 text-white font-bold py-3 px-6 sm:px-8 rounded-full text-lg sm:text-xl shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105">
                {{ failed(score) ? 'Restart from Round 1' : 'Next Round' }}
            </button>
        </div>
      </div>
    </div>

    <!-- Info Modal -->
    <div v-if="showInfoModal" class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50 p-4" @click="emit('toggleInfoModal')">
      <div class="bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <!-- Modal Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-600">
          <h2 class="text-2xl font-bold text-emerald-400">How to Play Memorhythm</h2>
          <button 
            @click="emit('toggleInfoModal')"
            class="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
            aria-label="Close info modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="p-6 space-y-6">
          <!-- Game Flow Section -->
          <div>
            <h3 class="text-xl font-semibold text-white mb-3">🎮 Game Flow</h3>
            <div class="text-gray-300 space-y-2">
              <p>1. <strong class="text-emerald-400">Watch Carefully:</strong> A sequence of colored circles will appear on the board, each playing a musical tone.</p>
              <p>2. <strong class="text-emerald-400">Your Turn:</strong> Replicate the sequence by clicking the same locations in the same rhythm.</p>
              <p>3. <strong class="text-emerald-400">Scoring:</strong> Your performance is evaluated on both position accuracy and rhythm timing.</p>
            </div>
          </div>

          <!-- Scoring Requirements -->
          <div>
            <h3 class="text-xl font-semibold text-white mb-3">📊 Scoring Requirements</h3>
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-4 space-y-3">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span class="text-gray-300"><strong class="text-white">Position Accuracy:</strong> Must be ≥30% to pass</span>
              </div>
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span class="text-gray-300"><strong class="text-white">Rhythm Accuracy:</strong> Must be ≥30% to pass</span>
              </div>
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 bg-emerald-400 rounded-full"></div>
                <span class="text-gray-300"><strong class="text-white">Total Score:</strong> Must be ≥50% to complete the level</span>
              </div>
            </div>
            <p class="text-sm text-gray-400 mt-3">All three requirements must be met to advance to the next round!</p>
          </div>

          <!-- Tips Section -->
          <div>
            <h3 class="text-xl font-semibold text-white mb-3">💡 Tips for Success</h3>
            <div class="text-gray-300 space-y-2">
              <p>• <strong class="text-emerald-400">Memory:</strong> Focus on the visual pattern and spatial relationships between circles.</p>
              <p>• <strong class="text-emerald-400">Rhythm:</strong> Listen to the musical timing and try to internalize the beat.</p>
              <p>• <strong class="text-emerald-400">Audio Cues:</strong> The pitch changes with vertical position - higher circles have higher tones.</p>
              <p>• <strong class="text-emerald-400">Practice:</strong> Each round adds one more circle to the sequence - start simple and build up!</p>
            </div>
          </div>

          <!-- Close Button -->
          <div class="flex justify-center pt-4">
            <button 
              @click="emit('toggleInfoModal')"
              class="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 