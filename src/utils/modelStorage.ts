/**
 * IndexedDB storage utility for user custom 3D models (.glb / .gltf)
 * Enables persistent custom characters across page reloads
 */

const DB_NAME = 'CandyApocalypseDB';
const DB_VERSION = 1;
const STORE_NAME = 'customModels';
const MODEL_KEY = 'player_character_glb';
const CONFIG_KEY = 'player_character_config';

export interface StoredModelConfig {
  scale: number;
  yOffset: number;
  rotY: number; // in degrees
  showGun: boolean;
  modelName: string;
}

export const DEFAULT_MODEL_CONFIG: StoredModelConfig = {
  scale: 1.0,
  yOffset: 0.0,
  rotY: 0,
  showGun: true,
  modelName: '',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomModelToDB(buffer: ArrayBuffer, name: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(buffer, MODEL_KEY);
    store.put(name, `${MODEL_KEY}_name`);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save model to IndexedDB:', err);
  }
}

export async function loadCustomModelFromDB(): Promise<{ buffer: ArrayBuffer; name: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getBuffer = store.get(MODEL_KEY);
    const getName = store.get(`${MODEL_KEY}_name`);

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        if (getBuffer.result) {
          resolve({
            buffer: getBuffer.result as ArrayBuffer,
            name: (getName.result as string) || 'custom_model.glb',
          });
        } else {
          resolve(null);
        }
      };
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to load model from IndexedDB:', err);
    return null;
  }
}

export async function deleteCustomModelFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(MODEL_KEY);
    store.delete(`${MODEL_KEY}_name`);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to delete model from IndexedDB:', err);
  }
}

export function saveModelConfig(config: StoredModelConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore localStorage errors
  }
}

export function loadModelConfig(): StoredModelConfig {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (data) {
      return { ...DEFAULT_MODEL_CONFIG, ...JSON.parse(data) };
    }
  } catch {
    // Ignore fallback
  }
  return { ...DEFAULT_MODEL_CONFIG };
}
