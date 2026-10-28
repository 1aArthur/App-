import React from 'react';
import { GameMode, ActivePowerUps, PlayerStats } from '../types/game';
import { Play, RotateCcw, Shield, Magnet, Zap, Award, Coins as CoinsIcon, Gauge } from 'lucide-react';

interface GameHUDProps {
  gameMode: GameMode;
  stats: PlayerStats;
  powerUps: ActivePowerUps;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenExporter: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameMode,
  stats,
  powerUps,
  onStart,
  onResume,
  onRestart,
  onOpenSettings,
  onOpenExporter,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar: Clean unboxed stats with tabular numerals */}
      <header className="flex items-center justify-between gap-4 w-full max-w-5xl mx-auto">
        {/* Brand & High Score */}
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wider text-slate-300 uppercase">
            Velocity Runner
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Recorde:</span>
            <span className="font-mono tabular-nums font-semibold text-amber-400">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Current Score & Multiplier */}
        <div className="flex flex-col items-center">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono tabular-nums drop-shadow-md">
            {stats.score.toLocaleString()}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{Math.floor(stats.distanceMeters)}m</span>
            {stats.multiplier > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-cyan-400 flex items-center gap-0.5">
                  <Zap className="w-3 h-3 inline" />
                  {stats.multiplier}x
                </span>
              </>
            )}
          </div>
        </div>

        {/* Coins & Speed */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-lg shadow-sm">
            <CoinsIcon className="w-4 h-4 text-amber-400" />
            <span className="font-mono tabular-nums font-bold text-amber-300 text-sm">
              {stats.coins}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-mono tabular-nums">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span>{Math.round(stats.speed * 3.6)} km/h</span>
          </div>
        </div>
      </header>

      {/* Active Power-Ups Banners (Top Center) */}
      <div className="flex flex-col items-center gap-2 my-auto">
        {powerUps.hoverboardRemaining > 0 && (
          <div className="flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded text-xs shadow-md backdrop-blur-xs">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hoverboard Escudo Ativo</span>
            <span className="font-mono font-bold tabular-nums">
              {powerUps.hoverboardRemaining.toFixed(1)}s
            </span>
          </div>
        )}
        {powerUps.magnetRemaining > 0 && (
          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/40 text-red-300 px-3 py-1 rounded text-xs shadow-md backdrop-blur-xs">
            <Magnet className="w-3.5 h-3.5 text-red-400" />
            <span>Ímã de Moedas Ativo</span>
            <span className="font-mono font-bold tabular-nums">
              {powerUps.magnetRemaining.toFixed(1)}s
            </span>
          </div>
        )}
        {powerUps.multiplierRemaining > 0 && (
          <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/40 text-purple-300 px-3 py-1 rounded text-xs shadow-md backdrop-blur-xs">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Pontuação 2X</span>
            <span className="font-mono font-bold tabular-nums">
              {powerUps.multiplierRemaining.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* Idle / Start Modal Overlay */}
      {gameMode === 'idle' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full mx-4 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl text-center flex flex-col gap-5">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
                Subway Surfers Offline · 8000Hz Edition
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Velocity Runner
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Otimizado para teclados magnéticos de 8000Hz e Rapid Trigger. Desvie de trens, colete moedas e atinja velocidade máxima.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-lg p-3 text-left text-xs text-slate-300 space-y-1.5 border border-slate-700/60 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Esquerda / Direita:</span>
                <span className="text-cyan-300 font-semibold">A / D ou ← / →</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pular Obstáculos:</span>
                <span className="text-cyan-300 font-semibold">W ou ↑ ou Espaço</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rolar por Baixo:</span>
                <span className="text-cyan-300 font-semibold">S ou ↓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pausar:</span>
                <span className="text-cyan-300 font-semibold">ESC ou P</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={onStart}
                className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Corrida
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenSettings}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                >
                  Calibrar 8000Hz
                </button>
                <button
                  onClick={onOpenExporter}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                >
                  Exportar Windows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {gameMode === 'paused' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="max-w-sm w-full mx-4 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl text-center flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Jogo Pausado</h2>
            <p className="text-xs text-slate-400">
              Pressione ESC ou clique abaixo para continuar a corrida nos trilhos.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={onResume}
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={onRestart}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Reiniciar Corrida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameMode === 'gameover' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-xs">
          <div className="max-w-md w-full mx-4 bg-slate-900 border border-red-900/60 rounded-xl p-6 shadow-2xl text-center flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Colisão no Metrô
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Fim de Jogo!
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Pontuação Final</span>
                <span className="text-xl font-bold font-mono text-cyan-300">
                  {stats.score.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Recorde Atual</span>
                <span className="text-xl font-bold font-mono text-amber-300 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  {stats.highScore.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Moedas Coletadas</span>
                <span className="text-lg font-bold font-mono text-yellow-400">
                  {stats.coins}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Distância Percorrida</span>
                <span className="text-lg font-bold font-mono text-slate-200">
                  {Math.floor(stats.distanceMeters)}m
                </span>
              </div>
            </div>

            <button
              onClick={onRestart}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              Jogar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
