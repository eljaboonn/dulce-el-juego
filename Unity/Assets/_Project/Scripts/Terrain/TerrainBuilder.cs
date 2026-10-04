using System;
using UnityEngine;

namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Convierte alturas ya remuestreadas en un GameObject Terrain. No lee archivos.
    /// </summary>
    public static class TerrainBuilder
    {
        public static UnityEngine.Terrain Build(float[,] heights, TerrainImportSettings settings, string name = "Terrain")
        {
            if (heights == null) throw new ArgumentNullException(nameof(heights));
            if (settings == null) throw new ArgumentNullException(nameof(settings));

            int resolution = heights.GetLength(0);
            var data = new TerrainData { heightmapResolution = resolution };
            data.size = new Vector3(settings.worldWidth, settings.worldHeight, settings.worldLength);
            data.SetHeights(0, 0, heights);

            GameObject go = UnityEngine.Terrain.CreateTerrainGameObject(data);
            go.name = name;

            var terrain = go.GetComponent<UnityEngine.Terrain>();
            terrain.heightmapPixelError = settings.pixelError;
            terrain.drawInstanced = true;            // instancing del terreno
            terrain.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return terrain;
        }
    }
}
