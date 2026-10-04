using UnityEngine;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Parámetros de importación como asset (Datos_Topograficos/Config).
    /// Tamaños en metros: Width (X) y Length (Z) independientes => terreno asimétrico.
    /// </summary>
    [CreateAssetMenu(menuName = "Motorcity Roll Patrol/Terrain Import Settings", fileName = "TerrainImportSettings")]
    public sealed class TerrainImportSettings : ScriptableObject
    {
        [Header("Archivo fuente (.raw 16-bit little-endian)")]
        public TextAsset heightmapFile;
        [Min(2)] public int sourceWidth = 1025;
        [Min(2)] public int sourceHeight = 513;

        [Header("Dimensiones reales en metros")]
        [Min(1f)] public float worldWidth = 4000f;
        [Min(1f)] public float worldLength = 2000f;
        [Min(1f)] public float worldHeight = 600f;

        [Header("Calidad (rendimiento)")]
        [Tooltip("Debe ser 2^n + 1. En móvil usa 257 o 513.")]
        public int heightmapResolution = 513;
        [Tooltip("Más alto = menos triángulos. 5-10 recomendado en móvil.")]
        [Range(1f, 200f)] public float pixelError = 8f;
    }
}
