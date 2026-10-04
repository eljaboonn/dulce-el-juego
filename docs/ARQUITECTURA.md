# Arquitectura

| Carpeta | Propósito |
|---|---|
| `src/core` | Bucle principal, servicios base (input, tiempo, eventos) |
| `src/config` | Configuración centralizada (`performance.ts`) |
| `src/game` | Motor actual (GameEngine, audio, texturas) |
| `src/world/terrain` | Importación de heightmaps y generación de terreno |
| `src/entities` / `src/systems` | Entidades y sistemas (IA, combate, spawn) |
| `src/components` | UI React (HUD, modales) |
| `public/assets/{models,textures,audio}` | Arte 3D, texturas y audio |
| `scenes` | Definiciones de escena/nivel |
| `data/heightmaps` | Datos topográficos (DEM/SRTM) |
| `ui` | Diseños y recursos de UI |
| `android-config` | Notas y ajustes de compilación Android |
