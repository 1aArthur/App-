import React, { useState } from 'react';
import { InputTelemetry } from '../types/game';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface TelemetryOverlayProps {
  telemetry: InputTelemetry;
  actuationMm: number;
}

export const TelemetryOverlay: React.FC<TelemetryOverlayProps> = ({ telemetry, actuationMm }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-auto font-mono text-xs select-none">
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg shadow-lg overflow-hidden backdrop-blur-xs text-slate-300 w-64">
        {/* Header bar */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-800 cursor-pointer border-b border-slate-700/60"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Telemetria 8000Hz</span>
          </div>
          <button className="text-slate-400 hover:text-white">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Diagnostic Items */}
        {!collapsed && (
          <div className="p-3 space-y-1.5 divide-y divide-slate-800 text-[11px]">
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Taxa de Quadros:</span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {telemetry.currentFps} FPS
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Tempo de Quadro:</span>
              <span className="font-medium text-slate-200 tabular-nums">
                {telemetry.frameTimeMs.toFixed(2)} ms
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Latência Teórica:</span>
              <span className="font-bold text-cyan-300 tabular-nums">
                {telemetry.lastInputLatencyUs} µs ({ (telemetry.lastInputLatencyUs / 1000).toFixed(3) } ms)
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Polling Estimado:</span>
              <span className="font-semibold text-purple-300 tabular-nums">
                {telemetry.estimatedPollingRateHz} Hz
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Ponto de Atuação:</span>
              <span className="font-medium text-amber-300 tabular-nums">
                {actuationMm.toFixed(1)} mm
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Inputs Registrados:</span>
              <span className="font-medium text-slate-200 tabular-nums">
                {telemetry.totalInputsCount}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Última Tecla:</span>
              <span className="font-semibold text-white px-1.5 py-0.5 bg-slate-800 rounded">
                {telemetry.lastPressedKey || 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
