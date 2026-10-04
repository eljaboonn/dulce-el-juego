using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace MotorcityRollPatrol.Editor
{
    /// <summary>
    /// Aplica de forma idempotente la configuración de rendimiento / Android.
    /// Se ejecuta al abrir el proyecto y desde el menú Tools > Motorcity Roll Patrol.
    /// </summary>
    [InitializeOnLoad]
    public static class ProjectBootstrap
    {
        private const string UrpAssetPath = "Assets/_Project/Settings/URP_Mobile.asset";

        static ProjectBootstrap()
        {
            EditorApplication.delayCall += Apply;
        }

        [MenuItem("Tools/Motorcity Roll Patrol/Apply Performance + Android Settings")]
        public static void Apply()
        {
            ApplyUrp();
            ApplyPlayerSettings();
            ApplyAndroid();
            AssetDatabase.SaveAssets();
            Debug.Log("[ProjectBootstrap] Configuración de rendimiento y Android aplicada.");
        }

        private static void ApplyUrp()
        {
            var urp = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(UrpAssetPath);
            if (urp == null)
            {
                urp = UniversalRenderPipelineAsset.Create();
                AssetDatabase.CreateAsset(urp, UrpAssetPath);
            }

            urp.supportsHDR = false;
            urp.msaaSampleCount = 1;                  // sin MSAA
            urp.renderScale = 0.85f;
            urp.shadowDistance = 40f;
            urp.shadowCascadeCount = 1;
            urp.supportsCameraDepthTexture = false;
            urp.supportsCameraOpaqueTexture = false;
            urp.useSRPBatcher = true;
            urp.supportsDynamicBatching = false;      // SRP Batcher lo sustituye
            EditorUtility.SetDirty(urp);

            GraphicsSettings.defaultRenderPipeline = urp;
            // Todos los niveles de calidad usan el mismo asset URP ligero.
            int current = QualitySettings.GetQualityLevel();
            for (int i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = urp;
            }
            QualitySettings.SetQualityLevel(current, false);
        }

        private static void ApplyPlayerSettings()
        {
            PlayerSettings.colorSpace = ColorSpace.Gamma;        // más barato en GPU móvil
            PlayerSettings.gpuSkinning = true;
            PlayerSettings.stripUnusedMeshComponents = true;
            PlayerSettings.MTRendering = true;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android,
                new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
        }

        private static void ApplyAndroid()
        {
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
            EditorUserBuildSettings.buildAppBundle = true;                 // .aab para Play Store
            EditorUserBuildSettings.androidBuildType = AndroidBuildType.Release;

            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.Android, ManagedStrippingLevel.High);
            PlayerSettings.SetIncrementalGCEnabled(true);
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.Android.optimizedFramePacing = true;
            EditorUserBuildSettings.androidBuildSubtarget = MobileTextureSubtarget.ASTC;
            PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "com.motorcityrollpatrol.game");
            PlayerSettings.productName = "Motorcity Roll Patrol";
        }
    }
}
