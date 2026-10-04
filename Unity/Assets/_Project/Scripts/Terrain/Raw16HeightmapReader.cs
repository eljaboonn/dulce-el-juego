using System;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Lee archivos .raw de 16 bits sin signo (little-endian), p. ej. exportados de
    /// World Machine, Gaea o QGIS. Soporta dimensiones NO cuadradas (terreno asimétrico).
    /// </summary>
    public sealed class Raw16HeightmapReader : IHeightmapReader
    {
        private const int BytesPerSample = 2;
        private readonly int _width;
        private readonly int _height;

        public Raw16HeightmapReader(int width, int height)
        {
            _width = width;
            _height = height;
        }

        public HeightmapData Read(byte[] fileBytes)
        {
            if (fileBytes == null)
                throw new ArgumentNullException(nameof(fileBytes));

            long expected = (long)_width * _height * BytesPerSample;
            if (fileBytes.Length != expected)
                throw new ArgumentException(
                    $"Tamaño RAW inesperado: {fileBytes.Length} bytes, se esperaban {expected} ({_width}x{_height} @16bit).");

            var samples = new float[_height, _width];
            int offset = 0;
            for (int z = 0; z < _height; z++)
            {
                for (int x = 0; x < _width; x++)
                {
                    ushort value = (ushort)(fileBytes[offset] | (fileBytes[offset + 1] << 8));
                    samples[z, x] = value / (float)ushort.MaxValue;
                    offset += BytesPerSample;
                }
            }

            return new HeightmapData(_width, _height, samples);
        }
    }
}
