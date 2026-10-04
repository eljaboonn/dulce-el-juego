import * as THREE from 'three';
import type { HeightmapData, TerrainOptions } from './types';

/**
 * Responsibility: turn elevation data into a THREE.BufferGeometry.
 * Pure function of its inputs; no I/O, no scene mutation.
 * Real terrain is asymmetric: X and Z extents are independent and elevation
 * comes straight from the data, never from a symmetric procedural formula.
 */
export class TerrainMeshBuilder {
  build(data: HeightmapData, opts: TerrainOptions): THREE.BufferGeometry {
    const step = Math.max(1, Math.floor(opts.sampleStep));
    const cols = Math.floor((data.width - 1) / step) + 1;
    const rows = Math.floor((data.height - 1) / step) + 1;

    const positions = new Float32Array(cols * rows * 3);
    const uvs = new Float32Array(cols * rows * 2);
    // Uint32 indices: large terrains exceed 65k vertices.
    const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);

    let p = 0;
    let u = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = Math.min(c * step, data.width - 1);
        const sz = Math.min(r * step, data.height - 1);
        const elev = data.elevations[sz * data.width + sx] * opts.heightScale;
        const fx = c / (cols - 1);
        const fz = r / (rows - 1);
        positions[p++] = (fx - 0.5) * opts.worldSizeX;
        positions[p++] = elev;
        positions[p++] = (fz - 0.5) * opts.worldSizeZ;
        uvs[u++] = fx;
        uvs[u++] = fz;
      }
    }

    let i = 0;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        indices[i++] = a; indices[i++] = d; indices[i++] = b;
        indices[i++] = b; indices[i++] = d; indices[i++] = e;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }
}
