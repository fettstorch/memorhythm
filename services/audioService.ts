
let audioContext: AudioContext | null = null;
let activePlayerOscillator: { oscillator: OscillatorNode, gainNode: GainNode, baseFrequency: number } | null = null;

// State for background music
let backgroundMusicBuffer: AudioBuffer | null = null;
let backgroundMusicSource: AudioBufferSourceNode | null = null;
let backgroundMusicGainNode: GainNode | null = null;
let backgroundMusicStartTime: number = 0; // In AudioContext time

// State for loop synchronization
let nextLoopPromise: Promise<void> | null = null;
let resolveNextLoop: (() => void) | null = null;
let nextLoopAudioContextTime: number = 0;
let loopTimeoutId: number | null = null;


/**
 * Initializes the AudioContext.
 * Must be called after a user interaction.
 * @returns A boolean indicating success.
 */
export const initAudio = (): boolean => {
  if (audioContext) {
    return true;
  }
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return true;
  } catch (e) {
    console.error("Web Audio API is not supported in this browser", e);
    return false;
  }
};

/**
 * Returns a promise that resolves on the next loop of the background music.
 */
export const onNextLoop = (): Promise<void> => {
  if (!audioContext || !backgroundMusicSource || !backgroundMusicSource.loop) {
    // If audio isn't ready or music isn't looping, resolve after a short delay.
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!nextLoopPromise) {
    nextLoopPromise = new Promise(resolve => {
      resolveNextLoop = resolve;
    });
  }
  return nextLoopPromise;
};

const scheduleLoopCallback = () => {
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId);
  }
  if (!audioContext || !backgroundMusicBuffer || !backgroundMusicSource || !backgroundMusicSource.loop) {
    return;
  }
  
  const loopDuration = backgroundMusicBuffer.duration;
  if (loopDuration <= 0) return;

  const currentTime = audioContext.currentTime;
  
  // If this is the first time, or if we've drifted, calculate the next loop time.
  if (nextLoopAudioContextTime <= currentTime) {
    const timeSinceStart = Math.max(0, currentTime - backgroundMusicStartTime);
    const loopsPassed = Math.floor(timeSinceStart / loopDuration);
    nextLoopAudioContextTime = backgroundMusicStartTime + (loopsPassed + 1) * loopDuration;
  }
  
  const delayInSeconds = nextLoopAudioContextTime - currentTime;
  
  loopTimeoutId = window.setTimeout(() => {
    // Resolve the promise for the loop that just occurred.
    if (resolveNextLoop) {
      resolveNextLoop();
    }
    
    // Create a new promise for the *next* loop.
    nextLoopPromise = new Promise(resolve => {
      resolveNextLoop = resolve;
    });
    
    // Set the time for the subsequent loop and schedule it.
    nextLoopAudioContextTime += loopDuration;
    scheduleLoopCallback();
  }, delayInSeconds * 1000);
};


/**
 * Decodes a base64 audio string into an AudioBuffer.
 * @param base64String The base64-encoded audio data.
 * @returns `true` if successful, `false` otherwise.
 */
export const loadBackgroundMusic = async (base64String: string): Promise<boolean> => {
    if (!audioContext || !base64String) {
        return false;
    }
    try {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const arrayBuffer = byteArray.buffer;

        backgroundMusicBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return true;
    } catch (e) {
        console.error("Failed to decode or load background music", e);
        return false;
    }
};

/**
 * Starts playing the loaded background music in a loop.
 */
export const startBackgroundMusic = () => {
    if (!audioContext || !backgroundMusicBuffer) {
        console.warn("Cannot start background music: context or buffer not ready.");
        return;
    }
    if (backgroundMusicSource) {
        backgroundMusicSource.stop();
        if (loopTimeoutId) {
            clearTimeout(loopTimeoutId);
            loopTimeoutId = null;
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = backgroundMusicBuffer;
    source.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // Lower volume for background track
    backgroundMusicGainNode = gainNode;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.start(0);
    backgroundMusicStartTime = audioContext.currentTime;
    backgroundMusicSource = source;
    
    // Initialize for loop scheduling
    nextLoopAudioContextTime = backgroundMusicStartTime;
    onNextLoop(); // Create the initial promise
    scheduleLoopCallback();
};

/**
 * Sets the volume of the background music.
 * @param volume A number between 0 (muted) and 1 (full volume).
 */
export const setBackgroundMusicVolume = (volume: number) => {
  if (audioContext && backgroundMusicGainNode) {
    // Use a ramp to avoid clicking sounds when muting/unmuting
    backgroundMusicGainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
  }
};


/**
 * Plays a generated sound effect.
 * @param name - The name of the sound to play.
 */
export const playSoundEffect = (name: 'level-complete' | 'level-failed') => {
    if (!audioContext) {
        console.warn("AudioContext not initialized. Cannot play sound effect.");
        return;
    }
    
    const now = audioContext.currentTime;

    if (name === 'level-complete') {
        // Ascending C-major arpeggio
        const freqs = [261.63, 329.63, 392.00, 523.25];
        freqs.forEach((freq, index) => {
            const osc = audioContext!.createOscillator();
            const gain = audioContext!.createGain();
            osc.connect(gain);
            gain.connect(audioContext!.destination);

            const startTime = now + index * 0.08;
            const duration = 0.15;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.6, startTime + 0.01);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    } else if (name === 'level-failed') {
        // Low, dissonant buzz
        const freqs = [123.47, 110.00]; // B2 and A2
        freqs.forEach(freq => {
            const osc = audioContext!.createOscillator();
            const gain = audioContext!.createGain();
            osc.connect(gain);
            gain.connect(audioContext!.destination);
            
            const duration = 0.4;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        });
    }
};

/**
 * Plays a tone with a given frequency and duration, with optional modifications for feedback.
 * Used for sequence playback animations.
 * @param frequency - The base frequency of the tone in Hz.
 * @param durationSeconds - The duration of the tone in seconds.
 * @param pitchShiftHz - The amount to shift the pitch by in Hz, indicating error.
 * @param waveType - The oscillator waveform to use.
 */
export const playTone = (
  frequency: number,
  durationSeconds: number,
  pitchShiftHz: number = 0,
  waveType: OscillatorType = 'sine'
) => {
  if (!audioContext) {
    console.warn("AudioContext not initialized. Cannot play tone.");
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = waveType;
  const finalFrequency = frequency + pitchShiftHz;
  oscillator.frequency.setValueAtTime(finalFrequency, audioContext.currentTime);

  // Fade in and out to prevent clicking sounds
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + durationSeconds);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + durationSeconds);
};

/**
 * Starts a continuous tone for player interaction. Replaces any existing tone.
 * @param frequency The absolute frequency of the tone in Hz.
 */
export const startPlayerTone = (frequency: number) => {
  if (!audioContext) {
    console.warn("AudioContext not initialized. Cannot play tone.");
    return;
  }

  if (activePlayerOscillator) {
    stopPlayerTone(false); // Stop immediately without reverb
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  // Attack: quick fade-in to avoid clicking
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.02);

  oscillator.start(audioContext.currentTime);

  activePlayerOscillator = { oscillator, gainNode, baseFrequency: frequency };
};

/**
 * Updates the pitch of the currently playing player tone to a new absolute frequency.
 * @param frequency The new absolute frequency to ramp to.
 */
export const updatePlayerTonePitch = (frequency: number) => {
  if (!audioContext || !activePlayerOscillator) {
    return;
  }

  const { oscillator } = activePlayerOscillator;

  // Use a short ramp to avoid audio 'clicks' from a sudden frequency change
  oscillator.frequency.linearRampToValueAtTime(frequency, audioContext.currentTime + 0.01);
  activePlayerOscillator.baseFrequency = frequency;
};


/**
 * Stops the continuous tone started by startPlayerTone.
 * @param withReverbTail - If true, adds a fade-out effect. Defaults to true.
 */
export const stopPlayerTone = (withReverbTail: boolean = true) => {
  if (!audioContext || !activePlayerOscillator) {
    return;
  }

  const { oscillator, gainNode } = activePlayerOscillator;
  const now = audioContext.currentTime;
  const releaseTime = withReverbTail ? 0.4 : 0.05; // 400ms for reverb, 50ms for quick stop

  // Release/Decay phase
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now); // Start fade from current gain
  gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

  oscillator.stop(now + releaseTime);

  activePlayerOscillator = null;
};
