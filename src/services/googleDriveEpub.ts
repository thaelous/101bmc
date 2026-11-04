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
export const GOOGLE_DRIVE_EPUB_FILE_ID = "1rgqqz4IZSeVB12Y5KIYAB3P4mZeXpFgP";

// Enlace oficial de descarga directa de Google Drive para 101BMC.epub
export const GOOGLE_DRIVE_EPUB_DIRECT_URL = 
  "https://drive.google.com/uc?export=download&id=1rgqqz4IZSeVB12Y5KIYAB3P4mZeXpFgP";

// URLs alternativas directas de Google Drive
export const GOOGLE_DRIVE_USERCONTENT_URL = 
  `https://drive.usercontent.google.com/download?id=${GOOGLE_DRIVE_EPUB_FILE_ID}&export=download&confirm=t`;

export const GOOGLE_DRIVE_CONFIRM_DIRECT_URL = 
  `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_EPUB_FILE_ID}&confirm=t`;

/**
 * Valida que los datos binarios sean un archivo ZIP / EPUB válido (empieza por 'PK' / 0x50 0x4B)
 * y que no sea una página de error o advertencia en formato HTML devuelta por el servidor.
 */
function isValidEpubBuffer(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 1000) return false;
  const bytes = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
  // EPUB es un archivo ZIP comprimido, comienza con 0x50 0x4B ('PK')
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
  const isHtml = bytes[0] === 0x3C; // '<' (ej: <!DOCTYPE o <html>)
  return isZip && !isHtml;
}

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
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch (err) {
    console.info('[GoogleDrive] Intento directo de fetch aviso:', err);
  }

  // 2. Intento directo a drive.usercontent.google.com con confirm=t
  try {
    const resp = await fetch(GOOGLE_DRIVE_USERCONTENT_URL, { mode: 'cors' });
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  // 3. Intento directo con confirm=t en drive.google.com
  try {
    const resp = await fetch(GOOGLE_DRIVE_CONFIRM_DIRECT_URL, { mode: 'cors' });
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  // 4. Fallback con proxy CORS para descargar el binario desde el enlace de Google Drive
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(proxyUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  // 5. Fallback con usercontent url a través de corsproxy.io
  try {
    const proxyUserContent = `https://corsproxy.io/?${encodeURIComponent(GOOGLE_DRIVE_USERCONTENT_URL)}`;
    const resp = await fetch(proxyUserContent);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  // 6. Fallback secundario a través de allorigins
  try {
    const aoUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(aoUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  // 7. Fallback secundario con usercontent a través de allorigins
  try {
    const aoUserContent = `https://api.allorigins.win/raw?url=${encodeURIComponent(GOOGLE_DRIVE_USERCONTENT_URL)}`;
    const resp = await fetch(aoUserContent);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      if (isValidEpubBuffer(buffer)) {
        return buffer;
      }
    }
  } catch {}

  throw new Error('No se pudo descargar el archivo 101BMC.epub desde Google Drive.');
}
