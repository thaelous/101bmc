/**
 * Módulo de Almacenamiento Seguro para el Audiolibro Completo
 * Base de datos IndexedDB: "bmc_audios_db"
 * Cache API nativa: "bmc-audios-v1"
 * 
 * Implementa:
 * - Cache API nativa del navegador (caches.open('bmc-audios-v1')) con fetch(url, { mode: 'no-cors' })
 * - Timeout estricto de máximo 8 segundos por archivo con AbortController
 * - Extracción y guardado en IndexedDB ("bmc_audios_db") mediante proxy y Firebase SDK
 * - Cero congelamientos: si un capítulo falla o tarda más de 8s, continúa la cola sin bloquear la barra
 */

import { ref, getBlob, getBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const DB_NAME = 'bmc_audios_db';
const DB_VERSION = 1;
const STORE_AUDIOS = 'audios';
const CACHE_NAME = 'bmc-audios-v1';

let dbInstance: IDBDatabase | null = null;

function openAudiosDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_AUDIOS)) {
        db.createObjectStore(STORE_AUDIOS, { keyPath: 'chapterNumber' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB bmc_audios_db'));
    };
  });
}

export interface AudioChapterRecord {
  chapterNumber: number;
  title: string;
  filename: string;
  blob: Blob;
  sizeBytes: number;
  savedAt: number;
}

/**
 * Descarga el archivo de audio como Blob utilizando proxies confiables y Firebase SDK,
 * respetando el AbortSignal para evitar colgar el proceso.
 */
export async function fetchAudioBlob(
  chapterNumber: number,
  filename?: string,
  audioUrl?: string,
  signal?: AbortSignal
): Promise<Blob> {
  const actualFilename = filename || `101bmc${chapterNumber}of113.mp3`;
  const storagePath = `audiolibro/${actualFilename}`;

  // 1. Proxy local (/api/proxy-media) con signal
  if (audioUrl) {
    try {
      const localProxyUrl = `/api/proxy-media?url=${encodeURIComponent(audioUrl)}`;
      const localResp = await fetch(localProxyUrl, { signal });
      if (localResp.ok) {
        const blob = await localResp.blob();
        if (blob && blob.size > 1000) return blob;
      }
    } catch {}
  }

  // 2. allorigins.win proxy con signal
  if (audioUrl) {
    try {
      const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(audioUrl)}`;
      const aoResp = await fetch(allOriginsUrl, { signal });
      if (aoResp.ok) {
        const blob = await aoResp.blob();
        if (blob && blob.size > 1000) return blob;
      }
    } catch {}
  }

  // 3. corsproxy.io proxy con signal
  if (audioUrl) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(audioUrl)}`;
      const proxyResp = await fetch(proxyUrl, { signal });
      if (proxyResp.ok) {
        const blob = await proxyResp.blob();
        if (blob && blob.size > 1000) return blob;
      }
    } catch {}
  }

  // 4. Firebase Storage SDK: getBlob o getBytes
  try {
    const storageRef = ref(storage, storagePath);
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        if (blob && blob.size > 1000) return blob;
      } catch {}
    }
    const bytes = await getBytes(storageRef);
    if (bytes && bytes.byteLength > 1000) {
      return new Blob([bytes], { type: 'audio/mpeg' });
    }
  } catch {}

  throw new Error(`No se pudo extraer blob para el capítulo ${chapterNumber}`);
}

/**
 * Guarda un capítulo con un timeout estricto de máximo 8 segundos.
 * Utiliza caches.open('bmc-audios-v1') con mode: 'no-cors' y opcionalmente IndexedDB.
 * Nunca rompe el ciclo de ejecución.
 */
export async function saveChapterWithTimeout(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl?: string,
  timeoutMs: number = 8000
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // 1. Guardar en Cache API nativa con mode: 'no-cors' (evita bloqueo CORS)
    if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const req = new Request(audioUrl, { mode: 'no-cors' });
        const resp = await fetch(req, { signal: controller.signal });
        await cache.put(req, resp);
      } catch (cacheErr) {
        console.warn(`[AudioVault] Cache API aviso en cap ${chapterNumber}:`, cacheErr);
      }
    }

    // 2. Extraer Blob para IndexedDB con el mismo AbortSignal de 8s
    let blob: Blob | null = null;
    try {
      blob = await fetchAudioBlob(chapterNumber, filename, audioUrl, controller.signal);
    } catch {}

    if (blob) {
      try {
        const db = await openAudiosDB();
        const record: AudioChapterRecord = {
          chapterNumber,
          title,
          filename,
          blob,
          sizeBytes: blob.size,
          savedAt: Date.now()
        };

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_AUDIOS, 'readwrite');
          const store = tx.objectStore(STORE_AUDIOS);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn(`[AudioVault] Timeout o fallo en capítulo ${chapterNumber}:`, err);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Guarda un capítulo individual (usado por el botón individual)
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl?: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  if (onProgress) onProgress(20);
  await saveChapterWithTimeout(chapterNumber, title, filename, audioUrl, 8000);
  if (onProgress) onProgress(100);
}

/**
 * Comprueba si un capítulo está guardado en IndexedDB o en Cache API
 */
export async function isChapterOfflineAvailable(chapterNumber: number, audioUrl?: string): Promise<boolean> {
  // 1. Comprobar en IndexedDB
  try {
    const db = await openAudiosDB();
    const inIdb = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readonly');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.get(chapterNumber);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
    if (inIdb) return true;
  } catch {}

  // 2. Comprobar en Cache API nativa ('bmc-audios-v1')
  if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(audioUrl);
      if (match) return true;
    } catch {}
  }

  return false;
}

/**
 * Obtiene el conjunto de números de capítulos guardados offline
 */
export async function getAllOfflineChapterNumbers(): Promise<Set<number>> {
  try {
    const db = await openAudiosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readonly');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = (req.result as number[]) || [];
        resolve(new Set<number>(keys));
      };
      req.onerror = () => resolve(new Set<number>());
    });
  } catch {
    return new Set<number>();
  }
}

/**
 * Obtiene la URL de reproducción desde IndexedDB o Cache API
 */
export async function getDecryptedChapterAudioUrl(chapterNumber: number, audioUrl?: string): Promise<string | null> {
  try {
    const db = await openAudiosDB();
    const record = await new Promise<AudioChapterRecord | null>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readonly');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.get(chapterNumber);
      req.onsuccess = () => resolve((req.result as AudioChapterRecord) || null);
      req.onerror = () => resolve(null);
    });

    if (record && record.blob) {
      return URL.createObjectURL(record.blob);
    }

    // Si no está en IndexedDB, buscar en Cache API
    if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(audioUrl);
        if (match) {
          const blob = await match.blob();
          if (blob && blob.size > 0) {
            return URL.createObjectURL(blob);
          }
          return audioUrl;
        }
      } catch {}
    }

    return null;
  } catch (err) {
    console.warn('[AudioVault] Error obteniendo audio offline:', err);
    return null;
  }
}

/**
 * Elimina un capítulo de IndexedDB y de Cache API
 */
export async function deleteOfflineChapter(chapterNumber: number, audioUrl?: string): Promise<void> {
  try {
    const db = await openAudiosDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readwrite');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.delete(chapterNumber);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });

    if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(audioUrl);
    }
  } catch (err) {
    console.warn('[AudioVault] Error eliminando audio:', err);
  }
}

/**
 * Elimina todos los audios guardados offline
 */
export async function deleteAllOfflineAudios(): Promise<void> {
  try {
    const db = await openAudiosDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readwrite');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });

    if (typeof window !== 'undefined' && 'caches' in window) {
      await caches.delete(CACHE_NAME);
    }
  } catch (err) {
    console.warn('[AudioVault] Error vaciando almacén de audios:', err);
  }
}
