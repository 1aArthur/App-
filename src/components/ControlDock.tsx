import React, { useState } from 'react';
import { GameMode } from '../types/game';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  FolderArchive,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface ControlDockProps {
  gameMode: GameMode;
  isMuted: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenExporter: () => void;
  onInputAction: (action: 'left' | 'right' | 'jump' | 'slide') => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  gameMode,
  isMuted,
  onTogglePlay,
  onRestart,
  onToggleMute,
  onOpenSettings,
  onOpenExporter,
  onInputAction,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 pointer-events-auto select-none ${
        collapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
      style={{ maxWidth: 'min(940px, 94vw)' }}
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-700/80 border-b-0 rounded-t-lg text-[11px] font-medium text-slate-300 hover:text-white transition-colors backdrop-blur-xs shadow-md"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mostrar Controles</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Ocultar Controles</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 text-slate-200">
        {/* Left: Game Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            {gameMode === 'playing' ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{gameMode === 'idle' ? 'Iniciar' : 'Continuar'}</span>
              </>
            )}
          </button>

          <button
            onClick={onRestart}
            title="Reiniciar Corrida"
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Ativar Som' : 'Silenciar Som'}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>

        {/* Center: Rapid On-screen Triggers for Mobile / Quick Testing */}
        <div className="flex items-center gap-1">
          <button
            onPointerDown={() => onInputAction('left')}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 border border-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            title="Esquerda (A ou ←)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onPointerDown={() => onInputAction('jump')}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 border border-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            title="Pular (W ou ↑ ou Espaço)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onPointerDown={() => onInputAction('slide')}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 border border-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            title="Rolar (S ou ↓)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onPointerDown={() => onInputAction('right')}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 border border-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            title="Direita (D ou →)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Settings and Exporter Modals */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Calibrar</span> 8000Hz
          </button>

          <button
            onClick={onOpenExporter}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-amber-600/40 text-amber-300 rounded-lg text-xs font-medium transition-colors"
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Projeto</span> Windows .EXE
          </button>
        </div>
      </div>
    </div>
  );
};
