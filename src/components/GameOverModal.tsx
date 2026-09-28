import React, { useState } from 'react';
import { RefreshCw, Trophy, Skull, Coins, Sparkles, Heart, Zap, Crosshair } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface GameOverModalProps {
  coins: number;
  kills: number;
  wave: number;
  stats: PlayerStats;
  onRestart: () => void;
  onUpgradePermanent: (type: 'hp' | 'damage' | 'speed') => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  coins,
  kills,
  wave,
  onRestart,
  onUpgradePermanent,
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'SHOP'>('SUMMARY');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#250d30] via-[#1a0822] to-[#0e0314] rounded-3xl border-2 border-pink-500/70 shadow-[0_12px_45px_rgba(236,72,153,0.5)] p-5 flex flex-col items-center gap-4 text-center">
        {/* Title */}
        <div>
          <div className="w-14 h-14 rounded-full bg-rose-950/80 border-2 border-rose-500/50 flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <Skull className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-md">
            ¡FIN DEL DULCE JUEGO!
          </h2>
          <p className="text-xs text-pink-200/80">
            Los zombies de caramelo te han superado
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex w-full bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'SUMMARY'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-pink-200/60 hover:text-white'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('SHOP')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'SHOP'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-pink-200/60 hover:text-white'
            }`}
          >
            Tienda Dulce
          </button>
        </div>

        {activeTab === 'SUMMARY' ? (
          /* Stats Grid */
          <div className="w-full grid grid-cols-3 gap-2 py-2">
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10">
              <Trophy className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-[10px] text-slate-300">Ola Final</span>
              <span className="text-lg font-black text-white">{wave}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10">
              <Skull className="w-4 h-4 text-rose-400 mb-1" />
              <span className="text-[10px] text-slate-300">Zombies</span>
              <span className="text-lg font-black text-rose-300">{kills}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10">
              <Coins className="w-4 h-4 text-yellow-400 mb-1" />
              <span className="text-[10px] text-slate-300">Monedas</span>
              <span className="text-lg font-black text-yellow-300">{coins}</span>
            </div>
          </div>
        ) : (
          /* Permanent Shop using Candy Coins */
          <div className="w-full flex flex-col gap-2.5 py-1 text-left">
            <div className="flex items-center justify-between text-xs text-yellow-300 font-bold px-1">
              <span>Monedas Disponibles:</span>
              <span>🍬 {coins}</span>
            </div>

            {/* Shop item: Max HP */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">+20 Salud Máxima</div>
                  <div className="text-[10px] text-slate-400">Costo: 300 monedas</div>
                </div>
              </div>
              <button
                onClick={() => onUpgradePermanent('hp')}
                disabled={coins < 300}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-pink-600 disabled:bg-slate-700 text-white"
              >
                Comprar
              </button>
            </div>

            {/* Shop item: Base Damage */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-pink-400" />
                <div>
                  <div className="text-xs font-bold text-white">+15% Daño Base</div>
                  <div className="text-[10px] text-slate-400">Costo: 450 monedas</div>
                </div>
              </div>
              <button
                onClick={() => onUpgradePermanent('damage')}
                disabled={coins < 450}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-pink-600 disabled:bg-slate-700 text-white"
              >
                Comprar
              </button>
            </div>

            {/* Shop item: Speed */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <div>
                  <div className="text-xs font-bold text-white">+12% Velocidad</div>
                  <div className="text-[10px] text-slate-400">Costo: 250 monedas</div>
                </div>
              </div>
              <button
                onClick={() => onUpgradePermanent('speed')}
                disabled={coins < 250}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-pink-600 disabled:bg-slate-700 text-white"
              >
                Comprar
              </button>
            </div>
          </div>
        )}

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(244,63,94,0.6)] active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          VOLVER A JUGAR
        </button>
      </div>
    </div>
  );
};
