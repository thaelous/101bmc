/**
 * ============================================================================
 * SERVICIO EXCLUSIVO DE DESCARGA DESDE GOOGLE DRIVE PARA "101BMC.epub"
 * Proyecto: 101 Buenos Malos Consejos Para Mi Hijo — Robert Pacheco
 * 
 * Reemplaza completamente a Firebase Storage para el libro digital.
 * Descarga el archivo en formato binario (ArrayBuffer) y genera un Blob URL local en memoria RAM.
 * ============================================================================
 */

// ID de recurso oficial / compartido en Google Drive
export const GOOGLE_DRIVE_EPUB_FILE_ID = "1zgAhCecB8cP2033kGK5NSnfw3h8ORenZ";

// Enlace oficial de descarga directa de Google Drive
export const GOOGLE_DRIVE_EPUB_DIRECT_URL = 
  `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_EPUB_FILE_ID}`;

// URLs alternativas directas de Google Drive
export const GOOGLE_DRIVE_USERCONTENT_URL = 
  `https://drive.usercontent.google.com/download?id=${GOOGLE_DRIVE_EPUB_FILE_ID}&export=download&confirm=t`;

/**
 * Realiza el fetch del enlace de Google Drive en formato binario (ArrayBuffer)
 * con manejo de fallback para eludir restricciones de red del navegador.
 */
export async function fetchGoogleDriveEpubArrayBuffer(customUrl?: string): Promise<ArrayBuffer> {
  const targetUrl = customUrl || GOOGLE_DRIVE_EPUB_DIRECT_URL;

  // 1. Intento directo al enlace de Google Drive
  try {
    const resp = await fetch(targetUrl, { mode: 'cors' });
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch (err) {
    console.info('[GoogleDrive] Intento directo de fetch aviso:', err);
  }

  // 2. Intento directo a drive.usercontent.google.com
  try {
    const resp = await fetch(GOOGLE_DRIVE_USERCONTENT_URL, { mode: 'cors' });
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch {}

  // 3. Fallback con proxy CORS para descargar el binario desde el enlace de Google Drive
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(proxyUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch {}

  // 4. Fallback secundario a través de allorigins
  try {
    const aoUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(aoUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch {}

  // 5. Fallback con usercontent url a través de proxy
  try {
    const proxyUserContent = `https://corsproxy.io/?${encodeURIComponent(GOOGLE_DRIVE_USERCONTENT_URL)}`;
    const resp = await fetch(proxyUserContent);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch {}

  throw new Error('No se pudo descargar el archivo 101BMC.epub desde Google Drive.');
}
