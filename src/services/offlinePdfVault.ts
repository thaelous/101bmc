/**
 * Módulo de Almacenamiento Seguro para el Libro Digital (PDF)
 * Base de datos IndexedDB: "bmc_pdf_offline"
 * 
 * Permite descargar y guardar el ArrayBuffer del libro 101BMC.pdf en memoria IndexedDB,
 * y cargarlo instantáneamente cuando no hay conexión a internet o se está en modo avión.
 */

import { ref, getBlob, getBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const DB_NAME = 'bmc_pdf_offline';
const DB_VERSION = 1;
const STORE_PDF = 'pdf_store';
const RECORD_KEY = '101BMC_PDF_FILE';

let dbInstance: IDBDatabase | null = null;

function openPdfDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
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
      reject(request.error || new Error('No se pudo abrir IndexedDB bmc_pdf_offline'));
    };
  });
}

/**
 * Comprueba si el libro digital ya está guardado en IndexedDB
 */
export async function isPdfOfflineAvailable(): Promise<boolean> {
  try {
    const db = await openPdfDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PDF, 'readonly');
      const store = tx.objectStore(STORE_PDF);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => resolve(!!req.result && !!req.result.data);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[OfflinePdf] Error comprobando estado offline:', err);
    return false;
  }
}

/**
 * Guarda el ArrayBuffer del PDF en IndexedDB "bmc_pdf_offline"
 */
export async function savePdfOffline(arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PDF, 'readwrite');
    const store = tx.objectStore(STORE_PDF);
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
 * Obtiene el ArrayBuffer guardado en IndexedDB "bmc_pdf_offline"
 */
export async function getOfflinePdfData(): Promise<ArrayBuffer | null> {
  try {
    const db = await openPdfDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDF, 'readonly');
      const store = tx.objectStore(STORE_PDF);
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
    console.warn('[OfflinePdf] Error leyendo PDF desde IndexedDB:', err);
    return null;
  }
}

/**
 * Elimina el libro de IndexedDB
 */
export async function deleteOfflinePdf(): Promise<void> {
  try {
    const db = await openPdfDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDF, 'readwrite');
      const store = tx.objectStore(STORE_PDF);
      const req = store.delete(RECORD_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflinePdf] Error eliminando PDF:', err);
  }
}

/**
 * Descarga los bytes del PDF utilizando getBlob() de Firebase Storage SDK
 * o XMLHttpRequest con responseType = 'arraybuffer' para evitar bloqueos de CORS.
 */
export async function fetchPdfBinary(pdfUrl?: string): Promise<ArrayBuffer> {
  // 1. Intentar con getBlob() / getBytes() del SDK oficial de Firebase Storage
  try {
    const storageRef = ref(storage, '101BMC.pdf');
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        return await blob.arrayBuffer();
      } catch (blobErr) {
        console.warn('[OfflinePdf] getBlob aviso para 101BMC.pdf, probando getBytes:', blobErr);
      }
    }
    const bytes = await getBytes(storageRef);
    return bytes;
  } catch (sdkErr) {
    console.warn('[OfflinePdf] Firebase Storage SDK aviso:', sdkErr);
  }

  // 2. Fallback a XMLHttpRequest con responseType = 'arraybuffer'
  if (pdfUrl) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', pdfUrl, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as ArrayBuffer);
        } else {
          reject(new Error(`Error XHR ${xhr.status} al descargar PDF`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red en XHR para PDF'));
      xhr.send();
    });
  }

  throw new Error('No se pudo descargar el archivo PDF.');
}
