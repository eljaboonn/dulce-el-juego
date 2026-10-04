/**
 * Single source of truth for render/performance settings.
 * Tune here instead of scattering magic numbers through the engine.
 */
export const PerformanceConfig = {
  /** MSAA is expensive on mobile fill-rate; resolution scaling is cheaper. */
  antialias: false,
  /** Cap device pixel ratio: DPR 3 phones render 9x pixels for little visual gain. */
  maxPixelRatio: 1.5,
  powerPreference: 'high-performance' as const,
  shadows: {
    enabled: true,
    /** BasicShadowMap is the cheapest; PCFSoft costs extra samples per pixel. */
    type: 'basic' as const,
    mapSize: 1024,
  },
  fogDensity: 0.016,
  /** Frame-rate target; the engine can use it to throttle. */
  targetFps: 60,
} as const;
