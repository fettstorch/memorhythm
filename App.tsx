
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { backgroundMusicBase64Encoded } from './sounds';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Idle);
  const [sequence, setSequence] = useState<CircleDefinition[]>([]);
  const [playerClicks, setPlayerClicks] = useState<PlayerClick[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [round, setRound] = useState<number>(1);
  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(null);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  const [isMusicSetup, setIsMusicSetup] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startNewRound = useCallback((targetRound: number) => {
    const sequenceLength = 2 + targetRound;
    setPlayerClicks([]);
    setScore(null);
    setActivePlaybackIndex(null);
    const newSequence = generateSequence(sequenceLength, dimensions.width, dimensions.height);
    setSequence(newSequence);
    setGameState(GameState.Playback);
  }, [dimensions.width, dimensions.height]);

  const handleStartGame = useCallback(async () => {
    let audioIsReady = audioReady;
    if (!audioIsReady) {
      const success = initAudio();
      if (success) {
        setAudioReady(true);
        audioIsReady = true;
      } else {
        alert("Audio could not be initialized. The game will proceed without sound.");
      }
    }

    if (audioIsReady && !isMusicSetup) {
      try {
        const musicLoaded = await loadBackgroundMusic(backgroundMusicBase64Encoded);
        if (musicLoaded) {
          startBackgroundMusic();
          setIsMusicSetup(true);
        }
      } catch (e) {
        console.error("Failed to set up background music.", e);
      }
    }
    
    setRound(1);
    startNewRound(1);
  }, [audioReady, isMusicSetup, startNewRound]);


  const handleNextRound = () => {
    const failed = score && (score.total < 50 || score.position < 30 || score.rhythm < 30);
    const nextRound = failed ? 1 : round + 1;
    setRound(nextRound);
    startNewRound(nextRound);
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  useEffect(() => {
    if (isMusicSetup) {
        setBackgroundMusicVolume(isMuted ? 0 : 0.3);
    }
  }, [isMuted, isMusicSetup]);


  // Game state: Playback
  useEffect(() => {
    if (gameState !== GameState.Playback || sequence.length === 0) return;

    let timeoutId: number;
    let isCancelled = false;

    const playNextInSequence = (index: number) => {
      if (isCancelled) return;

      if (index >= sequence.length) {
        setGameState(GameState.PlayerTurn);
        setActivePlaybackIndex(null);
        return;
      }
      
      const circle = sequence[index];
      setActivePlaybackIndex(index);
      playTone(circle.frequency, ANIMATION_DURATION_MS / 1000);
      
      const delay = index < sequence.length - 1 ? sequence[index + 1].time - circle.time : ANIMATION_DURATION_MS * 1.5;
      timeoutId = window.setTimeout(() => playNextInSequence(index + 1), delay);
    };
    
    const startSyncedPlayback = async () => {
        // Await the next loop of the background music.
        await onNextLoop();
        if (isCancelled) return;

        // Small grace period to ensure the beat has "landed" visually/audibly.
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
  }, [gameState, sequence]);

  const handleInteractionStart = useCallback((click: PlayerClick) => {
    if (playerClicks.length < sequence.length) {
        const frequency = calculateFrequencyFromY(click.y, dimensions.height);
        startPlayerTone(frequency);
        setPlayerClicks(prev => [...prev, click]);
    }
  }, [playerClicks.length, sequence.length, dimensions.height]);

  const handleInteractionMove = useCallback(({ x, y }: { x: number, y: number }) => {
    if (playerClicks.length === 0 || playerClicks.length > sequence.length) return;
    
    setPlayerClicks(prev => {
        const updatedClicks = [...prev];
        const lastClick = updatedClicks[updatedClicks.length - 1];
        updatedClicks[updatedClicks.length - 1] = { ...lastClick, x, y };
        return updatedClicks;
    });

    const frequency = calculateFrequencyFromY(y, dimensions.height);
    updatePlayerTonePitch(frequency);

  }, [playerClicks, sequence.length, dimensions.height]);

  const handleInteractionEnd = useCallback(() => {
    stopPlayerTone();
  }, []);

  // Game state: Player turn -> Calculating
  useEffect(() => {
    if (gameState === GameState.PlayerTurn && playerClicks.length === sequence.length && sequence.length > 0) {
      setGameState(GameState.Calculating);
    }
  }, [gameState, playerClicks, sequence]);

  // Game state: Calculating -> Scoring
  useEffect(() => {
    if (gameState === GameState.Calculating) {
      const timer = setTimeout(() => {
        setGameState(GameState.Scoring);
      }, 1500); // Add a small delay for suspense

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Game state: Scoring
  useEffect(() => {
    if (gameState === GameState.Scoring) {
      const calculatedScore = calculateScore(sequence, playerClicks, MAX_POSITION_ERROR_PX, MAX_RHYTHM_ERROR_MS);
      setScore(calculatedScore);
      const failed = calculatedScore.total < 50 || calculatedScore.position < 30 || calculatedScore.rhythm < 30;
      if (failed) {
        playSoundEffect('level-failed');
      } else {
        playSoundEffect('level-complete');
      }
    }
  }, [gameState, sequence, playerClicks]);

  const clicksRemaining = useMemo(() => {
    return sequence.length - playerClicks.length;
  }, [sequence.length, playerClicks.length]);

  return (
    <div className="h-screen w-screen flex items-center justify-center font-sans bg-gray-900 text-white">
      <div className="relative w-full h-full">
        <GameCanvas
          gameState={gameState}
          sequence={sequence}
          playerClicks={playerClicks}
          activePlaybackIndex={activePlaybackIndex}
          onPlayerInteractionStart={handleInteractionStart}
          onPlayerInteractionMove={handleInteractionMove}
          onPlayerInteractionEnd={handleInteractionEnd}
          width={dimensions.width}
          height={dimensions.height}
        />
        <UIOverlay
          gameState={gameState}
          score={score}
          round={round}
          clicksRemaining={clicksRemaining}
          isMuted={isMuted}
          isMusicSetup={isMusicSetup}
          onStart={handleStartGame}
          onNextRound={handleNextRound}
          onToggleMute={handleToggleMute}
        />
      </div>
    </div>
  );
};

export default App;
