import React, { useMemo } from 'react';
import { PlayerStats, UpgradeOption, WeaponInfo } from '../types/game';
import { Zap, Shield, Sparkles, Crosshair, Award, ShoppingBag } from 'lucide-react';

interface UpgradeModalProps {
  level: number;
  stats: PlayerStats;
  weapons: WeaponInfo[];
  onSelectUpgrade: (upgrade: UpgradeOption) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  level,
  stats,
  weapons,
  onSelectUpgrade,
}) => {
  // Generate upgrades with prices scaled by the player's total kills!
  const options = useMemo(() => {
    const kills = stats.totalKills;

    // Price formula: base + (kills * factor)
    const pool: UpgradeOption[] = [
      {
        id: 'gominola_critica',
        title: 'Gominola Crítica',
        description: '+15% probabilidad de golpe crítico dulce y x2.2 de daño crítico',
        icon: 'crit',
        category: 'STAT',
        rarity: 'RARE',
        cost: Math.max(50, 75 + Math.floor(kills * 2.5)),
        effect: (playerStats) => {
          playerStats.critChance = Math.min(0.85, playerStats.critChance + 0.15);
        },
      },
      {
        id: 'calibres_azucarados',
        title: 'Calibres Azucarados',
        description: '+28% daño a la metralleta, +15% cadencia y proyectiles perforantes',
        icon: 'bullet',
        category: 'WEAPON',
        rarity: 'EPIC',
        cost: Math.max(80, 110 + Math.floor(kills * 3.5)),
        effect: (playerStats, weps) => {
          const w = weps.find((item) => item.id === 'AMETRALLADORA');
          if (w) {
            w.damage = Math.round(w.damage * 1.28);
            w.fireRate *= 1.15;
            w.level = Math.min(w.maxLevel, w.level + 1);
          }
        },
      },
      {
        id: 'machete_afilado',
        title: 'Machete Afilado (Filo Dulce)',
        description: '+35% daño cuerpo a cuerpo y arco de corte extendido',
        icon: 'machete',
        category: 'WEAPON',
        rarity: 'RARE',
        cost: Math.max(70, 95 + Math.floor(kills * 3.0)),
        effect: (playerStats, weps) => {
          const w = weps.find((item) => item.id === 'MACHETE');
          if (w) {
            w.damage = Math.round(w.damage * 1.35);
            w.range += 0.6;
            w.level = Math.min(w.maxLevel, w.level + 1);
          }
        },
      },
      {
        id: 'armadura_caramelo',
        title: 'Armadura de Caramelo Reforzada',
        description: 'Recarga el 100% de la barra de armadura azul y +35 armadura máxima',
        icon: 'shield',
        category: 'STAT',
        rarity: 'RARE',
        cost: Math.max(60, 90 + Math.floor(kills * 2.8)),
        effect: (playerStats) => {
          playerStats.maxShield += 35;
          playerStats.shield = playerStats.maxShield;
        },
      },
      {
        id: 'cargador_dulce',
        title: 'Cargador Dulce Ampliado',
        description: '+8 balas de capacidad en la metralleta y 25% recarga más veloz',
        icon: 'bullet',
        category: 'WEAPON',
        rarity: 'COMMON',
        cost: Math.max(45, 65 + Math.floor(kills * 2.0)),
        effect: (playerStats, weps) => {
          playerStats.maxAmmo += 8;
          playerStats.currentAmmo = playerStats.maxAmmo;
          const w = weps.find((item) => item.id === 'AMETRALLADORA');
          if (w && w.maxAmmo) {
            w.maxAmmo += 8;
          }
        },
      },
      {
        id: 'impulso_azucarado',
        title: 'Impulso Azucarado',
        description: '+18% velocidad de movimiento para evadir hordas y +35% imán de monedas',
        icon: 'zap',
        category: 'STAT',
        rarity: 'COMMON',
        cost: Math.max(40, 60 + Math.floor(kills * 2.0)),
        effect: (playerStats) => {
          playerStats.speed *= 1.18;
          playerStats.magnetRange *= 1.35;
        },
      },
    ];

    // Pick 3 random distinct upgrades
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [stats.totalKills, weapons]);

  const getRarityBadge = (rarity: UpgradeOption['rarity']) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'text-amber-400 border-amber-400/60 bg-amber-950/60';
      case 'EPIC':
        return 'text-purple-300 border-purple-400/60 bg-purple-950/60';
      case 'RARE':
        return 'text-sky-300 border-sky-400/60 bg-sky-950/60';
      default:
        return 'text-emerald-300 border-emerald-400/60 bg-emerald-950/60';
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'bullet':
        return (
          <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow">
            <path d="M38 52 L38 82 Q38 86 50 86 Q62 86 62 82 L62 52 Z" fill="#facc15" />
            <path d="M38 52 C38 34 44 18 50 14 C56 18 62 34 62 52 Z" fill="#ec4899" />
          </svg>
        );
      case 'machete':
        return (
          <svg viewBox="0 0 100 100" className="w-6 h-6 -rotate-12 drop-shadow">
            <path d="M28 70 L68 22 Q78 18 84 24 Q86 34 76 46 L40 82 Z" fill="#ffffff" />
            <path d="M38 80 L74 44 Q84 32 82 24" stroke="#ff2b75" strokeWidth="6" fill="none" />
          </svg>
        );
      case 'shield':
        return <Shield className="w-6 h-6 text-cyan-400" />;
      case 'zap':
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'crit':
        return <Crosshair className="w-6 h-6 text-rose-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-pink-400" />;
    }
  };

  const handlePurchase = (option: UpgradeOption) => {
    const cost = option.cost || 0;
    if (stats.candyCoins >= cost) {
      stats.candyCoins -= cost;
    }
    onSelectUpgrade(option);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-gradient-to-b from-[#192b1d] via-[#121f15] to-[#0a140d] rounded-3xl border-2 border-emerald-400/60 shadow-[0_10px_40px_rgba(16,185,129,0.4)] p-5 flex flex-col items-center gap-4 text-center">
        {/* Header - EXACT NAME REQUESTED BY USER */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-emerald-400/50 bg-emerald-950/60 text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1.5 shadow-sm">
            <Award className="w-3 h-3 text-emerald-300" />
            <span>NIVEL {level} COMPLETADO</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-[0_2px_10px_rgba(52,211,153,0.6)] uppercase">
            ELIGE UNA GOLOSINA IMPULSADORA DE NIVEL
          </h2>

          {/* Player Candy Coins & Kills Summary */}
          <div className="flex items-center justify-center gap-3 mt-2 px-3 py-1 rounded-full bg-black/60 border border-emerald-500/30 text-xs">
            <span className="font-extrabold text-amber-300 flex items-center gap-1">
              🪙 {stats.candyCoins} <span className="text-[10px] text-white/80">Monedas</span>
            </span>
            <span className="text-emerald-500">|</span>
            <span className="font-bold text-emerald-200">
              ☠ {stats.totalKills} <span className="text-[10px] text-white/80">Zombies eliminados</span>
            </span>
          </div>
        </div>

        {/* Upgrade / Impulse Cards with Prices based on Kills */}
        <div className="flex flex-col gap-3 w-full">
          {options.map((option) => {
            const cost = option.cost || 0;
            const canAfford = stats.candyCoins >= cost;

            return (
              <button
                key={option.id}
                onClick={() => handlePurchase(option)}
                className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-lg cursor-pointer ${
                  canAfford
                    ? 'bg-emerald-950/40 hover:bg-emerald-800/30 border-emerald-500/40 hover:border-emerald-300'
                    : 'bg-black/40 border-slate-700/60 opacity-75'
                }`}
              >
                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-black/60 border border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  {renderIcon(option.icon)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                      {option.title}
                    </h3>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${getRarityBadge(
                        option.rarity
                      )}`}
                    >
                      {option.rarity}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-tight mb-1.5">
                    {option.description}
                  </p>

                  {/* Price Tag (dependiendo de cuántos enemigos mató el jugador) */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-300/80 font-medium">
                      Precio por bajas (☠ {stats.totalKills}):
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        canAfford
                          ? 'bg-amber-950/80 border-amber-400 text-amber-300'
                          : 'bg-red-950/80 border-red-500 text-red-300'
                      }`}
                    >
                      <span>🪙 {cost}</span>
                      <span className="text-[9px]">{canAfford ? 'COMPRAR' : 'INSUFICIENTE'}</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Free Emergency Treat if short on coins */}
        {options.every((o) => (o.cost || 0) > stats.candyCoins) && (
          <button
            onClick={() =>
              onSelectUpgrade({
                id: 'emergency_armor',
                title: 'Golosina de Emergencia',
                description: '+30 Armadura azul de auxilio',
                icon: 'shield',
                category: 'STAT',
                rarity: 'COMMON',
                effect: (playerStats) => {
                  playerStats.shield = Math.min(playerStats.maxShield, playerStats.shield + 30);
                },
              })
            }
            className="w-full py-2 px-3 rounded-xl bg-cyan-950/80 border border-cyan-400 text-xs font-bold text-cyan-200 hover:bg-cyan-900 cursor-pointer shadow-md"
          >
            Obtener Golosina de Auxilio Gratis (+30 Armadura)
          </button>
        )}
      </div>
    </div>
  );
};
