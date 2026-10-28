import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameMode, PlayerStats, ActivePowerUps, InputTelemetry, MagneticKeyboardConfig } from './types/game';
import { ThreeRunnerScene } from './engine/ThreeRunnerScene';
import { InputManager, InputAction } from './engine/InputManager';
import { sound } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { TelemetryOverlay } from './components/TelemetryOverlay';
import { ControlDock } from './components/ControlDock';
import { InputSettingsModal } from './components/InputSettingsModal';
import { WindowsTauriExporter } from './components/WindowsTauriExporter';
import { registerServiceWorker } from './serviceWorkerRegistration';

export function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeRunnerScene | null>(null);
  const inputManagerRef = useRef<InputManager>(new InputManager());
  const gameModeRef = useRef<GameMode>('idle');

  // Game UI States
  const [gameMode, setGameMode] = useState<GameMode>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExporterOpen, setIsExporterOpen] = useState<boolean>(false);

  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    highScore: 0,
    coins: 0,
    distanceMeters: 0,
    multiplier: 1,
    speed: 28,
  });

  const [powerUps, setPowerUps] = useState<ActivePowerUps>({
    hoverboardRemaining: 0,
    magnetRemaining: 0,
    multiplierRemaining: 0,
  });

  const [telemetry, setTelemetry] = useState<InputTelemetry>({
    currentFps: 144,
    frameTimeMs: 6.94,
    lastInputLatencyUs: 125,
    estimatedPollingRateHz: 8000,
    totalInputsCount: 0,
    rapidTriggerEventsCount: 0,
    lastPressedKey: 'Ready',
  });

  const [config, setConfig] = useState<MagneticKeyboardConfig>(
    inputManagerRef.current.getConfig()
  );

  // Sync gameMode ref
  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('velocity_runner_high_score');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        setStats((prev) => ({ ...prev, highScore: parsed }));
      }
    }
    registerServiceWorker();
  }, []);

  // Dispatch Player Actions
  const handleAction = useCallback((action: InputAction) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (action === 'pause') {
      setGameMode((curr) => {
        if (curr === 'playing') return 'paused';
        if (curr === 'paused') return 'playing';
        return curr;
      });
      return;
    }

    if (gameModeRef.current !== 'playing') {
      if (gameModeRef.current === 'idle' || gameModeRef.current === 'gameover') {
        startGame();
      }
      return;
    }

    switch (action) {
      case 'left':
        scene.shiftLane('left');
        sound.playLaneSwitch();
        break;
      case 'right':
        scene.shiftLane('right');
        sound.playLaneSwitch();
        break;
      case 'jump':
        scene.jump();
        sound.playJump();
        break;
      case 'slide':
        scene.slide();
        sound.playSlide();
        break;
    }
  }, []);

  // Mount 3D Scene and Start Render Loop
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // 1. Initialize Scene
    const scene = new ThreeRunnerScene(canvasMountRef.current);
    sceneRef.current = scene;

    // 2. Setup Callbacks
    scene.setCallbacks({
      onCoinCollect: () => {
        sound.playCoin();
        setStats((prev) => {
          const mult = scene.getActivePowerUps().multiplierRemaining > 0 ? 2 : 1;
          return {
            ...prev,
            coins: prev.coins + 1,
            score: prev.score + 50 * mult,
          };
        });
      },
      onPowerUpCollect: (type: string) => {
        sound.playPowerUp();
      },
      onCrash: () => {
        sound.playCrash();
        setGameMode('gameover');
        setStats((prev) => {
          const finalScore = prev.score;
          if (finalScore > prev.highScore) {
            localStorage.setItem('velocity_runner_high_score', finalScore.toString());
            return { ...prev, highScore: finalScore };
          }
          return prev;
        });
      },
    });

    // 3. Setup Input Manager
    const inputMgr = inputManagerRef.current;
    const unsubscribe = inputMgr.onAction((action) => {
      handleAction(action);
    });
    inputMgr.startListening();

    // 4. Animation and Performance Tracking Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;
    let animId = 0;

    const tick = () => {
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      // Track FPS
      frameCount++;
      if (now - lastFpsUpdate >= 250) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;

        const frameTime = deltaSec * 1000;
        setTelemetry(inputMgr.getTelemetry(currentFps, frameTime));
      }

      // Update 3D scene physics and rendering
      const isPlaying = gameModeRef.current === 'playing';
      const result = scene.update(deltaSec, isPlaying);

      if (isPlaying) {
        const activePU = scene.getActivePowerUps();
        setPowerUps(activePU);

        setStats((prev) => {
          const multiplier = activePU.multiplierRemaining > 0 ? 2 : 1;
          const scoreDelta = Math.floor(result.speed * deltaSec * 5 * multiplier);
          return {
            ...prev,
            score: prev.score + scoreDelta,
            distanceMeters: result.distance,
            speed: result.speed,
            multiplier,
          };
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // 5. Touch / Swipe Gesture Support for Mobile / Tablets
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          if (dx > 0) handleAction('right');
          else handleAction('left');
        } else {
          if (dy < 0) handleAction('jump');
          else handleAction('slide');
        }
      }
    };

    const container = canvasMountRef.current;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      unsubscribe();
      inputMgr.stopListening();
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      scene.destroy();
    };
  }, [handleAction]);

  const startGame = () => {
    if (sceneRef.current) {
      sceneRef.current.reset();
    }
    setStats((prev) => ({
      ...prev,
      score: 0,
      coins: 0,
      distanceMeters: 0,
      multiplier: 1,
      speed: 28,
    }));
    setPowerUps({
      hoverboardRemaining: 0,
      magnetRemaining: 0,
      multiplierRemaining: 0,
    });
    setGameMode('playing');
  };

  const handleTogglePlay = () => {
    if (gameMode === 'idle' || gameMode === 'gameover') {
      startGame();
    } else if (gameMode === 'playing') {
      setGameMode('paused');
    } else if (gameMode === 'paused') {
      setGameMode('playing');
    }
  };

  const handleRestart = () => {
    startGame();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const handleSaveConfig = (newConfig: MagneticKeyboardConfig) => {
    setConfig(newConfig);
    inputManagerRef.current.setConfig(newConfig);
    sound.setVolume(newConfig.soundVolume);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Real-time Telemetry Overlay for 8000Hz Diagnostics */}
      <TelemetryOverlay telemetry={telemetry} actuationMm={config.actuationDistanceMm} />

      {/* Main Game HUD & Menus */}
      <GameHUD
        gameMode={gameMode}
        stats={stats}
        powerUps={powerUps}
        onStart={startGame}
        onResume={() => setGameMode('playing')}
        onRestart={handleRestart}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExporter={() => setIsExporterOpen(true)}
      />

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        gameMode={gameMode}
        isMuted={isMuted}
        onTogglePlay={handleTogglePlay}
        onRestart={handleRestart}
        onToggleMute={handleToggleMute}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExporter={() => setIsExporterOpen(true)}
        onInputAction={handleAction}
      />

      {/* Magnetic Keyboard Calibration Modal */}
      <InputSettingsModal
        config={config}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
      />

      {/* Native Windows Tauri v2 + Rust Project Exporter */}
      <WindowsTauriExporter
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
      />
    </div>
  );
}

export default App;
