import React from 'react';
import { PlayerStats, RadarBlip, WeaponInfo, WeaponType } from '../types/game';
import { Volume2, VolumeX, Pause, Play, Upload, Shield, RotateCw } from 'lucide-react';

interface GameHUDProps {
  stats: PlayerStats;
  weapons: WeaponInfo[];
  radarBlips?: RadarBlip[];
  playerAngle?: number;
  wave: number;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onDash: () => void;
  onSpecial: () => void;
  onSwitchWeapon: (weapon: WeaponType) => void;
  onAttackStart: () => void;
  onAttackEnd: () => void;
  onReload: () => void;
  onOpenCustomModelModal: () => void;
  hasCustomModel: boolean;
  useCustomModel: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  wave,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onDash,
  onSpecial,
  onSwitchWeapon,
  onAttackStart,
  onAttackEnd,
  onReload,
  onOpenCustomModelModal,
  hasCustomModel,
  useCustomModel,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  // Blue Armor (Shield) percentage - drops and disappears as damage is sustained!
  const armorPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));

  const isMetralleta = stats.activeWeapon === 'AMETRALLADORA';
  const isMachete = stats.activeWeapon === 'MACHETE';

  // Rotation speed of the ability candy indicator:
  // As the player defeats more enemies (increasing specialMeter), it spins faster!
  // When specialReady (100%), it spins at ultra speed with glowing aura!
  const meterProgress = Math.max(0, Math.min(100, stats.specialMeter));
  const spinSpeedSec = stats.specialReady
    ? 0.35
    : Math.max(0.55, 5.5 - (meterProgress / 100) * 4.8);

  const calculatedScore = stats.totalKills * 125 + stats.candyCoins * 2;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none overflow-hidden font-sans">
      {/* ================= TOP BAR ================= */}
      <div className="flex items-start justify-between w-full z-20 gap-2 sm:gap-4">
        {/* Top-Left: Melting Candy Ability Spinner + Health & Armor Bars + Score Below */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            {/* Melting & Spinning Candy Indicator:
                When it starts spinning, it melts and spills luscious strawberry syrup droplets! */}
            <div className="relative pointer-events-auto">
              <button
                onClick={onSpecial}
                disabled={!stats.specialReady}
                className={`relative w-14 h-14 z-10 transition-transform active:scale-95 cursor-pointer flex items-center justify-center ${
                  stats.specialReady
                    ? 'scale-110 drop-shadow-[0_0_18px_rgba(244,63,94,0.95)]'
                    : 'drop-shadow-md'
                }`}
                title={
                  stats.specialReady
                    ? '¡Habilidad Especial Dulce Lista! Toca para activar'
                    : `Cargando Habilidad: ${Math.round(meterProgress)}% (Gira y se derrite al derrotar enemigos)`
                }
              >
                {/* Outer candy aura pulse when ready */}
                {stats.specialReady && (
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-pink-500 via-yellow-400 to-rose-400 opacity-80 blur-xs animate-ping" />
                )}

                {/* Melting Syrup Wavy Liquid Rim (appears and undulates as candy spins & melts) */}
                <div
                  className="absolute -inset-1 rounded-full pointer-events-none opacity-90 transition-opacity duration-300"
                  style={{
                    animation: stats.specialReady
                      ? 'syrup-ooze 1.2s ease-in-out infinite, syrup-drip-glow 1.5s ease-in-out infinite'
                      : meterProgress > 15
                      ? 'syrup-ooze 2.4s ease-in-out infinite'
                      : 'none',
                    background: stats.specialReady
                      ? 'radial-gradient(circle, rgba(244,63,94,0.4) 40%, rgba(251,113,133,0.8) 75%, rgba(253,224,71,0.6) 100%)'
                      : 'radial-gradient(circle, rgba(244,63,94,0.2) 50%, rgba(244,63,94,0.6) 100%)',
                  }}
                />

                {/* Rotating Peppermint Candy Wheel */}
                <div
                  className={`w-full h-full rounded-full border-2 border-white bg-gradient-to-tr from-pink-600 via-rose-400 to-pink-200 flex items-center justify-center overflow-hidden shadow-lg ${
                    stats.specialReady ? 'ring-2 ring-yellow-300' : ''
                  }`}
                  style={{
                    animation: `spin ${spinSpeedSec}s linear infinite`,
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M50 50 L50 0 A50 50 0 0 1 85 15 Z" fill="#ffffff" />
                    <path d="M50 50 L100 50 A50 50 0 0 1 85 85 Z" fill="#ffffff" />
                    <path d="M50 50 L50 100 A50 50 0 0 1 15 85 Z" fill="#ffffff" />
                    <path d="M50 50 L0 50 A50 50 0 0 1 15 15 Z" fill="#ffffff" />
                    <circle cx="50" cy="50" r="14" fill="#fb7185" />
                    <circle cx="50" cy="50" r="7" fill="#ffffff" />
                  </svg>
                </div>

                {/* Ready badge */}
                {stats.specialReady && (
                  <span className="absolute -top-1 right-0 bg-yellow-400 text-rose-950 text-[7px] font-black px-1 rounded-sm uppercase tracking-tighter shadow-md animate-bounce z-20">
                    ¡LISTA!
                  </span>
                )}
              </button>

              {/* MELTING & DRIPPING SYRUP ANIMATION ("derritiéndose y derramando"):
                  Luscious dripping stalactites of glossy syrup that stretch and drop down! */}
              <div className="absolute top-[75%] left-0 right-0 h-10 pointer-events-none z-10 overflow-visible flex justify-center">
                <svg
                  viewBox="0 0 120 70"
                  className="w-16 h-12 -mt-1 drop-shadow-[0_4px_6px_rgba(244,63,94,0.6)]"
                  style={{
                    filter: stats.specialReady
                      ? 'drop-shadow(0 4px 10px rgba(244,63,94,0.9)) drop-shadow(0 6px 14px rgba(251,191,36,0.7))'
                      : 'drop-shadow(0 3px 5px rgba(244,63,94,0.5))',
                  }}
                >
                  {/* Viscous Melting Base Syrup Glaze clinging to bottom of the candy */}
                  <path
                    d="M15 10 Q30 22 45 15 Q60 26 75 16 Q90 24 105 10 Q110 5 115 10 L115 0 L5 0 Q10 5 15 10 Z"
                    fill={stats.specialReady ? '#f43f5e' : '#fb7185'}
                  />
                  <path
                    d="M20 8 Q35 17 45 12 Q60 20 75 13 Q90 19 100 8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.8"
                  />

                  {/* Drip 1 (Left): Animated Stretching Syrup Bead */}
                  <g style={{ animation: `drip-stretch ${Math.max(0.7, spinSpeedSec * 2.2)}s ease-in-out infinite` }}>
                    <path
                      d="M28 12 C28 20 25 32 30 35 C35 32 32 20 32 12 Z"
                      fill={stats.specialReady ? '#e11d48' : '#f43f5e'}
                    />
                    <circle cx="30" cy="35" r="3.2" fill={stats.specialReady ? '#fb7185' : '#f43f5e'} />
                    <circle cx="29" cy="34" r="1.1" fill="#ffffff" opacity="0.85" />
                  </g>
                  {/* Falling droplet from Drip 1 */}
                  <circle
                    cx="30"
                    cy="36"
                    r="2.5"
                    fill={stats.specialReady ? '#fb7185' : '#f43f5e'}
                    style={{ animation: `drip-fall ${Math.max(0.7, spinSpeedSec * 2.2)}s ease-in infinite` }}
                  />

                  {/* Drip 2 (Center Major Drip): Large Viscous Dripping Syrup Stalactite */}
                  <g style={{ animation: `drip-stretch ${Math.max(0.6, spinSpeedSec * 1.8)}s ease-in-out infinite 0.2s` }}>
                    <path
                      d="M56 14 C56 26 52 44 60 48 C68 44 64 26 64 14 Z"
                      fill={stats.specialReady ? '#e11d48' : '#e11d48'}
                    />
                    <ellipse cx="60" cy="48" rx="4.8" ry="5.2" fill={stats.specialReady ? '#fb7185' : '#f43f5e'} />
                    <ellipse cx="58.5" cy="46.5" rx="1.8" ry="2.2" fill="#ffffff" opacity="0.9" />
                  </g>
                  {/* Big falling droplet from Major Drip */}
                  <circle
                    cx="60"
                    cy="50"
                    r="3.5"
                    fill={stats.specialReady ? '#fb7185' : '#e11d48'}
                    style={{ animation: `drip-fall ${Math.max(0.6, spinSpeedSec * 1.8)}s ease-in infinite 0.2s` }}
                  />

                  {/* Drip 3 (Right Center): Sweet Oozing Syrup Nectar */}
                  <g style={{ animation: `drip-stretch ${Math.max(0.8, spinSpeedSec * 2.5)}s ease-in-out infinite 0.45s` }}>
                    <path
                      d="M84 13 C84 22 81 36 86 40 C91 36 88 22 88 13 Z"
                      fill={stats.specialReady ? '#e11d48' : '#f43f5e'}
                    />
                    <circle cx="86" cy="40" r="3.6" fill={stats.specialReady ? '#fb7185' : '#f43f5e'} />
                    <circle cx="85" cy="38.5" r="1.3" fill="#ffffff" opacity="0.85" />
                  </g>
                  {/* Falling droplet from Drip 3 */}
                  <circle
                    cx="86"
                    cy="42"
                    r="2.8"
                    fill={stats.specialReady ? '#fb7185' : '#f43f5e'}
                    style={{ animation: `drip-fall ${Math.max(0.8, spinSpeedSec * 2.5)}s ease-in infinite 0.45s` }}
                  />

                  {/* Drip 4 (Far Right): Sweet Accent Drop */}
                  <g style={{ animation: `drip-stretch ${Math.max(0.9, spinSpeedSec * 2.8)}s ease-in-out infinite 0.1s` }}>
                    <path
                      d="M102 10 C102 17 100 24 104 27 C108 24 106 17 106 10 Z"
                      fill={stats.specialReady ? '#f43f5e' : '#fb7185'}
                    />
                    <circle cx="104" cy="27" r="2.5" fill={stats.specialReady ? '#fb7185' : '#f43f5e'} />
                  </g>
                </svg>
              </div>
            </div>

            {/* Dual Bars Container: Life (Red) & Armor (Blue) */}
            <div className="flex flex-col gap-1.5 pl-1">
              {/* Health Bar (Red/Pink Frosting Tube) */}
              <div className="relative w-44 sm:w-52 h-6 bg-[#2d0a15] border-2 border-white/95 rounded-full overflow-hidden shadow-[0_2px_10px_rgba(244,63,94,0.4)]">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-pink-500 to-rose-400 rounded-full transition-all duration-200 relative"
                  style={{ width: `${hpPercent}%` }}
                >
                  <div className="absolute top-0.5 left-2 right-2 h-1.5 bg-white/40 rounded-full" />
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white tracking-wider drop-shadow-md">
                  {Math.ceil(stats.hp)} / {stats.maxHp} HP
                </span>
              </div>

              {/* Blue Armor Bar (Armadura Azul que absorbe daño y desaparece al agotarse) */}
              <div className="relative w-40 sm:w-48 h-4 bg-[#08182b] border border-cyan-300/80 rounded-full overflow-hidden shadow-[0_0_8px_rgba(6,182,212,0.4)] ml-1">
                <div
                  className={`h-full bg-gradient-to-r from-blue-700 via-cyan-500 to-sky-300 rounded-full transition-all duration-150 ${
                    stats.shield <= 0 ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{ width: `${armorPercent}%` }}
                >
                  <div className="absolute top-0.5 left-1 right-1 h-1 bg-white/50 rounded-full" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1 text-[9px] font-extrabold text-white tracking-wider drop-shadow-md">
                  <Shield className="w-2.5 h-2.5 text-cyan-300" />
                  <span>
                    {stats.shield > 0
                      ? `ARMADURA: ${Math.ceil(stats.shield)}/${stats.maxShield}`
                      : 'ARMADURA AGOTADA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Meter: Cleanly positioned below the life & armor bar with clear spacing */}
          <div className="flex items-center gap-1.5 ml-16 mt-2 bg-black/75 backdrop-blur-xs px-3.5 py-0.5 rounded-full border border-pink-400/40 w-fit shadow-md">
            <span className="text-[10px] font-black text-pink-300 tracking-wider">SCORE:</span>
            <span className="text-xs font-black text-yellow-300 font-mono tracking-wide drop-shadow-[0_1px_3px_rgba(250,204,21,0.6)]">
              {calculatedScore}
            </span>
            <span className="text-[9px] text-pink-200/70 font-bold">· ☠ {stats.totalKills}</span>
          </div>
        </div>

        {/* Top-Center: Candy Coins Counter (Moved here from bottom to uncrowd the joystick and buttons!) */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-400/60 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <span className="text-sm">🪙</span>
            <span className="font-extrabold text-xs tracking-wider text-white drop-shadow-sm">
              CANDY COINS: <span className="text-yellow-400 font-mono font-black">{stats.candyCoins}</span>
            </span>
          </div>
        </div>

        {/* Top-Right: Wave Info & Spacious Action Controls */}
        <div className="flex flex-col items-end gap-2">
          {/* Wave Badge */}
          <div className="bg-gradient-to-r from-pink-950/85 via-purple-950/85 to-pink-900/85 backdrop-blur-xs px-4 py-1 rounded-full border border-pink-400/50 flex items-center gap-2 shadow-md">
            <span className="text-xs font-black text-pink-200 tracking-wider uppercase">
              OLA {wave}
            </span>
          </div>

          {/* Mobile Coins Badge (when on small screens) */}
          <div className="sm:hidden flex items-center gap-1 bg-black/80 px-2.5 py-0.5 rounded-full border border-amber-400/50 text-[10px] text-yellow-300 font-bold">
            <span>🪙</span>
            <span>{stats.candyCoins}</span>
          </div>

          {/* Controls: 3D Model, Sound, Pause with comfortable spacing (no overcrowding!) */}
          <div className="flex items-center gap-2 pointer-events-auto mt-0.5">
            <button
              onClick={onOpenCustomModelModal}
              className={`py-1 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm ${
                hasCustomModel && useCustomModel
                  ? 'bg-pink-600 border-pink-300 text-white shadow-[0_0_10px_rgba(236,72,153,0.7)]'
                  : 'bg-black/70 hover:bg-black/90 border-pink-400/40 text-pink-300'
              }`}
              title="Cargar o Ajustar Mi Modelo 3D (.glb)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{hasCustomModel ? 'Mi 3D' : '+ 3D'}</span>
            </button>
            <button
              onClick={onToggleMute}
              className="p-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white/90 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Sonido"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
            </button>
            <button
              onClick={onTogglePause}
              className="p-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white/90 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Pausar"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>


      {/* ================= LEVEL / EXP PROGRESS BAR =================
          Smaller, sleeker, and styled in pastel pink as requested */}
      <div className="flex flex-col items-center justify-center w-full px-4 z-10 -mt-1">
        <div className="relative w-48 sm:w-56 h-2 bg-pink-950/40 rounded-full border border-pink-300/40 overflow-hidden shadow-[0_0_6px_rgba(244,114,182,0.3)]">
          <div
            className="h-full bg-gradient-to-r from-pink-200 via-pink-400 to-rose-300 rounded-full transition-all duration-300 relative shadow-[0_0_8px_rgba(244,114,182,0.7)]"
            style={{ width: `${Math.min(100, (stats.exp / stats.maxExp) * 100)}%` }}
          >
            <div className="absolute top-0 left-1 right-1 h-0.5 bg-white/60 rounded-full" />
          </div>
        </div>
        <div className="text-[9px] text-pink-200 font-bold tracking-wide mt-0.5 drop-shadow-sm">
          NIVEL {stats.level} · {stats.exp} / {stats.maxExp} EXP
        </div>
      </div>

      {/* ================= MIDDLE IN-GAME HINTS ================= */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {stats.totalKills === 0 && (
          <div className="bg-black/75 backdrop-blur-xs px-4 py-1.5 rounded-full border border-pink-400/50 text-xs text-pink-200 animate-pulse pointer-events-none shadow-lg text-center max-w-[280px]">
            Usa el joystick para moverte · Presiona el botón de acción para disparar o cortar con el machete
          </div>
        )}
        {isMetralleta && stats.isReloading && (
          <div className="bg-amber-950/85 backdrop-blur-xs px-3.5 py-1 rounded-full border border-amber-400 text-[11px] font-bold text-amber-200 animate-bounce pointer-events-none shadow-lg">
            ¡Recargando rifle! Cambia al Machete para golpes cuerpo a cuerpo
          </div>
        )}
      </div>

      {/* ================= BOTTOM BAR CONTROLS ================= */}
      <div className="flex items-end justify-between w-full z-20 pb-1">
        {/* Bottom-Left: Weapon Slots (Ametralladora & Machete) - Spaced out cleanly */}
        <div className="flex flex-col gap-3 pointer-events-auto pl-2 pb-2">
          {/* Weapon Slot 1: Ametralladora Dulce (Rifle de combate) */}
          <button
            onClick={() => onSwitchWeapon('AMETRALLADORA')}
            className={`relative w-16 h-16 rounded-2xl border-2 p-1.5 flex items-center justify-center transition-all cursor-pointer ${
              isMetralleta
                ? 'border-pink-400 bg-[#280c2e] shadow-[0_0_16px_rgba(244,63,94,0.7)] scale-105 ring-2 ring-pink-300/60'
                : 'border-slate-700 bg-black/60 opacity-60 hover:opacity-90'
            }`}
            title="Equipar Ametralladora (Rifle en manos, Machete en cadera)"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-11 h-11 drop-shadow-md">
                <rect x="10" y="44" width="16" height="5" rx="1.5" fill="#475569" />
                <rect x="24" y="38" width="46" height="14" rx="2" fill="#1e293b" />
                <rect x="26" y="35" width="42" height="3" fill="#ff2b75" />
                <rect x="70" y="42" width="18" height="6" rx="1" fill="#334155" />
                <rect x="85" y="40" width="5" height="10" rx="1" fill="#00e5ff" />
                <path d="M48 52 L45 74 Q43 82 36 84 L33 80 Q39 78 40 72 L43 52 Z" fill="#ff2b75" />
                <path d="M28 52 L22 72 L30 74 L34 52 Z" fill="#0f172a" />
                <rect x="58" y="52" width="6" height="16" rx="2" fill="#0f172a" />
                <rect x="38" y="30" width="14" height="6" rx="1" fill="#334155" />
                <circle cx="45" cy="33" r="1.5" fill="#00e5ff" />
                <polygon points="90,45 96,41 93,45 98,45 93,48 97,52 90,47" fill="#facc15" />
              </svg>
            </div>
            {/* Ammo Badge */}
            <div className="absolute -top-2.5 -right-1 bg-gradient-to-r from-pink-600 to-rose-500 border border-white text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-xs">
              {stats.isReloading ? 'REC...' : `${stats.currentAmmo}/${stats.maxAmmo}`}
            </div>
            {isMetralleta && (
              <span className="absolute -bottom-2 px-1.5 bg-pink-500 text-white text-[7px] font-bold rounded-sm uppercase tracking-tight shadow-xs">
                EN MANOS
              </span>
            )}
          </button>

          {/* Weapon Slot 2: Machete Azucarado */}
          <button
            onClick={() => onSwitchWeapon('MACHETE')}
            className={`relative w-16 h-16 rounded-2xl border-2 p-1.5 flex items-center justify-center transition-all cursor-pointer ${
              isMachete
                ? 'border-pink-400 bg-[#280c2e] shadow-[0_0_16px_rgba(244,63,94,0.7)] scale-105 ring-2 ring-pink-300/60'
                : 'border-slate-700 bg-black/60 opacity-60 hover:opacity-90'
            }`}
            title="Equipar Machete (Machete en mano, Rifle en espalda)"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-11 h-11 -rotate-12 drop-shadow-md">
                <path d="M28 70 L68 22 Q78 18 84 24 Q86 34 76 46 L40 82 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M38 80 L74 44 Q84 32 82 24" stroke="#ff2b75" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M28 70 L18 80 Q14 84 18 88 Q22 92 26 88 L38 78 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                <line x1="22" y1="76" x2="30" y2="84" stroke="#ffffff" strokeWidth="2" />
                <line x1="26" y1="72" x2="34" y2="80" stroke="#ffffff" strokeWidth="2" />
                <polygon points="78,16 80,21 85,21 81,24 83,29 78,26 74,29 76,24 71,21 76,21" fill="#facc15" />
              </svg>
            </div>
            <div className="absolute -top-2.5 -right-1 bg-emerald-600 border border-white text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-xs">
              MELEE
            </div>
            {isMachete && (
              <span className="absolute -bottom-2 px-1.5 bg-pink-500 text-white text-[7px] font-bold rounded-sm uppercase tracking-tight shadow-xs">
                EN MANO
              </span>
            )}
          </button>
        </div>

        {/* Center Area: Completely clear to give the Virtual Joystick unobstructed room! */}
        <div className="flex-1 pointer-events-none" />

        {/* Bottom-Right: Spacious Action Controls (No crowding!) */}
        <div className="flex flex-col items-end gap-3.5 pointer-events-auto pr-2 pb-2">
          {/* Secondary Row: Reload, Special Candy & Dash Buttons cleanly spaced */}
          <div className="flex items-center gap-3">
            {/* Manual Reload button for Ametralladora */}
            {isMetralleta && (
              <button
                onClick={onReload}
                disabled={stats.isReloading || stats.currentAmmo >= stats.maxAmmo}
                className={`p-2.5 rounded-full border border-pink-400/60 bg-black/75 text-pink-300 shadow-md active:scale-95 transition-all cursor-pointer ${
                  stats.isReloading || stats.currentAmmo >= stats.maxAmmo ? 'opacity-40' : 'hover:bg-pink-900/40'
                }`}
                title="Recargar Munición"
              >
                <RotateCw className={`w-4 h-4 ${stats.isReloading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

            {/* Special Ability Button with Melting Candy Icon */}
            <button
              onClick={onSpecial}
              disabled={!stats.specialReady}
              className={`relative w-13 h-13 rounded-full border-2 p-1.5 flex items-center justify-center transition-all cursor-pointer ${
                stats.specialReady
                  ? 'border-yellow-300 bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 shadow-[0_0_22px_rgba(244,63,94,0.95),0_0_32px_rgba(250,204,21,0.7)] scale-105 active:scale-95 animate-pulse'
                  : 'border-pink-900/60 bg-black/70 text-slate-500 opacity-50'
              }`}
              title="Habilidad Especial: Explosión de Dulces"
            >
              {/* Sweet Candy Vector Icon */}
              <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-md">
                <polygon points="12,32 30,50 12,68 18,50" fill={stats.specialReady ? '#facc15' : '#64748b'} />
                <polygon points="88,32 70,50 88,68 82,50" fill={stats.specialReady ? '#facc15' : '#64748b'} />
                <ellipse cx="50" cy="50" rx="24" ry="20" fill={stats.specialReady ? '#f43f5e' : '#475569'} />
                <ellipse cx="50" cy="50" rx="22" ry="18" fill={stats.specialReady ? '#fb7185' : '#334155'} />
                <path d="M42 32 Q50 50 42 68" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.85" />
                <path d="M54 32 Q62 50 54 68" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.85" />
                <circle cx="44" cy="42" r="3" fill="#ffffff" />
              </svg>

              {/* Ready ping badge */}
              {stats.specialReady && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 border border-white flex items-center justify-center text-[8px] font-black text-rose-950">
                  ★
                </div>
              )}
            </button>

            {/* Dash / Evade Button with ample spacing */}
            <button
              onClick={onDash}
              disabled={!stats.dashAvailable}
              className={`relative w-13 h-13 rounded-full border-2 border-white/85 bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer ${
                !stats.dashAvailable ? 'opacity-40 grayscale' : 'hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              }`}
              title="Esquivar (Dash)"
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-none stroke-cyan-300 stroke-2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!stats.dashAvailable && stats.dashCooldown > 0 && (
                <div className="absolute inset-0 rounded-full bg-black/75 flex items-center justify-center font-bold text-[10px] text-white">
                  {stats.dashCooldown.toFixed(1)}s
                </div>
              )}
            </button>
          </div>

          {/* Primary Action Button (Bala cuando tiene Ametralladora, Machete cuando tiene Machete) */}
          <button
            onPointerDown={onAttackStart}
            onPointerUp={onAttackEnd}
            onPointerLeave={onAttackEnd}
            className={`relative w-21 h-21 sm:w-22 sm:h-22 rounded-full border-4 border-white/95 flex flex-col items-center justify-center shadow-[0_8px_24px_rgba(244,63,94,0.7)] active:scale-90 transition-all select-none cursor-pointer ${
              isMetralleta
                ? 'bg-gradient-to-tr from-rose-900 via-pink-600 to-rose-400 ring-2 ring-pink-400/60'
                : 'bg-gradient-to-tr from-emerald-950 via-teal-700 to-emerald-500 ring-2 ring-emerald-400/60'
            }`}
            title={isMetralleta ? 'Disparar Ametralladora' : 'Atacar con Machete'}
          >
            {isMetralleta ? (
              <>
                {/* Bullet (Bala) Vector Icon */}
                <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md -mt-1">
                  <path d="M38 52 L38 82 Q38 86 50 86 Q62 86 62 82 L62 52 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
                  <rect x="36" y="74" width="28" height="3" rx="1" fill="#a16207" />
                  <path d="M38 52 C38 34 44 18 50 14 C56 18 62 34 62 52 Z" fill="#ec4899" stroke="#be185d" strokeWidth="2" />
                  <path d="M43 28 Q46 22 50 20" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
                  <polygon points="50,6 52,11 58,11 53,15 55,20 50,17 45,20 47,15 42,11 48,11" fill="#ffffff" />
                </svg>
                <span className="text-[9px] font-black text-white uppercase tracking-wider -mt-1 drop-shadow-sm">
                  {stats.isReloading ? 'RECARGA' : 'DISPARAR'}
                </span>
                {stats.isReloading && (
                  <div className="absolute inset-0 rounded-full border-4 border-amber-300 border-t-transparent animate-spin pointer-events-none" />
                )}
              </>
            ) : (
              <>
                {/* Machete Vector Icon */}
                <svg viewBox="0 0 100 100" className="w-12 h-12 -rotate-12 drop-shadow-md -mt-1">
                  <path d="M28 70 L68 22 Q78 18 84 24 Q86 34 76 46 L40 82 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <path d="M38 80 L74 44 Q84 32 82 24" stroke="#ff2b75" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M28 70 L18 80 Q14 84 18 88 Q22 92 26 88 L38 78 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                  <polygon points="78,16 80,21 85,21 81,24 83,29 78,26 74,29 76,24 71,21 76,21" fill="#facc15" />
                </svg>
                <span className="text-[9px] font-black text-white uppercase tracking-wider -mt-1 drop-shadow-sm">
                  CORTAR
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
