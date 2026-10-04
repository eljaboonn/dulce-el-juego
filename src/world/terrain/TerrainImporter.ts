import * as THREE from 'three';
import { HeightmapLoader } from './HeightmapLoader';
import { TerrainMeshBuilder } from './TerrainMeshBuilder';
import { DEFAULT_TERRAIN_OPTIONS, type HeightmapData, type TerrainOptions } from './types';

/**
 * Orchestrates heightmap -> terrain mesh. Single responsibility: coordination.
 * Reading is delegated to HeightmapLoader, geometry to TerrainMeshBuilder,
 * so each can be swapped or tested independently.
 *
 * TODO (next steps): register real parsers (16-bit PNG, SRTM .hgt, GeoTIFF),
 * chunked streaming + LOD for the open world, material/splat-map assignment.
 */
export class TerrainImporter {
  constructor(
    private readonly loader: HeightmapLoader = new HeightmapLoader(),
    private readonly builder: TerrainMeshBuilder = new TerrainMeshBuilder(),
  ) {}

  /** Load a heightmap file and return a ready-to-add terrain mesh. */
  async import(
    url: string,
    material: THREE.Material,
    options: Partial<TerrainOptions> = {},
  ): Promise<THREE.Mesh> {
    const data = await this.loader.load(url);
    return this.fromData(data, material, options);
  }

  /** Build a mesh from already-decoded elevation data (useful for tests/procedural input). */
  fromData(
    data: HeightmapData,
    material: THREE.Material,
    options: Partial<TerrainOptions> = {},
  ): THREE.Mesh {
    this.validate(data);
    const opts = { ...DEFAULT_TERRAIN_OPTIONS, ...options };
    const mesh = new THREE.Mesh(this.builder.build(data, opts), material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; // terrain is static
    mesh.updateMatrix();
    return mesh;
  }

  private validate(data: HeightmapData): void {
    if (data.width < 2 || data.height < 2) throw new Error('Heightmap must be at least 2x2');
    if (data.elevations.length !== data.width * data.height) {
      throw new Error('Heightmap elevations length does not match width*height');
    }
  }
}
