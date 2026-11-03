/**
 * Módulo de Almacenamiento Seguro Local (Offline Audio Vault)
 * Base de datos IndexedDB: "bmc_audio_offline"
 * Algoritmo: Web Crypto API nativa AES-GCM (256 bits)
 * Clave: Derivada criptográficamente del identificador/correo del usuario en localStorage.
 * 
 * Cumplimiento estricto:
 * - Nunca descarga archivos a la carpeta de descargas del usuario ni expone el .mp3 suelto.
 * - Solo almacena datos binarios cifrados en IndexedDB.
 * - Desencripta al vuelo en memoria RAM mediante Blob y URL.createObjectURL para reproducir sin conexión.
 */

import { getChapterAudioBytes } from '../firebase/config';

const DB_NAME = 'bmc_audio_offline';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'encrypted_chapters';

let dbInstance: IDBDatabase | null = null;

/**
 * Abre o inicializa la base de datos "bmc_audio_offline"
 */
function openVaultDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        db.createObjectStore(STORE_CHAPTERS, { keyPath: 'chapterNumber' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB'));
    };
  });
}

/**
 * Deriva la CryptoKey AES-GCM (256 bits) utilizando el identificador o correo
 * del usuario almacenado en localStorage ('bmc_acceso_autorizado').
 */
async function getUserCryptoKey(userEmailOrId?: string): Promise<CryptoKey> {
  let identifier: string | null | undefined = userEmailOrId;
  if (!identifier && typeof localStorage !== 'undefined') {
    identifier = localStorage.getItem('bmc_acceso_autorizado') || localStorage.getItem('bmc_usuario_actual') || undefined;
  }
  if (!identifier) {
    identifier = 'bmc_lector_autorizado_vault';
  }

  // Obtenemos un hash SHA-256 (32 bytes = 256 bits) del identificador de sesión
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(identifier.trim().toLowerCase() + '_bmc_secure_offline_salt');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyMaterial);

  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedChapterRecord {
  chapterNumber: number;
  title: string;
  filename: string;
  iv: Uint8Array;
  encryptedBuffer: ArrayBuffer;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
}

/**
 * Verifica si un capítulo específico existe en la base de datos "bmc_audio_offline"
 */
export async function isChapterOfflineAvailable(chapterNumber: number): Promise<boolean> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.count(chapterNumber);

      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[OfflineVault] Error al verificar capítulo en bmc_audio_offline:', err);
    return false;
  }
}

/**
 * Obtiene la lista completa de números de capítulos guardados en "bmc_audio_offline"
 */
export async function getAllOfflineChapterNumbers(): Promise<number[]> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = req.result as number[];
        resolve(keys);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineVault] Error al listar capítulos offline:', err);
    return [];
  }
}

/**
 * Descarga el archivo de audio en binario, lo encripta en memoria con AES-GCM
 * y lo guarda en la base de datos IndexedDB "bmc_audio_offline".
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl?: string,
  onProgress?: (progressPercent: number) => void,
  userEmailOrId?: string
): Promise<void> {
  const db = await openVaultDB();
  const key = await getUserCryptoKey(userEmailOrId);

  if (onProgress) onProgress(15);

  // 1. Obtención de bytes binarios (utiliza Firebase Storage SDK getBytes/getBlob para eludir CORS)
  let audioBuffer: ArrayBuffer;
  try {
    audioBuffer = await getChapterAudioBytes(chapterNumber, filename);
  } catch (sdkErr) {
    console.warn(`[OfflineVault] getChapterAudioBytes falló para cap ${chapterNumber}, probando fetch con fallback:`, sdkErr);
    if (!audioUrl) throw sdkErr;
    const response = await fetch(audioUrl, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`Error ${response.status} al descargar audio para almacenamiento offline.`);
    }
    audioBuffer = await response.arrayBuffer();
  }

  if (onProgress) onProgress(75);

  // 2. Encriptación nativa en memoria con AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    audioBuffer
  );

  // 3. Guardado seguro dentro de IndexedDB "bmc_audio_offline"
  const record: EncryptedChapterRecord = {
    chapterNumber,
    title,
    filename,
    iv,
    encryptedBuffer,
    mimeType: 'audio/mpeg',
    sizeBytes: encryptedBuffer.byteLength,
    savedAt: Date.now()
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
    const store = tx.objectStore(STORE_CHAPTERS);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  if (onProgress) onProgress(100);
}

/**
 * Desencripta en memoria los datos almacenados en "bmc_audio_offline" al vuelo
 * y crea una URL temporal con URL.createObjectURL para reproducir sin conexión.
 */
export async function getDecryptedChapterAudioUrl(
  chapterNumber: number,
  userEmailOrId?: string
): Promise<string | null> {
  try {
    const db = await openVaultDB();
    const key = await getUserCryptoKey(userEmailOrId);

    const record = await new Promise<EncryptedChapterRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.get(chapterNumber);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record || !record.encryptedBuffer) {
      return null;
    }

    // Desencriptar datos con AES-GCM
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv as unknown as BufferSource },
      key,
      record.encryptedBuffer
    );

    const blob = new Blob([decryptedBuffer], { type: record.mimeType || 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`[OfflineVault] Error al desencriptar capítulo ${chapterNumber}:`, err);
    return null;
  }
}

/**
 * Elimina un capítulo de "bmc_audio_offline"
 */
export async function deleteOfflineChapter(chapterNumber: number): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
    const store = tx.objectStore(STORE_CHAPTERS);
    const req = store.delete(chapterNumber);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
