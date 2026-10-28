import React, { useState, useEffect } from 'react';
import { MagneticKeyboardConfig } from '../types/game';
import { X, Sliders, Volume2, Cpu, Check } from 'lucide-react';

interface InputSettingsModalProps {
  config: MagneticKeyboardConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newConfig: MagneticKeyboardConfig) => void;
}

export const InputSettingsModal: React.FC<InputSettingsModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<MagneticKeyboardConfig>({ ...config });
  const [testTravel, setTestTravel] = useState(0); // 0 to 4mm
  const [isTestPressed, setIsTestPressed] = useState(false);

  useEffect(() => {
    setLocalConfig({ ...config });
  }, [config, isOpen]);

  // Handle live test key presses
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'].includes(e.code)) {
        setIsTestPressed(true);
        setTestTravel(localConfig.actuationDistanceMm + 0.8);
      }
    };

    const onKeyUp = () => {
      setIsTestPressed(false);
      setTestTravel(0);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isOpen, localConfig.actuationDistanceMm]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Calibração de Teclado Magnético</h2>
              <p className="text-xs text-slate-400">
                Ajuste os parâmetros para switches magnéticos (Hall Effect) e 8000Hz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Actuation Point Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-300">Ponto de Atuação (Actuation Point)</span>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">
                {localConfig.actuationDistanceMm.toFixed(2)} mm
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="4.0"
              step="0.05"
              value={localConfig.actuationDistanceMm}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, actuationDistanceMm: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0.10 mm (Ultra-sensível / Instantâneo)</span>
              <span>4.00 mm (Curso completo)</span>
            </div>
          </div>

          {/* Rapid Trigger Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-300">Sensibilidade Rapid Trigger</span>
              <span className="font-mono font-bold text-purple-400 tabular-nums">
                {localConfig.rapidTriggerSensitivityMm.toFixed(2)} mm
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={localConfig.rapidTriggerSensitivityMm}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  rapidTriggerSensitivityMm: parseFloat(e.target.value),
                })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0.05 mm (Reset dinâmico no menor recuo)</span>
              <span>2.00 mm (Mais tolerante)</span>
            </div>
          </div>

          {/* Polling Rate Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Taxa de Polling de Entrada</span>
            <div className="grid grid-cols-4 gap-2">
              {[8000, 4000, 2000, 1000].map((hz) => (
                <button
                  key={hz}
                  type="button"
                  onClick={() => setLocalConfig({ ...localConfig, pollingRateHz: hz })}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                    localConfig.pollingRateHz === hz
                      ? 'bg-cyan-600 border-cyan-400 text-white'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {hz} Hz
                  <span className="block text-[9px] font-normal opacity-80">
                    {(1000 / hz).toFixed(3)}ms
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Switch Actuation Visualizer Bench */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-400">Simulador de Switch Magnético</span>
              <span className="text-slate-400">
                Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-300">A</kbd>,{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-300">D</kbd> ou{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-300">Espaço</kbd>
              </span>
            </div>

            {/* Travel bar */}
            <div className="relative w-full h-8 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center px-3">
              {/* Actuation Line Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
                style={{
                  left: `${(localConfig.actuationDistanceMm / 4.0) * 100}%`,
                }}
              />

              {/* Progress bar representing physical travel */}
              <div
                className={`h-full absolute left-0 top-0 transition-all duration-75 ${
                  testTravel >= localConfig.actuationDistanceMm
                    ? 'bg-emerald-500/40 border-r-2 border-emerald-400'
                    : 'bg-cyan-500/20'
                }`}
                style={{
                  width: `${Math.min(100, (testTravel / 4.0) * 100)}%`,
                }}
              />

              <div className="relative z-20 flex justify-between w-full text-xs font-mono">
                <span className="text-slate-400">0.0 mm</span>
                <span className="font-bold text-white">
                  {isTestPressed ? (
                    <span className="text-emerald-400">ATUADO ({testTravel.toFixed(2)}mm)</span>
                  ) : (
                    <span className="text-slate-500">Repouso (0.0mm)</span>
                  )}
                </span>
                <span className="text-slate-400">4.0 mm</span>
              </div>
            </div>
          </div>

          {/* Sound Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-400" />
                Volume de Efeitos Sonoros
              </span>
              <span className="font-mono text-slate-300">
                {Math.round(localConfig.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.soundVolume}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, soundVolume: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
