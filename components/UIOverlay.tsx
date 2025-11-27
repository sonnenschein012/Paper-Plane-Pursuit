
import React from 'react';
import { COLORS } from '../constants';
import { Difficulty, GamePhase } from '../types';

interface UIOverlayProps {
  score: number;
  gamePhase: GamePhase;
  difficulty: Difficulty;
  onStart: (difficulty: Difficulty) => void;
  onRestart: () => void;
  onBackToMenu: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  score, 
  gamePhase,
  difficulty,
  onStart,
  onRestart,
  onBackToMenu
}) => {
  // Determine text color based on active mode
  const textColor = difficulty === 'HARD' ? COLORS.HARD.TEXT : COLORS.NORMAL.TEXT;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10 font-sans">
      {/* HUD (Only visible when playing or game over) */}
      {gamePhase !== 'MENU' && (
        <div className="flex justify-between items-start animate-fade-in">
          <div className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>
            {score.toLocaleString()}
          </div>
          {/* Difficulty Indicator */}
          <div className="text-sm font-bold tracking-widest uppercase opacity-50" style={{ color: textColor }}>
            {difficulty} MODE
          </div>
        </div>
      )}

      {/* Start Screen (MENU) */}
      {gamePhase === 'MENU' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto">
          <div className="text-center max-w-lg w-full">
            <h1 className="text-6xl font-black mb-2 tracking-tighter" style={{ color: COLORS.NORMAL.PLAYER }}>
              PAPER PLANE
            </h1>
            <h2 className="text-2xl font-bold mb-8 text-gray-400 tracking-widest uppercase">
              Omni Survival
            </h2>
            
            <div className="flex flex-col gap-4 px-8">
              <button
                onClick={() => onStart('NORMAL')}
                className="group relative w-full py-4 text-xl font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg border-2 border-transparent hover:border-current overflow-hidden"
                style={{
                  backgroundColor: COLORS.NORMAL.PLAYER,
                  color: '#FFF',
                }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                NORMAL MODE
                <span className="block text-xs font-medium opacity-70 mt-1">Casual Flight</span>
              </button>

              <button
                onClick={() => onStart('HARD')}
                className="group relative w-full py-4 text-xl font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg border-2 border-transparent hover:border-current overflow-hidden"
                style={{
                  backgroundColor: '#D63031', // Keep red for danger indicator
                  color: '#FFF',
                }}
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                HARD MODE
                <span className="block text-xs font-medium opacity-70 mt-1">Neon Hell • Advanced AI</span>
              </button>
            </div>
            
            <p className="mt-8 text-gray-500 text-sm font-medium">
              Pilot with Mouse • Auto-Fire Active
            </p>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gamePhase === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md pointer-events-auto">
          <div className="text-center animate-bounce-in max-w-md w-full p-8 rounded-2xl bg-white shadow-2xl">
            <h2 className="text-6xl font-black mb-2 tracking-tighter text-red-500">
              CRASHED
            </h2>
            <p className="text-gray-800 text-2xl mb-8 font-bold">SCORE: {score}</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={onRestart}
                className="w-full px-10 py-4 text-xl font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg bg-gray-900 text-white"
              >
                RETRY FLIGHT
              </button>
              
              <button
                onClick={onBackToMenu}
                className="w-full px-10 py-3 text-lg font-bold rounded-full transition-all hover:scale-105 active:scale-95 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
