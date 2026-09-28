/**
 * Candy Apocalypse: Pastel Zombie Hunt
 * Main Application Component
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameHUD } from './components/GameHUD';
import { VirtualJoystick } from './components/VirtualJoystick';
import { UpgradeModal } from './components/UpgradeModal';
import { GameOverModal } from './components/GameOverModal';
import { StartScreen } from './components/StartScreen';
import { CustomModelModal } from './components/CustomModelModal';
import { DamageNumber, GameState, PlayerStats, RadarBlip, UpgradeOption, WeaponInfo, WeaponType } from './types/game';
import { soundEngine } from './game/audio';
import {
  deleteCustomModelFromDB,
  loadCustomModelFromDB,
  loadModelConfig,
  saveCustomModelToDB,
  saveModelConfig,
  StoredModelConfig,
} from './utils/modelStorage';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game UI States
  const [gameState, setGameState] = useState<GameState>('START');
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreenFrame, setIsFullscreenFrame] = useState(false);

  // Custom 3D Model State
  const [isCustomModelModalOpen, setIsCustomModelModalOpen] = useState(false);
  const [customModelConfig, setCustomModelConfig] = useState<StoredModelConfig>(loadModelConfig);
  const [hasCustomModel, setHasCustomModel] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);

  // Gameplay Synced Data
  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100,
    speed: 7.2,
    damageMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    critChance: 0.15,
    magnetRange: 5.5,
    candyCoins: 1200,
    totalKills: 0,
    level: 1,
    exp: 0,
    maxExp: 100,
    activeWeapon: 'AMETRALLADORA',
    currentAmmo: 25,
    maxAmmo: 25,
    isReloading: false,
    reloadProgress: 0,
    dashCooldown: 0,
    dashAvailable: true,
    specialMeter: 35,
    specialReady: false,
    combo: 0,
  });

  const [weapons, setWeapons] = useState<WeaponInfo[]>([]);
  const [radarBlips, setRadarBlips] = useState<RadarBlip[]>([]);
  const [playerAngle, setPlayerAngle] = useState(0);
  const [wave, setWave] = useState(1);
  const [levelUpChoiceLevel, setLevelUpChoiceLevel] = useState(1);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);

  // Initialize Three.js Game Engine once mounted
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: (updatedStats) => {
        setStats({ ...updatedStats });
      },
      onWeaponsUpdate: (updatedWeapons) => {
        setWeapons([...updatedWeapons]);
      },
      onRadarUpdate: (blips, angle) => {
        setRadarBlips(blips);
        setPlayerAngle(angle);
      },
      onLevelUp: (newLevel) => {
        setLevelUpChoiceLevel(newLevel);
        setGameState('LEVEL_UP');
        engine.setPaused(true);
      },
      onGameOver: () => {
        setGameState('GAME_OVER');
      },
      onWaveChange: (newWave) => {
        setWave(newWave);
      },
      onAddDamageNumber: (dmg) => {
        setDamageNumbers((prev) => [...prev.slice(-15), dmg]);
      },
    });

    engineRef.current = engine;

    // Check for stored custom model in IndexedDB
    loadCustomModelFromDB().then((stored) => {
      if (stored && stored.buffer) {
        const savedConfig = loadModelConfig();
        engine
          .loadCustomModelFromBuffer(stored.buffer, savedConfig)
          .then((res) => {
            if (res.success) {
              setHasCustomModel(true);
              setUseCustomModel(true);
              setAvailableAnimations(res.animations);
              const calibratedScale = res.appliedScale !== undefined ? res.appliedScale : savedConfig.scale;
              const calibratedYOffset = res.appliedYOffset !== undefined ? res.appliedYOffset : savedConfig.yOffset;
              setCustomModelConfig((prev) => ({
                ...prev,
                modelName: stored.name,
                scale: calibratedScale,
                yOffset: calibratedYOffset,
              }));
            }
          })
          .catch((e) => console.warn('Could not restore custom model:', e));
      }
    });

    // Start in paused state until user clicks Play on StartScreen
    engine.setPaused(true);

    return () => {
      engine.destroy();
    };
  }, []);

  // Cleanup damage numbers
  useEffect(() => {
    if (damageNumbers.length === 0) return;
    const timer = setInterval(() => {
      setDamageNumbers((prev) =>
        prev
          .map((d) => ({ ...d, life: d.life - 0.1 }))
          .filter((d) => d.life > 0)
      );
    }, 100);
    return () => clearInterval(timer);
  }, [damageNumbers.length]);

  // Joystick Input Handler
  const handleJoystickMove = (x: number, y: number) => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.setMoveInput(x, y);
    }
  };

  // Start Game
  const handleStartGame = () => {
    soundEngine.unlock();
    soundEngine.startMusic();
    setGameState('PLAYING');
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
  };

  // Switch Weapon (Metralleta <-> Machete)
  const handleSwitchWeapon = (weapon: WeaponType) => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.switchWeapon(weapon);
    }
  };

  // Combat Action Button (Attack / Shoot)
  const handleAttackStart = () => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.setAttacking(true);
    }
  };

  const handleAttackEnd = () => {
    if (engineRef.current) {
      engineRef.current.setAttacking(false);
    }
  };

  // Manual Reload for Ametralladora
  const handleReload = () => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.reload();
    }
  };

  // Keyboard shortcuts for attacks & weapon switching on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || isPaused) return;

      if (e.code === 'Space' || e.key.toLowerCase() === 'j') {
        handleAttackStart();
      } else if (e.key.toLowerCase() === 'q' || e.key === '1') {
        handleSwitchWeapon(stats.activeWeapon === 'AMETRALLADORA' ? 'MACHETE' : 'AMETRALLADORA');
      } else if (e.key.toLowerCase() === 'r') {
        handleReload();
      } else if (e.key === 'Shift' || e.key.toLowerCase() === 'k') {
        handleDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key.toLowerCase() === 'j') {
        handleAttackEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused, stats.activeWeapon]);

  // Dash Trigger
  const handleDash = () => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.triggerDash();
    }
  };

  // Special / Sugar Rush Trigger
  const handleSpecial = () => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.triggerSpecial();
    }
  };

  // Sound Toggle
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Pause Toggle
  const handleTogglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    if (engineRef.current) {
      engineRef.current.setPaused(next);
    }
  };

  // Upgrade Selection
  const handleSelectUpgrade = (upgrade: UpgradeOption) => {
    if (engineRef.current) {
      upgrade.effect(stats, weapons);
      engineRef.current.applyUpgrade();
      engineRef.current.setPaused(false);
    }
    setGameState('PLAYING');
  };

  // Restart after Game Over
  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
    setGameState('PLAYING');
  };

  // Permanent Shop Upgrades
  const handleUpgradePermanent = (type: 'hp' | 'damage' | 'speed') => {
    if (type === 'hp' && stats.candyCoins >= 300) {
      stats.candyCoins -= 300;
      stats.maxHp += 20;
      stats.hp += 20;
    } else if (type === 'damage' && stats.candyCoins >= 450) {
      stats.candyCoins -= 450;
      stats.damageMultiplier *= 1.15;
    } else if (type === 'speed' && stats.candyCoins >= 250) {
      stats.candyCoins -= 250;
      stats.speed *= 1.12;
    }
    setStats({ ...stats });
    if (engineRef.current) {
      engineRef.current.applyUpgrade(undefined, stats);
    }
  };

  // -------------------------------------------------------------
  // CUSTOM 3D MODEL HANDLERS
  // -------------------------------------------------------------

  const handleLoadCustomModelFile = async (
    file: File
  ): Promise<{ success: boolean; animations: string[]; error?: string }> => {
    if (!engineRef.current) {
      return { success: false, animations: [], error: 'Motor 3D no listo' };
    }

    try {
      const buffer = await file.arrayBuffer();
      const res = await engineRef.current.loadCustomModelFromBuffer(buffer, customModelConfig);

      if (res.success) {
        // Save to IndexedDB for permanence
        await saveCustomModelToDB(buffer, file.name);

        const newConfig = {
          ...customModelConfig,
          modelName: file.name,
          scale: res.appliedScale !== undefined ? res.appliedScale : 1.0,
          yOffset: res.appliedYOffset !== undefined ? res.appliedYOffset : 0.0,
        };
        setCustomModelConfig(newConfig);
        saveModelConfig(newConfig);

        setHasCustomModel(true);
        setUseCustomModel(true);
        setAvailableAnimations(res.animations);
      }
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
      return { success: false, animations: [], error: msg };
    }
  };

  const handleUpdateCustomModelConfig = (partial: Partial<StoredModelConfig>) => {
    const updated = { ...customModelConfig, ...partial };
    setCustomModelConfig(updated);
    saveModelConfig(updated);
    if (engineRef.current) {
      engineRef.current.setCustomModelConfig(updated);
    }
  };

  const handleToggleUseCustomModel = (useCustom: boolean) => {
    setUseCustomModel(useCustom);
    if (engineRef.current) {
      engineRef.current.setUseCustomModel(useCustom);
    }
  };

  const handleDeleteCustomModel = async () => {
    if (engineRef.current) {
      engineRef.current.removeCustomModel();
    }
    await deleteCustomModelFromDB();
    setHasCustomModel(false);
    setUseCustomModel(false);
    setAvailableAnimations([]);
    const resetConfig = { ...customModelConfig, modelName: '' };
    setCustomModelConfig(resetConfig);
    saveModelConfig(resetConfig);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09030c] flex items-center justify-center">
      {/* Background Ambience on Desktop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2d0e38_0%,#09030c_80%)] pointer-events-none" />

      {/* Frame Container (Simulates Portrait Vertical Mobile on Desktop, fills on actual mobile) */}
      <div
        className={`relative transition-all duration-300 overflow-hidden flex flex-col ${
          isFullscreenFrame
            ? 'w-full h-full'
            : 'w-full max-w-[430px] h-full max-h-[890px] rounded-none sm:rounded-[42px] border-0 sm:border-[8px] border-[#221028] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.15)] ring-1 ring-white/10'
        }`}
      >
        {/* Dynamic Island / Speaker Notch (Mobile simulation decorative element) */}
        {!isFullscreenFrame && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black/80 rounded-full z-40 hidden sm:block pointer-events-none shadow-md" />
        )}

        {/* 3D WebGL Canvas Layer */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Damage Numbers in 2D Screen Space */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {damageNumbers.map((dmg) => (
            <div
              key={dmg.id}
              className="absolute font-black tracking-wider transition-transform animate-bounce text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={{
                left: `50%`,
                top: `42%`,
                color: dmg.color,
                opacity: dmg.life,
                transform: `translate(${(dmg.x * 12).toFixed(0)}px, ${(dmg.y * -8).toFixed(0)}px) scale(${dmg.isCrit ? 1.4 : 1})`,
              }}
            >
              {dmg.text}
            </div>
          ))}
        </div>

        {/* In-Game HUD */}
        {gameState !== 'START' && (
          <GameHUD
            stats={stats}
            weapons={weapons}
            radarBlips={radarBlips}
            playerAngle={playerAngle}
            wave={wave}
            isMuted={isMuted}
            isPaused={isPaused}
            onToggleMute={handleToggleMute}
            onTogglePause={handleTogglePause}
            onDash={handleDash}
            onSpecial={handleSpecial}
            onSwitchWeapon={handleSwitchWeapon}
            onAttackStart={handleAttackStart}
            onAttackEnd={handleAttackEnd}
            onReload={handleReload}
            onOpenCustomModelModal={() => setIsCustomModelModalOpen(true)}
            hasCustomModel={hasCustomModel}
            useCustomModel={useCustomModel}
          />
        )}

        {/* Virtual Joystick in the Center ("joystick al centro") with ample clearance */}
        {gameState === 'PLAYING' && !isPaused && (
          <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <VirtualJoystick onMove={handleJoystickMove} size={160} />
          </div>
        )}

        {/* Start Game Screen */}
        {gameState === 'START' && (
          <StartScreen
            onStartGame={handleStartGame}
            onOpenCustomModel={() => setIsCustomModelModalOpen(true)}
            hasCustomModel={hasCustomModel}
            modelName={customModelConfig.modelName}
          />
        )}

        {/* Level Up Perk Modal ("ELIGE UNA GOLOSINA IMPULSADORA DE NIVEL") */}
        {gameState === 'LEVEL_UP' && (
          <UpgradeModal
            level={levelUpChoiceLevel}
            stats={stats}
            weapons={weapons}
            onSelectUpgrade={handleSelectUpgrade}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'GAME_OVER' && (
          <GameOverModal
            coins={stats.candyCoins}
            kills={stats.totalKills}
            wave={wave}
            stats={stats}
            onRestart={handleRestart}
            onUpgradePermanent={handleUpgradePermanent}
          />
        )}

        {/* Custom 3D Model Importer Modal */}
        <CustomModelModal
          isOpen={isCustomModelModalOpen}
          onClose={() => setIsCustomModelModalOpen(false)}
          onLoadModelFile={handleLoadCustomModelFile}
          currentConfig={customModelConfig}
          onUpdateConfig={handleUpdateCustomModelConfig}
          hasCustomModel={hasCustomModel}
          useCustomModel={useCustomModel}
          onToggleUseCustom={handleToggleUseCustomModel}
          onDeleteCustomModel={handleDeleteCustomModel}
          availableAnimations={availableAnimations}
        />

        {/* Fullscreen / Window Toggle (discreet in top desktop corner) */}
        <div className="absolute bottom-2 left-2 z-40 hidden sm:block pointer-events-auto opacity-40 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsFullscreenFrame(!isFullscreenFrame)}
            className="p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white border border-white/20 text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
            title="Alternar Pantalla Completa"
          >
            {isFullscreenFrame ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="text-[9px]">{isFullscreenFrame ? 'Marco' : 'Full'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
