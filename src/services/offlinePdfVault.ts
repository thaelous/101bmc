/**
 * Módulo de Almacenamiento Seguro Local para el Libro Digital (PDF Vault)
 * Base de datos IndexedDB: "bmc_pdf_offline"
 * Algoritmo: Web Crypto API nativa AES-GCM (256 bits)
 * Clave: Derivada criptográficamente del identificador/correo del usuario en localStorage.
 * 
 * Cumplimiento estricto:
 * - Cero descargas hacia el sistema de archivos del usuario.
 * - Almacenamiento 100% cifrado dentro de IndexedDB "bmc_pdf_offline".
 * - Desencriptado al vuelo en memoria RAM cuando se lee sin conexión o en modo avión.
 */

const DB_NAME = 'bmc_pdf_offline';
const DB_VERSION = 1;
const STORE_PDF = 'pdf_store';
const RECORD_KEY = '101BMC_ENCRYPTED_PDF';

let dbInstance: IDBDatabase | null = null;

function openPdfVaultDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PDF)) {
        db.createObjectStore(STORE_PDF, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB bmc_pdf_offline'));
    };
  });
}

/**
 * Deriva la CryptoKey AES-GCM (256 bits) utilizando el identificador o correo
 * del usuario en localStorage.
 */
async function getUserCryptoKey(userEmailOrId?: string): Promise<CryptoKey> {
  let identifier: string | null | undefined = userEmailOrId;
  if (!identifier && typeof localStorage !== 'undefined') {
    identifier = localStorage.getItem('bmc_acceso_autorizado') || localStorage.getItem('bmc_usuario_actual') || undefined;
  }
  if (!identifier) {
    identifier = 'bmc_lector_autorizado_vault';
  }

  const enc = new TextEncoder();
  const keyMaterial = enc.encode(identifier.trim().toLowerCase() + '_bmc_pdf_vault_salt');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyMaterial);

  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPdfRecord {
  id: string;
  iv: Uint8Array;
  encryptedBuffer: ArrayBuffer;
  savedAt: number;
  sizeBytes: number;
}

/**
 * Verifica si el libro PDF completo está guardado en IndexedDB "bmc_pdf_offline"
 */
export async function isPdfOfflineAvailable(): Promise<boolean> {
  try {
    const db = await openPdfVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PDF, 'readonly');
      const store = tx.objectStore(STORE_PDF);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[OfflinePdfVault] Error al verificar PDF offline:', err);
    return false;
  }
}

/**
 * Cifra en memoria el ArrayBuffer del PDF con AES-GCM y lo guarda en IndexedDB "bmc_pdf_offline"
 */
export async function savePdfForOffline(
  pdfBytes: ArrayBuffer,
  onProgress?: (progressPercent: number) => void,
  userEmailOrId?: string
): Promise<void> {
  if (onProgress) onProgress(10);
  const db = await openPdfVaultDB();
  const key = await getUserCryptoKey(userEmailOrId);

  if (onProgress) onProgress(30);

  // Generar IV de 12 bytes para AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  if (onProgress) onProgress(50);

  // Cifrado simétrico AES-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    pdfBytes
  );

  if (onProgress) onProgress(80);

  const record: EncryptedPdfRecord = {
    id: RECORD_KEY,
    iv,
    encryptedBuffer,
    savedAt: Date.now(),
    sizeBytes: encryptedBuffer.byteLength
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PDF, 'readwrite');
    const store = tx.objectStore(STORE_PDF);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  if (onProgress) onProgress(100);
}

/**
 * Desencripta al vuelo los bytes del PDF almacenados en IndexedDB "bmc_pdf_offline"
 */
export async function getDecryptedPdfBytes(userEmailOrId?: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openPdfVaultDB();
    const record = await new Promise<EncryptedPdfRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_PDF, 'readonly');
      const store = tx.objectStore(STORE_PDF);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record || !record.encryptedBuffer) {
      return null;
    }

    const key = await getUserCryptoKey(userEmailOrId);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv as unknown as BufferSource },
      key,
      record.encryptedBuffer
    );

    return decryptedBuffer;
  } catch (err) {
    console.warn('[OfflinePdfVault] Error al desencriptar PDF offline:', err);
    return null;
  }
}

/**
 * Elimina el libro digital de IndexedDB
 */
export async function deleteOfflinePdf(): Promise<void> {
  const db = await openPdfVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PDF, 'readwrite');
    const store = tx.objectStore(STORE_PDF);
    const req = store.delete(RECORD_KEY);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
