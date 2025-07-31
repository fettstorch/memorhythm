import { createApp } from 'vue'
import App from './App.vue'
import { enableDeterministicMode } from './services/seededRandom'

// Check if we should enable deterministic mode
const urlParams = new URLSearchParams(window.location.search);
const testMode = urlParams.get('test') === 'true';
const seed = parseInt(urlParams.get('seed') || '12345', 10);

if (testMode) {
  // Enable deterministic mode before creating the app
  enableDeterministicMode(seed);
  
  // Add visual indicator that we're in test mode
  document.title = `${document.title} [TEST MODE]`;
  console.log('🧪 E2E Test mode active - sequences will be deterministic');
}

createApp(App).mount('#app') 