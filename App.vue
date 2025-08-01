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
import { getLeaderboard, submitScore } from './src/services/leaderboardService';
import type { LeaderboardResponse } from './types';
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
const showInfoModal = ref<boolean>(false);
const dimensions = ref({ width: 0, height: 0 });

// Player name and score management
const PLAYER_NAME_KEY = 'memorhythm-player-name';
const USER_SCORES_KEY = 'memorhythm-user-scores';

const generateDefaultName = () => `user-${Math.floor(1000 + Math.random() * 9000)}`;

const loadPlayerName = (): string => {
  try {
    const saved = localStorage.getItem(PLAYER_NAME_KEY);
    return saved && saved.trim() ? saved.trim() : generateDefaultName();
  } catch {
    return generateDefaultName();
  }
};

const savePlayerName = (name: string) => {
  try {
    const trimmedName = name.trim();
    if (trimmedName) {
      localStorage.setItem(PLAYER_NAME_KEY, trimmedName);
    }
  } catch (error) {
    console.warn('Failed to save player name to localStorage:', error);
  }
};

// User score persistence
interface UserBestScores {
  position: number;
  rhythm: number;
  total: number;
  round: number;
}

const loadUserScores = (): UserBestScores => {
  try {
    const saved = localStorage.getItem(USER_SCORES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the structure
      if (typeof parsed === 'object' && 
          typeof parsed.position === 'number' && 
          typeof parsed.rhythm === 'number' && 
          typeof parsed.total === 'number' && 
          typeof parsed.round === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load user scores from localStorage:', error);
  }
  return { position: 0, rhythm: 0, total: 0, round: 0 };
};

const saveUserScores = (scores: UserBestScores) => {
  try {
    localStorage.setItem(USER_SCORES_KEY, JSON.stringify(scores));
  } catch (error) {
    console.warn('Failed to save user scores to localStorage:', error);
  }
};

const playerName = ref(loadPlayerName());
const bestScores = ref(loadUserScores());

// Leaderboard data - cache all three types
const leaderboardCache = ref<{
  total: LeaderboardResponse | null;
  position: LeaderboardResponse | null;
  rhythm: LeaderboardResponse | null;
}>({
  total: null,
  position: null,
  rhythm: null
});
const isLoadingLeaderboard = ref(false);
const activeLeaderboardTab = ref<'total' | 'position' | 'rhythm'>('total');
let refreshInterval: NodeJS.Timer | null = null;

// Check if we're in test mode to disable leaderboard features
const isTestMode = new URLSearchParams(window.location.search).get('test') === 'true';

const handleCanvasReady = (newDimensions: { width: number; height: number }) => {
  dimensions.value = newDimensions;
};

// Load all leaderboard data and cache it
const loadAllLeaderboards = async (showLoading = false) => {
  if (isTestMode) return; // Skip leaderboard in test mode
  
  if (showLoading) {
    isLoadingLeaderboard.value = true;
  }
  
  try {
    // Load all three leaderboard types in parallel
    const [totalData, positionData, rhythmData] = await Promise.all([
      getLeaderboard('total', 20),
      getLeaderboard('position', 20),
      getLeaderboard('rhythm', 20)
    ]);
    
    leaderboardCache.value = {
      total: totalData,
      position: positionData,
      rhythm: rhythmData
    };
  } catch (error) {
    console.error('Failed to load leaderboards:', error);
  } finally {
    if (showLoading) {
      isLoadingLeaderboard.value = false;
    }
  }
};

// Switch leaderboard tab (no loading needed - use cached data)
const switchLeaderboardTab = (category: 'total' | 'position' | 'rhythm') => {
  activeLeaderboardTab.value = category;
};

// Merge local user scores with leaderboard data
const mergeLocalUserScore = (leaderboardData: LeaderboardResponse | null, category: ScoreCategory): LeaderboardResponse | null => {
  if (!leaderboardData || bestScores.value.total === 0) return leaderboardData;
  
  const currentUserName = playerName.value.trim();
  const userScore = bestScores.value[category];
  const userRound = bestScores.value.round;
  
  // Check if user is already in the leaderboard
  const existingUserIndex = leaderboardData.entries.findIndex(entry => entry.user === currentUserName);
  
  // Create user entry
  const userEntry: LeaderboardEntry = {
    user: currentUserName,
    score: userScore,
    round: userRound
  };
  
  let newEntries = [...leaderboardData.entries];
  
  if (existingUserIndex >= 0) {
    // User exists in leaderboard - only replace if local score is better
    const existingEntry = newEntries[existingUserIndex];
    if (userScore > existingEntry.score || 
        (userScore === existingEntry.score && userRound > existingEntry.round)) {
      newEntries[existingUserIndex] = userEntry;
    }
  } else {
    // User not in leaderboard - add them
    newEntries.push(userEntry);
  }
  
  // Sort by round (desc) first, then by score (desc) within each round
  newEntries.sort((a, b) => {
    if (b.round !== a.round) return b.round - a.round;
    return b.score - a.score;
  });
  
  // Ensure local user is always included, even if not in top 20
  const localUserIndex = newEntries.findIndex(entry => entry.user === currentUserName);
  let finalEntries = newEntries.slice(0, 20);
  
  // If local user is not in top 20 but exists in the full list, add them
  if (localUserIndex >= 20) {
    const localUserEntry = newEntries[localUserIndex];
    finalEntries = [...finalEntries.slice(0, 19), localUserEntry]; // Replace 20th with local user
  }
  
  newEntries = finalEntries;
  
  return {
    category: leaderboardData.category,
    entries: newEntries
  };
};

// Get current leaderboard data from cache with local user integrated
const currentLeaderboardData = computed(() => {
  const cachedData = leaderboardCache.value[activeLeaderboardTab.value];
  return mergeLocalUserScore(cachedData, activeLeaderboardTab.value);
});

// Start periodic refresh of leaderboard data
const startLeaderboardRefresh = () => {
  if (isTestMode || refreshInterval) return;
  
  refreshInterval = setInterval(() => {
    loadAllLeaderboards();
  }, 10000); // Refresh every 10 seconds
};

// Stop periodic refresh
const stopLeaderboardRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Auto-submit score for failed games (NO auto-redirect - wait for player input)
const autoSubmitScoreOnly = async (calculatedScore: Score) => {
  if (isTestMode) {
    // In test mode, don't submit scores but keep normal game flow
    return;
  }
  
  try {
    // Submit the score using the current player name
    await submitScore({
      user: playerName.value.trim() || generateDefaultName(),
      position: calculatedScore.position,
      rhythm: calculatedScore.rhythm,
      total: calculatedScore.total,
      round: round.value,
    });
    
    // Refresh leaderboard data in background
    loadAllLeaderboards(); // Don't await - let it update in background
    
  } catch (error) {
    console.error('Failed to submit score:', error);
    // Continue with normal game flow even if submission fails
  }
};

// Removed duplicate function

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
  
  if (failed) {
    // For failed games, return to start screen instead of immediately starting new round
    round.value = 1;
    gameState.value = GameState.Idle;
  } else {
    // For successful rounds, proceed to next round
    const nextRound = round.value + 1;
    round.value = nextRound;
    startNewRound(nextRound);
  }
};

const handleToggleMute = () => {
  isMuted.value = !isMuted.value;
};

const handleToggleInfoModal = () => {
  showInfoModal.value = !showInfoModal.value;
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
    
    // Update best scores and save to localStorage
    let scoresUpdated = false;
    if (calculatedScore.position > bestScores.value.position) {
      bestScores.value.position = calculatedScore.position;
      scoresUpdated = true;
    }
    if (calculatedScore.rhythm > bestScores.value.rhythm) {
      bestScores.value.rhythm = calculatedScore.rhythm;
      scoresUpdated = true;
    }
    if (calculatedScore.total > bestScores.value.total) {
      bestScores.value.total = calculatedScore.total;
      bestScores.value.round = round.value;
      scoresUpdated = true;
    }
    
    // Save updated scores to localStorage
    if (scoresUpdated) {
      saveUserScores(bestScores.value);
    }
    
    const failed = calculatedScore.total < 50 || calculatedScore.position < 30 || calculatedScore.rhythm < 30;
    if (failed) {
      playSoundEffect('level-failed');
      // For failed games, auto-submit score but stay in scoring state - wait for player to click "Restart from Round 1"
      autoSubmitScoreOnly(calculatedScore);
    } else {
      playSoundEffect('level-complete');
      // For successful rounds, auto-submit score but stay in scoring state - wait for player to click "Next Round"
      autoSubmitScoreOnly(calculatedScore);
    }
  }
});

const clicksRemaining = computed(() => {
  return sequence.value.length - playerClicks.value.length;
});

// No longer needed - modals removed

// Load leaderboard data on app start and start periodic refresh
onMounted(() => {
  loadAllLeaderboards(true); // Show loading only on initial load
  startLeaderboardRefresh();
});

// Clean up interval on unmount
onUnmounted(() => {
  stopLeaderboardRefresh();
});
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
        :showInfoModal="showInfoModal"
        :playerName="playerName"
        :leaderboardData="currentLeaderboardData"
        :isLoadingLeaderboard="isLoadingLeaderboard"
        :activeLeaderboardTab="activeLeaderboardTab"
        @start="handleStartGame"
        @nextRound="handleNextRound"
        @toggleMute="handleToggleMute"
        @toggleInfoModal="handleToggleInfoModal"
        @updatePlayerName="(newName) => { playerName = newName; savePlayerName(newName); }"
        @switchLeaderboardTab="switchLeaderboardTab"
      />
    </div>
  </div>
</template>
<style>
html, body {
  overscroll-behavior-x: none;
}
</style> 