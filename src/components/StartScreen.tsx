import React from 'react';
import { Play, Sparkles, Crosshair, ShieldCheck, Upload, Shield } from 'lucide-react';

interface StartScreenProps {
  onStartGame: () => void;
  onOpenCustomModel: () => void;
  hasCustomModel: boolean;
  modelName: string;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  onOpenCustomModel,
  hasCustomModel,
  modelName,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#1c0824]/90 via-[#0e0214]/40 to-[#1c0824]/90 backdrop-blur-[2px] text-white select-none">
      {/* Top Brand / Title */}
      <div className="flex flex-col items-center text-center mt-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-400/50 bg-pink-950/60 text-xs font-bold text-pink-300 tracking-wider mb-2 shadow-[0_0_15px_rgba(244,114,182,0.4)]">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>SUPERVIVENCIA EN EL APOCALIPSIS DULCE</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 tracking-tight drop-shadow-[0_4px_14px_rgba(244,63,94,0.7)] leading-tight">
          CANDY APOCALYPSE
        </h1>
        <p className="text-sm font-semibold text-pink-200/90 tracking-wide mt-0.5">
          Pastel Zombie Hunt
        </p>
      </div>

      {/* Center Features Card */}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto w-full my-auto">
        {/* Custom 3D Model Option Button */}
        <button
          onClick={onOpenCustomModel}
          className="p-3 rounded-2xl bg-gradient-to-r from-pink-950/80 to-purple-950/80 border-2 border-pink-400/50 hover:border-pink-300 flex items-center justify-between shadow-lg active:scale-98 transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-600/30 border border-pink-400 flex items-center justify-center text-pink-300 shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {hasCustomModel ? 'Mi Modelo 3D (.glb)' : '¿Tienes tu propio Modelo 3D?'}
              </span>
              <span className="text-[10px] text-pink-200/70 block mt-0.5">
                {hasCustomModel ? `Cargado: ${modelName}` : 'Carga tu archivo .glb o .gltf aquí'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-600 text-white shadow-xs">
            {hasCustomModel ? 'AJUSTAR' : 'CARGAR'}
          </span>
        </button>

        {/* Combat Controls Card */}
        <div className="p-3 rounded-2xl bg-white/5 border border-pink-500/30 flex items-start gap-2.5 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-pink-900/60 border border-pink-400/40 flex items-center justify-center shrink-0">
            <Crosshair className="w-4 h-4 text-pink-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-pink-200">Rifle y Machete Tácticos</h3>
            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
              Rifle en manos y machete en cadera. Al cambiar, el rifle pasa a la espalda y el machete a la mano para combate cuerpo a cuerpo.
            </p>
          </div>
        </div>

        {/* Blue Armor Card */}
        <div className="p-3 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-start gap-2.5 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-cyan-200">Barra Azul de Armadura</h3>
            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
              Absorbe el daño primero y desaparece al agotarse. ¡Recupérala con golosinas y subidas de nivel!
            </p>
          </div>
        </div>

        {/* Candy Ability Indicator Card */}
        <div className="p-3 rounded-2xl bg-white/5 border border-amber-500/30 flex items-start gap-2.5 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-amber-900/50 border border-amber-400/40 flex items-center justify-center shrink-0 text-base">
            🍬
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-200">Medidor Dulce de Habilidad</h3>
            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
              El dulce junto a tu vida gira más rápido conforme eliminas enemigos. Al llegar a su máxima velocidad, ¡activa el estallido especial!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Start Button */}
      <div className="flex flex-col items-center gap-2 mb-2">
        <button
          onClick={onStartGame}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white font-black text-base tracking-wider flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(244,63,94,0.7)] active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          ¡INICIAR CACERÍA!
        </button>

        <span className="text-[10px] text-pink-300/70">
          Usa el joystick y botón de acción en móvil · Teclado: WASD + Espacio
        </span>
      </div>
    </div>
  );
};
