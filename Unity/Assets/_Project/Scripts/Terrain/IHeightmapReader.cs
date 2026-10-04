namespace MotorcityRollPatrol.Terrain
{
    /// <summary>
    /// Contrato de lectura de elevación. Una implementación por formato
    /// (RAW 16-bit, PNG, GeoTIFF/SRTM convertido, etc.).
    /// </summary>
    public interface IHeightmapReader
    {
        HeightmapData Read(byte[] fileBytes);
    }
}
