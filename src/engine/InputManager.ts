import { MagneticKeyboardConfig, InputTelemetry } from '../types/game';

export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'pause';

type ActionCallback = (action: InputAction, latencyUs: number) => void;

export class InputManager {
  private config: MagneticKeyboardConfig = {
    actuationDistanceMm: 0.2,
    rapidTriggerSensitivityMm: 0.1,
    pollingRateHz: 8000,
    highPrecisionTiming: true,
    laneSwitchSpeed: 3,
    soundVolume: 0.5,
  };

  private callbacks: Set<ActionCallback> = new Set();
  private isListening: boolean = false;
  private keyStates: Map<string, { isDown: boolean; pressTimestamp: number }> = new Map();
  private eventTimestamps: number[] = [];
  private totalInputs: number = 0;
  private rapidTriggerCount: number = 0;
  private lastLatencyUs: number = 125; // default 125us (8000Hz period)
  private lastKey: string = '-';

  constructor(initialConfig?: Partial<MagneticKeyboardConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  public setConfig(newConfig: Partial<MagneticKeyboardConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): MagneticKeyboardConfig {
    return { ...this.config };
  }

  public onAction(cb: ActionCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public startListening() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, { passive: false, capture: true });
    window.addEventListener('keyup', this.handleKeyUp, { passive: true, capture: true });
  }

  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Microsecond timing via performance.now()
    const now = performance.now();
    const code = e.code;
    this.lastKey = code;

    // Filter repeated keydown events caused by OS auto-repeat
    // Rapid trigger works on mechanical actuation, not OS repeat delays
    const keyRecord = this.keyStates.get(code);
    if (e.repeat || (keyRecord && keyRecord.isDown)) {
      return;
    }

    // Record key press
    this.keyStates.set(code, { isDown: true, pressTimestamp: now });

    // Track polling rate interval
    this.recordEventTimestamp(now);
    this.totalInputs++;

    // Calculate theoretical latency based on actuation distance & polling rate
    // 8000Hz = 0.125ms = 125us base period
    const pollingIntervalUs = (1000 / this.config.pollingRateHz) * 1000;
    // Travel latency = actuationDistance * travelTimeFactor
    const travelLatencyUs = this.config.actuationDistanceMm * 200;
    this.lastLatencyUs = Math.round(pollingIntervalUs + travelLatencyUs);

    const action = this.mapCodeToAction(code);
    if (action) {
      // Prevent default page scrolling for Arrow keys / Space
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
      this.dispatchAction(action, this.lastLatencyUs);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const now = performance.now();
    const code = e.code;
    const record = this.keyStates.get(code);

    if (record && record.isDown) {
      // Key release - rapid trigger resets actuation immediately!
      this.rapidTriggerCount++;
      this.recordEventTimestamp(now);
      this.keyStates.set(code, { isDown: false, pressTimestamp: now });
    }
  };

  public triggerAction(action: InputAction) {
    const now = performance.now();
    this.recordEventTimestamp(now);
    this.totalInputs++;
    this.dispatchAction(action, this.lastLatencyUs);
  }

  private dispatchAction(action: InputAction, latencyUs: number) {
    for (const cb of this.callbacks) {
      cb(action, latencyUs);
    }
  }

  private mapCodeToAction(code: string): InputAction | null {
    switch (code) {
      case 'KeyA':
      case 'ArrowLeft':
        return 'left';
      case 'KeyD':
      case 'ArrowRight':
        return 'right';
      case 'KeyW':
      case 'ArrowUp':
      case 'Space':
        return 'jump';
      case 'KeyS':
      case 'ArrowDown':
        return 'slide';
      case 'Escape':
      case 'KeyP':
        return 'pause';
      default:
        return null;
    }
  }

  private recordEventTimestamp(now: number) {
    this.eventTimestamps.push(now);
    // Keep only last 20 timestamps for polling rate calculation
    if (this.eventTimestamps.length > 20) {
      this.eventTimestamps.shift();
    }
  }

  public getTelemetry(fps: number, frameTimeMs: number): InputTelemetry {
    let estimatedHz = this.config.pollingRateHz;
    if (this.eventTimestamps.length >= 2) {
      const deltas: number[] = [];
      for (let i = 1; i < this.eventTimestamps.length; i++) {
        const delta = this.eventTimestamps[i] - this.eventTimestamps[i - 1];
        if (delta > 0.05 && delta < 50) {
          deltas.push(delta);
        }
      }
      if (deltas.length > 0) {
        const minDeltaMs = Math.min(...deltas);
        estimatedHz = Math.round(1000 / minDeltaMs);
        if (estimatedHz > 8000) estimatedHz = 8000;
      }
    }

    return {
      currentFps: fps,
      frameTimeMs: frameTimeMs,
      lastInputLatencyUs: this.lastLatencyUs,
      estimatedPollingRateHz: Math.max(1000, estimatedHz),
      totalInputsCount: this.totalInputs,
      rapidTriggerEventsCount: this.rapidTriggerCount,
      lastPressedKey: this.lastKey,
    };
  }
}
