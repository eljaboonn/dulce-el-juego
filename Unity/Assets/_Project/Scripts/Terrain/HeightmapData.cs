using System;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Muestras de elevación normalizadas (0..1) en una rejilla rectangular.
    /// Se indexa como [fila (Z), columna (X)], igual que TerrainData.SetHeights.
    /// Solo contiene datos: no sabe leer archivos ni crear terreno.
    /// </summary>
    public sealed class HeightmapData
    {
        public int Width { get; }
        public int Height { get; }
        public float[,] Samples { get; }

        public HeightmapData(int width, int height, float[,] samples)
        {
            if (width < 2 || height < 2)
                throw new ArgumentException("El heightmap necesita al menos 2x2 muestras.");
            if (samples == null || samples.GetLength(0) != height || samples.GetLength(1) != width)
                throw new ArgumentException("Las dimensiones de 'samples' no coinciden con width/height.");

            Width = width;
            Height = height;
            Samples = samples;
        }
    }
}
