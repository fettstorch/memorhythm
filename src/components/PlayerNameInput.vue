<template>
  <div class="player-name-input">
    <div class="input-group">
      <label for="playerName">Enter your name:</label>
      <input
        id="playerName"
        v-model="playerName"
        type="text"
        maxlength="20"
        placeholder="Your name"
        @keyup.enter="submitName"
        :disabled="isSubmitting"
      />
      <button 
        @click="submitName" 
        :disabled="!playerName.trim() || isSubmitting"
        class="submit-btn"
      >
        {{ isSubmitting ? 'Submitting...' : 'Submit Score' }}
      </button>
    </div>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success">{{ successMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { submitScore } from '../services/leaderboardService';
import type { Score } from '../../types';

interface Props {
  score: Score;
  round: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  submitted: [];
}>();

const playerName = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

async function submitName() {
  if (!playerName.value.trim()) return;
  
  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    const result = await submitScore({
      user: playerName.value.trim(),
      position: props.score.position,
      rhythm: props.score.rhythm,
      total: props.score.total,
      round: props.round,
    });
    
    if (result.updated) {
      successMessage.value = `Score submitted! Updated categories: ${result.categories?.join(', ') || 'none'}`;
    } else {
      successMessage.value = 'Score submitted, but no new records set.';
    }
    
    setTimeout(() => {
      emit('submitted');
    }, 2000);
    
  } catch (error) {
    errorMessage.value = 'Failed to submit score. Please try again.';
    console.error('Score submission error:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.player-name-input {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  color: white;
  max-width: 400px;
  margin: 0 auto;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

label {
  font-size: 1.2em;
  font-weight: bold;
}

input {
  padding: 10px;
  border-radius: 5px;
  border: 2px solid #ccc;
  font-size: 1em;
  text-align: center;
  width: 200px;
}

input:focus {
  outline: none;
  border-color: #4CAF50;
}

.submit-btn {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #45a049;
}

.submit-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.error {
  color: #ff4444;
  margin-top: 10px;
}

.success {
  color: #4CAF50;
  margin-top: 10px;
}
</style>