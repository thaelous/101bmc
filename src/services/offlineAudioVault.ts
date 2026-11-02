/**
 * Módulo de Almacenamiento Seguro Local (Offline Audio Vault)
 * Utiliza IndexedDB y la API nativa Web Crypto con cifrado AES-GCM de 256 bits.
 * 
 * Reglas de seguridad:
 * - Los audios se descargan en memoria y se cifran inmediatamente.
 * - En IndexedDB únicamente se guardan buffers cifrados (ciphertext + IV).
 * - No se expone el archivo .mp3 sin cifrar ni se guarda en el sistema de archivos del usuario.
 * - Cuando no hay conexión o se reproduce un capítulo guardado, se descifra al vuelo en memoria
 *   mediante un Blob URL temporal efímero.
 */

const DB_NAME = 'bmc_offline_audio_vault_v1';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'encrypted_chapters';
const STORE_KEYS = 'vault_security_keys';
const MASTER_KEY_ID = 'bmc_aes_master_key';

let cachedCryptoKey: CryptoKey | null = null;
let dbInstance: IDBDatabase | null = null;

/**
 * Inicializa y abre la base de datos IndexedDB
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

      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: 'id' });
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
 * Obtiene o genera la llave simétrica AES-GCM (256 bits) para este dispositivo.
 * La llave cruda se guarda protegida en el store privado de IndexedDB y nunca sale del navegador.
 */
async function getMasterCryptoKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  const db = await openVaultDB();

  // Intentar leer la llave existente
  const existingKeyBytes = await new Promise<Uint8Array | null>((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readonly');
    const store = tx.objectStore(STORE_KEYS);
    const req = store.get(MASTER_KEY_ID);

    req.onsuccess = () => {
      if (req.result && req.result.keyBytes) {
        resolve(req.result.keyBytes);
      } else {
        resolve(null);
      }
    };

    req.onerror = () => reject(req.error);
  });

  if (existingKeyBytes) {
    // Importar llave existente a formato CryptoKey AES-GCM
    cachedCryptoKey = await window.crypto.subtle.importKey(
      'raw',
      existingKeyBytes as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return cachedCryptoKey;
  }

  // Generar nueva semilla criptográfica segura de 256 bits (32 bytes)
  const newRawKeyBytes = new Uint8Array(32);
  window.crypto.getRandomValues(newRawKeyBytes);

  // Guardar en IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readwrite');
    const store = tx.objectStore(STORE_KEYS);
    const req = store.put({ id: MASTER_KEY_ID, keyBytes: newRawKeyBytes, createdAt: Date.now() });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Importar para uso activo
  cachedCryptoKey = await window.crypto.subtle.importKey(
    'raw',
    newRawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedCryptoKey;
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
 * Verifica si un capítulo específico está guardado y cifrado en el almacén local
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
 * Descarga el audio desde la URL de Firebase Storage, lo fragmenta y cifra en memoria con AES-GCM
 * y lo almacena protegido en IndexedDB.
 */
export async function saveChapterForOffline(
  chapterNumber: number,
  title: string,
  filename: string,
  audioUrl: string,
  onProgress?: (progressPercent: number) => void
): Promise<void> {
  const db = await openVaultDB();
  const key = await getMasterCryptoKey();

  if (onProgress) onProgress(10);

  // 1. Descargar el stream de audio como ArrayBuffer binario
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

  // 2. Generar vector de inicialización (IV) de 12 bytes aleatorios para AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  // 3. Cifrar los bytes en memoria con AES-GCM (256-bit)
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    audioBuffer
  );

  // 4. Guardar el registro cifrado en IndexedDB
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
 * Lee el archivo cifrado de IndexedDB, lo descifra en memoria usando la CryptoKey local
 * y genera una URL temporal de Blob (URL.createObjectURL) para el reproductor nativo.
 */
export async function getDecryptedChapterAudioUrl(chapterNumber: number): Promise<string | null> {
  try {
    const db = await openVaultDB();
    const key = await getMasterCryptoKey();

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

    // Descifrar con AES-GCM
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
