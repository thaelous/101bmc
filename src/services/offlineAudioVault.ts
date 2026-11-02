/**
 * Módulo de Almacenamiento Seguro Local (Offline Audio Vault)
 * Utiliza IndexedDB ('bmc_offline_db') y la API nativa Web Crypto con cifrado AES-GCM de 256 bits
 * derivado del identificador de sesión del usuario para máxima protección contra copias externas.
 * 
 * Reglas de seguridad estrictas:
 * - Los audios se descargan en memoria (ArrayBuffer/Blob).
 * - Se cifran inmediatamente en memoria con AES-GCM (256 bits) usando clave derivada del usuario.
 * - En IndexedDB se guardan únicamente fragmentos/buffers cifrados (ciphertext + IV).
 * - PROHIBIDO forzar descargas convencionales a la carpeta de descargas del teléfono o exponer archivos .mp3 sueltos.
 * - Al reproducir sin conexión, se descifra al vuelo en memoria RAM mediante un Blob URL temporal efímero.
 */

const DB_NAME = 'bmc_offline_db';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'encrypted_chapters';
const STORE_META = 'vault_meta';

let cachedCryptoKey: CryptoKey | null = null;
let currentSessionKeyId: string | null = null;
let dbInstance: IDBDatabase | null = null;

/**
 * Inicializa y abre la base de datos IndexedDB 'bmc_offline_db'
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

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB bmc_offline_db'));
    };
  });
}

/**
 * Obtiene o deriva la llave simétrica AES-GCM (256 bits) utilizando la Web Crypto API
 * y el identificador de sesión del usuario (correo o token) como material de derivación PBKDF2.
 */
async function getMasterCryptoKey(userSessionId?: string): Promise<CryptoKey> {
  const sessionIdentifier = (userSessionId || (typeof localStorage !== 'undefined' ? localStorage.getItem('bmc_acceso_autorizado') : null) || 'bmc_authorized_session_reader').trim().toLowerCase();

  if (cachedCryptoKey && currentSessionKeyId === sessionIdentifier) {
    return cachedCryptoKey;
  }

  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(sessionIdentifier),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode('bmc_101_robert_pacheco_secure_salt_2026');
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cachedCryptoKey = derivedKey;
  currentSessionKeyId = sessionIdentifier;
  return derivedKey;
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
 * Verifica si un capítulo específico está guardado y cifrado en el almacén local IndexedDB
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
    console.warn('[OfflineVault] Error al verificar capítulo:', err);
    return false;
  }
}

/**
 * Obtiene el listado de números de capítulos disponibles sin conexión
 */
export async function getAllOfflineChapterNumbers(): Promise<number[]> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = (req.result || []) as number[];
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
 * Descarga el audio desde la URL de Firebase Storage en memoria como ArrayBuffer/Blob,
 * lo fragmenta y cifra en memoria con AES-GCM de 256 bits derivado de la sesión,
 * y lo almacena de forma segura en IndexedDB sin forzar descargas en el teléfono.
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl: string,
  userSessionId?: string,
  onProgress?: (progressPercent: number) => void
): Promise<void> {
  const db = await openVaultDB();
  const key = await getMasterCryptoKey(userSessionId);

  if (onProgress) onProgress(10);

  // 1. Descargar el archivo de audio como ArrayBuffer binario en memoria
  const response = await fetch(audioUrl, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al descargar el archivo de audio.`);
  }

  const contentLength = Number(response.headers.get('content-length')) || 0;
  let audioBuffer: ArrayBuffer;

  if (response.body && contentLength > 0 && typeof ReadableStream !== 'undefined') {
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress) {
          const pct = Math.min(85, Math.round(10 + (receivedBytes / contentLength) * 75));
          onProgress(pct);
        }
      }
    }

    const merged = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    audioBuffer = merged.buffer;
  } else {
    if (onProgress) onProgress(50);
    audioBuffer = await response.arrayBuffer();
  }

  if (onProgress) onProgress(90);

  // 2. Generar vector de inicialización (IV) de 12 bytes aleatorios criptográficos para AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  // 3. Cifrar en memoria con AES-GCM (256-bit)
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    audioBuffer
  );

  // 4. Guardar los bloques cifrados en IndexedDB 'bmc_offline_db'
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
 * Consulta si los datos del capítulo están en IndexedDB.
 * Si existen: desencripta los datos en memoria al vuelo (AES-GCM) y crea una URL temporal (URL.createObjectURL).
 */
export async function getDecryptedChapterAudioUrl(
  chapterNumber: number,
  userSessionId?: string
): Promise<string | null> {
  try {
    const db = await openVaultDB();
    const key = await getMasterCryptoKey(userSessionId);

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

    // Desencriptar los bloques en memoria al vuelo con AES-GCM
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv as unknown as BufferSource },
      key,
      record.encryptedBuffer
    );

    const blob = new Blob([decryptedBuffer], { type: record.mimeType || 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`[OfflineVault] Error al descifrar capítulo ${chapterNumber}:`, err);
    return null;
  }
}

/**
 * Elimina un capítulo específico del almacén offline
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

/**
 * Obtiene el resumen de almacenamiento ocupado por los audios cifrados
 */
export async function getOfflineStorageSummary(): Promise<{ totalBytes: number; count: number }> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as EncryptedChapterRecord[];
        const totalBytes = records.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
        resolve({
          totalBytes,
          count: records.length
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { totalBytes: 0, count: 0 };
  }
}
