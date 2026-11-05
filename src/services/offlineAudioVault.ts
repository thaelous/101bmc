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
import { storage, getChapterAudioDownloadUrl, getChapterSignedStorageUrl } from '../firebase/config';
import { getOfficialChapterAudioUrl, getSameOriginAudioUrl } from '../data/officialAudioUrls';


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
 * Descarga el archivo de audio como Blob utilizando las fuentes oficiales
 * (Firebase Storage / Netlify), validando que sea audio real MP3.
 */
export async function fetchAudioBlob(
  chapterNumber: number,
  filename?: string,
  audioUrl?: string,
  signal?: AbortSignal
): Promise<Blob> {
  const actualFilename = filename || `101bmc${chapterNumber}of113.mp3`;

  // 1. URLs candidatas oficiales (incluyendo URL de mismo origen para evitar CORS)
  const candidateUrls: string[] = [];
  
  // Opción misma procedencia (sin restricciones de CORS en subdominios personalizados)
  const sameOriginUrl = getSameOriginAudioUrl(chapterNumber, actualFilename);
  candidateUrls.push(sameOriginUrl);

  if (audioUrl && !candidateUrls.includes(audioUrl)) {
    candidateUrls.push(audioUrl);
  }

  const officialUrl = getOfficialChapterAudioUrl(chapterNumber, actualFilename);
  if (officialUrl && !candidateUrls.includes(officialUrl)) {
    candidateUrls.push(officialUrl);
  }

  // 2. Probar fetch con URLs candidatas
  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, { signal });
      if (resp.ok) {
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/html')) {
          const blob = await resp.blob();
          if (blob && blob.size > 20000) {
            return blob;
          }
        }
      }
    } catch {}
  }

  // 3. Obtener URL pública firmada de Firebase Storage con token (&token=...)
  try {
    const signedUrl = await getChapterSignedStorageUrl(chapterNumber, actualFilename);
    if (signedUrl && !candidateUrls.includes(signedUrl)) {
      const resp = await fetch(signedUrl, { signal });
      if (resp.ok) {
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/html')) {
          const blob = await resp.blob();
          if (blob && blob.size > 20000) return blob;
        }
      }
    }
  } catch {}

  // 4. Respaldo directo en Firebase Storage SDK (comunicación directa con la API de Firebase)
  try {
    const storagePath = `audiolibro/${actualFilename}`;
    const storageRef = ref(storage, storagePath);
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        if (blob && blob.size > 20000) return blob;
      } catch {}
    }
    const bytes = await getBytes(storageRef, 50 * 1024 * 1024);
    if (bytes && bytes.byteLength > 20000) {
      return new Blob([bytes], { type: 'audio/mpeg' });
    }
  } catch {}

  // 5. Proxy de respaldo local si fuese necesario
  for (const url of candidateUrls) {
    try {
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`;
      const resp = await fetch(proxyUrl, { signal });
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 20000) return blob;
      }
    } catch {}
  }

  throw new Error(`No se pudo extraer blob de audio para el capítulo ${chapterNumber}`);
}


/**
 * Guarda un capítulo con un timeout estricto y seguro (por defecto 20 segundos).
 * Convierte la respuesta en Blob y la almacena en IndexedDB ("bmc_audios_db") y Cache API.
 * Retorna true ÚNICAMENTE cuando el archivo se ha almacenado exitosamente en el dispositivo.
 */
export async function saveChapterWithTimeout(
  chapterNumber: number,
  titleOrUrl?: string,
  filename?: string,
  audioUrl?: string,
  timeoutMs: number = 20000
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let realTitle = `Capítulo ${chapterNumber}`;
  let realFilename = filename || `101bmc${chapterNumber}of113.mp3`;
  let realAudioUrl = audioUrl;

  if (titleOrUrl) {
    if (titleOrUrl.startsWith('http://') || titleOrUrl.startsWith('https://') || titleOrUrl.startsWith('gs://')) {
      realAudioUrl = titleOrUrl;
    } else {
      realTitle = titleOrUrl;
    }
  }

  if (!realAudioUrl) {
    realAudioUrl = getOfficialChapterAudioUrl(chapterNumber) || undefined;
  }

  try {
    // 1. Descargar el Blob de audio real
    const blob = await fetchAudioBlob(chapterNumber, realFilename, realAudioUrl, controller.signal);
    if (!blob || blob.size < 20000) {
      return false;
    }

    // 2. Guardar en IndexedDB ("bmc_audios_db")
    const db = await openAudiosDB();
    const record: AudioChapterRecord = {
      chapterNumber,
      title: realTitle,
      filename: realFilename,
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

    // 3. Guardar también en Cache API nativa ("bmc-audios-v1") para doble resiliencia
    if (realAudioUrl && typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = new Response(blob, {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': blob.size.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
        await cache.put(new Request(realAudioUrl), cachedResponse);
      } catch (cacheErr) {
        console.warn(`[AudioVault] Cache API aviso en cap ${chapterNumber}:`, cacheErr);
      }
    }

    return true;
  } catch (err) {
    console.warn(`[AudioVault] Error o timeout en capítulo ${chapterNumber}:`, err);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Guarda un capítulo individual (usado por el botón individual en la lista)
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl?: string,
  onProgress?: (pct: number) => void
): Promise<boolean> {
  if (onProgress) onProgress(20);
  const success = await saveChapterWithTimeout(chapterNumber, title, filename, audioUrl, 25000);
  if (onProgress) onProgress(100);
  return success;
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
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const candidates = audioUrl ? [audioUrl] : [getOfficialChapterAudioUrl(chapterNumber)].filter(Boolean);
      for (const u of candidates) {
        const match = await cache.match(u);
        if (match) return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Obtiene el conjunto de números de capítulos guardados offline en el dispositivo
 */
export async function getAllOfflineChapterNumbers(): Promise<Set<number>> {
  const result = new Set<number>();

  // 1. Desde IndexedDB
  try {
    const db = await openAudiosDB();
    const idbKeys = await new Promise<number[]>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, 'readonly');
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = (req.result as number[]) || [];
        resolve(keys);
      };
      req.onerror = () => resolve([]);
    });

    idbKeys.forEach(k => result.add(k));
  } catch {}

  return result;
}

/**
 * Obtiene la URL de reproducción desde IndexedDB (Blob URL) o Cache API
 */
export async function getDecryptedChapterAudioUrl(chapterNumber: number, audioUrl?: string): Promise<string | null> {
  try {
    // 1. Buscar en IndexedDB
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

    // 2. Si no está en IndexedDB, buscar en Cache API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const candidates = audioUrl ? [audioUrl] : [getOfficialChapterAudioUrl(chapterNumber)].filter(Boolean);
        for (const u of candidates) {
          const match = await cache.match(u);
          if (match) {
            const blob = await match.blob();
            if (blob && blob.size > 20000) {
              return URL.createObjectURL(blob);
            }
          }
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
