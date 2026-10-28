export type GameMode = 'idle' | 'playing' | 'paused' | 'gameover';

export type Lane = -1 | 0 | 1; // -1: Left, 0: Center, 1: Right

export type ObstacleType =
  | 'train_static'
  | 'train_moving'
  | 'barrier_low' // Must jump
  | 'barrier_high' // Must slide
  | 'light_pole';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: Lane;
  z: number;
  speedZ: number; // for moving trains
  width: number;
  height: number;
  depth: number;
  passed: boolean;
}

export interface Coin {
  id: number;
  lane: Lane;
  z: number;
  y: number;
  collected: boolean;
}

export type PowerUpType = 'hoverboard' | 'magnet' | 'multiplier2x';

export interface PowerUpItem {
  id: number;
  type: PowerUpType;
  lane: Lane;
  z: number;
  y: number;
  collected: boolean;
}

export interface ActivePowerUps {
  hoverboardRemaining: number;
  magnetRemaining: number;
  multiplierRemaining: number;
}

export interface MagneticKeyboardConfig {
  actuationDistanceMm: number; // e.g. 0.2mm (range 0.1 to 4.0)
  rapidTriggerSensitivityMm: number; // e.g. 0.1mm (range 0.1 to 2.0)
  pollingRateHz: number; // 8000, 4000, 2000, 1000
  highPrecisionTiming: boolean;
  laneSwitchSpeed: number; // 1 to 5 (transition speed)
  soundVolume: number;
}

export interface InputTelemetry {
  currentFps: number;
  frameTimeMs: number;
  lastInputLatencyUs: number; // in microseconds
  estimatedPollingRateHz: number;
  totalInputsCount: number;
  rapidTriggerEventsCount: number;
  lastPressedKey: string;
}

export interface PlayerStats {
  score: number;
  highScore: number;
  coins: number;
  distanceMeters: number;
  multiplier: number;
  speed: number;
}
