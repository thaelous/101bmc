/**
 * Módulo de Almacenamiento Seguro para el Audiolibro Completo
 * Base de datos IndexedDB: "bmc_audios_db"
 * Cache API: "bmc-audios-offline-v1"
 * 
 * Permite descargar y almacenar los 113 capítulos como Blobs binarios usando:
 * - Cache API nativa del navegador (caches.open('bmc-audios-offline-v1'))
 * - Fallback con https://corsproxy.io/? + encodeURIComponent(audioUrl) para eludir CORS
 * - Firebase Storage SDK getBlob() / getBytes()
 * - XMLHttpRequest con responseType = 'blob'
 * - Reproducción instantánea offline mediante URL.createObjectURL(blob)
 */

import { ref, getBlob, getBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const DB_NAME = 'bmc_audios_db';
const DB_VERSION = 1;
const STORE_AUDIOS = 'audios';
const CACHE_NAME = 'bmc-audios-offline-v1';

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
 * Descarga el archivo de audio como Blob utilizando múltiples estrategias para evitar cualquier error de CORS:
 * 1. Firebase Storage SDK getBlob() / getBytes()
 * 2. Fallback a corsproxy.io con encodeURIComponent para extraer el ArrayBuffer limpio
 * 3. Fallback a XMLHttpRequest con responseType = 'blob'
 * 4. Cache API nativa del navegador con caches.open('bmc-audios-offline-v1')
 */
export async function fetchAudioBlob(
  chapterNumber: number,
  filename?: string,
  audioUrl?: string
): Promise<Blob> {
  const actualFilename = filename || `101bmc${chapterNumber}of113.mp3`;
  const storagePath = `audiolibro/${actualFilename}`;

  // 1. Firebase Storage SDK: getBlob() o getBytes()
  try {
    const storageRef = ref(storage, storagePath);
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        if (blob && blob.size > 1000) {
          return blob;
        }
      } catch (blobErr) {
        console.warn(`[AudioVault] getBlob aviso para ${storagePath}, probando alternativas:`, blobErr);
      }
    }
    const bytes = await getBytes(storageRef);
    if (bytes && bytes.byteLength > 1000) {
      return new Blob([bytes], { type: 'audio/mpeg' });
    }
  } catch (sdkErr) {
    console.warn(`[AudioVault] Firebase Storage SDK aviso para ${storagePath}:`, sdkErr);
  }

  // 2. Fallback con https://corsproxy.io/? + encodeURIComponent(audioUrl)
  if (audioUrl) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(audioUrl)}`;
      const proxyResp = await fetch(proxyUrl);
      if (proxyResp.ok) {
        const blob = await proxyResp.blob();
        if (blob && blob.size > 1000) {
          return blob;
        }
      }
    } catch (proxyErr) {
      console.warn(`[AudioVault] corsproxy.io fallo para cap ${chapterNumber}:`, proxyErr);
    }
  }

  // 3. Fallback a XMLHttpRequest con responseType = 'blob'
  if (audioUrl) {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', audioUrl, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            resolve(xhr.response as Blob);
          } else {
            reject(new Error(`Status XHR ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('XHR network error'));
        xhr.send();
      });

      if (blob && blob.size > 1000) {
        return blob;
      }
    } catch (xhrErr) {
      console.warn(`[AudioVault] XHR aviso para cap ${chapterNumber}:`, xhrErr);
    }
  }

  // 4. Fallback con Cache API nativa del navegador (caches.open('bmc-audios-offline-v1'))
  if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const req = new Request(audioUrl, { mode: 'no-cors' });
      await cache.put(req, await fetch(audioUrl, { mode: 'no-cors' }));
      const match = await cache.match(req);
      if (match) {
        const blob = await match.blob();
        if (blob && blob.size > 0) return blob;
      }
    } catch (cacheErr) {
      console.warn(`[AudioVault] Cache API aviso para cap ${chapterNumber}:`, cacheErr);
    }
  }

  throw new Error(`No se pudo obtener el audio para el capítulo ${chapterNumber}`);
}

/**
 * Comprueba si un capítulo está guardado en IndexedDB "bmc_audios_db"
 */
export async function isChapterOfflineAvailable(chapterNumber: number): Promise<boolean> {
  try {
    const db = await openAudiosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readonly');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.get(chapterNumber);

      req.onsuccess = () => resolve(!!req.result && !!req.result.blob);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[AudioVault] Error comprobando capítulo offline:', err);
    return false;
  }
}

/**
 * Obtiene el conjunto de números de capítulos ya guardados offline
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
 * Guarda un capítulo en IndexedDB "bmc_audios_db"
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl?: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  if (onProgress) onProgress(20);
  const blob = await fetchAudioBlob(chapterNumber, filename, audioUrl);
  if (onProgress) onProgress(70);

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

  // Guardar también en Cache API si audioUrl está presente para redundancia
  if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(audioUrl, new Response(blob));
    } catch {}
  }

  if (onProgress) onProgress(100);
}

/**
 * Obtiene la URL de objeto (URL.createObjectURL) para el capítulo desde IndexedDB o Cache API
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

    // Si no está en IndexedDB, intentar con Cache API
    if (audioUrl && typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(audioUrl);
        if (match) {
          const blob = await match.blob();
          return URL.createObjectURL(blob);
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
 * Elimina un capítulo de IndexedDB
 */
export async function deleteOfflineChapter(chapterNumber: number): Promise<void> {
  try {
    const db = await openAudiosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readwrite');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.delete(chapterNumber);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
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
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readwrite');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('[AudioVault] Error vaciando almacén de audios:', err);
  }
}
