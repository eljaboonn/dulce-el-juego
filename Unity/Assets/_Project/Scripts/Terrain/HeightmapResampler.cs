using System;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Remuestrea (bilineal) un heightmap rectangular a la resolución cuadrada 2^n+1
    /// que exige Unity, sin deformar la proporción: el aspecto real se aplica luego
    /// con el tamaño en metros (X/Z) del terreno.
    /// </summary>
    public static class HeightmapResampler
    {
        public static float[,] Resample(HeightmapData source, int targetResolution)
        {
            if (source == null)
                throw new ArgumentNullException(nameof(source));
            if (targetResolution < 2)
                throw new ArgumentOutOfRangeException(nameof(targetResolution));

            var result = new float[targetResolution, targetResolution];
            float xScale = (source.Width - 1) / (float)(targetResolution - 1);
            float zScale = (source.Height - 1) / (float)(targetResolution - 1);

            for (int z = 0; z < targetResolution; z++)
            {
                float srcZ = z * zScale;
                int z0 = (int)srcZ;
                int z1 = Math.Min(z0 + 1, source.Height - 1);
                float tz = srcZ - z0;

                for (int x = 0; x < targetResolution; x++)
                {
                    float srcX = x * xScale;
                    int x0 = (int)srcX;
                    int x1 = Math.Min(x0 + 1, source.Width - 1);
                    float tx = srcX - x0;

                    float top = Lerp(source.Samples[z0, x0], source.Samples[z0, x1], tx);
                    float bottom = Lerp(source.Samples[z1, x0], source.Samples[z1, x1], tx);
                    result[z, x] = Lerp(top, bottom, tz);
                }
            }

            return result;
        }

        private static float Lerp(float a, float b, float t) => a + (b - a) * t;
    }
}
