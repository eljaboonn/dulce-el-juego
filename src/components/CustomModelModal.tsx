import React, { useRef, useState } from 'react';
import { Upload, X, Check, RotateCw, MoveVertical, Maximize2, Trash2, Eye, Sparkles } from 'lucide-react';
import { StoredModelConfig } from '../utils/modelStorage';

interface CustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadModelFile: (file: File) => Promise<{ success: boolean; animations: string[]; error?: string }>;
  currentConfig: StoredModelConfig;
  onUpdateConfig: (config: Partial<StoredModelConfig>) => void;
  hasCustomModel: boolean;
  useCustomModel: boolean;
  onToggleUseCustom: (useCustom: boolean) => void;
  onDeleteCustomModel: () => void;
  availableAnimations: string[];
}

export const CustomModelModal: React.FC<CustomModelModalProps> = ({
  isOpen,
  onClose,
  onLoadModelFile,
  currentConfig,
  onUpdateConfig,
  hasCustomModel,
  useCustomModel,
  onToggleUseCustom,
  onDeleteCustomModel,
  availableAnimations,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      setErrorMessage('Por favor selecciona un archivo con formato .glb o .gltf');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await onLoadModelFile(file);
      if (res.success) {
        setSuccessMessage(`¡Modelo "${file.name}" cargado con éxito!`);
      } else {
        setErrorMessage(res.error || 'Error al procesar el archivo 3D');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al cargar';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-fadeIn select-none font-sans">
      <div className="w-full max-w-md max-h-[90vh] bg-gradient-to-b from-[#250d30]/95 via-[#1a0822]/95 to-[#0e0314]/95 rounded-3xl border-2 border-pink-500/70 shadow-[0_12px_45px_rgba(236,72,153,0.5)] p-5 flex flex-col gap-4 text-left overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-500/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-900/60 border border-pink-400/50 flex items-center justify-center text-pink-300">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                Cargar Modelo 3D Personalizado
              </h2>
              <p className="text-[11px] text-pink-200/70">
                Usa tu propio personaje (.glb / .gltf) hecho en Blender, Maya o Mixamo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-pink-400 bg-pink-900/40 scale-[1.02]'
              : 'border-pink-500/40 bg-purple-950/30 hover:bg-purple-950/50 hover:border-pink-400/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            onChange={onFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-pink-600/30 border border-pink-400 flex items-center justify-center text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.4)]">
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div>
            <span className="text-xs font-bold text-white block">
              {loading ? 'Procesando modelo 3D...' : 'Haz clic o arrastra tu archivo .GLB / .GLTF aquí'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Compatible con Blender, Mixamo, VRoid, Sketchfab (guarda texturas incrustadas)
            </span>
          </div>

          {currentConfig.modelName && (
            <div className="mt-1 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[10px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              <span>Modelo activo: {currentConfig.modelName}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Active Toggle Switch */}
        {hasCustomModel && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-pink-400" />
              <div>
                <span className="text-xs font-bold text-white block">Usar Mi Modelo en Partida</span>
                <span className="text-[10px] text-slate-400 block">
                  {useCustomModel ? 'Tu modelo está activo en la arena' : 'Usando modelo predeterminado'}
                </span>
              </div>
            </div>
            <button
              onClick={() => onToggleUseCustom(!useCustomModel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                useCustomModel
                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {useCustomModel ? 'ACTIVO' : 'ACTIVAR'}
            </button>
          </div>
        )}

        {/* Fine-Tuning Controls for Loaded Model */}
        {hasCustomModel && (
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-black/40 border border-pink-500/30">
            <span className="text-xs font-black text-pink-300 uppercase tracking-wider block">
              Ajustes de Escala y Posición
            </span>

            {/* Scale Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-pink-400" />
                  Escala del Modelo:
                </span>
                <span className="font-mono text-pink-300 font-bold">{currentConfig.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={currentConfig.scale}
                onChange={(e) => onUpdateConfig({ scale: parseFloat(e.target.value) })}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onUpdateConfig({ scale: 1.0 })}
                className="mt-1 w-full py-1 text-[10px] font-bold rounded-lg bg-pink-950/70 border border-pink-400/40 text-pink-200 hover:bg-pink-900/60 transition-colors cursor-pointer"
              >
                Restablecer Escala Automática Normalizada (1.00x)
              </button>
            </div>

            {/* Vertical Y Offset Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <MoveVertical className="w-3.5 h-3.5 text-pink-400" />
                  Altura Pies / Suelo (Y):
                </span>
                <span className="font-mono text-pink-300 font-bold">{currentConfig.yOffset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.05"
                value={currentConfig.yOffset}
                onChange={(e) => onUpdateConfig({ yOffset: parseFloat(e.target.value) })}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ yOffset: 0.0 })}
                  className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-pink-950/70 border border-pink-400/40 text-pink-200 hover:bg-pink-900/60 transition-colors cursor-pointer"
                >
                  Pies al Ras del Suelo (Y = 0.0)
                </button>
              </div>
            </div>

            {/* Rotation Y Presets (0, 90, 180, 270) */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 text-pink-400" />
                  Orientación Frontal (Giro Y):
                </span>
                <span className="font-mono text-pink-300 font-bold">{currentConfig.rotY}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => onUpdateConfig({ rotY: deg })}
                    className={`py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      currentConfig.rotY === deg
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Metralleta on custom model */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-xs text-slate-300">Equipar Metralleta Dulce en Manos:</span>
              <button
                onClick={() => onUpdateConfig({ showGun: !currentConfig.showGun })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currentConfig.showGun ? 'bg-pink-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentConfig.showGun ? 'SÍ' : 'NO'}
              </button>
            </div>

            {/* Animations List if detected */}
            {availableAnimations.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-pink-300 block mb-1">
                  Animaciones Detectadas ({availableAnimations.length}):
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {availableAnimations.map((anim, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-400/30 text-[9px] text-pink-200"
                    >
                      {anim}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-pink-500/20">
          {hasCustomModel ? (
            <button
              onClick={onDeleteCustomModel}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar mi modelo</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-500">Sin modelo externo cargado</span>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            Listo / Volver al Juego
          </button>
        </div>
      </div>
    </div>
  );
};
