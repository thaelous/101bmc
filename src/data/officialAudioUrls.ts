/**
 * URLs Oficiales de Streaming y Descarga de los 113 Capítulos del Audiolibro
 * "101 Buenos Malos Consejos" - Robert Pacheco
 * 
 * Bucket Oficial: libros-1f750.firebasestorage.app
 * Carpeta: audiolibro/
 * Patrón: https://firebasestorage.googleapis.com/v0/b/libros-1f750.firebasestorage.app/o/audiolibro%2F{NOMBRE_DEL_ARCHIVO}?alt=media
 */

export const FIREBASE_STORAGE_AUDIO_BASE_URL = "https://firebasestorage.googleapis.com/v0/b/libros-1f750.firebasestorage.app/o/audiolibro%2F";

/**
 * Retorna la URL directa oficial de Firebase Storage para cualquier capítulo
 * con el parámetro de acceso público ?alt=media garantizado de forma limpia.
 */
export function getOfficialChapterAudioUrl(chapterNumber: number, filename?: string): string {
  const actualFilename = (filename || `101bmc${chapterNumber}of113.mp3`).trim();
  const cleanFilename = actualFilename.replace(/^.*[\\/]/, '');
  return `${FIREBASE_STORAGE_AUDIO_BASE_URL}${cleanFilename}?alt=media`;
}

/**
 * Retorna la URL de proxy con el mismo origen (/storage-audio/{filename})
 * que resuelve a través de Netlify CDN eliminando cualquier restricción CORS en dominios personalizados.
 */
export function getSameOriginAudioUrl(chapterNumber: number, filename?: string): string {
  const actualFilename = (filename || `101bmc${chapterNumber}of113.mp3`).trim();
  const cleanFilename = actualFilename.replace(/^.*[\\/]/, '');
  return `/storage-audio/${cleanFilename}`;
}

/**
 * Diccionario precalculado de las 113 URLs directas de Firebase Storage
 */
export const OFFICIAL_AUDIO_URLS: Record<number, string> = Array.from({ length: 113 }, (_, i) => i + 1).reduce((acc, num) => {
  acc[num] = getOfficialChapterAudioUrl(num);
  return acc;
}, {} as Record<number, string>);

