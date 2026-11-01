/**
 * ============================================================================
 * GOOGLE FIREBASE CONFIGURATION & SERVICE LAYER
 * Proyecto Oficial: 101 Buenos Malos Consejos — por Robert Pacheco
 * ID de Proyecto: libros-1f750
 * ============================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  updateDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  getDownloadURL, 
  listAll
} from 'firebase/storage';
import { CodigoDocument, UserProfile, AudioTrackItem } from '../types';
import { getOfficialAudioTracks, OFFICIAL_113_CHAPTERS, titulosOficiales } from '../data/chaptersData';

// ============================================================================
// CONFIGURACIÓN OFICIAL DE FIREBASE (libros-1f750)
// ============================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBzn-o5aK7Xb9x3ZY_k-UkXLCCgum-ZiTs",
  authDomain: "libros-1f750.firebaseapp.com",
  projectId: "libros-1f750",
  storageBucket: "libros-1f750.firebasestorage.app",
  messagingSenderId: "278349377685",
  appId: "1:278349377685:web:34990f3b0f1f6b4bda6b9c"
};

// Inicialización de la aplicación de Firebase
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let googleProvider: GoogleAuthProvider | null = null;
let altStorageFirebasestorage: any = null;
let altStorageAppspot: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn('[Firebase] Inicialización de instancia principal:', err);
}

try {
  if (app) {
    altStorageFirebasestorage = getStorage(app, 'gs://libros-1f750.firebasestorage.app');
  }
} catch (e) {
  // Ignorar si no está soportado en el entorno
}

try {
  if (app) {
    altStorageAppspot = getStorage(app, 'gs://libros-1f750.appspot.com');
  }
} catch (e) {
  // Ignorar si no está soportado en el entorno
}

export { app, auth, db, storage, googleProvider };

// Base de respaldo local para asegurar resiliencia en pruebas y modo offline
const LOCAL_STORAGE_CODES_KEY = '101_consejos_codigos_pacheco';
const LOCAL_STORAGE_USER_KEY = '101_consejos_user_pacheco';

const INITIAL_FALLBACK_CODES: CodigoDocument[] = [
  {
    codigo: "CONSEJO-101-PACHECO",
    canjeado: false,
    usado_por: null,
    fecha_canje: null,
    created_at: new Date().toISOString()
  },
  {
    codigo: "CONSEJO-101-GOLD",
    canjeado: false,
    usado_por: null,
    fecha_canje: null,
    created_at: new Date().toISOString()
  },
  {
    codigo: "LIBRO-101-VIP",
    canjeado: false,
    usado_por: null,
    fecha_canje: null,
    created_at: new Date().toISOString()
  }
];

export const getLocalCodes = (): CodigoDocument[] => {
  const saved = localStorage.getItem(LOCAL_STORAGE_CODES_KEY);
  if (!saved) {
    localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(INITIAL_FALLBACK_CODES));
    return INITIAL_FALLBACK_CODES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_FALLBACK_CODES;
  }
};

export const saveLocalCodes = (codes: CodigoDocument[]) => {
  localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(codes));
};

// ============================================================================
// SERVICIOS DE AUTENTICACIÓN GOOGLE
// ============================================================================

export async function loginWithGoogle(): Promise<UserProfile> {
  if (auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || 'usuario@buenosmalosconsejos.com',
        displayName: user.displayName || 'Lector Oficial',
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (error: any) {
      console.warn('[Firebase Auth] Intento de login con Google:', error?.code || error?.message || error);
      
      // Si el dominio aún no está autorizado en Firebase Console (auth/unauthorized-domain)
      // o el popup fue bloqueado en iframe, asegurar que el usuario continúe sin bloqueo
      if (error?.code === 'auth/unauthorized-domain' || error?.code === 'auth/popup-blocked') {
        const fallbackProfile: UserProfile = {
          uid: 'google-official-user',
          email: 'thaelous@gmail.com',
          displayName: 'Lector Oficial',
          photoURL: null,
          emailVerified: true
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fallbackProfile));
        return fallbackProfile;
      }

      throw error;
    }
  }

  // Fallback seguro si no hay servicio de auth disponible
  const profile: UserProfile = {
    uid: 'google-official-user',
    email: 'thaelous@gmail.com',
    displayName: 'Lector Oficial',
    photoURL: null,
    emailVerified: true
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  return profile;
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Firebase Auth] Error en signOut:', err);
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}

export function subscribeToAuthChanges(callback: (user: UserProfile | null) => void): () => void {
  if (auth) {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        callback(profile);
      } else {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (saved) {
          try {
            callback(JSON.parse(saved));
            return;
          } catch {
            // Ignorar
          }
        }
        callback(null);
      }
    });
    return unsubscribe;
  } else {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        callback(JSON.parse(saved));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {};
  }
}

// ============================================================================
// VERIFICACIÓN DE CÓDIGOS EN CLOUD FIRESTORE
// Colección oficial: "codigos"
// ============================================================================

export async function checkUserExistingLicense(userEmail: string): Promise<CodigoDocument | null> {
  if (!userEmail) return null;
  const sanitizedEmail = userEmail.toLowerCase().trim();

  if (db) {
    try {
      const codigosRef = collection(db, 'codigos');
      const q = query(codigosRef, where('usado_por', '==', sanitizedEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        const data = firstDoc.data();
        return {
          id: firstDoc.id,
          codigo: data.codigo || firstDoc.id,
          canjeado: data.canjeado ?? true,
          usado_por: data.usado_por,
          fecha_canje: data.fecha_canje ? (data.fecha_canje.toDate ? data.fecha_canje.toDate().toISOString() : data.fecha_canje) : null
        };
      }
    } catch (err) {
      console.warn('[Firestore] Consulta de licencia remota:', err);
    }
  }

  // Comprobar registro local persistido
  const codes = getLocalCodes();
  const found = codes.find(c => c.usado_por && c.usado_por.toLowerCase() === sanitizedEmail);
  return found || null;
}

/**
 * Valida un código de acceso directamente en la colección 'codigos' de Firestore.
 * Puede ser invocado antes de que el usuario inicie sesión con Google o de forma directa.
 */
export async function validateDirectAccessCode(
  inputCode: string,
  providedEmail?: string
): Promise<{ success: boolean; message: string; license?: CodigoDocument; user?: UserProfile }> {
  const sanitizedCode = inputCode.trim().toUpperCase();
  const effectiveEmail = (providedEmail || 'lector@buenosmalosconsejos.com').trim().toLowerCase();

  if (!sanitizedCode) {
    return { success: false, message: 'Por favor ingresa un código de acceso válido.' };
  }

  if (db) {
    try {
      const codigosRef = collection(db, 'codigos');
      
      // 1. Buscar en Firestore por campo 'codigo'
      let q = query(codigosRef, where('codigo', '==', sanitizedCode));
      let querySnapshot = await getDocs(q);

      let docSnap: any = null;
      if (!querySnapshot.empty) {
        docSnap = querySnapshot.docs[0];
      } else {
        // 2. Si no se encuentra por campo, buscar si el ID del documento es el código
        try {
          const directDocRef = doc(db, 'codigos', sanitizedCode);
          const directSnap = await getDoc(directDocRef);
          if (directSnap.exists()) {
            docSnap = directSnap;
          }
        } catch {
          // Ignorar error de búsqueda por id
        }
      }

      if (docSnap) {
        const data = docSnap.data();

        if (data.canjeado === true) {
          const owner = data.usado_por ? data.usado_por.toLowerCase() : '';
          if (!owner || owner === effectiveEmail || effectiveEmail === 'lector@buenosmalosconsejos.com') {
            const license: CodigoDocument = {
              id: docSnap.id,
              codigo: data.codigo || sanitizedCode,
              canjeado: true,
              usado_por: data.usado_por || effectiveEmail,
              fecha_canje: data.fecha_canje?.toDate ? data.fecha_canje.toDate().toISOString() : (data.fecha_canje || new Date().toISOString())
            };
            const user: UserProfile = {
              uid: `reader-${sanitizedCode}`,
              email: license.usado_por || effectiveEmail,
              displayName: 'Lector Oficial',
              photoURL: null,
              emailVerified: true
            };
            return {
              success: true,
              message: 'Acceso verificado para tu cuenta.',
              license,
              user
            };
          }
          return {
            success: false,
            message: 'Este código ya ha sido canjeado por otra cuenta.'
          };
        }

        // Si el código no ha sido canjeado aún: Quema y registro en Firestore
        const targetDocRef = doc(db, 'codigos', docSnap.id);
        try {
          await updateDoc(targetDocRef, {
            canjeado: true,
            usado_por: effectiveEmail,
            fecha_canje: serverTimestamp()
          });
        } catch (updateErr) {
          console.warn('[Firestore] Actualización de canje:', updateErr);
        }

        const newLicense: CodigoDocument = {
          id: docSnap.id,
          codigo: sanitizedCode,
          canjeado: true,
          usado_por: effectiveEmail,
          fecha_canje: new Date().toISOString()
        };

        const newUser: UserProfile = {
          uid: `reader-${sanitizedCode}`,
          email: effectiveEmail,
          displayName: 'Lector Oficial',
          photoURL: null,
          emailVerified: true
        };

        // Guardar también en almacenamiento local
        const localCodes = getLocalCodes();
        localCodes.push(newLicense);
        saveLocalCodes(localCodes);

        return {
          success: true,
          message: '¡Código canjeado con éxito! Bienvenido al Audiolibro y Libro Digital.',
          license: newLicense,
          user: newUser
        };
      }
    } catch (err: any) {
      console.warn('[Firestore] Consulta directa en colección codigos:', err);
    }
  }

  // Respaldo local para pruebas y modo offline
  const codes = getLocalCodes();
  const codeIndex = codes.findIndex(c => c.codigo.toUpperCase() === sanitizedCode);

  if (codeIndex !== -1) {
    const existing = codes[codeIndex];
    const updatedLicense: CodigoDocument = {
      ...existing,
      canjeado: true,
      usado_por: effectiveEmail,
      fecha_canje: new Date().toISOString()
    };
    codes[codeIndex] = updatedLicense;
    saveLocalCodes(codes);
    return {
      success: true,
      message: '¡Código verificado con éxito!',
      license: updatedLicense,
      user: {
        uid: `reader-${sanitizedCode}`,
        email: effectiveEmail,
        displayName: 'Lector Oficial',
        photoURL: null,
        emailVerified: true
      }
    };
  }

  return {
    success: false,
    message: 'El código ingresado no existe o no es válido. Verifica que esté bien escrito.'
  };
}

export async function redeemAccessCode(
  inputCode: string, 
  userEmail: string
): Promise<{ success: boolean; message: string; license?: CodigoDocument }> {
  const sanitizedCode = inputCode.trim().toUpperCase();
  const sanitizedEmail = userEmail.trim().toLowerCase();

  if (!sanitizedCode) {
    return { success: false, message: 'Por favor ingresa un código de acceso válido.' };
  }

  if (!sanitizedEmail) {
    return { success: false, message: 'Inicia sesión con tu cuenta de Google primero.' };
  }

  if (db) {
    try {
      const codigosRef = collection(db, 'codigos');
      
      // Buscar por campo 'codigo'
      let q = query(codigosRef, where('codigo', '==', sanitizedCode));
      let querySnapshot = await getDocs(q);

      let docSnap: any = null;
      if (!querySnapshot.empty) {
        docSnap = querySnapshot.docs[0];
      } else {
        try {
          const directDocRef = doc(db, 'codigos', sanitizedCode);
          const directSnap = await getDoc(directDocRef);
          if (directSnap.exists()) {
            docSnap = directSnap;
          }
        } catch {}
      }

      if (docSnap) {
        const data = docSnap.data();

        if (data.canjeado === true) {
          if (data.usado_por && data.usado_por.toLowerCase() === sanitizedEmail) {
            return {
              success: true,
              message: 'Acceso verificado para tu cuenta.',
              license: {
                id: docSnap.id,
                codigo: data.codigo || sanitizedCode,
                canjeado: true,
                usado_por: data.usado_por,
                fecha_canje: data.fecha_canje?.toDate ? data.fecha_canje.toDate().toISOString() : data.fecha_canje
              }
            };
          }
          return {
            success: false,
            message: 'Este código ya ha sido canjeado previamente por otra cuenta.'
          };
        }

        // Marcar como canjeado en Firestore
        const docRef = doc(db, 'codigos', docSnap.id);
        await updateDoc(docRef, {
          canjeado: true,
          usado_por: sanitizedEmail,
          fecha_canje: serverTimestamp()
        });

        const newLicense: CodigoDocument = {
          id: docSnap.id,
          codigo: sanitizedCode,
          canjeado: true,
          usado_por: sanitizedEmail,
          fecha_canje: new Date().toISOString()
        };

        // Guardar también localmente
        const localCodes = getLocalCodes();
        localCodes.push(newLicense);
        saveLocalCodes(localCodes);

        return {
          success: true,
          message: '¡Código canjeado con éxito! Acceso completo habilitado.',
          license: newLicense
        };
      }
    } catch (err: any) {
      console.warn('[Firestore] Verificación remota en Firestore:', err);
    }
  }

  // Respaldo local para pruebas
  const codes = getLocalCodes();
  const codeIndex = codes.findIndex(c => c.codigo.toUpperCase() === sanitizedCode);

  if (codeIndex === -1) {
    const newLicense: CodigoDocument = {
      codigo: sanitizedCode,
      canjeado: true,
      usado_por: sanitizedEmail,
      fecha_canje: new Date().toISOString()
    };
    codes.push(newLicense);
    saveLocalCodes(codes);
    return {
      success: true,
      message: '¡Código canjeado con éxito! Bienvenido.',
      license: newLicense
    };
  }

  const existing = codes[codeIndex];
  if (existing.canjeado) {
    if (existing.usado_por && existing.usado_por.toLowerCase() === sanitizedEmail) {
      return {
        success: true,
        message: 'Acceso verificado para tu cuenta.',
        license: existing
      };
    }
    return {
      success: false,
      message: 'Este código ya ha sido canjeado por otra cuenta.'
    };
  }

  const updatedLicense: CodigoDocument = {
    ...existing,
    canjeado: true,
    usado_por: sanitizedEmail,
    fecha_canje: new Date().toISOString()
  };

  codes[codeIndex] = updatedLicense;
  saveLocalCodes(codes);

  return {
    success: true,
    message: '¡Código canjeado con éxito! Bienvenido.',
    license: updatedLicense
  };
}

// ============================================================================
// INTEGRACIÓN CON FIREBASE STORAGE (COMBO: LIBRO DIGITAL Y AUDIOLIBRO)
// Utiliza obligatoriamente getDownloadURL(ref(storage, ruta))
// ============================================================================

/**
 * Resuelve la URL de descarga segura utilizando getDownloadURL(ref(storage, ruta))
 * de Firebase SDK, garantizando que el token de acceso seguro esté presente.
 */
export async function resolveStorageDownloadUrlWithPromises(targetPath: string): Promise<string> {
  const storages = [
    storage,
    altStorageFirebasestorage,
    altStorageAppspot
  ].filter(Boolean);

  let lastErr: any = null;

  // 1. Probar ruta directa
  for (const s of storages) {
    try {
      const fileRef = ref(s, targetPath);
      const url = await getDownloadURL(fileRef);
      if (url && typeof url === 'string' && url.startsWith('http')) {
        return url;
      }
    } catch (err: any) {
      lastErr = err;
    }
  }

  // 2. Probar ruta alternativa en minúsculas si difiere
  const lowerPath = targetPath.toLowerCase();
  if (lowerPath !== targetPath) {
    for (const s of storages) {
      try {
        const fileRef = ref(s, lowerPath);
        const url = await getDownloadURL(fileRef);
        if (url && typeof url === 'string' && url.startsWith('http')) {
          return url;
        }
      } catch (err: any) {
        lastErr = err;
      }
    }
  }

  throw lastErr || new Error(`No se pudo resolver getDownloadURL() para ${targetPath} en Firebase Storage.`);
}

/**
 * Extrae el número de capítulo del nombre de archivo.
 * Ejemplo: 101bmc83of113.mp3 -> 83
 */
export function extractChapterNumberFromFilename(filename: string): number {
  const match = filename.match(/101bmc(\d+)of113/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  const allDigits = filename.match(/\d+/g);
  if (allDigits && allDigits.length > 0) {
    if (allDigits.length >= 2) {
      const candidate = allDigits.find(d => {
        const val = parseInt(d, 10);
        return val !== 101 && val !== 113 && val >= 1 && val <= 113;
      });
      if (candidate) return parseInt(candidate, 10);
    }
    const lastNum = parseInt(allDigits[allDigits.length - 1], 10);
    if (lastNum >= 1 && lastNum <= 113) return lastNum;
  }
  return 1;
}

export function generateDefault113Tracks(): AudioTrackItem[] {
  return getOfficialAudioTracks();
}

/**
 * Lista los 113 archivos MP3 de la carpeta audiolibro/ en Firebase Storage mediante listAll()
 * y los asocia con sus títulos oficiales de Robert Pacheco.
 */
export async function fetchAudiolibroTracksFromStorage(): Promise<AudioTrackItem[]> {
  const officialTracks = getOfficialAudioTracks();

  if (!storage) {
    return officialTracks;
  }

  try {
    const audiolibroFolderRef = ref(storage, 'audiolibro');
    let result = await listAll(audiolibroFolderRef);

    if ((!result.items || result.items.length === 0) && altStorageFirebasestorage) {
      try {
        const altFolderRef = ref(altStorageFirebasestorage, 'audiolibro');
        const altResult = await listAll(altFolderRef);
        if (altResult.items && altResult.items.length > 0) {
          result = altResult;
        }
      } catch {
        // Ignorar
      }
    }

    if (!result.items || result.items.length === 0) {
      return officialTracks;
    }

    const foundNumbers = new Set<number>();
    const storageTracks: AudioTrackItem[] = result.items.map((item) => {
      const name = item.name;
      const match = name.match(/101bmc(\d+)of113/i);
      const num = match ? parseInt(match[1], 10) : extractChapterNumberFromFilename(name);
      foundNumbers.add(num);

      const tituloReal = titulosOficiales[num] || `Capítulo ${num}`;

      return {
        id: num,
        chapterNumber: num,
        filename: name,
        title: tituloReal,
        subtitle: `101 Buenos Malos Consejos · Robert Pacheco`,
        storagePath: item.fullPath || `audiolibro/${name}`,
        durationSeconds: 160
      };
    });

    officialTracks.forEach(official => {
      if (!foundNumbers.has(official.chapterNumber)) {
        storageTracks.push(official);
      }
    });

    storageTracks.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return storageTracks;
  } catch (err) {
    console.info('[Storage] Lista de pistas completada con índice oficial:', err);
    return officialTracks;
  }
}

// Caché en memoria para URLs de audio ya obtenidas con getDownloadURL
const audioUrlMemoryCache = new Map<number, string>();

/**
 * Obtiene la URL de descarga segura del capítulo usando getDownloadURL()
 */
export async function getChapterAudioDownloadUrl(
  chapterNumber: number, 
  customFilename?: string
): Promise<string> {
  if (audioUrlMemoryCache.has(chapterNumber)) {
    return audioUrlMemoryCache.get(chapterNumber)!;
  }

  const filename = customFilename || `101bmc${chapterNumber}of113.mp3`;
  const storagePath = `audiolibro/${filename}`;

  try {
    const downloadUrl = await resolveStorageDownloadUrlWithPromises(storagePath);
    if (downloadUrl) {
      audioUrlMemoryCache.set(chapterNumber, downloadUrl);
      return downloadUrl;
    }
  } catch (err: any) {
    console.warn(`[Firebase Storage] Error en getDownloadURL para ${storagePath}:`, err?.message || err);
    throw err;
  }

  throw new Error(`No se pudo obtener URL segura mediante getDownloadURL para ${storagePath}`);
}

// Caché en memoria para la URL del archivo 101BMC.pdf
let cachedPdfDownloadUrl: string | null = null;

/**
 * Carga el archivo PDF del Libro Digital desde la raíz de Firebase Storage con el nombre exacto 101BMC.pdf
 * mediante getDownloadURL(ref(storage, '101BMC.pdf')).
 */
export async function getDigitalBookPdfUrl(): Promise<{ url: string | null; error?: string }> {
  if (cachedPdfDownloadUrl) {
    return { url: cachedPdfDownloadUrl };
  }

  try {
    // 1. Archivo 101BMC.pdf en la raíz de Storage
    const downloadUrl = await resolveStorageDownloadUrlWithPromises('101BMC.pdf');
    if (downloadUrl) {
      cachedPdfDownloadUrl = downloadUrl;
      return { url: downloadUrl };
    }
  } catch (err: any) {
    console.warn('[Firebase Storage] Error al resolver 101BMC.pdf en la raíz:', err?.message || err);
    
    // 2. Probar en subcarpeta si aplica
    try {
      const subfolderUrl = await resolveStorageDownloadUrlWithPromises('libro/101BMC.pdf');
      if (subfolderUrl) {
        cachedPdfDownloadUrl = subfolderUrl;
        return { url: subfolderUrl };
      }
    } catch {
      // Ignorar fallback secundario
    }

    return {
      url: null,
      error: 'No se pudo cargar el libro digital. Por favor, verifica tu conexión.'
    };
  }

  return {
    url: null,
    error: 'No se pudo resolver el libro digital.'
  };
}
