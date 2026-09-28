/**
 * Game Type Definitions - Candy Apocalypse: Pastel Zombie Hunt
 */

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY';

export type WeaponType = 'MACHETE' | 'AMETRALLADORA';

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  description: string;
  icon: 'machete' | 'bullet';
  level: number;
  maxLevel: number;
  damage: number;
  fireRate: number; // attacks per second
  range: number;
  projectileSpeed?: number;
  currentAmmo?: number;
  maxAmmo?: number;
  isReloading?: boolean;
  unlocked: boolean;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  shield: number; // Blue Armor Bar - absorbs damage first until it runs out!
  maxShield: number;
  speed: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  critChance: number; // 0 to 1
  magnetRange: number;
  candyCoins: number;
  totalKills: number;
  level: number;
  exp: number;
  maxExp: number;
  activeWeapon: WeaponType;
  currentAmmo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  dashCooldown: number; // in seconds
  dashAvailable: boolean;
  specialMeter: number; // 0 to 100
  specialReady: boolean;
}

export type EnemyType = 'CUPCAKE' | 'GUMMY_BEAR' | 'GINGERBREAD' | 'JAWBREAKER' | 'CAKEZILLA_BOSS';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  expValue: number;
  coinValue: number;
  scale: number;
  color: string;
  accentColor: string;
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'WEAPON' | 'STAT' | 'SPECIAL';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  cost?: number; // Cost in Candy Coins based on kills
  effect: (stats: PlayerStats, weapons: WeaponInfo[]) => void;
}

export interface DamageNumber {
  id: string;
  text: string;
  x: number;
  y: number;
  isCrit: boolean;
  color: string;
  life: number;
}

export interface RadarBlip {
  x: number;
  z: number;
  type: 'ENEMY' | 'BOSS' | 'COIN';
}
