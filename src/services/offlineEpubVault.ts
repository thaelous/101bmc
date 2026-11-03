/**
 * Módulo de Almacenamiento Seguro para el Libro Digital EPUB
 * Base de datos IndexedDB: "bmc_epub_offline"
 * 
 * Permite descargar y guardar el ArrayBuffer del libro 101BMC.epub en IndexedDB,
 * y cargarlo instantáneamente mediante ePub(arrayBuffer) incluso en modo avión sin conexión.
 */

import { ref, getBlob, getBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const DB_NAME = 'bmc_epub_offline';
const DB_VERSION = 1;
const STORE_EPUB = 'epub_store';
const RECORD_KEY = '101BMC_EPUB_FILE';

let dbInstance: IDBDatabase | null = null;

function openEpubDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_EPUB)) {
        db.createObjectStore(STORE_EPUB, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir IndexedDB bmc_epub_offline'));
    };
  });
}

/**
 * Comprueba si el libro digital EPUB ya está guardado en IndexedDB "bmc_epub_offline"
 */
export async function isEpubOfflineAvailable(): Promise<boolean> {
  try {
    const db = await openEpubDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EPUB, 'readonly');
      const store = tx.objectStore(STORE_EPUB);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => resolve(!!req.result && !!req.result.data);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[OfflineEpub] Error comprobando estado offline:', err);
    return false;
  }
}

/**
 * Guarda el ArrayBuffer del EPUB en IndexedDB "bmc_epub_offline"
 */
export async function saveEpubOffline(arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await openEpubDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPUB, 'readwrite');
    const store = tx.objectStore(STORE_EPUB);
    const req = store.put({
      id: RECORD_KEY,
      data: arrayBuffer,
      savedAt: Date.now(),
      byteLength: arrayBuffer.byteLength
    });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene el ArrayBuffer guardado en IndexedDB "bmc_epub_offline"
 */
export async function getOfflineEpubData(): Promise<ArrayBuffer | null> {
  try {
    const db = await openEpubDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EPUB, 'readonly');
      const store = tx.objectStore(STORE_EPUB);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as ArrayBuffer);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineEpub] Error leyendo EPUB desde IndexedDB:', err);
    return null;
  }
}

/**
 * Elimina el libro EPUB de IndexedDB
 */
export async function deleteOfflineEpub(): Promise<void> {
  try {
    const db = await openEpubDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EPUB, 'readwrite');
      const store = tx.objectStore(STORE_EPUB);
      const req = store.delete(RECORD_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineEpub] Error eliminando EPUB:', err);
  }
}

import { getDigitalBookEpubBytes } from '../firebase/config';

/**
 * Descarga los bytes del EPUB utilizando la SDK de Firebase Storage directamente.
 */
export async function fetchEpubBinary(): Promise<ArrayBuffer> {
  return await getDigitalBookEpubBytes();
}
