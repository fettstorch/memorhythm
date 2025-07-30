
import React from 'react';
import { GameState, Score } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: Score | null;
  round: number;
  clicksRemaining: number;
  isMuted: boolean;
  isMusicSetup: boolean;
  onStart: () => void;
  onNextRound: () => void;
  onToggleMute: () => void;
}

const UIButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:bg-emerald-600 transition-transform transform hover:scale-105"
  >
    {children}
  </button>
);

const ScoreDisplay: React.FC<{ score: Score }> = ({ score }) => {
  const positionPassed = score.position >= 30;
  const rhythmPassed = score.rhythm >= 30;
  const totalPassed = score.total >= 50;
  const failed = !positionPassed || !rhythmPassed || !totalPassed;
  const allPassed = !failed;

  const scoreTitleColor = failed ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="bg-gray-800 bg-opacity-80 p-8 rounded-2xl shadow-2xl w-full max-w-md text-left backdrop-blur-sm">
      <h2 className={`text-4xl font-bold mb-6 text-center ${scoreTitleColor}`}>
        {failed ? 'Try Again' : 'Round Complete!'}
      </h2>
      <div className="space-y-4">
        {/* Position Accuracy */}
        <div className="text-2xl">
          <span className="text-gray-300">Position Accuracy:</span>
          <span className={`font-bold ${positionPassed ? 'text-emerald-400' : 'text-red-400'}`}> {score.position}%</span>
          <span className="text-gray-400"> / 30%</span>
        </div>
        {/* Rhythm Accuracy */}
        <div className="text-2xl">
          <span className="text-gray-300">Rhythm Accuracy:</span>
          <span className={`font-bold ${rhythmPassed ? 'text-emerald-400' : 'text-red-400'}`}> {score.rhythm}%</span>
          <span className="text-gray-400"> / 30%</span>
        </div>

        <div className="border-t border-gray-600 my-4"></div>

        {/* Total Score */}
        <div className="text-3xl">
          <span className={`font-bold ${allPassed ? 'text-emerald-400' : 'text-red-400'}`}>Total Score:</span>
          <span className={`font-bold ${allPassed ? 'text-emerald-400' : 'text-red-400'}`}> {score.total}%</span>
          <span className="text-gray-400"> / 50%</span>
        </div>
      </div>
    </div>
  );
};


const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, score, round, clicksRemaining, isMuted, isMusicSetup, onStart, onNextRound, onToggleMute }) => {
  const VolumeUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
  
  const VolumeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l4-4m0 0l-4-4m4 4l-4 4" />
    </svg>
  );

  const renderCenteredContent = () => {
    switch (gameState) {
      case GameState.Idle:
        return (
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 text-white drop-shadow-lg">Memorhythm</h1>
            <p className="text-xl text-gray-300 mb-8">Test your memory and sense of rhythm.</p>
            <UIButton onClick={onStart}>Start Game</UIButton>
          </div>
        );
      case GameState.Playback:
        return (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white animate-pulse">Watch Carefully...</h2>
          </div>
        );
      case GameState.PlayerTurn:
        return (
          <div className="text-center">
            <h2 className="text-5xl font-bold text-emerald-400">Your Turn!</h2>
          </div>
        );
      case GameState.Calculating:
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-400 mx-auto mb-6"></div>
            <h2 className="text-3xl font-bold text-white">Calculating...</h2>
          </div>
        );
      case GameState.Scoring:
        const failed = score && (score.total < 50 || score.position < 30 || score.rhythm < 30);
        return (
          <div className="flex flex-col items-center space-y-8">
            {score && <ScoreDisplay score={score} />}
            <UIButton onClick={onNextRound}>
              {failed ? 'Restart from Round 1' : 'Next Round'}
            </UIButton>
          </div>
        );
      default:
        return null;
    }
  };

  const isInteractive = gameState === GameState.Idle || gameState === GameState.Scoring;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left Mute button */}
      {isMusicSetup && (
        <div className="absolute top-5 left-5 pointer-events-auto">
            <button
            onClick={onToggleMute}
            className="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-3 rounded-full text-white shadow-lg hover:bg-gray-700 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </button>
        </div>
      )}

      {/* Top-right HUD for round/clicks info */}
      {(gameState === GameState.Playback || gameState === GameState.PlayerTurn) && (
        <div className="absolute top-5 right-5 bg-gray-800 bg-opacity-70 backdrop-blur-sm p-4 rounded-xl shadow-lg pointer-events-auto flex items-center space-x-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Round</div>
            <div className="text-3xl font-bold text-white">{round}</div>
          </div>
          {gameState === GameState.PlayerTurn && (
            <>
              <div className="h-10 border-l border-gray-600"></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Clicks Left</div>
                <div className="text-3xl font-bold text-white">{clicksRemaining}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Centered UI for major state changes */}
      <div className="w-full h-full flex items-center justify-center">
        <div className={`p-4 ${isInteractive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {renderCenteredContent()}
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
