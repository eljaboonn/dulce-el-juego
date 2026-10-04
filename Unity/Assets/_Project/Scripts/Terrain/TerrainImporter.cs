using System;
using UnityEngine;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Orquestador: lee (IHeightmapReader) -> remuestrea (HeightmapResampler) -> construye (TerrainBuilder).
    /// No contiene lógica de formato ni de generación; solo coordina los pasos.
    /// Para soportar otro formato basta con otra implementación de IHeightmapReader.
    /// </summary>
    public sealed class TerrainImporter : MonoBehaviour
    {
        [SerializeField] private TerrainImportSettings settings;
        [SerializeField] private bool importOnStart;

        public UnityEngine.Terrain Current { get; private set; }

        private void Start()
        {
            if (importOnStart) Import();
        }

        [ContextMenu("Import Terrain")]
        public void Import()
        {
            if (settings == null || settings.heightmapFile == null)
            {
                Debug.LogError("[TerrainImporter] Falta TerrainImportSettings o su archivo de heightmap.", this);
                return;
            }
            if (!IsPowerOfTwoPlusOne(settings.heightmapResolution))
            {
                Debug.LogError("[TerrainImporter] heightmapResolution debe ser 2^n + 1 (257, 513, 1025...).", this);
                return;
            }

            try
            {
                IHeightmapReader reader = new Raw16HeightmapReader(settings.sourceWidth, settings.sourceHeight);
                HeightmapData data = reader.Read(settings.heightmapFile.bytes);
                float[,] heights = HeightmapResampler.Resample(data, settings.heightmapResolution);

                if (Current != null) Destroy(Current.gameObject);
                Current = TerrainBuilder.Build(heights, settings, "ImportedTerrain");
                Current.transform.SetParent(transform, false);
            }
            catch (Exception e)
            {
                Debug.LogError($"[TerrainImporter] Error al importar: {e.Message}", this);
            }
        }

        private static bool IsPowerOfTwoPlusOne(int value)
        {
            int n = value - 1;
            return n > 1 && (n & (n - 1)) == 0;
        }
    }
}
