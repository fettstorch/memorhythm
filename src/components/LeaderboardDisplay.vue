<template>
  <div class="leaderboard-display">
    <h2>Leaderboards</h2>
    
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category"
        @click="activeCategory = category"
        :class="{ active: activeCategory === category }"
        class="category-tab"
      >
        {{ categoryLabels[category] }}
      </button>
    </div>

    <div class="leaderboard-content">
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="!leaderboard?.entries.length" class="empty">
        No scores yet for {{ categoryLabels[activeCategory] }}
      </div>
      <div v-else class="leaderboard-list">
        <div
          v-for="entry in leaderboard.entries"
          :key="`${entry.user}-${entry.score}`"
          class="leaderboard-entry"
          :class="{ highlight: (entry.rank || 0) <= 3 }"
        >
          <span class="rank">#{{ entry.rank || 0 }}</span>
          <span class="user">{{ entry.user }}</span>
          <span class="score">{{ formatScore(entry.score, entry.round) }}</span>
        </div>
      </div>
    </div>

    <button @click="$emit('close')" class="close-btn">Close</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getLeaderboard } from '../services/leaderboardService';
import type { LeaderboardResponse, ScoreCategory } from '../../types';

defineEmits<{
  close: [];
}>();

const categories: ScoreCategory[] = ['total', 'position', 'rhythm'];
const categoryLabels = {
  total: 'Total Score',
  position: 'Position',
  rhythm: 'Rhythm',
};

const activeCategory = ref<ScoreCategory>('total');
const leaderboard = ref<LeaderboardResponse | null>(null);
const loading = ref(false);
const error = ref('');

async function fetchLeaderboard() {
  loading.value = true;
  error.value = '';
  
  try {
    leaderboard.value = await getLeaderboard(activeCategory.value, 10);
  } catch (err) {
    error.value = 'Failed to load leaderboard';
    console.error('Leaderboard fetch error:', err);
  } finally {
    loading.value = false;
  }
}

function formatScore(score: number, round: number): string {
  if (activeCategory.value === 'round') {
    return `Round ${score}`;
  }
  return `${score}% Round ${round}`;
}

watch(activeCategory, fetchLeaderboard);
onMounted(fetchLeaderboard);
</script>

<style scoped>
.leaderboard-display {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 15px;
  padding: 30px;
  color: white;
  max-width: 600px;
  margin: 0 auto;
  max-height: 80vh;
  overflow-y: auto;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #4CAF50;
}

.category-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.category-tab {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.category-tab:hover {
  background: rgba(255, 255, 255, 0.2);
}

.category-tab.active {
  background: #4CAF50;
  border-color: #4CAF50;
}

.leaderboard-content {
  min-height: 200px;
  margin-bottom: 20px;
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px;
  color: #ccc;
}

.error {
  color: #ff4444;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-entry {
  display: grid;
  grid-template-columns: 50px 1fr auto;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: background 0.3s;
}

.leaderboard-entry:hover {
  background: rgba(255, 255, 255, 0.1);
}

.leaderboard-entry.highlight {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
  border-left: 3px solid #FFD700;
}

.rank {
  font-weight: bold;
  color: #4CAF50;
}

.user {
  font-weight: 500;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.score {
  font-weight: bold;
  color: #FFD700;
}

.close-btn {
  display: block;
  margin: 0 auto;
  padding: 10px 30px;
  background: #666;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background 0.3s;
}

.close-btn:hover {
  background: #555;
}
</style>