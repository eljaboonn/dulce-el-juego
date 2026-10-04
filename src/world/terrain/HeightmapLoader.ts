import type { HeightmapData } from './types';

/** Strategy interface: one implementation per source format. */
export interface HeightmapParser {
  canParse(url: string): boolean;
  parse(buffer: ArrayBuffer): Promise<HeightmapData> | HeightmapData;
}

/**
 * Responsibility: fetch bytes and delegate to the right parser.
 * Does NOT build geometry. Register parsers (PNG16, raw .r16, GeoTIFF, SRTM .hgt)
 * via `register` without modifying this class.
 */
export class HeightmapLoader {
  private parsers: HeightmapParser[] = [];

  register(parser: HeightmapParser): this {
    this.parsers.push(parser);
    return this;
  }

  async load(url: string): Promise<HeightmapData> {
    const parser = this.parsers.find((p) => p.canParse(url));
    if (!parser) throw new Error(`No heightmap parser registered for: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Heightmap fetch failed (${res.status}): ${url}`);
    return parser.parse(await res.arrayBuffer());
  }
}
