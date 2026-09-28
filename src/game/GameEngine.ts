import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DamageNumber, EnemyType, PlayerStats, RadarBlip, WeaponInfo, WeaponType } from '../types/game';
import { soundEngine } from './audio';
import {
  createCandyBarkTexture,
  createCharacterFaceTexture,
  createCookieTexture,
  createPeppermintTexture,
  createRainbowFloorTexture,
  createTattooTexture,
  createTealBikiniTexture,
} from './textures';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onWeaponsUpdate: (weapons: WeaponInfo[]) => void;
  onRadarUpdate: (blips: RadarBlip[], playerAngle: number) => void;
  onLevelUp: (newLevel: number) => void;
  onGameOver: (totalCoins: number, kills: number, wave: number) => void;
  onWaveChange: (wave: number) => void;
  onAddDamageNumber: (dmg: DamageNumber) => void;
}

interface EnemyInstance {
  id: string;
  mesh: THREE.Group;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  expValue: number;
  coinValue: number;
  radius: number;
  isBoss?: boolean;
  hitFlashTimer: number;
  materials: THREE.Material[];
  originalColors: THREE.Color[];
  animOffset: number;
}

interface ProjectileInstance {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  pierce: number;
  piercedIds: Set<string>;
  life: number;
  maxLife: number;
  type: WeaponType;
  color: string;
}

interface DropInstance {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  type: 'COIN' | 'EXP' | 'HEART';
  value: number;
  life: number;
  velocity: THREE.Vector3;
}

interface ParticleInstance {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: THREE.Vector3;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;

  // Player & Rig
  private playerGroup: THREE.Group = new THREE.Group();
  private proceduralModelGroup: THREE.Group | null = null;
  private customModelGroup: THREE.Group = new THREE.Group();
  private customModelScene: THREE.Group | null = null;
  private customGunMesh: THREE.Group | null = null;
  private customMacheteMesh: THREE.Group | null = null;
  private customMixer: THREE.AnimationMixer | null = null;
  private customIdleAction: THREE.AnimationAction | null = null;
  private customRunAction: THREE.AnimationAction | null = null;
  private customAttackAction: THREE.AnimationAction | null = null;
  private currentCustomAction: THREE.AnimationAction | null = null;
  private hasEmbeddedClips: boolean = false;
  private customRigBones: {
    rightHand?: THREE.Object3D;
    leftHand?: THREE.Object3D;
    rightForeArm?: THREE.Object3D;
    leftForeArm?: THREE.Object3D;
    rightUpperArm?: THREE.Object3D;
    leftUpperArm?: THREE.Object3D;
    spine?: THREE.Object3D;
    chest?: THREE.Object3D;
    neck?: THREE.Object3D;
    head?: THREE.Object3D;
    hips?: THREE.Object3D;
    rightThigh?: THREE.Object3D;
    leftThigh?: THREE.Object3D;
    rightCalf?: THREE.Object3D;
    leftCalf?: THREE.Object3D;
    rightFoot?: THREE.Object3D;
    leftFoot?: THREE.Object3D;
  } | null = null;
  private useCustomModel: boolean = false;
  private customModelBaseScale: number = 1.0;
  private customModelOriginOffset = {
    rawCenterX: 0,
    rawCenterZ: 0,
    rawMinY: 0,
  };
  private customModelOptions = {
    scale: 1.0,
    yOffset: 0.0,
    rotY: 0,
    showGun: true,
  };
  private playerBodyParts: {
    torso: THREE.Mesh;
    hair: THREE.Mesh;
    skirt: THREE.Mesh;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    head: THREE.Mesh;
  };

  // Weapon Meshes on Procedural Character (both visible: one in hand, one holstered)
  private metralletaMesh: THREE.Group | null = null;
  private macheteMesh: THREE.Group | null = null;

  // Death Animation State
  private isDying: boolean = false;
  private deathTimer: number = 0;
  private readonly deathDuration: number = 2.2;

  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVelocity = new THREE.Vector3(0, 0, 0);
  private targetFacingAngle = 0;
  private currentFacingAngle = 0;
  private isMoving = false;
  private runCycle = 0;
  private dashTimeRemaining = 0;
  private dashDirection = new THREE.Vector3();

  // Attack & Combat state
  private isAttacking = false;
  private attackCooldown = 0;
  private reloadTimer = 0;
  private muzzleFlashMesh: THREE.Mesh | null = null;
  private muzzleFlashTimer: number = 0;

  // Joystick Input Vector (-1 to 1)
  private moveInput = { x: 0, y: 0 };

  // Gameplay State
  private stats: PlayerStats = {
    hp: 100,
    maxHp: 100,
    shield: 100, // Blue Armor bar - absorbs damage first!
    maxShield: 100,
    speed: 7.5,
    damageMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    critChance: 0.15,
    magnetRange: 5.5,
    candyCoins: 1200,
    totalKills: 0,
    level: 1,
    exp: 0,
    maxExp: 100,
    activeWeapon: 'AMETRALLADORA',
    currentAmmo: 30,
    maxAmmo: 30,
    isReloading: false,
    reloadProgress: 0,
    dashCooldown: 0,
    dashAvailable: true,
    specialMeter: 35,
    specialReady: false,
  };

  // Two Weapons: Machete & Ametralladora
  private weapons: WeaponInfo[] = [
    {
      id: 'MACHETE',
      name: 'Machete Azucarado',
      description: 'Golpes cuerpo a cuerpo con corte de área y daño masivo',
      icon: 'machete',
      level: 1,
      maxLevel: 5,
      damage: 85,
      fireRate: 2.0, // attacks/sec
      range: 4.8,
      unlocked: true,
    },
    {
      id: 'AMETRALLADORA',
      name: 'Ametralladora Dulce',
      description: 'Disparos tácticos continuos con munición limitada y recarga',
      icon: 'bullet',
      level: 1,
      maxLevel: 5,
      damage: 32,
      fireRate: 3.8, // slower, heavier, tactical punch
      range: 22,
      projectileSpeed: 30,
      currentAmmo: 25,
      maxAmmo: 25,
      isReloading: false,
      unlocked: true,
    },
  ];

  // Entities
  private enemies: EnemyInstance[] = [];
  private projectiles: ProjectileInstance[] = [];
  private drops: DropInstance[] = [];
  private particles: ParticleInstance[] = [];
  private targetEnemy: EnemyInstance | null = null;
  private targetReticle: THREE.Mesh;

  // Wave & Spawning
  private currentWave = 1;
  private waveTimer = 0;
  private waveDuration = 45; // seconds per wave
  private spawnTimer = 0;
  private isPaused = false;
  private sugarRushTimer = 0;

  // Environment references
  private sceneryDecorations: THREE.Object3D[] = [];
  private floorMesh: THREE.Mesh | null = null;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Setup Three.js Core
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Fog: Soft dreamy pastel cotton-candy plum fog matching reference art!
    this.scene.fog = new THREE.FogExp2('#351242', 0.016);

    const width = container.clientWidth || 390;
    const height = container.clientHeight || 844;
    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 150);
    this.camera.position.set(0, 4.2, 7.5);
    this.camera.lookAt(0, 1.8, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor('#2b0e36'); // Vibrant pastel plum sky
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Build Lighting
    this.setupLighting();

    // Build World & Background (Candy forest, giant spiked lollipops, cookies, volcano cake)
    this.setupEnvironment();

    // Build Player Rig
    const { group, bodyParts } = this.createPlayerCharacter();
    this.proceduralModelGroup = group;
    this.playerBodyParts = bodyParts;
    this.playerGroup.add(this.proceduralModelGroup);
    this.playerGroup.add(this.customModelGroup);
    this.customModelGroup.visible = false;
    this.scene.add(this.playerGroup);

    // Target reticle
    const reticleGeo = new THREE.RingGeometry(0.8, 1.05, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: '#22c55e', // toxic swamp neon green
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.targetReticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.targetReticle.visible = false;
    this.scene.add(this.targetReticle);

    // Initial camera placement (Third person chase perspective)
    this.updateCamera(0.016);

    // Listeners
    window.addEventListener('resize', this.handleResize);

    // Push initial stats
    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onWeaponsUpdate([...this.weapons]);
    this.callbacks.onWaveChange(this.currentWave);

    // Start Loop
    this.animate();
  }

  // Set Move Vector from virtual joystick or keyboard (-1 to 1)
  public setMoveInput(x: number, y: number) {
    this.moveInput.x = Math.max(-1, Math.min(1, x));
    this.moveInput.y = Math.max(-1, Math.min(1, y));
  }

  // Set Attacking state (when user holds/presses the action button)
  public setAttacking(attacking: boolean) {
    this.isAttacking = attacking;
  }

  // Switch between Machete and Ametralladora (Tactical Holstering System)
  public switchWeapon(weaponId: WeaponType) {
    if (this.stats.activeWeapon === weaponId) return;
    this.stats.activeWeapon = weaponId;

    soundEngine.playWeaponSwitch();

    // 1. Procedural Character Weapon Placement
    if (this.metralletaMesh && this.macheteMesh) {
      this.metralletaMesh.visible = true;
      this.macheteMesh.visible = true;

      if (weaponId === 'AMETRALLADORA') {
        // Combat rifle in hands aiming forward
        this.metralletaMesh.position.set(0, 2.25, 0.72);
        this.metralletaMesh.rotation.set(0, 0, 0);

        // Machete holstered at hip / waist (cintura o cadera)
        this.macheteMesh.position.set(0.46, 1.95, -0.05);
        this.macheteMesh.rotation.set(0.3, 0.15, -2.5);
      } else {
        // Machete drawn in right hand ready to strike!
        this.macheteMesh.position.set(0.38, 2.3, 0.65);
        this.macheteMesh.rotation.set(0.45, -0.2, -0.2);

        // Combat rifle slung across back (en la espalda)
        this.metralletaMesh.position.set(-0.06, 2.65, -0.32);
        this.metralletaMesh.rotation.set(-0.35, 0.2, -0.85);
      }
    }

    // 2. Custom GLB Model Weapon Placement
    this.updateCustomWeaponPositions();

    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onWeaponsUpdate([...this.weapons]);
  }

  // Trigger Reload manually or when ammo runs out
  public reload() {
    if (this.stats.isReloading || this.stats.currentAmmo >= this.stats.maxAmmo) return;
    this.startReload();
  }

  private startReload() {
    this.stats.isReloading = true;
    this.reloadTimer = 0;
    this.stats.reloadProgress = 0;
    soundEngine.playReload();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Dash Action
  public triggerDash(): boolean {
    if (!this.stats.dashAvailable || this.dashTimeRemaining > 0) return false;

    if (Math.abs(this.moveInput.x) > 0.1 || Math.abs(this.moveInput.y) > 0.1) {
      this.dashDirection.set(this.moveInput.x, 0, this.moveInput.y).normalize();
    } else {
      this.dashDirection.set(Math.sin(this.currentFacingAngle), 0, Math.cos(this.currentFacingAngle)).normalize();
    }

    this.dashTimeRemaining = 0.22;
    this.stats.dashAvailable = false;
    this.stats.dashCooldown = 2.4;
    soundEngine.playDash();

    this.createDashBurstParticles();
    this.callbacks.onStatsUpdate({ ...this.stats });
    return true;
  }

  // Sugar Rush Ultimate Action
  public triggerSpecial(): boolean {
    if (this.stats.specialMeter < 100) return false;

    this.stats.specialMeter = 0;
    this.stats.specialReady = false;
    this.sugarRushTimer = 6.0;

    soundEngine.playSpecial();

    this.createExplosionParticles(this.playerPos, '#ff2b75', 30);
    this.createExplosionParticles(this.playerPos, '#22c55e', 25);

    this.enemies.forEach((enemy) => {
      const dist = enemy.mesh.position.distanceTo(this.playerPos);
      if (dist < 12) {
        this.damageEnemy(enemy, 110, true);
      }
    });

    this.callbacks.onStatsUpdate({ ...this.stats });
    return true;
  }

  // Upgrade application
  public applyUpgrade(weaponId?: WeaponType, statMod?: Partial<PlayerStats>) {
    if (weaponId) {
      const w = this.weapons.find((item) => item.id === weaponId);
      if (w) {
        w.level = Math.min(w.maxLevel, w.level + 1);
        w.damage = Math.round(w.damage * 1.25);
        w.fireRate *= 1.15;
        if (w.id === 'AMETRALLADORA' && w.maxAmmo) {
          w.maxAmmo += 5;
          this.stats.maxAmmo = w.maxAmmo;
        }
      }
    }

    if (statMod) {
      Object.assign(this.stats, statMod);
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onWeaponsUpdate([...this.weapons]);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      soundEngine.stopMusic();
    } else {
      soundEngine.startMusic();
    }
  }

  public restartGame() {
    this.isDying = false;
    this.deathTimer = 0;

    this.stats.hp = this.stats.maxHp;
    this.stats.shield = this.stats.maxShield;
    this.stats.currentAmmo = this.stats.maxAmmo;
    this.stats.isReloading = false;
    this.stats.reloadProgress = 0;
    this.stats.exp = 0;
    this.stats.level = 1;
    this.stats.totalKills = 0;
    this.stats.specialMeter = 30;
    this.stats.specialReady = false;
    this.currentWave = 1;
    this.waveTimer = 0;

    // Reset procedural body rotations
    if (this.playerBodyParts) {
      this.playerBodyParts.torso.rotation.set(0, 0, 0);
      this.playerBodyParts.torso.position.y = 2.45;
      this.playerBodyParts.head.rotation.set(0, 0, 0);
      this.playerBodyParts.leftLeg.rotation.set(0, 0, 0);
      this.playerBodyParts.rightLeg.rotation.set(0, 0, 0);
      this.playerBodyParts.leftArm.rotation.set(0, 0, 0);
      this.playerBodyParts.rightArm.rotation.set(0, 0, 0);
    }

    if (this.customModelScene) {
      this.customModelScene.rotation.x = 0;
      this.customModelScene.position.y = this.customModelOptions.yOffset;
    }

    // Reset weapons placement
    if (this.metralletaMesh && this.macheteMesh) {
      this.metralletaMesh.visible = true;
      this.macheteMesh.visible = true;
      this.metralletaMesh.position.set(0, 2.25, 0.72);
      this.metralletaMesh.rotation.set(0, 0, 0);
      this.macheteMesh.position.set(0.46, 1.95, -0.05);
      this.macheteMesh.rotation.set(0.3, 0.15, -2.5);
    }
    this.updateCustomWeaponPositions();

    // Reset entities
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.enemies = [];
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.drops.forEach((d) => this.scene.remove(d.mesh));
    this.drops = [];

    this.playerPos.set(0, 0, 0);
    this.playerGroup.position.set(0, 0, 0);

    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onWeaponsUpdate([...this.weapons]);
    this.callbacks.onWaveChange(this.currentWave);

    this.isPaused = false;
    soundEngine.startMusic();
  }

  // -------------------------------------------------------------
  // CUSTOM 3D MODEL LOADING & MANAGEMENT (.glb / .gltf)
  // -------------------------------------------------------------

  public async loadCustomModelFromBuffer(
    buffer: ArrayBuffer,
    initialConfig?: { scale?: number; yOffset?: number; rotY?: number; showGun?: boolean }
  ): Promise<{ success: boolean; animations: string[]; appliedScale?: number; appliedYOffset?: number; error?: string }> {
    return new Promise((resolve) => {
      try {
        const loader = new GLTFLoader();
        loader.parse(
          buffer,
          '',
          (gltf) => {
            if (this.customModelScene) {
              this.customModelGroup.remove(this.customModelScene);
              this.customModelScene = null;
            }
            if (this.customGunMesh) {
              if (this.customGunMesh.parent) {
                this.customGunMesh.parent.remove(this.customGunMesh);
              }
              this.customGunMesh = null;
            }
            if (this.customMacheteMesh) {
              if (this.customMacheteMesh.parent) {
                this.customMacheteMesh.parent.remove(this.customMacheteMesh);
              }
              this.customMacheteMesh = null;
            }

            const model = gltf.scene;
            this.customModelScene = model;

            // 1. Reset base transforms and prepare matrices
            model.position.set(0, 0, 0);
            model.rotation.set(0, 0, 0);
            model.scale.set(1, 1, 1);
            model.updateMatrixWorld(true);

            // 2. Traverse all meshes and bones to optimize rendering, lighting and prevent frustum culling
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                // CRITICAL: Disable frustum culling on all character meshes to prevent disappearance during bone animation
                mesh.frustumCulled = false;

                const mats: THREE.Material[] = Array.isArray(mesh.material) ? mesh.material : (mesh.material ? [mesh.material] : []);
                mats.forEach((mat: THREE.Material) => {
                  if (mat) {
                    mat.side = THREE.DoubleSide; // Render both sides to avoid backface culling
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      // Prevent pitch black reflections when no HDRI environment map exists
                      if (mat.metalness > 0.45 && !mat.metalnessMap) {
                        mat.metalness = 0.2;
                      }
                      if (mat.roughness < 0.2) {
                        mat.roughness = 0.45;
                      }
                      // If completely black color with no texture, brighten slightly
                      if (mat.color && mat.color.r === 0 && mat.color.g === 0 && mat.color.b === 0 && !mat.map) {
                        mat.color.set('#d4d4d8');
                      }
                    }
                    mat.needsUpdate = true;
                  }
                });
              }

              if ((child as THREE.Bone).isBone) {
                child.matrixAutoUpdate = true;
              }
            });

            // 3. Compute Raw Bounding Box & Dimensions across all geometries and bones
            const rawBox = new THREE.Box3().setFromObject(model);
            if (rawBox.isEmpty() || !isFinite(rawBox.min.x)) {
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
                  (child as THREE.Mesh).geometry.computeBoundingBox();
                  const geomBox = (child as THREE.Mesh).geometry.boundingBox;
                  if (geomBox) {
                    rawBox.union(geomBox.clone().applyMatrix4(child.matrixWorld));
                  }
                }
              });
            }

            const rawSize = new THREE.Vector3();
            rawBox.getSize(rawSize);
            const rawCenter = new THREE.Vector3();
            rawBox.getCenter(rawCenter);

            // 4. Automatic Scale Adjustment (Requirement 2: reajustar de forma automática por código)
            // Target character height in world coordinates is ~3.4 units (human scale in this arena)
            const rawHeight = rawSize.y > 0.001 ? rawSize.y : Math.max(rawSize.x, rawSize.z, 0.1);
            const TARGET_HEIGHT = 3.4;
            const autoBaseScale = TARGET_HEIGHT / rawHeight;

            this.customModelBaseScale = autoBaseScale;
            this.customModelOriginOffset = {
              rawCenterX: isFinite(rawCenter.x) ? rawCenter.x : 0,
              rawCenterZ: isFinite(rawCenter.z) ? rawCenter.z : 0,
              rawMinY: isFinite(rawBox.min.y) ? rawBox.min.y : 0,
            };

            // Determine safe scale multiplier: default 1.0 = exact 3.4 unit human height
            let userScaleMultiplier = 1.0;
            if (initialConfig?.scale && initialConfig.scale > 0) {
              const testHeight = rawHeight * initialConfig.scale;
              // If scale is a sensible multiplier or already calibrated:
              if (initialConfig.scale >= 0.2 && initialConfig.scale <= 3.0 && (testHeight >= 1.2 && testHeight <= 6.0)) {
                userScaleMultiplier = initialConfig.scale;
              } else if (testHeight < 1.0 || testHeight > 6.5) {
                // If it was microscopic (<1.0) or gigantic (>6.5), recalibrate automatically to 1.0x
                userScaleMultiplier = 1.0;
              }
            }

            const finalScale = autoBaseScale * userScaleMultiplier;
            const rotDeg = initialConfig?.rotY ?? 0;
            const showGun = initialConfig?.showGun ?? true;
            const userYOffset = initialConfig?.yOffset !== undefined ? initialConfig.yOffset : 0.0;

            // 5. Position mesh and bone hierarchy EXACTLY at the origin in front of the main camera (Requirement 1)
            model.scale.set(finalScale, finalScale, finalScale);
            // Center X and Z so origin is exactly centered at (0, 0)
            model.position.x = -this.customModelOriginOffset.rawCenterX * finalScale;
            model.position.z = -this.customModelOriginOffset.rawCenterZ * finalScale;
            // Place feet precisely on floor y = 0
            model.position.y = (-this.customModelOriginOffset.rawMinY * finalScale) + userYOffset;
            model.rotation.y = (rotDeg * Math.PI) / 180;
            model.updateMatrixWorld(true);

            this.customModelOptions = {
              scale: userScaleMultiplier,
              yOffset: userYOffset,
              rotY: rotDeg,
              showGun,
            };

            this.customModelGroup.add(model);

            // 6. Detect and configure custom model skeleton bones
            this.customRigBones = this.detectAndConfigureCustomBones(model);

            // 7. Setup Animations (Embedded in GLTF or Procedural Combat Stance)
            const animNames: string[] = [];
            this.customMixer = null;
            this.customIdleAction = null;
            this.customRunAction = null;
            this.customAttackAction = null;
            this.currentCustomAction = null;
            this.hasEmbeddedClips = false;

            if (gltf.animations && gltf.animations.length > 0) {
              this.customMixer = new THREE.AnimationMixer(model);

              gltf.animations.forEach((clip) => {
                animNames.push(clip.name);
              });

              // Broad search for combat/idle clip
              const idleClip =
                gltf.animations.find((c) => /idle|stand|combat|ready|guard|pose|breath|wait|static/i.test(c.name)) ||
                gltf.animations[0];
              // Broad search for running/walking locomotion clip
              const runClip =
                gltf.animations.find((c) => /run|walk|jog|sprint|move|locomotion|trot|forward/i.test(c.name)) ||
                (gltf.animations.length > 1 ? gltf.animations[1] : idleClip);
              // Search for attack/shot clip
              const attackClip = gltf.animations.find((c) => /attack|shoot|fire|slash|hit|strike/i.test(c.name));

              if (idleClip) {
                this.customIdleAction = this.customMixer.clipAction(idleClip);
                this.customIdleAction.setLoop(THREE.LoopRepeat, Infinity);
                this.customIdleAction.play();
                this.currentCustomAction = this.customIdleAction;
              }
              if (runClip) {
                this.customRunAction = this.customMixer.clipAction(runClip);
                this.customRunAction.setLoop(THREE.LoopRepeat, Infinity);
              }
              if (attackClip) {
                this.customAttackAction = this.customMixer.clipAction(attackClip);
              }

              this.hasEmbeddedClips = true;
            } else {
              this.hasEmbeddedClips = false;
              // No animations in GLTF -> apply natural combat posture so character NEVER stays in T-pose!
              this.applyInitialCombatStance();
            }

            // 8. Attach weapons directly to the character's right hand and holster points
            if (showGun) {
              this.attachWeaponsToCustomModel();
            }

            this.setUseCustomModel(true);

            resolve({
              success: true,
              animations: animNames,
              appliedScale: userScaleMultiplier,
              appliedYOffset: userYOffset,
            });
          },
          (err) => {
            console.error('Error parsing GLTF model:', err);
            resolve({
              success: false,
              animations: [],
              error: 'No se pudo interpretar el archivo 3D. Asegúrate de que sea un .GLB o .GLTF válido.',
            });
          }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar';
        resolve({
          success: false,
          animations: [],
          error: msg,
        });
      }
    });
  }

  // Detects all standard humanoid bones across Mixamo, Blender, Unreal, VRoid, and generic rigs
  private detectAndConfigureCustomBones(model: THREE.Object3D) {
    const bones: {
      rightHand?: THREE.Object3D;
      leftHand?: THREE.Object3D;
      rightForeArm?: THREE.Object3D;
      leftForeArm?: THREE.Object3D;
      rightUpperArm?: THREE.Object3D;
      leftUpperArm?: THREE.Object3D;
      spine?: THREE.Object3D;
      chest?: THREE.Object3D;
      neck?: THREE.Object3D;
      head?: THREE.Object3D;
      hips?: THREE.Object3D;
      rightThigh?: THREE.Object3D;
      leftThigh?: THREE.Object3D;
      rightCalf?: THREE.Object3D;
      leftCalf?: THREE.Object3D;
      rightFoot?: THREE.Object3D;
      leftFoot?: THREE.Object3D;
    } = {};

    model.traverse((obj) => {
      const isBoneLike = (obj as unknown as { isBone?: boolean }).isBone || obj.type === 'Bone' || (obj.children && obj.children.length > 0 && obj.parent);
      if (!isBoneLike || !obj.name) return;

      const lower = obj.name.toLowerCase();

      // Exclude fingers, toes, and props
      const isFingerOrToe =
        lower.includes('thumb') ||
        lower.includes('index') ||
        lower.includes('mid') ||
        lower.includes('ring') ||
        lower.includes('pinky') ||
        lower.includes('finger') ||
        lower.includes('toe');

      // Distinguish Right vs Left accurately
      const isRight =
        (lower.includes('right') ||
          lower.endsWith('_r') ||
          lower.endsWith('.r') ||
          lower.includes('_r_') ||
          lower.includes('.r.') ||
          lower.includes('r_hand') ||
          lower.includes('hand_r') ||
          lower.includes('hand.r') ||
          lower.startsWith('r_')) &&
        !lower.includes('left') &&
        !lower.includes('_l') &&
        !lower.endsWith('.l');

      const isLeft =
        (lower.includes('left') ||
          lower.endsWith('_l') ||
          lower.endsWith('.l') ||
          lower.includes('_l_') ||
          lower.includes('.l.') ||
          lower.includes('l_hand') ||
          lower.includes('hand_l') ||
          lower.includes('hand.l') ||
          lower.startsWith('l_')) &&
        !lower.includes('right') &&
        !lower.includes('_r') &&
        !lower.endsWith('.r');

      if (!isFingerOrToe) {
        if (!bones.rightHand && (lower.includes('hand') || lower.includes('wrist')) && isRight) {
          bones.rightHand = obj;
        } else if (!bones.leftHand && (lower.includes('hand') || lower.includes('wrist')) && isLeft) {
          bones.leftHand = obj;
        } else if (
          !bones.rightForeArm &&
          (lower.includes('forearm') || lower.includes('lowerarm') || lower.includes('elbow') || lower.includes('fore_arm') || lower.includes('lower_arm')) &&
          isRight
        ) {
          bones.rightForeArm = obj;
        } else if (
          !bones.leftForeArm &&
          (lower.includes('forearm') || lower.includes('lowerarm') || lower.includes('elbow') || lower.includes('fore_arm') || lower.includes('lower_arm')) &&
          isLeft
        ) {
          bones.leftForeArm = obj;
        } else if (
          !bones.rightUpperArm &&
          (lower.includes('upperarm') || lower.includes('upper_arm') || (lower.includes('arm') && !lower.includes('fore') && !lower.includes('lower'))) &&
          isRight
        ) {
          bones.rightUpperArm = obj;
        } else if (
          !bones.leftUpperArm &&
          (lower.includes('upperarm') || lower.includes('upper_arm') || (lower.includes('arm') && !lower.includes('fore') && !lower.includes('lower'))) &&
          isLeft
        ) {
          bones.leftUpperArm = obj;
        } else if (!bones.rightThigh && (lower.includes('thigh') || lower.includes('upleg') || lower.includes('upperleg')) && isRight) {
          bones.rightThigh = obj;
        } else if (!bones.leftThigh && (lower.includes('thigh') || lower.includes('upleg') || lower.includes('upperleg')) && isLeft) {
          bones.leftThigh = obj;
        } else if (
          !bones.rightCalf &&
          (lower.includes('calf') || lower.includes('shin') || lower.includes('knee') || (lower.includes('leg') && !lower.includes('up') && !lower.includes('thigh'))) &&
          isRight
        ) {
          bones.rightCalf = obj;
        } else if (
          !bones.leftCalf &&
          (lower.includes('calf') || lower.includes('shin') || lower.includes('knee') || (lower.includes('leg') && !lower.includes('up') && !lower.includes('thigh'))) &&
          isLeft
        ) {
          bones.leftCalf = obj;
        } else if (!bones.chest && (lower.includes('chest') || lower.includes('upperchest') || lower.includes('spine2') || lower.includes('spine1'))) {
          bones.chest = obj;
        } else if (!bones.spine && lower.includes('spine')) {
          bones.spine = obj;
        } else if (!bones.neck && lower.includes('neck')) {
          bones.neck = obj;
        } else if (!bones.head && lower.includes('head')) {
          bones.head = obj;
        } else if (!bones.hips && (lower.includes('hip') || lower.includes('pelvis') || lower.includes('root') || lower.includes('waist'))) {
          bones.hips = obj;
        }
      }

      // Cache initial rest/T-pose rotation for smooth animations
      if (!obj.userData.restRotation) {
        obj.userData.restRotation = obj.rotation.clone();
      }
    });

    return bones;
  }

  // Brings a model out of rigid T-Pose into an active, ready combat stance
  private applyInitialCombatStance() {
    if (!this.customRigBones) return;
    const b = this.customRigBones;

    // Lower arms from horizontal T-pose and bend elbows forward holding the weapon
    if (b.rightUpperArm) {
      const rest = b.rightUpperArm.userData.restRotation || new THREE.Euler();
      b.rightUpperArm.rotation.set(rest.x - 0.38, rest.y + 0.32, rest.z - 1.15);
    }
    if (b.rightForeArm) {
      const rest = b.rightForeArm.userData.restRotation || new THREE.Euler();
      b.rightForeArm.rotation.set(rest.x + 0.55, rest.y + 0.18, rest.z - 0.8);
    }
    if (b.leftUpperArm) {
      const rest = b.leftUpperArm.userData.restRotation || new THREE.Euler();
      b.leftUpperArm.rotation.set(rest.x - 0.28, rest.y - 0.38, rest.z + 1.1);
    }
    if (b.leftForeArm) {
      const rest = b.leftForeArm.userData.restRotation || new THREE.Euler();
      b.leftForeArm.rotation.set(rest.x + 0.65, rest.y - 0.25, rest.z + 1.25);
    }
    if (b.spine) {
      const rest = b.spine.userData.restRotation || new THREE.Euler();
      b.spine.rotation.x = rest.x + 0.1; // Athletic forward combat lean
    }
    if (b.rightThigh) {
      const rest = b.rightThigh.userData.restRotation || new THREE.Euler();
      b.rightThigh.rotation.x = rest.x - 0.08;
      if (b.rightCalf) {
        const calfRest = b.rightCalf.userData.restRotation || new THREE.Euler();
        b.rightCalf.rotation.x = calfRest.x + 0.14;
      }
    }
    if (b.leftThigh) {
      const rest = b.leftThigh.userData.restRotation || new THREE.Euler();
      b.leftThigh.rotation.x = rest.x + 0.08;
      if (b.leftCalf) {
        const calfRest = b.leftCalf.userData.restRotation || new THREE.Euler();
        b.leftCalf.rotation.x = calfRest.x + 0.1;
      }
    }
  }

  // Attach and position both weapons (combat rifle and machete) on custom model
  private attachWeaponsToCustomModel() {
    if (this.customGunMesh) {
      if (this.customGunMesh.parent) {
        this.customGunMesh.parent.remove(this.customGunMesh);
      }
      this.customGunMesh = null;
    }
    if (this.customMacheteMesh) {
      if (this.customMacheteMesh.parent) {
        this.customMacheteMesh.parent.remove(this.customMacheteMesh);
      }
      this.customMacheteMesh = null;
    }

    if (!this.customModelScene || !this.customModelOptions.showGun) return;

    this.customGunMesh = this.createMetralletaMesh();
    this.customMacheteMesh = this.createSugarCleaverMesh();

    this.updateCustomWeaponPositions();
  }

  // Updates custom model weapon attachments according to active weapon:
  // When Ametralladora is active: Rifle LINKED DIRECTLY to Right Hand, Machete at hip/waist!
  // When Machete is active: Machete in right hand, Rifle slung on back!
  private updateCustomWeaponPositions() {
    if (!this.customModelScene || !this.customGunMesh || !this.customMacheteMesh || !this.customModelOptions.showGun) {
      return;
    }

    if (this.customGunMesh.parent) this.customGunMesh.parent.remove(this.customGunMesh);
    if (this.customMacheteMesh.parent) this.customMacheteMesh.parent.remove(this.customMacheteMesh);

    // Prefer detected skeleton bones, or fallback search
    const handBone = this.customRigBones?.rightHand;
    const backBone = this.customRigBones?.chest || this.customRigBones?.spine;
    const hipBone = this.customRigBones?.hips;

    const isRifleActive = this.stats.activeWeapon === 'AMETRALLADORA';

    if (isRifleActive) {
      // 1. Rifle LINKED DIRECTLY TO RIGHT HAND (no floating!)
      if (handBone) {
        this.customGunMesh.position.set(0, 0, 0);
        this.customGunMesh.rotation.set(0, 0, 0);
        this.customGunMesh.scale.set(0.7, 0.7, 0.7);
        handBone.add(this.customGunMesh);
      } else {
        // Fallback for static unrigged model: attach adjacent to right side
        this.customGunMesh.position.set(0.35, 1.8, 0.6);
        this.customGunMesh.rotation.set(0, 0, 0);
        this.customGunMesh.scale.set(0.85, 0.85, 0.85);
        this.customModelGroup.add(this.customGunMesh);
      }

      // 2. Machete holstered at hip / waist (cintura o cadera)
      if (hipBone) {
        this.customMacheteMesh.position.set(0.18, -0.05, 0.05);
        this.customMacheteMesh.rotation.set(0.3, 0.2, -2.5);
        this.customMacheteMesh.scale.set(0.68, 0.68, 0.68);
        hipBone.add(this.customMacheteMesh);
      } else {
        this.customMacheteMesh.position.set(0.45, 1.5, -0.05);
        this.customMacheteMesh.rotation.set(0.3, 0.2, -2.5);
        this.customMacheteMesh.scale.set(0.8, 0.8, 0.8);
        this.customModelGroup.add(this.customMacheteMesh);
      }
    } else {
      // 1. Machete in right hand ready to strike!
      if (handBone) {
        this.customMacheteMesh.position.set(0, 0, 0);
        this.customMacheteMesh.rotation.set(0.4, -0.2, -0.2);
        this.customMacheteMesh.scale.set(0.75, 0.75, 0.75);
        handBone.add(this.customMacheteMesh);
      } else {
        this.customMacheteMesh.position.set(0.35, 1.85, 0.6);
        this.customMacheteMesh.rotation.set(0.4, -0.2, -0.2);
        this.customMacheteMesh.scale.set(0.85, 0.85, 0.85);
        this.customModelGroup.add(this.customMacheteMesh);
      }

      // 2. Rifle slung across the back (en su espalda)
      if (backBone) {
        this.customGunMesh.position.set(0, 0.15, -0.25);
        this.customGunMesh.rotation.set(-0.35, 0.2, -0.85);
        this.customGunMesh.scale.set(0.68, 0.68, 0.68);
        backBone.add(this.customGunMesh);
      } else {
        this.customGunMesh.position.set(-0.05, 2.1, -0.3);
        this.customGunMesh.rotation.set(-0.35, 0.2, -0.85);
        this.customGunMesh.scale.set(0.8, 0.8, 0.8);
        this.customModelGroup.add(this.customGunMesh);
      }
    }

    this.customGunMesh.visible = true;
    this.customMacheteMesh.visible = true;
  }

  public setCustomModelConfig(config: { scale?: number; yOffset?: number; rotY?: number; showGun?: boolean }) {
    if (config.scale !== undefined) this.customModelOptions.scale = config.scale;
    if (config.yOffset !== undefined) this.customModelOptions.yOffset = config.yOffset;
    if (config.rotY !== undefined) this.customModelOptions.rotY = config.rotY;
    if (config.showGun !== undefined) this.customModelOptions.showGun = config.showGun;

    if (this.customModelScene) {
      const effectiveScale = this.customModelBaseScale * this.customModelOptions.scale;
      this.customModelScene.scale.set(effectiveScale, effectiveScale, effectiveScale);
      this.customModelScene.position.x = -this.customModelOriginOffset.rawCenterX * effectiveScale;
      this.customModelScene.position.z = -this.customModelOriginOffset.rawCenterZ * effectiveScale;
      this.customModelScene.position.y = (-this.customModelOriginOffset.rawMinY * effectiveScale) + this.customModelOptions.yOffset;
      this.customModelScene.rotation.y = (this.customModelOptions.rotY * Math.PI) / 180;
    }

    if (config.showGun !== undefined) {
      if (this.customModelOptions.showGun) {
        this.attachWeaponsToCustomModel();
      } else {
        if (this.customGunMesh) {
          if (this.customGunMesh.parent) this.customGunMesh.parent.remove(this.customGunMesh);
          this.customGunMesh = null;
        }
        if (this.customMacheteMesh) {
          if (this.customMacheteMesh.parent) this.customMacheteMesh.parent.remove(this.customMacheteMesh);
          this.customMacheteMesh = null;
        }
      }
    }
  }

  public setUseCustomModel(useCustom: boolean) {
    this.useCustomModel = useCustom && this.customModelScene !== null;
    if (this.proceduralModelGroup) {
      this.proceduralModelGroup.visible = !this.useCustomModel;
    }
    this.customModelGroup.visible = this.useCustomModel;
  }

  public removeCustomModel() {
    this.setUseCustomModel(false);
    if (this.customModelScene) {
      this.customModelGroup.remove(this.customModelScene);
      this.customModelScene = null;
    }
    if (this.customGunMesh) {
      if (this.customGunMesh.parent) {
        this.customGunMesh.parent.remove(this.customGunMesh);
      }
      this.customGunMesh = null;
    }
    if (this.customMacheteMesh) {
      if (this.customMacheteMesh.parent) {
        this.customMacheteMesh.parent.remove(this.customMacheteMesh);
      }
      this.customMacheteMesh = null;
    }
    this.customMixer = null;
    this.customIdleAction = null;
    this.customRunAction = null;
    this.currentCustomAction = null;
  }

  // -------------------------------------------------------------
  // THREE.JS SETUP
  // -------------------------------------------------------------

  private setupLighting() {
    // 1. Iluminación Ambiental Brillante y Equilibrada (Neutral Ambient Light)
    // Evita sombras empastadas y garantiza que todas las caras del modelo 3D sean nítidas y claras
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.8);
    this.scene.add(ambientLight);

    // 2. Luz Hemisférica: cielo blanco puro con suave reflejo cálido desde el suelo
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#ecd4fc', 1.8);
    hemiLight.position.set(0, 35, 0);
    this.scene.add(hemiLight);

    // 3. Iluminación Cenital Principal (Zenithal / Top-Down Key Sunlight)
    // Proyecta luz cenital perpendicular directa sobre el personaje y la arena
    const zenithalLight = new THREE.DirectionalLight('#ffffff', 3.0);
    zenithalLight.position.set(0, 45, 6);
    zenithalLight.castShadow = true;
    zenithalLight.shadow.mapSize.width = 2048;
    zenithalLight.shadow.mapSize.height = 2048;
    zenithalLight.shadow.camera.near = 5;
    zenithalLight.shadow.camera.far = 100;
    zenithalLight.shadow.camera.left = -30;
    zenithalLight.shadow.camera.right = 30;
    zenithalLight.shadow.camera.top = 30;
    zenithalLight.shadow.camera.bottom = -30;
    zenithalLight.shadow.bias = -0.0005;
    this.scene.add(zenithalLight);

    // 4. Luz Frontal y Lateral Cálida para relieve tridimensional
    const keyFillLight = new THREE.DirectionalLight('#fff5eb', 2.0);
    keyFillLight.position.set(15, 25, 20);
    this.scene.add(keyFillLight);

    // 5. Luz de Contorno (Rim Light) Brillante para despegar la silueta del fondo rosado
    const rimLight = new THREE.DirectionalLight('#f0f9ff', 2.2);
    rimLight.position.set(-18, 20, -22);
    this.scene.add(rimLight);

    // 6. Luces Cenitales y de Enfoque dedicadas sobre el Jugador (Player Light Rig)
    // Luz cenital directa sobre el modelo del personaje
    const playerZenithalSpot = new THREE.DirectionalLight('#ffffff', 2.4);
    playerZenithalSpot.position.set(0, 16, 1);
    playerZenithalSpot.target = this.playerGroup;
    this.playerGroup.add(playerZenithalSpot);

    // Luz frontal para iluminar el rostro, armas y ropajes
    const playerFrontFill = new THREE.PointLight('#ffffff', 2.2, 18, 1.2);
    playerFrontFill.position.set(0, 3.2, 4.0);
    this.playerGroup.add(playerFrontFill);

    // Luz trasera de contorno para destacar los bordes del modelo frente al fondo rosado
    const playerBackHighlight = new THREE.PointLight('#e0f2fe', 1.8, 14, 1.2);
    playerBackHighlight.position.set(0, 3.2, -3.8);
    this.playerGroup.add(playerBackHighlight);
  }

  private setupEnvironment() {
    // 1. Rainbow Swirled Floor
    const floorGeo = new THREE.PlaneGeometry(160, 240, 24, 24);
    floorGeo.rotateX(-Math.PI / 2);

    const floorTexture = createRainbowFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.45,
      metalness: 0.1,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // 2. Background evil Cake Volcano / mountain in cotton-candy twilight
    const volcanoGroup = new THREE.Group();
    const volcanoGeo = new THREE.ConeGeometry(38, 55, 12, 4);
    const volcanoMat = new THREE.MeshStandardMaterial({
      color: '#3b0d40', // dark chocolate blackberry cake mountain
      roughness: 0.85,
    });
    const volcanoMesh = new THREE.Mesh(volcanoGeo, volcanoMat);
    volcanoMesh.position.set(0, 20, -75);
    volcanoGroup.add(volcanoMesh);

    // Volcano Frosting cap: Sweet pastel strawberry frosting
    const capGeo = new THREE.ConeGeometry(18, 14, 12);
    const capMat = new THREE.MeshStandardMaterial({
      color: '#f472b6', // strawberry pink frosting
      roughness: 0.3,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 42, -75);
    volcanoGroup.add(capMesh);

    // Glowing evil ruby eyes on mountain
    const eyeGeo = new THREE.SphereGeometry(2.2, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff0055' });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-6, 32, -60);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(6, 32, -60);
    volcanoGroup.add(leftEye, rightEye);

    this.scene.add(volcanoGroup);

    // 3. Giant Spiked Lollipops along the perimeter
    const lollipopTextures = [
      createPeppermintTexture('#e11d48', '#ffffff', 14),
      createPeppermintTexture('#9333ea', '#ec4899', 12),
      createPeppermintTexture('#10b981', '#facc15', 10),
    ];

    const lollipopPositions = [
      { x: -16, z: -10, scale: 1.4, texIdx: 0, spiked: true },
      { x: 16, z: -14, scale: 1.5, texIdx: 1, spiked: true },
      { x: -20, z: -35, scale: 1.8, texIdx: 1, spiked: false },
      { x: 22, z: -40, scale: 2.0, texIdx: 0, spiked: true },
      { x: -14, z: 25, scale: 1.3, texIdx: 2, spiked: false },
      { x: 18, z: 28, scale: 1.4, texIdx: 1, spiked: true },
      { x: -24, z: 5, scale: 1.6, texIdx: 0, spiked: false },
      { x: 25, z: -5, scale: 1.7, texIdx: 2, spiked: true },
    ];

    lollipopPositions.forEach((pos) => {
      const pop = this.createGiantLollipop(lollipopTextures[pos.texIdx], pos.spiked);
      pop.position.set(pos.x, 0, pos.z);
      pop.scale.set(pos.scale, pos.scale, pos.scale);
      this.sceneryDecorations.push(pop);
      this.scene.add(pop);
    });

    // 4. Candy Canes & Dripping Licorice Trees
    const candyBarkTex = createCandyBarkTexture();
    const treePositions = [
      { x: -12, z: -20 },
      { x: 14, z: -25 },
      { x: -15, z: 12 },
      { x: 15, z: 10 },
      { x: -18, z: -55 },
      { x: 18, z: -60 },
    ];

    treePositions.forEach((tp) => {
      const tree = this.createSpookyCandyTree(candyBarkTex);
      tree.position.set(tp.x, 0, tp.z);
      this.sceneryDecorations.push(tree);
      this.scene.add(tree);
    });

    // 5. Giant Gummy Bears
    const gummyColors = ['#22c55e', '#ef4444', '#a855f7', '#eab308'];
    const gummyPositions = [
      { x: -10, z: -16, col: gummyColors[0] },
      { x: 12, z: -18, col: gummyColors[1] },
      { x: -11, z: 18, col: gummyColors[2] },
      { x: 13, z: 20, col: gummyColors[3] },
    ];

    gummyPositions.forEach((gp) => {
      const gummy = this.createGummyBearStatue(gp.col);
      gummy.position.set(gp.x, 3.5, gp.z);
      this.sceneryDecorations.push(gummy);
      this.scene.add(gummy);
    });

    // 6. Cookie Boulders
    const cookieTex = createCookieTexture();
    const cookiePositions = [
      { x: -7, z: -6, s: 2.2 },
      { x: 8, z: -8, s: 2.6 },
      { x: -8, z: 14, s: 2.0 },
      { x: 7, z: 12, s: 2.4 },
      { x: 0, z: -30, s: 3.2 },
    ];

    cookiePositions.forEach((cp) => {
      const cookie = this.createCookieBoulder(cookieTex);
      cookie.position.set(cp.x, 0.4, cp.z);
      cookie.scale.set(cp.s, cp.s * 0.4, cp.s);
      this.sceneryDecorations.push(cookie);
      this.scene.add(cookie);
    });
  }

  // Giant Spiked Lollipop mesh
  private createGiantLollipop(texture: THREE.CanvasTexture, hasSpikes: boolean): THREE.Group {
    const group = new THREE.Group();

    const stickGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 12);
    const stickMat = new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.4 });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 7;
    stick.castShadow = true;
    group.add(stick);

    const discGeo = new THREE.CylinderGeometry(4.2, 4.2, 1.2, 32);
    discGeo.rotateX(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.25,
      metalness: 0.1,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 13.5;
    disc.castShadow = true;
    group.add(disc);

    if (hasSpikes) {
      const spikeGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
      const spikeMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.3 });

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(angle) * 4.6, 13.5 + Math.sin(angle) * 4.6, 0);
        spike.rotation.z = angle - Math.PI / 2;
        group.add(spike);
      }
    }

    return group;
  }

  // Spooky Twisted Candy Tree with dripping slime
  private createSpookyCandyTree(barkTexture: THREE.CanvasTexture): THREE.Group {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(1.2, 2.2, 14, 10);
    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTexture,
      roughness: 0.7,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 7;
    trunk.castShadow = true;
    group.add(trunk);

    const branchGeo = new THREE.TorusGeometry(3.5, 0.7, 8, 16, Math.PI);
    const branch = new THREE.Mesh(branchGeo, trunkMat);
    branch.position.set(0, 13, 0);
    branch.rotation.x = Math.PI / 4;
    group.add(branch);

    // Dripping toxic green slime
    const dropGeo = new THREE.ConeGeometry(0.35, 1.4, 6);
    dropGeo.rotateX(Math.PI);
    const dropMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.1,
      metalness: 0.1,
    });
    for (let i = 0; i < 5; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.position.set((i - 2) * 1.5, 11.2 - Math.random() * 0.6, (Math.random() - 0.5) * 1.5);
      group.add(drop);
    }

    return group;
  }

  // Gummy Bear Statue
  private createGummyBearStatue(color: string): THREE.Group {
    const group = new THREE.Group();
    const gummyMat = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.15,
      transmission: 0.6,
      opacity: 0.9,
      transparent: true,
      ior: 1.4,
    });

    const bodyGeo = new THREE.CapsuleGeometry(1.1, 1.8, 8, 16);
    const body = new THREE.Mesh(bodyGeo, gummyMat);
    group.add(body);

    const headGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const head = new THREE.Mesh(headGeo, gummyMat);
    head.position.y = 1.9;
    group.add(head);

    const earGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, gummyMat);
    leftEar.position.set(-0.7, 2.7, 0);
    const rightEar = new THREE.Mesh(earGeo, gummyMat);
    rightEar.position.set(0.7, 2.7, 0);
    group.add(leftEar, rightEar);

    const snoutGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const snout = new THREE.Mesh(snoutGeo, gummyMat);
    snout.position.set(0, 1.8, 0.7);
    group.add(snout);

    group.scale.set(1.5, 1.5, 1.5);
    return group;
  }

  private createCookieBoulder(texture: THREE.CanvasTexture): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(1.0, 1);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // -------------------------------------------------------------
  // PLAYER RIG CREATION (Fashion Athletic Heroine from photo)
  // -------------------------------------------------------------

  private createPlayerCharacter() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: '#cf9375',
      roughness: 0.52,
      metalness: 0.05,
    });

    const faceMat = new THREE.MeshStandardMaterial({
      map: createCharacterFaceTexture(),
      roughness: 0.48,
    });

    const tattooMat = new THREE.MeshStandardMaterial({
      map: createTattooTexture(),
      roughness: 0.5,
    });

    const bikiniMat = new THREE.MeshStandardMaterial({
      map: createTealBikiniTexture(),
      roughness: 0.35,
    });

    const skirtMat = new THREE.MeshStandardMaterial({
      color: '#f472b6',
      roughness: 0.4,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: '#141416',
      roughness: 0.25,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      metalness: 0.85,
      roughness: 0.2,
    });

    const sandalMat = new THREE.MeshStandardMaterial({
      color: '#111114',
      roughness: 0.25,
      metalness: 0.2,
    });

    // 1. Torso
    const torsoGeo = new THREE.CylinderGeometry(0.44, 0.36, 1.25, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.y = 2.45;
    torso.castShadow = true;
    group.add(torso);

    const navel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: '#8c5035' }));
    navel.position.set(0, -0.22, 0.38);
    torso.add(navel);

    // Teal Halter Bikini Top
    const cupLeft = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 12), bikiniMat);
    cupLeft.rotation.set(Math.PI / 2.8, -0.2, 0);
    cupLeft.position.set(-0.21, 0.24, 0.36);
    torso.add(cupLeft);

    const cupRight = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 12), bikiniMat);
    cupRight.rotation.set(Math.PI / 2.8, 0.2, 0);
    cupRight.position.set(0.21, 0.24, 0.36);
    torso.add(cupRight);

    const halterStringGeo = new THREE.TorusGeometry(0.24, 0.02, 6, 16, Math.PI);
    const halterString = new THREE.Mesh(halterStringGeo, bikiniMat);
    halterString.rotation.x = -Math.PI / 3;
    halterString.position.set(0, 0.46, 0.15);
    torso.add(halterString);

    // Gold Pendant Necklace
    const neckChainGeo = new THREE.TorusGeometry(0.26, 0.015, 6, 20);
    const neckChain = new THREE.Mesh(neckChainGeo, goldMat);
    neckChain.rotation.x = Math.PI / 2;
    neckChain.position.set(0, 0.55, 0.04);
    torso.add(neckChain);

    const goldPendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), goldMat);
    goldPendant.position.set(0, 0.42, 0.36);
    torso.add(goldPendant);

    // 2. Pink Pleated Mini Skirt
    const skirtGeo = new THREE.ConeGeometry(0.86, 0.68, 24, 1, true);
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = 1.8;
    skirt.castShadow = true;
    group.add(skirt);

    const waistBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.12, 24), skirtMat);
    waistBand.position.y = 2.12;
    group.add(waistBand);

    // 3. Head & Long Dark Hair
    const headGeo = new THREE.SphereGeometry(0.38, 20, 20);
    const head = new THREE.Mesh(headGeo, [skinMat, faceMat, skinMat, skinMat, skinMat, skinMat]);
    head.position.y = 3.38;
    head.castShadow = true;
    group.add(head);

    // Dangling Gold Earrings
    const leftEarring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12), goldMat);
    leftEarring.position.set(-0.38, 3.32, 0.02);
    leftEarring.rotation.y = Math.PI / 2;
    group.add(leftEarring);

    const rightEarring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12), goldMat);
    rightEarring.position.set(0.38, 3.32, 0.02);
    rightEarring.rotation.y = Math.PI / 2;
    group.add(rightEarring);

    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.6, 1.4, 16), hairMat);
    hair.position.set(0, 3.0, -0.16);
    group.add(hair);

    const frontHairLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.95, 8), hairMat);
    frontHairLeft.position.set(-0.28, 2.9, 0.22);
    frontHairLeft.rotation.z = -0.15;
    group.add(frontHairLeft);

    const frontHairRight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.95, 8), hairMat);
    frontHairRight.position.set(0.28, 2.9, 0.22);
    frontHairRight.rotation.z = 0.15;
    group.add(frontHairRight);

    // 4. Arms
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 2.9, 0.05);
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
    leftArm.add(leftShoulder);
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.7, 8), skinMat);
    leftUpperArm.position.set(0.12, -0.3, 0.25);
    leftUpperArm.rotation.set(0.65, 0.45, -0.35);
    leftArm.add(leftUpperArm);
    group.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.58, 2.9, 0.05);
    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
    rightArm.add(rightShoulder);

    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.75, 8), tattooMat);
    rightArmMesh.position.set(-0.1, -0.35, 0.28);
    rightArmMesh.rotation.set(0.55, -0.3, 0.2);
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);

    // Stacked Gold Bangles
    for (let b = 0; b < 4; b++) {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 14), goldMat);
      bangle.position.set(-0.18, -0.62 + b * 0.045, 0.48);
      bangle.rotation.set(0.55, -0.3, 0.2);
      rightArm.add(bangle);
    }
    group.add(rightArm);

    // Attach Ametralladora (Combat Rifle in hands)
    const gun = this.createMetralletaMesh();
    gun.position.set(0, 2.25, 0.72);
    gun.rotation.set(0, 0, 0);
    group.add(gun);
    this.metralletaMesh = gun;

    // Attach Machete (Sugar Cleaver holstered at hip / waist)
    const machete = this.createSugarCleaverMesh();
    machete.position.set(0.46, 1.95, -0.05);
    machete.rotation.set(0.3, 0.15, -2.5);
    group.add(machete);
    this.macheteMesh = machete;
    this.macheteMesh.visible = true; // Both visible: rifle in hands, machete at hip

    // 5. Legs & Sandals
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.28, 1.45, 0);
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.9, 10), skinMat);
    leftThigh.position.y = -0.4;
    leftLeg.add(leftThigh);
    const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.85, 10), skinMat);
    leftCalf.position.y = -1.1;
    leftLeg.add(leftCalf);

    const leftSandal = this.createStrappySandalMesh(sandalMat, goldMat);
    leftSandal.position.set(0, -1.5, 0.05);
    leftLeg.add(leftSandal);
    group.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.28, 1.45, 0);
    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.9, 10), skinMat);
    rightThigh.position.y = -0.4;
    rightLeg.add(rightThigh);
    const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.85, 10), skinMat);
    rightCalf.position.y = -1.1;
    rightLeg.add(rightCalf);

    const rightSandal = this.createStrappySandalMesh(sandalMat, goldMat);
    rightSandal.position.set(0, -1.5, 0.05);
    rightLeg.add(rightSandal);
    group.add(rightLeg);

    return {
      group,
      bodyParts: {
        torso,
        hair,
        skirt,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        head,
      },
    };
  }

  // Black Strappy Gladiator High-Heel Sandal Mesh
  private createStrappySandalMesh(sandalMat: THREE.Material, goldMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    const soleGeo = new THREE.BoxGeometry(0.22, 0.06, 0.44);
    const sole = new THREE.Mesh(soleGeo, sandalMat);
    sole.position.set(0, 0.03, 0.05);
    group.add(sole);

    const heelGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.36, 8);
    const heel = new THREE.Mesh(heelGeo, sandalMat);
    heel.position.set(0, -0.15, -0.12);
    group.add(heel);

    const ankleStrapGeo = new THREE.TorusGeometry(0.13, 0.025, 6, 16);
    const ankleStrap = new THREE.Mesh(ankleStrapGeo, sandalMat);
    ankleStrap.rotation.x = Math.PI / 2;
    ankleStrap.position.set(0, 0.18, -0.02);
    group.add(ankleStrap);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), goldMat);
    buckle.position.set(0.13, 0.18, -0.02);
    group.add(buckle);

    for (let s = 0; s < 3; s++) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.04), sandalMat);
      strap.position.set(0, 0.08 + s * 0.03, 0.08 + s * 0.08);
      group.add(strap);
    }

    return group;
  }

  // Tactical Submachine Gun (Metralleta) with candy accents & muzzle flash
  // The pistol grip is aligned exactly at (0, 0, 0) so attaching to hand bone sits directly in palm!
  private createMetralletaMesh(): THREE.Group {
    const group = new THREE.Group();
    const inner = new THREE.Group();
    // Offset inner parts so that the pistol grip is centered at origin (0, 0, 0)
    inner.position.set(0, 0.24, -0.3);
    inner.scale.set(0.6, 0.6, 0.6); // Scale down the weapon
    group.add(inner);

    const metalDarkMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.25,
    });

    const candyPinkTrimMat = new THREE.MeshStandardMaterial({
      color: '#ff2b75',
      metalness: 0.3,
      roughness: 0.2,
    });

    const tealAccentMat = new THREE.MeshStandardMaterial({
      color: '#14b8a6',
      metalness: 0.4,
      roughness: 0.3,
    });

    // 1. Main Receiver
    const receiverGeo = new THREE.BoxGeometry(0.18, 0.28, 0.95);
    const receiver = new THREE.Mesh(receiverGeo, metalDarkMat);
    receiver.castShadow = true;
    inner.add(receiver);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.7), candyPinkTrimMat);
    stripe.position.set(0, 0.04, 0);
    inner.add(stripe);

    // 2. Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, metalDarkMat);
    barrel.position.set(0, 0.03, -0.75);
    inner.add(barrel);

    const muzzleBrakeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8);
    muzzleBrakeGeo.rotateX(Math.PI / 2);
    const muzzleBrake = new THREE.Mesh(muzzleBrakeGeo, tealAccentMat);
    muzzleBrake.position.set(0, 0.03, -1.1);
    inner.add(muzzleBrake);

    // 3. Curved Extended Magazine
    const magGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 12, 1, false, 0, Math.PI);
    magGeo.rotateZ(Math.PI / 2);
    const mag = new THREE.Mesh(magGeo, metalDarkMat);
    mag.position.set(0, -0.32, -0.05);
    mag.rotation.x = -0.3;
    inner.add(mag);

    // 4. Red-Dot Sight
    const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), metalDarkMat);
    sightBase.position.set(0, 0.22, -0.05);
    inner.add(sightBase);

    const reticleLens = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: '#00e5ff', side: THREE.DoubleSide })
    );
    reticleLens.position.set(0, 0.24, -0.16);
    inner.add(reticleLens);

    // 5. Foregrip
    const foregripGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.32, 8);
    const foregrip = new THREE.Mesh(foregripGeo, metalDarkMat);
    foregrip.position.set(0, -0.22, -0.42);
    inner.add(foregrip);

    // 6. Pistol Grip (centered at (0, 0, 0) relative to group!)
    const pistolGripGeo = new THREE.BoxGeometry(0.12, 0.35, 0.15);
    const pistolGrip = new THREE.Mesh(pistolGripGeo, metalDarkMat);
    pistolGrip.position.set(0, -0.24, 0.3);
    pistolGrip.rotation.x = 0.35;
    inner.add(pistolGrip);

    // 7. Dynamic Muzzle Flash
    const flashGeo = new THREE.OctahedronGeometry(0.22, 1);
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#ffe066',
      transparent: true,
      opacity: 0.95,
    });
    const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0, 0.03, -1.25);
    muzzleFlash.visible = false;
    inner.add(muzzleFlash);
    this.muzzleFlashMesh = muzzleFlash;

    group.scale.set(0.9, 0.9, 0.9);
    return group;
  }

  // Sugar Cleaver Machete
  private createSugarCleaverMesh(): THREE.Group {
    const group = new THREE.Group();

    const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    group.add(handle);

    const bladeGeo = new THREE.BoxGeometry(0.05, 0.95, 0.32);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.7,
      roughness: 0.2,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.6, 0.1);
    group.add(blade);

    const dripGeo = new THREE.BoxGeometry(0.06, 0.25, 0.34);
    const dripMat = new THREE.MeshBasicMaterial({ color: '#ff2b75' });
    const drip = new THREE.Mesh(dripGeo, dripMat);
    drip.position.set(0, 0.95, 0.1);
    group.add(drip);

    group.scale.set(0.6, 0.6, 0.6); // Scale down the machete
    return group;
  }

  // -------------------------------------------------------------
  // ENEMY SPAWNING & RESILIENCE (SURVIVAL CHALLENGE)
  // -------------------------------------------------------------

  private spawnWaveEnemy() {
    const roll = Math.random();
    let type: EnemyType = 'CUPCAKE';

    if (this.currentWave >= 4 && roll < 0.25) {
      type = 'JAWBREAKER';
    } else if (this.currentWave >= 3 && roll < 0.45) {
      type = 'GINGERBREAD';
    } else if (this.currentWave >= 2 && roll < 0.65) {
      type = 'GUMMY_BEAR';
    }

    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 20 + Math.random() * 8;
    const x = this.playerPos.x + Math.sin(spawnAngle) * spawnDist;
    const z = this.playerPos.z + Math.cos(spawnAngle) * spawnDist;

    this.createEnemyInstance(type, x, z);
  }

  private spawnBoss() {
    const spawnAngle = Math.PI;
    const x = this.playerPos.x + Math.sin(spawnAngle) * 26;
    const z = this.playerPos.z + Math.cos(spawnAngle) * 26;
    this.createEnemyInstance('CAKEZILLA_BOSS', x, z, true);
  }

  private createEnemyInstance(type: EnemyType, x: number, z: number, isBoss = false): EnemyInstance {
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    const originalColors: THREE.Color[] = [];

    // Increased HP & Durability for survival challenge
    let hp = 75;
    let maxHp = 75;
    let speed = 3.4;
    let damage = 14;
    let expValue = 20;
    let coinValue = 15;
    let radius = 1.0;

    if (type === 'CUPCAKE') {
      hp = 120 + this.currentWave * 28;
      maxHp = hp;
      speed = 3.6 + Math.random() * 0.4;
      damage = 14;
      radius = 0.9;
      expValue = 25;
      coinValue = 22;

      const wrapGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.8, 12);
      const wrapMat = new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.6 });
      const wrap = new THREE.Mesh(wrapGeo, wrapMat);
      wrap.position.y = 0.4;
      group.add(wrap);
      materials.push(wrapMat);
      originalColors.push(wrapMat.color.clone());

      const frostGeo = new THREE.ConeGeometry(0.9, 0.9, 12);
      const frostMat = new THREE.MeshStandardMaterial({ color: '#a7f3d0', roughness: 0.3 });
      const frost = new THREE.Mesh(frostGeo, frostMat);
      frost.position.y = 1.1;
      group.add(frost);
      materials.push(frostMat);
      originalColors.push(frostMat.color.clone());

      const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#dc2626' });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0, 0.9, 0.7);
      group.add(eye);
    } else if (type === 'GUMMY_BEAR') {
      hp = 230 + this.currentWave * 48;
      maxHp = hp;
      speed = 2.4;
      damage = 22;
      radius = 1.2;
      expValue = 45;
      coinValue = 40;

      const gummyMat = new THREE.MeshStandardMaterial({
        color: '#84cc16',
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
      });
      materials.push(gummyMat);
      originalColors.push(gummyMat.color.clone());

      const bodyGeo = new THREE.CapsuleGeometry(0.65, 0.9, 8, 12);
      const body = new THREE.Mesh(bodyGeo, gummyMat);
      body.position.y = 1.0;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.55, 12, 12);
      const head = new THREE.Mesh(headGeo, gummyMat);
      head.position.y = 1.9;
      group.add(head);

      const eyeMat = new THREE.MeshBasicMaterial({ color: '#a855f7' });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), eyeMat);
      leftEye.position.set(-0.25, 2.0, 0.45);
      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), eyeMat);
      rightEye.position.set(0.25, 2.0, 0.45);
      group.add(leftEye, rightEye);
    } else if (type === 'GINGERBREAD') {
      hp = 360 + this.currentWave * 68;
      maxHp = hp;
      speed = 4.0;
      damage = 28;
      radius = 1.1;
      expValue = 70;
      coinValue = 65;

      const gingerMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });
      materials.push(gingerMat);
      originalColors.push(gingerMat.color.clone());

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.25), gingerMat);
      torso.position.y = 1.2;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), gingerMat);
      head.position.y = 2.1;
      group.add(head);

      const skullMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const skullFace = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), skullMat);
      skullFace.position.set(0, 2.1, 0.46);
      group.add(skullFace);
    } else if (type === 'JAWBREAKER') {
      hp = 720 + this.currentWave * 140;
      maxHp = hp;
      speed = 1.8;
      damage = 42;
      radius = 1.8;
      expValue = 140;
      coinValue = 120;

      const jawMat = new THREE.MeshStandardMaterial({
        color: '#ec4899',
        roughness: 0.15,
        metalness: 0.2,
      });
      materials.push(jawMat);
      originalColors.push(jawMat.color.clone());

      const sphereGeo = new THREE.SphereGeometry(1.6, 20, 20);
      const sphere = new THREE.Mesh(sphereGeo, jawMat);
      sphere.position.y = 1.6;
      group.add(sphere);

      const spikeGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
      const spikeMat = new THREE.MeshStandardMaterial({ color: '#facc15' });
      for (let i = 0; i < 10; i++) {
        const phi = Math.random() * Math.PI;
        const theta = Math.random() * Math.PI * 2;
        const sp = new THREE.Mesh(spikeGeo, spikeMat);
        sp.position.set(Math.sin(phi) * Math.cos(theta) * 1.6, 1.6 + Math.cos(phi) * 1.6, Math.sin(phi) * Math.sin(theta) * 1.6);
        sp.lookAt(sp.position.clone().multiplyScalar(2));
        group.add(sp);
      }
    } else if (type === 'CAKEZILLA_BOSS') {
      hp = 3600 + this.currentWave * 850;
      maxHp = hp;
      speed = 2.0;
      damage = 60;
      radius = 3.5;
      expValue = 650;
      coinValue = 550;

      const cakeMat1 = new THREE.MeshStandardMaterial({ color: '#be185d', roughness: 0.4 });
      const cakeMat2 = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.3 });
      materials.push(cakeMat1, cakeMat2);
      originalColors.push(cakeMat1.color.clone(), cakeMat2.color.clone());

      const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 1.8, 20), cakeMat1);
      tier1.position.y = 0.9;
      group.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 1.6, 20), cakeMat2);
      tier2.position.y = 2.5;
      group.add(tier2);

      const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.4, 16), cakeMat1);
      tier3.position.y = 3.9;
      group.add(tier3);

      const candleGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.6, 8);
      const candleMat = new THREE.MeshStandardMaterial({ color: '#fef08a' });
      const flameMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });

      [-1.0, 1.0].forEach((ox) => {
        const candle = new THREE.Mesh(candleGeo, candleMat);
        candle.position.set(ox, 4.8, 0);
        group.add(candle);

        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), flameMat);
        flame.position.set(ox, 5.7, 0);
        group.add(flame);
      });
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    const enemy: EnemyInstance = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      mesh: group,
      type,
      hp,
      maxHp,
      speed,
      damage,
      expValue,
      coinValue,
      radius,
      isBoss,
      hitFlashTimer: 0,
      materials,
      originalColors,
      animOffset: Math.random() * Math.PI * 2,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  // -------------------------------------------------------------
  // COMBAT & TARGETING (AUTO-AIM, ACTION BUTTON ATTACK)
  // -------------------------------------------------------------

  private updateCombat(dt: number) {
    // 1. Scan for nearest enemy to aim at
    let closestDist = Infinity;
    let closestEnemy: EnemyInstance | null = null;
    const maxScanRange = this.stats.activeWeapon === 'AMETRALLADORA' ? 24 : 6.0;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dist = e.mesh.position.distanceTo(this.playerPos);
      if (dist < closestDist && dist <= maxScanRange) {
        closestDist = dist;
        closestEnemy = e;
      }
    }

    this.targetEnemy = closestEnemy;

    // Reticle follows target
    if (this.targetEnemy) {
      this.targetReticle.visible = true;
      this.targetReticle.position.copy(this.targetEnemy.mesh.position);
      this.targetReticle.position.y = 0.06;
      this.targetReticle.rotation.z += dt * 4;
    } else {
      this.targetReticle.visible = false;
    }

    // Cooldown timers
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    // Reload timer for Ametralladora
    if (this.stats.isReloading) {
      this.reloadTimer += dt;
      this.stats.reloadProgress = Math.min(1, this.reloadTimer / 1.6);
      if (this.reloadTimer >= 1.6) {
        this.stats.currentAmmo = this.stats.maxAmmo;
        this.stats.isReloading = false;
        this.stats.reloadProgress = 0;
      }
      this.callbacks.onStatsUpdate({ ...this.stats });
    }

    // ACTION BUTTON ATTACK HANDLER
    if (this.isAttacking && this.attackCooldown <= 0) {
      if (this.stats.activeWeapon === 'AMETRALLADORA') {
        if (this.stats.isReloading) {
          // Can't shoot while reloading!
        } else if (this.stats.currentAmmo <= 0) {
          // Out of ammo! Trigger reload
          this.startReload();
        } else {
          // Fire Ametralladora bullet
          this.fireAmetralladora();
          this.stats.currentAmmo--;
          this.attackCooldown = 1 / (this.weapons[1].fireRate * this.stats.fireRateMultiplier);
          if (this.stats.currentAmmo <= 0) {
            this.startReload();
          }
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      } else if (this.stats.activeWeapon === 'MACHETE') {
        // Melee slash
        this.performMacheteSlash();
        this.attackCooldown = 1 / (this.weapons[0].fireRate * this.stats.fireRateMultiplier);
      }
    }
  }

  private fireAmetralladora() {
    const origin = this.playerPos.clone().add(new THREE.Vector3(0, 2.1, 0.4));
    let dir = new THREE.Vector3();

    if (this.targetEnemy) {
      const targetPos = this.targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, this.targetEnemy.radius * 0.7, 0));
      dir = targetPos.sub(origin).normalize();
    } else {
      dir.set(Math.sin(this.currentFacingAngle), 0, Math.cos(this.currentFacingAngle)).normalize();
    }

    soundEngine.playSubmachineGun();
    this.triggerMuzzleFlash();

    const weapon = this.weapons[1];
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#ff2b75' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      position: mesh.position,
      velocity: dir.clone().multiplyScalar(weapon.projectileSpeed || 32),
      damage: weapon.damage * this.stats.damageMultiplier,
      pierce: 1,
      piercedIds: new Set(),
      life: 0,
      maxLife: weapon.range / (weapon.projectileSpeed || 32),
      type: weapon.id,
      color: '#ff2b75',
    });
  }

  private performMacheteSlash() {
    soundEngine.playMacheteSlash();

    // Animate Machete swing
    if (this.macheteMesh) {
      this.macheteMesh.rotation.x = Math.PI / 1.5;
      setTimeout(() => {
        if (this.macheteMesh) {
          this.macheteMesh.rotation.x = 0.4;
        }
      }, 150);
    }

    // Create glowing sweet crescent slash arc in front of player
    this.createSlashWaveEffect();

    const forward = new THREE.Vector3(Math.sin(this.currentFacingAngle), 0, Math.cos(this.currentFacingAngle));
    const range = this.weapons[0].range;
    let hitCount = 0;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const toEnemy = e.mesh.position.clone().sub(this.playerPos);
      toEnemy.y = 0;
      const dist = toEnemy.length();

      if (dist <= range) {
        toEnemy.normalize();
        const dot = forward.dot(toEnemy);
        // Forward arc (~140 degrees)
        if (dot > 0.2) {
          this.damageEnemy(e, this.weapons[0].damage * this.stats.damageMultiplier);
          this.createSplatterParticles(e.mesh.position, '#ff2b75', 10);
          hitCount++;
        }
      }
    }

    if (hitCount > 0 && this.stats.specialMeter < 100) {
      this.stats.specialMeter = Math.min(100, this.stats.specialMeter + 5 * hitCount);
      if (this.stats.specialMeter >= 100) {
        this.stats.specialReady = true;
      }
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  private createSlashWaveEffect() {
    const geo = new THREE.RingGeometry(1.6, 3.6, 24, 1, 0, Math.PI * 0.7);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: '#ff2b75',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const slash = new THREE.Mesh(geo, mat);
    slash.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.2, 0));
    slash.rotation.y = this.currentFacingAngle - Math.PI * 0.35;
    this.scene.add(slash);

    let life = 0;
    const animateSlash = () => {
      life += 0.04;
      mat.opacity = Math.max(0, 0.85 - life * 4);
      slash.scale.addScalar(0.06);
      if (life < 0.2) {
        requestAnimationFrame(animateSlash);
      } else {
        this.scene.remove(slash);
        geo.dispose();
        mat.dispose();
      }
    };
    requestAnimationFrame(animateSlash);
  }

  private triggerMuzzleFlash() {
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.visible = true;
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
      this.muzzleFlashTimer = 0.045;
    }
    this.ejectShellCasing();
  }

  private ejectShellCasing() {
    const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      metalness: 0.9,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.playerPos).add(new THREE.Vector3(0.25, 2.25, 0.45));
    this.scene.add(mesh);

    const vel = new THREE.Vector3(
      1.8 + Math.random() * 1.5,
      2.2 + Math.random() * 1.5,
      -0.6 + (Math.random() - 0.5) * 1.0
    );

    this.particles.push({
      mesh,
      velocity: vel,
      life: 0,
      maxLife: 0.45,
      spin: new THREE.Vector3(Math.random() * 18, Math.random() * 18, Math.random() * 18),
    });
  }

  // -------------------------------------------------------------
  // DAMAGE, DROPS & PARTICLES
  // -------------------------------------------------------------

  private damageEnemy(enemy: EnemyInstance, amount: number, isSpecial = false) {
    const isCrit = isSpecial || Math.random() < this.stats.critChance;
    const finalDamage = isCrit ? Math.round(amount * 1.8) : amount;

    enemy.hp -= finalDamage;
    enemy.hitFlashTimer = 0.12;

    enemy.materials.forEach((m) => {
      if ('color' in m) {
        (m as THREE.MeshStandardMaterial).color.set('#ffffff');
      }
    });

    if (isCrit) {
      soundEngine.playCrit();
    } else {
      soundEngine.playHit();
    }

    this.callbacks.onAddDamageNumber({
      id: `dmg_${Date.now()}_${Math.random()}`,
      text: isCrit ? `CRIT! ${finalDamage}` : `${finalDamage}`,
      x: enemy.mesh.position.x,
      y: enemy.mesh.position.y + enemy.radius * 1.5,
      isCrit,
      color: isCrit ? '#facc15' : '#ff4d8d',
      life: 0.8,
    });

    this.createSplatterParticles(enemy.mesh.position, isCrit ? '#facc15' : '#ff4d8d', 8);

    if (this.stats.specialMeter < 100) {
      this.stats.specialMeter = Math.min(100, this.stats.specialMeter + 2.5);
      if (this.stats.specialMeter >= 100) {
        this.stats.specialReady = true;
      }
      this.callbacks.onStatsUpdate({ ...this.stats });
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyInstance) {
    this.createExplosionParticles(enemy.mesh.position, '#ff2b75', 18);
    this.createExplosionParticles(enemy.mesh.position, '#22c55e', 14);

    // Drops multiple coins with varied value!
    const coinCount = enemy.isBoss ? 8 : Math.floor(1 + Math.random() * 3);
    for (let i = 0; i < coinCount; i++) {
      const val = Math.ceil(enemy.coinValue / coinCount);
      this.spawnDrop(enemy.mesh.position, 'COIN', val);
    }

    this.spawnDrop(enemy.mesh.position, 'EXP', enemy.expValue);

    if (Math.random() < 0.08) {
      this.spawnDrop(enemy.mesh.position, 'HEART', 25);
    }

    this.scene.remove(enemy.mesh);
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.stats.totalKills++;
    this.stats.combo = (this.stats.combo || 0) + 1;
    setTimeout(() => {
      this.stats.combo = 0;
      this.callbacks.onStatsUpdate({ ...this.stats });
    }, 2000);

    const wasReady = this.stats.specialReady;
    const meterBoost = enemy.isBoss ? 40 : 10;
    this.stats.specialMeter = Math.min(100, this.stats.specialMeter + meterBoost);
    if (this.stats.specialMeter >= 100) {
      this.stats.specialReady = true;
      if (!wasReady) {
        soundEngine.playSpecialReady();
      }
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private spawnDrop(pos: THREE.Vector3, type: 'COIN' | 'EXP' | 'HEART', value: number) {
    let mesh: THREE.Object3D;

    if (type === 'COIN') {
      const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 14);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        metalness: 0.75,
        roughness: 0.2,
      });
      mesh = new THREE.Mesh(geo, mat);
    } else if (type === 'EXP') {
      const geo = new THREE.OctahedronGeometry(0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        roughness: 0.2,
      });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.SphereGeometry(0.35, 10, 10);
      const mat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.2 });
      mesh = new THREE.Mesh(geo, mat);
    }

    const spreadX = (Math.random() - 0.5) * 2.2;
    const spreadZ = (Math.random() - 0.5) * 2.2;
    mesh.position.set(pos.x + spreadX, 0.4, pos.z + spreadZ);
    this.scene.add(mesh);

    this.drops.push({
      mesh,
      position: mesh.position,
      type,
      value,
      life: 60,
      velocity: new THREE.Vector3(spreadX * 1.5, 3.5, spreadZ * 1.5),
    });
  }

  private createSplatterParticles(pos: THREE.Vector3, color: string, count: number) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 7
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3,
        spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
      });
    }
  }

  private createExplosionParticles(pos: THREE.Vector3, color: string, count: number) {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 3,
        (Math.random() - 0.5) * 12
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
      });
    }
  }

  private createDashBurstParticles() {
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: '#ff77aa', transparent: true, opacity: 0.8 });

    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.playerPos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2, (Math.random() - 0.5) * 0.8));
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3),
        life: 0,
        maxLife: 0.35,
        spin: new THREE.Vector3(1, 1, 1),
      });
    }
  }

  // -------------------------------------------------------------
  // MAIN UPDATE LOOP & DEATH ANIMATION
  // -------------------------------------------------------------

  private startDeathSequence() {
    this.isDying = true;
    this.deathTimer = 0;
    this.isAttacking = false;
    this.moveInput = { x: 0, y: 0 };
    this.playerVelocity.set(0, 0, 0);

    soundEngine.stopMusic();
    soundEngine.playPlayerDeath();

    // Burst of candy crumble, sugar sparkles, and colorful defeat confetti
    this.createDeathCrumbleParticles();

    // Scatter weapons down onto the floor beside the character
    if (this.metralletaMesh) {
      this.metralletaMesh.rotation.set(0.5, 0.3, 1.2);
      this.metralletaMesh.position.y = 0.25;
    }
    if (this.macheteMesh) {
      this.macheteMesh.rotation.set(1.5, 0, 0.4);
      this.macheteMesh.position.y = 0.2;
    }
    if (this.customGunMesh) {
      this.customGunMesh.position.y = 0.25;
    }
    if (this.customMacheteMesh) {
      this.customMacheteMesh.position.y = 0.18;
    }
  }

  private createDeathCrumbleParticles() {
    const colors = ['#f43f5e', '#fb7185', '#facc15', '#ffffff', '#38bdf8', '#c084fc'];
    const geo = new THREE.DodecahedronGeometry(0.18);
    for (let i = 0; i < 45; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.3,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.playerPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        0.5 + Math.random() * 2.0,
        (Math.random() - 0.5) * 1.2
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          2.5 + Math.random() * 4,
          (Math.random() - 0.5) * 6
        ),
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
      });
    }
  }

  private update(dt: number) {
    if (this.isPaused) return;

    // Death animation sequence
    if (this.isDying) {
      this.deathTimer += dt;
      const progress = Math.min(1, this.deathTimer / 1.5);
      const ease = progress * (2 - progress);

      // Collapse procedural character
      if (this.playerBodyParts) {
        this.playerBodyParts.torso.rotation.x = -Math.PI * 0.45 * ease;
        this.playerBodyParts.torso.position.y = 2.45 - (1.95 * ease);
        this.playerBodyParts.head.rotation.x = -0.4 * ease;
        this.playerBodyParts.leftLeg.rotation.x = -0.2 * ease;
        this.playerBodyParts.rightLeg.rotation.x = 0.35 * ease;
        this.playerBodyParts.leftArm.rotation.z = -0.7 * ease;
        this.playerBodyParts.rightArm.rotation.z = 0.7 * ease;
      }

      // Collapse custom GLB model
      if (this.customModelScene) {
        this.customModelScene.rotation.x = -Math.PI * 0.45 * ease;
        this.customModelScene.position.y = Math.max(0.12, this.customModelOptions.yOffset * (1 - ease * 0.75));
      }

      // Camera descends slowly, dramatic framing
      const targetCamPos = new THREE.Vector3(
        this.playerPos.x,
        this.playerPos.y + 2.8,
        this.playerPos.z + 5.5
      );
      this.camera.position.lerp(targetCamPos, dt * 2.5);
      this.camera.lookAt(this.playerPos.x, 0.8, this.playerPos.z);

      this.updateParticles(dt);

      if (this.deathTimer >= this.deathDuration) {
        this.handleGameOver();
      }
      return;
    }

    // 1. Dash displacement
    if (this.dashTimeRemaining > 0) {
      this.dashTimeRemaining -= dt;
      this.playerPos.addScaledVector(this.dashDirection, this.stats.speed * 2.8 * dt);
    } else {
      // Smooth movement with responsive acceleration & damped strafing
      const moveLen = Math.hypot(this.moveInput.x, this.moveInput.y);
      this.isMoving = moveLen > 0.08;

      const targetVel = new THREE.Vector3();
      if (this.isMoving) {
        targetVel.set(this.moveInput.x, 0, this.moveInput.y).normalize().multiplyScalar(this.stats.speed * moveLen);
      }
      this.playerVelocity.lerp(targetVel, Math.min(1, dt * 18));
      this.playerPos.addScaledVector(this.playerVelocity, dt);

      // Facing & Aiming Direction:
      // When attacking: face locked enemy if present to shoot or slash
      // When moving freely: face movement direction smoothly with banking tilt!
      // When idle: face nearest enemy alertly without shooting
      if (this.isAttacking && this.targetEnemy) {
        const dir = this.targetEnemy.mesh.position.clone().sub(this.playerPos);
        dir.y = 0;
        this.targetFacingAngle = Math.atan2(dir.x, dir.z);
        // Reduce bank while aiming
        this.playerGroup.rotation.z *= 0.85;
      } else if (this.isMoving) {
        this.targetFacingAngle = Math.atan2(this.playerVelocity.x, this.playerVelocity.z);
        // Dynamic banking / leaning into sideways turns for silky smooth feel
        const targetBank = -this.playerVelocity.x * 0.028;
        this.playerGroup.rotation.z = THREE.MathUtils.lerp(this.playerGroup.rotation.z, targetBank, dt * 10);
      } else if (this.targetEnemy) {
        // Idle: aim alertly at nearest enemy
        const dir = this.targetEnemy.mesh.position.clone().sub(this.playerPos);
        dir.y = 0;
        this.targetFacingAngle = Math.atan2(dir.x, dir.z);
        this.playerGroup.rotation.z = THREE.MathUtils.lerp(this.playerGroup.rotation.z, 0, dt * 10);
      } else {
        this.playerGroup.rotation.z = THREE.MathUtils.lerp(this.playerGroup.rotation.z, 0, dt * 10);
      }
    }

    // Keep player within candy arena bounds
    this.playerPos.x = Math.max(-45, Math.min(45, this.playerPos.x));
    this.playerPos.z = Math.max(-55, Math.min(55, this.playerPos.z));
    this.playerGroup.position.copy(this.playerPos);

    // Update Dash Cooldown
    if (this.stats.dashCooldown > 0) {
      this.stats.dashCooldown = Math.max(0, this.stats.dashCooldown - dt);
      if (this.stats.dashCooldown === 0) {
        this.stats.dashAvailable = true;
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    }

    // Update Sugar Rush timer
    if (this.sugarRushTimer > 0) {
      this.sugarRushTimer -= dt;
      if (Math.random() < 0.4) {
        this.createSplatterParticles(this.playerPos, '#ffe600', 2);
      }
    }

    // Update Muzzle Flash visibility timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0 && this.muzzleFlashMesh) {
        this.muzzleFlashMesh.visible = false;
      }
    }

    // Smooth shortest-arc rotation interpolation
    let angleDiff = this.targetFacingAngle - this.currentFacingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const turnRate = this.isAttacking ? 18 : 13;
    this.currentFacingAngle += angleDiff * Math.min(1, dt * turnRate);
    this.playerGroup.rotation.y = this.currentFacingAngle;

    // Character Run Animation
    this.animatePlayerCharacter(dt);

    // Camera Chase Update
    this.updateCamera(dt);

    // Combat (Aiming & Action Button Fire/Slash)
    this.isAttacking = !!this.targetEnemy;
    this.updateCombat(dt);

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update Enemies
    this.updateEnemies(dt);

    // Update Drops & Magnet Pull
    this.updateDrops(dt);

    // Update Particles
    this.updateParticles(dt);

    // Wave Progression & Spawning
    this.updateWaves(dt);

    // Send Radar Blips to HUD
    this.sendRadarData();
  }

  private animatePlayerCharacter(dt: number) {
    if (this.useCustomModel) {
      if (this.hasEmbeddedClips) {
        if (this.isMoving) {
          if (this.customRunAction && this.currentCustomAction !== this.customRunAction) {
            this.customRunAction.reset().fadeIn(0.2).play();
            if (this.currentCustomAction) this.currentCustomAction.fadeOut(0.2);
            this.currentCustomAction = this.customRunAction;
          }
        } else {
          if (this.customIdleAction && this.currentCustomAction !== this.customIdleAction) {
            this.customIdleAction.reset().fadeIn(0.2).play();
            if (this.currentCustomAction) this.currentCustomAction.fadeOut(0.2);
            this.currentCustomAction = this.customIdleAction;
          }
        }

        if (this.isAttacking && this.customAttackAction && !this.customAttackAction.isRunning()) {
          this.customAttackAction.reset().fadeIn(0.1).play();
        }
      } else if (this.customRigBones && (this.customRigBones.rightUpperArm || this.customRigBones.rightHand)) {
        // Procedural Skeletal Combat Stance & Movement (NO T-POSE!)
        this.animateProceduralCustomSkeleton(dt);
      } else if (this.customModelScene) {
        this.runCycle += dt * (this.isMoving ? 14 : 3);
        const effectiveScale = this.customModelBaseScale * this.customModelOptions.scale;
        const baseY = (-this.customModelOriginOffset.rawMinY * effectiveScale) + this.customModelOptions.yOffset;
        if (this.isMoving) {
          this.customModelScene.position.y = baseY + Math.abs(Math.sin(this.runCycle)) * 0.08;
          this.customModelScene.rotation.z = Math.sin(this.runCycle) * 0.03;
        } else {
          this.customModelScene.position.y = baseY + Math.sin(this.runCycle * 1.5) * 0.02;
          this.customModelScene.rotation.z = 0;
        }
      }
      return;
    }

    if (this.isMoving) {
      this.runCycle += dt * 14;
      const swing = Math.sin(this.runCycle) * 0.65;

      this.playerBodyParts.leftLeg.rotation.x = swing;
      this.playerBodyParts.rightLeg.rotation.x = -swing;

      this.playerBodyParts.leftArm.rotation.x = -swing * 0.7;
      this.playerBodyParts.rightArm.rotation.x = swing * 0.5;

      this.playerBodyParts.skirt.rotation.z = Math.sin(this.runCycle * 2) * 0.08;
      this.playerBodyParts.hair.rotation.x = -Math.abs(Math.sin(this.runCycle)) * 0.15;
      this.playerBodyParts.torso.position.y = 2.45 + Math.abs(Math.sin(this.runCycle)) * 0.08;
    } else {
      this.runCycle += dt * 3;
      const breath = Math.sin(this.runCycle) * 0.04;
      this.playerBodyParts.leftLeg.rotation.x = 0;
      this.playerBodyParts.rightLeg.rotation.x = 0;
      this.playerBodyParts.leftArm.rotation.x = breath;
      this.playerBodyParts.rightArm.rotation.x = -breath;
      this.playerBodyParts.torso.position.y = 2.45 + breath;
    }
  }

  // Active procedural skeletal movement & combat stance for rigged models
  private animateProceduralCustomSkeleton(dt: number) {
    if (!this.customRigBones) return;
    const b = this.customRigBones;
    const isRifle = this.stats.activeWeapon === 'AMETRALLADORA';

    if (this.isMoving) {
      this.runCycle += dt * 13.5;
      const stride = Math.sin(this.runCycle);
      const legSwing = stride * 0.65;

      // 1. Natural Running Legs with Knee Flexion
      if (b.rightThigh) {
        const rest = b.rightThigh.userData.restRotation || new THREE.Euler();
        b.rightThigh.rotation.x = rest.x + legSwing;
        if (b.rightCalf) {
          const calfRest = b.rightCalf.userData.restRotation || new THREE.Euler();
          b.rightCalf.rotation.x = calfRest.x + Math.max(0, -legSwing) * 0.8;
        }
      }
      if (b.leftThigh) {
        const rest = b.leftThigh.userData.restRotation || new THREE.Euler();
        b.leftThigh.rotation.x = rest.x - legSwing;
        if (b.leftCalf) {
          const calfRest = b.leftCalf.userData.restRotation || new THREE.Euler();
          b.leftCalf.rotation.x = calfRest.x + Math.max(0, legSwing) * 0.8;
        }
      }

      // 2. Torso Footfall Bounce & Banking
      if (this.customModelScene) {
        this.customModelScene.position.y = this.customModelOptions.yOffset + Math.abs(Math.sin(this.runCycle)) * 0.09;
        this.customModelScene.rotation.z = Math.sin(this.runCycle) * 0.04;
      }

      // 3. Combat Ready Arms Moving with Run Stride
      const armRhythm = Math.sin(this.runCycle) * 0.12;
      if (b.rightUpperArm) {
        const rest = b.rightUpperArm.userData.restRotation || new THREE.Euler();
        b.rightUpperArm.rotation.set(
          rest.x - 0.4 + armRhythm * 0.6,
          rest.y + 0.35,
          rest.z - 1.1 + armRhythm * 0.35
        );
      }
      if (b.rightForeArm) {
        const rest = b.rightForeArm.userData.restRotation || new THREE.Euler();
        b.rightForeArm.rotation.set(
          rest.x + 0.6 + armRhythm * 0.3,
          rest.y + 0.2,
          rest.z - 0.85
        );
      }
      if (b.leftUpperArm) {
        const rest = b.leftUpperArm.userData.restRotation || new THREE.Euler();
        b.leftUpperArm.rotation.set(
          rest.x - 0.3 - armRhythm * 0.5,
          rest.y - 0.4,
          rest.z + 1.05 - armRhythm * 0.35
        );
      }
      if (b.leftForeArm) {
        const rest = b.leftForeArm.userData.restRotation || new THREE.Euler();
        b.leftForeArm.rotation.set(
          rest.x + 0.7 - armRhythm * 0.25,
          rest.y - 0.3,
          rest.z + 1.2
        );
      }
      if (b.spine) {
        const rest = b.spine.userData.restRotation || new THREE.Euler();
        b.spine.rotation.x = rest.x + 0.12;
        b.spine.rotation.y = rest.y + Math.sin(this.runCycle) * 0.04;
      }
    } else {
      // IDLE ALERT COMBAT STANCE:
      this.runCycle += dt * 2.8;
      const breath = Math.sin(this.runCycle) * 0.04;

      if (this.customModelScene) {
        this.customModelScene.position.y = this.customModelOptions.yOffset + breath * 0.35;
        this.customModelScene.rotation.z = 0;
      }

      // Breathing spine & chest
      if (b.spine) {
        const rest = b.spine.userData.restRotation || new THREE.Euler();
        b.spine.rotation.x = rest.x + 0.09 + breath;
      }
      if (b.chest) {
        const rest = b.chest.userData.restRotation || new THREE.Euler();
        b.chest.rotation.x = rest.x + 0.05 + breath * 0.5;
      }

      // Staggered foot placement
      if (b.rightThigh) {
        const rest = b.rightThigh.userData.restRotation || new THREE.Euler();
        b.rightThigh.rotation.x = rest.x - 0.08;
      }
      if (b.leftThigh) {
        const rest = b.leftThigh.userData.restRotation || new THREE.Euler();
        b.leftThigh.rotation.x = rest.x + 0.08;
      }

      // Ready arms holding weapon forward
      if (b.rightUpperArm) {
        const rest = b.rightUpperArm.userData.restRotation || new THREE.Euler();
        b.rightUpperArm.rotation.set(
          rest.x - 0.38 + breath * 0.3,
          rest.y + 0.32,
          rest.z - 1.15
        );
      }
      if (b.rightForeArm) {
        const rest = b.rightForeArm.userData.restRotation || new THREE.Euler();
        b.rightForeArm.rotation.set(
          rest.x + 0.55,
          rest.y + 0.18,
          rest.z - 0.8
        );
      }
      if (b.leftUpperArm) {
        const rest = b.leftUpperArm.userData.restRotation || new THREE.Euler();
        b.leftUpperArm.rotation.set(
          rest.x - 0.28,
          rest.y - 0.38,
          rest.z + 1.1
        );
      }
      if (b.leftForeArm) {
        const rest = b.leftForeArm.userData.restRotation || new THREE.Euler();
        b.leftForeArm.rotation.set(
          rest.x + 0.65,
          rest.y - 0.25,
          rest.z + 1.25
        );
      }
    }

    // 4. Attacking Recoil & Slash
    if (this.isAttacking) {
      if (isRifle) {
        const recoil = Math.sin(Date.now() * 0.045) * 0.09;
        if (b.rightUpperArm) b.rightUpperArm.rotation.x += recoil;
        if (b.rightForeArm) b.rightForeArm.rotation.x += recoil * 1.6;
        if (b.spine) b.spine.rotation.x -= recoil * 0.5;
      } else {
        const slash = Math.sin(Date.now() * 0.02) * 0.55;
        if (b.rightUpperArm) b.rightUpperArm.rotation.x += slash;
        if (b.rightForeArm) b.rightForeArm.rotation.z += slash;
      }
    }
  }

  private updateCamera(dt: number) {
    const targetCamPos = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + 4.2,
      this.playerPos.z + 7.5
    );

    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 10));

    // Look directly at character origin / torso coordinates so mesh & bone hierarchy are right in front of camera
    const lookTarget = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + 1.8,
      this.playerPos.z
    );
    this.camera.lookAt(lookTarget);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.position.addScaledVector(p.velocity, dt);

      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (p.piercedIds.has(e.id)) continue;

        const dist = e.mesh.position.distanceTo(p.position);
        if (dist <= e.radius + 0.5) {
          this.damageEnemy(e, p.damage);
          p.piercedIds.add(e.id);
          p.pierce--;

          if (p.pierce <= 0) {
            break;
          }
        }
      }

      if (p.life >= p.maxLife || p.pierce <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        if (e.hitFlashTimer <= 0) {
          e.materials.forEach((m, idx) => {
            if ('color' in m && e.originalColors[idx]) {
              (m as THREE.MeshStandardMaterial).color.copy(e.originalColors[idx]);
            }
          });
        }
      }

      const dir = this.playerPos.clone().sub(e.mesh.position);
      const dist = dir.length();
      dir.y = 0;
      dir.normalize();

      e.animOffset += dt * 8;
      if (e.type === 'CUPCAKE') {
        e.mesh.position.y = Math.abs(Math.sin(e.animOffset)) * 0.45;
      } else if (e.type === 'GUMMY_BEAR') {
        e.mesh.scale.y = 1 + Math.sin(e.animOffset) * 0.15;
      } else if (e.type === 'JAWBREAKER') {
        e.mesh.rotation.x += dt * 6;
      }

      if (dist > e.radius) {
        e.mesh.position.addScaledVector(dir, e.speed * dt);
        e.mesh.lookAt(this.playerPos.x, e.mesh.position.y, this.playerPos.z);
      }

      if (dist < e.radius + 0.8 && this.dashTimeRemaining <= 0) {
        this.hitPlayer(e.damage * dt);
      }
    }
  }

  // Hit Player: Blue Armor bar absorbs damage first!
  private hitPlayer(damageAmount: number) {
    if (this.isDying) return;

    let remainingDamage = Math.max(1, damageAmount);

    if (this.stats.shield > 0) {
      if (this.stats.shield >= remainingDamage) {
        this.stats.shield -= remainingDamage;
        remainingDamage = 0;
        soundEngine.playShieldHit();
      } else {
        remainingDamage -= this.stats.shield;
        this.stats.shield = 0;
        soundEngine.playShieldHit();
      }
    }

    if (remainingDamage > 0) {
      this.stats.hp = Math.max(0, this.stats.hp - remainingDamage);
      soundEngine.playHurt();
    }

    this.callbacks.onStatsUpdate({ ...this.stats });

    if (this.stats.hp <= 0 && !this.isDying) {
      this.startDeathSequence();
    }
  }

  private updateDrops(dt: number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;

      if (drop.velocity.y > 0) {
        drop.position.addScaledVector(drop.velocity, dt);
        drop.velocity.y -= 9.8 * dt;
        if (drop.position.y < 0.4) {
          drop.position.y = 0.4;
          drop.velocity.set(0, 0, 0);
        }
      }

      const dist = drop.position.distanceTo(this.playerPos);
      if (dist <= this.stats.magnetRange) {
        const pullDir = this.playerPos.clone().sub(drop.position).normalize();
        const pullSpeed = Math.min(25, 8 + (this.stats.magnetRange - dist) * 4);
        drop.position.addScaledVector(pullDir, pullSpeed * dt);
      }

      drop.mesh.rotation.y += dt * 3;

      if (dist < 1.4) {
        if (drop.type === 'COIN') {
          this.stats.candyCoins += drop.value;
          soundEngine.playCoin();
          this.callbacks.onAddDamageNumber({
            id: `coin_${Date.now()}_${Math.random()}`,
            text: `+${drop.value} 🪙`,
            x: this.playerPos.x + (Math.random() - 0.5) * 1.5,
            y: this.playerPos.y + 2.5,
            isCrit: drop.value >= 30,
            color: '#facc15',
            life: 0.75,
          });
        } else if (drop.type === 'EXP') {
          this.gainExp(drop.value);
        } else if (drop.type === 'HEART') {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + drop.value);
          soundEngine.playCoin();
        }

        this.scene.remove(drop.mesh);
        this.drops.splice(i, 1);
        this.callbacks.onStatsUpdate({ ...this.stats });
        continue;
      }

      if (drop.life <= 0) {
        this.scene.remove(drop.mesh);
        this.drops.splice(i, 1);
      }
    }
  }

  private gainExp(amount: number) {
    this.stats.exp += amount;
    if (this.stats.exp >= this.stats.maxExp) {
      this.stats.exp -= this.stats.maxExp;
      this.stats.level++;
      this.stats.maxExp = Math.round(this.stats.maxExp * 1.35);

      soundEngine.playLevelUp();
      this.callbacks.onLevelUp(this.stats.level);
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 14 * dt;

      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;

      const scale = Math.max(0.01, 1 - p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private updateWaves(dt: number) {
    this.waveTimer += dt;
    this.spawnTimer += dt;

    const spawnInterval = Math.max(0.8, 2.2 - this.currentWave * 0.2);
    const maxEnemies = 16 + this.currentWave * 6;

    if (this.spawnTimer >= spawnInterval && this.enemies.length < maxEnemies) {
      this.spawnTimer = 0;
      this.spawnWaveEnemy();
    }

    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.currentWave++;
      this.callbacks.onWaveChange(this.currentWave);

      if (this.currentWave % 5 === 0) {
        this.spawnBoss();
      }
    }
  }

  private sendRadarData() {
    const blips: RadarBlip[] = [];

    this.enemies.slice(0, 30).forEach((e) => {
      blips.push({
        x: e.mesh.position.x - this.playerPos.x,
        z: e.mesh.position.z - this.playerPos.z,
        type: e.isBoss ? 'BOSS' : 'ENEMY',
      });
    });

    this.drops.slice(0, 15).forEach((d) => {
      blips.push({
        x: d.position.x - this.playerPos.x,
        z: d.position.z - this.playerPos.z,
        type: 'COIN',
      });
    });

    this.callbacks.onRadarUpdate(blips, this.currentFacingAngle);
  }

  private handleGameOver() {
    this.isPaused = true;
    soundEngine.stopMusic();
    this.callbacks.onGameOver(this.stats.candyCoins, this.stats.totalKills, this.currentWave);
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.06, this.clock.getDelta());

    // CRITICAL: Always update animation mixer so character animation plays continuously
    // even during start screen, pauses, or model preview
    if (this.customMixer) {
      this.customMixer.update(dt);
    }

    // Keep camera smoothly framing the character directly in front of the lens
    this.updateCamera(dt);

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    soundEngine.stopMusic();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
