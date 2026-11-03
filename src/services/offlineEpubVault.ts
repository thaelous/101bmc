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

/**
 * Descarga los bytes del EPUB utilizando Firebase Storage SDK, proxy local o proxy CORS
 */
export async function fetchEpubBinary(epubUrl?: string): Promise<ArrayBuffer> {
  // 1. Firebase Storage SDK directo
  try {
    const storageRef = ref(storage, '101BMC.epub');
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        if (blob && blob.size > 1000) {
          return await blob.arrayBuffer();
        }
      } catch {}
    }
    const bytes = await getBytes(storageRef);
    if (bytes && bytes.byteLength > 1000) {
      return bytes;
    }
  } catch (sdkErr) {
    console.warn('[OfflineEpub] Firebase Storage SDK aviso para 101BMC.epub:', sdkErr);
  }

  // 2. Proxy local /api/proxy-media
  if (epubUrl) {
    try {
      const localProxy = `/api/proxy-media?url=${encodeURIComponent(epubUrl)}`;
      const resp = await fetch(localProxy);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        if (buf && buf.byteLength > 1000) return buf;
      }
    } catch {}

    // 3. fetch directo con mode: 'cors'
    try {
      const resp = await fetch(epubUrl, { mode: 'cors', cache: 'force-cache' });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        if (buf && buf.byteLength > 1000) return buf;
      }
    } catch {}

    // 4. allorigins.win
    try {
      const aoUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(epubUrl)}`;
      const aoResp = await fetch(aoUrl);
      if (aoResp.ok) {
        const buf = await aoResp.arrayBuffer();
        if (buf && buf.byteLength > 1000) return buf;
      }
    } catch {}

    // 5. corsproxy.io
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(epubUrl)}`;
      const proxyResp = await fetch(proxyUrl);
      if (proxyResp.ok) {
        const buf = await proxyResp.arrayBuffer();
        if (buf && buf.byteLength > 1000) return buf;
      }
    } catch {}

    // 6. XMLHttpRequest
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', epubUrl, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
          resolve(xhr.response as ArrayBuffer);
        } else {
          reject(new Error(`Error XHR ${xhr.status} al descargar EPUB`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red en XHR para EPUB'));
      xhr.send();
    });
  }

  throw new Error('No se pudo descargar el archivo EPUB.');
}
