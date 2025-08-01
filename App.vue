<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { GameState, CircleDefinition, PlayerClick, Score } from './types';
import { generateSequence, calculateScore, calculateFrequencyFromY } from './services/gameLogic';
import {
  initAudio,
  playTone,
  playSoundEffect,
  startPlayerTone,
  stopPlayerTone,
  updatePlayerTonePitch,
  loadBackgroundMusic,
  startBackgroundMusic,
  onNextLoop,
  setBackgroundMusicVolume,
} from './services/audioService';
import {
  ANIMATION_DURATION_MS,
  MAX_POSITION_ERROR_PX,
  MAX_RHYTHM_ERROR_MS,
} from './constants';
import GameCanvas from './components/GameCanvas.vue';
import UIOverlay from './components/UIOverlay.vue';
import PlayerNameInput from './src/components/PlayerNameInput.vue';
import LeaderboardDisplay from './src/components/LeaderboardDisplay.vue';
import { backgroundMusicBase64Encoded } from './sounds';

const gameState = ref<GameState>(GameState.Idle);
const sequence = ref<CircleDefinition[]>([]);
const playerClicks = ref<PlayerClick[]>([]);
const score = ref<Score | null>(null);
const round = ref<number>(1);
const activePlaybackIndex = ref<number | null>(null);
const audioReady = ref<boolean>(false);
const isMusicSetup = ref<boolean>(false);
const isMuted = ref<boolean>(false);
const dimensions = ref({ width: 0, height: 0 });
const bestScores = ref({ position: 0, rhythm: 0, total: 0 });
const showPlayerNameInput = ref(false);
const showLeaderboard = ref(false);

// Check if we're in test mode to disable leaderboard modals
const isTestMode = new URLSearchParams(window.location.search).get('test') === 'true';

const handleCanvasReady = (newDimensions: { width: number; height: number }) => {
  dimensions.value = newDimensions;
};

const startNewRound = (targetRound: number) => {
  const sequenceLength = 2 + targetRound;
  playerClicks.value = [];
  score.value = null;
  activePlaybackIndex.value = null;
  const newSequence = generateSequence(sequenceLength, dimensions.value.width, dimensions.value.height);
  sequence.value = newSequence;
  
  // DEBUG: Log the sequence details
  console.debug(`🎮 DEBUG: Starting Round ${targetRound} with ${sequenceLength} circles:`);
  console.debug('📍 Sequence coordinates and timing:');
  newSequence.forEach((circle, index) => {
    console.debug(`  Circle ${index + 1}: x=${Math.round(circle.x)}, y=${Math.round(circle.y)}, time=${circle.time}ms, color=${circle.color}, freq=${Math.round(circle.frequency)}Hz`);
  });
  
  gameState.value = GameState.Playback;
};

const handleStartGame = async () => {
  let audioIsReady = audioReady.value;
  if (!audioIsReady) {
    const success = initAudio();
    if (success) {
      audioReady.value = true;
      audioIsReady = true;
    } else {
      alert("Audio could not be initialized. The game will proceed without sound.");
    }
  }

  if (audioIsReady && !isMusicSetup.value) {
    try {
      const musicLoaded = await loadBackgroundMusic(backgroundMusicBase64Encoded);
      if (musicLoaded) {
        startBackgroundMusic();
        isMusicSetup.value = true;
      }
    } catch (e) {
      console.error("Failed to set up background music.", e);
    }
  }

  if (dimensions.value.width > 0) {
    round.value = 1;
    startNewRound(1);
  }
};

const handleNextRound = () => {
  const failed = score.value && (score.value.total < 50 || score.value.position < 30 || score.value.rhythm < 30);
  const nextRound = failed ? 1 : round.value + 1;
  round.value = nextRound;
  startNewRound(nextRound);
};

const handleToggleMute = () => {
  isMuted.value = !isMuted.value;
};

watch(isMuted, (muted) => {
  if (isMusicSetup.value) {
    setBackgroundMusicVolume(muted ? 0 : 0.3);
  }
});

watch([gameState, sequence], () => {
  if (gameState.value !== GameState.Playback || sequence.value.length === 0) return;

  let timeoutId: number;
  let isCancelled = false;

  const playNextInSequence = (index: number) => {
    if (isCancelled) return;

    if (index >= sequence.value.length) {
      console.debug('🎵 DEBUG: Playback complete - switching to PlayerTurn');
      gameState.value = GameState.PlayerTurn;
      activePlaybackIndex.value = null;
      return;
    }

    const circle = sequence.value[index];
    activePlaybackIndex.value = index;
    playTone(circle.frequency, ANIMATION_DURATION_MS / 1000);
    
    console.debug(`🎵 DEBUG: Playing circle ${index + 1}: x=${Math.round(circle.x)}, y=${Math.round(circle.y)} at ${circle.time}ms`);

    const delay = index < sequence.value.length - 1 ? sequence.value[index + 1].time - circle.time : ANIMATION_DURATION_MS * 1.5;
    timeoutId = window.setTimeout(() => playNextInSequence(index + 1), delay);
  };
  
  const startSyncedPlayback = async () => {
      await onNextLoop();
      if (isCancelled) return;

      timeoutId = window.setTimeout(() => {
          if (!isCancelled) {
              playNextInSequence(0);
          }
      }, 100);
  };

  startSyncedPlayback();

  return () => {
    isCancelled = true;
    clearTimeout(timeoutId);
  };
});

const handleInteractionStart = (click: PlayerClick) => {
  if (playerClicks.value.length < sequence.value.length) {
      const frequency = calculateFrequencyFromY(click.y, dimensions.value.height);
      startPlayerTone(frequency);
      playerClicks.value.push(click);
  }
};

const handleInteractionPitchChange = ({ y }: { y: number }) => {
    const frequency = calculateFrequencyFromY(y, dimensions.value.height);
    updatePlayerTonePitch(frequency);
};

const handleInteractionEnd = ({ x, y }: { x: number; y: number }) => {
  stopPlayerTone();
  if (playerClicks.value.length > 0) {
    const lastClickIndex = playerClicks.value.length - 1;
    const newClicks = [...playerClicks.value];
    newClicks[lastClickIndex] = { ...newClicks[lastClickIndex], x, y };
    playerClicks.value = newClicks;
    
    // DEBUG: Log player click details
    const click = newClicks[lastClickIndex];
    const targetCircle = sequence.value[lastClickIndex];
    const distance = Math.hypot(click.x - targetCircle.x, click.y - targetCircle.y);
    console.debug(`👆 DEBUG: Player click ${lastClickIndex + 1}:`);
    console.debug(`  Clicked: x=${Math.round(click.x)}, y=${Math.round(click.y)}, time=${click.time}ms`);
    console.debug(`  Target:  x=${Math.round(targetCircle.x)}, y=${Math.round(targetCircle.y)}, time=${targetCircle.time}ms`);
    console.debug(`  Distance: ${Math.round(distance)}px, Time diff: ${click.time - targetCircle.time}ms`);
  }
};

watch(playerClicks, () => {
  if (gameState.value === GameState.PlayerTurn && playerClicks.value.length === sequence.value.length && sequence.value.length > 0) {
    gameState.value = GameState.Calculating;
  }
}, { deep: true });

watch(gameState, (newGameState) => {
  if (newGameState === GameState.Calculating) {
    const timer = setTimeout(() => {
      gameState.value = GameState.Scoring;
    }, 1500);
    
    const stopTimer = () => clearTimeout(timer);
    
    // This is a bit of a hack, but it's the simplest way to ensure the timer is cleaned up
    // when the component is unmounted.
    const unwatch = watch(gameState, (newState) => {
        if (newState !== GameState.Calculating) {
            stopTimer();
            unwatch();
        }
    });

  } else if (newGameState === GameState.Scoring) {
    const calculatedScore = calculateScore(sequence.value, playerClicks.value, MAX_POSITION_ERROR_PX, MAX_RHYTHM_ERROR_MS);
    score.value = calculatedScore;
    
    // DEBUG: Log final scores
    console.debug(`📊 DEBUG: Round ${round.value} Results:`);
    console.debug(`  Position Score: ${calculatedScore.position}% (min: 30%)`);
    console.debug(`  Rhythm Score: ${calculatedScore.rhythm}% (min: 30%)`);
    console.debug(`  Total Score: ${calculatedScore.total}% (min: 50%)`);
    console.debug(`  Max Position Error: ${MAX_POSITION_ERROR_PX}px`);
    console.debug(`  Max Rhythm Error: ${MAX_RHYTHM_ERROR_MS}ms`);
    
    // Update best scores
    if (calculatedScore.position > bestScores.value.position) {
      bestScores.value.position = calculatedScore.position;
    }
    if (calculatedScore.rhythm > bestScores.value.rhythm) {
      bestScores.value.rhythm = calculatedScore.rhythm;
    }
    if (calculatedScore.total > bestScores.value.total) {
      bestScores.value.total = calculatedScore.total;
    }
    
    const failed = calculatedScore.total < 50 || calculatedScore.position < 30 || calculatedScore.rhythm < 30;
    if (failed) {
      playSoundEffect('level-failed');
      // Show name input for failed games too (they still completed rounds) - but not in test mode
      if (!isTestMode) {
        showPlayerNameInput.value = true;
      }
    } else {
      playSoundEffect('level-complete');
      // Show name input for successful rounds - but not in test mode
      if (!isTestMode) {
        showPlayerNameInput.value = true;
      }
    }
  }
});

const clicksRemaining = computed(() => {
  return sequence.value.length - playerClicks.value.length;
});

const handlePlayerNameSubmitted = () => {
  showPlayerNameInput.value = false;
};

const handleShowLeaderboard = () => {
  // Don't show leaderboard in test mode
  if (!isTestMode) {
    showLeaderboard.value = true;
  }
};

const handleHideLeaderboard = () => {
  showLeaderboard.value = false;
};
</script>

<template>
  <div class="h-screen w-screen flex items-center justify-center font-sans bg-gray-900 text-white overflow-hidden">
    <div class="relative w-full h-full">
      <GameCanvas
        @ready="handleCanvasReady"
        :gameState="gameState"
        :sequence="sequence"
        :playerClicks="playerClicks"
        :activePlaybackIndex="activePlaybackIndex"
        @playerInteractionStart="handleInteractionStart"
        @playerInteractionPitchChange="handleInteractionPitchChange"
        @playerInteractionEnd="handleInteractionEnd"
      />
      <UIOverlay
        :gameState="gameState"
        :score="score"
        :bestScores="bestScores"
        :round="round"
        :clicksRemaining="clicksRemaining"
        :isMuted="isMuted"
        :isMusicSetup="isMusicSetup"
        @start="handleStartGame"
        @nextRound="handleNextRound"
        @toggleMute="handleToggleMute"
        @showLeaderboard="handleShowLeaderboard"
      />
      
      <!-- Player Name Input Modal -->
      <div v-if="showPlayerNameInput" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <PlayerNameInput 
          :score="score!" 
          :round="round"
          @submitted="handlePlayerNameSubmitted"
        />
      </div>
      
      <!-- Leaderboard Modal -->
      <div v-if="showLeaderboard" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <LeaderboardDisplay @close="handleHideLeaderboard" />
      </div>
    </div>
  </div>
</template>
<style>
html, body {
  overscroll-behavior-x: none;
}
</style> 