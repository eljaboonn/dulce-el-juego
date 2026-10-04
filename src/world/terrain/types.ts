/** Raw elevation grid, row-major, values in metres. */
export interface HeightmapData {
  width: number;
  height: number;
  /** length === width * height */
  elevations: Float32Array;
}

export interface TerrainOptions {
  /** World size in metres along X and Z. */
  worldSizeX: number;
  worldSizeZ: number;
  /** Multiplier applied to elevations (vertical exaggeration). */
  heightScale: number;
  /** Take every Nth sample when building the mesh (LOD / budget control). */
  sampleStep: number;
}

export const DEFAULT_TERRAIN_OPTIONS: TerrainOptions = {
  worldSizeX: 1000,
  worldSizeZ: 1000,
  heightScale: 1,
  sampleStep: 4,
};
