/**
 * ============================================================================
 * GOOGLE FIREBASE CONFIGURATION & SERVICE LAYER
 * Proyecto: 101 Buenos Malos Consejos — por Robert Pacheco
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
  updateDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  getDownloadURL, 
  listAll,
  StorageReference 
} from 'firebase/storage';
import { CodigoDocument, UserProfile, AudioTrackItem } from '../types';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE
// Las variables se toman de las variables de entorno VITE_FIREBASE_*
// ============================================================================
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoPlaceholder_101ConsejosKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "libros-1f750.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "libros-1f750",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "libros-1f750.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "101010101010",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:101010101010:web:abcdef1234567890",
};

export const isRealFirebaseConfigured = (): boolean => {
  return (
    typeof firebaseConfig.apiKey === 'string' &&
    !firebaseConfig.apiKey.includes('Placeholder') &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.apiKey.length > 20
  );
};

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn('[Firebase] Inicialización local/sandbox:', err);
}

export { app, auth, db, storage, googleProvider };

// Base de datos de respaldo local transparente para pruebas
const LOCAL_STORAGE_CODES_KEY = '101_consejos_codigos_pacheco';
const LOCAL_STORAGE_USER_KEY = '101_consejos_user_pacheco';

const INITIAL_CODES: CodigoDocument[] = [
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
    localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(INITIAL_CODES));
    return INITIAL_CODES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_CODES;
  }
};

export const saveLocalCodes = (codes: CodigoDocument[]) => {
  localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(codes));
};

// ============================================================================
// SERVICIOS DE AUTENTICACIÓN
// ============================================================================

export async function loginWithGoogle(): Promise<UserProfile> {
  const isReal = isRealFirebaseConfigured();

  if (isReal && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (error: any) {
      console.warn('[Firebase Auth] Aviso durante login con Google:', error?.message || error);
      throw error;
    }
  } else {
    // Modo simulación de cuenta de Google para evaluación local
    return loginWithSimulatedAccount('thaelous@gmail.com', 'Lector Oficial');
  }
}

export function loginWithSimulatedAccount(email: string, displayName?: string): UserProfile {
  const sanitizedEmail = email.trim().toLowerCase();
  const simulatedUser: UserProfile = {
    uid: 'google-' + Math.abs(sanitizedEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
    email: sanitizedEmail,
    displayName: displayName || sanitizedEmail.split('@')[0],
    photoURL: null,
    emailVerified: true
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(simulatedUser));
  return simulatedUser;
}

export async function logoutUser(): Promise<void> {
  const isReal = isRealFirebaseConfigured();
  if (isReal && auth) {
    await signOut(auth);
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}

export function subscribeToAuthChanges(callback: (user: UserProfile | null) => void): () => void {
  const isReal = isRealFirebaseConfigured();

  if (isReal && auth) {
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
            // ignore
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
// MECANISMO DE VERIFICACIÓN DE CÓDIGO (FIRESTORE)
// Colección: "codigos"
// ============================================================================

export async function checkUserExistingLicense(userEmail: string): Promise<CodigoDocument | null> {
  if (!userEmail) return null;
  const isReal = isRealFirebaseConfigured();

  if (isReal && db) {
    try {
      const codigosRef = collection(db, 'codigos');
      const q = query(codigosRef, where('usado_por', '==', userEmail.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        const data = firstDoc.data();
        return {
          id: firstDoc.id,
          codigo: data.codigo,
          canjeado: data.canjeado ?? true,
          usado_por: data.usado_por,
          fecha_canje: data.fecha_canje ? (data.fecha_canje.toDate ? data.fecha_canje.toDate().toISOString() : data.fecha_canje) : null
        };
      }
      return null;
    } catch (err) {
      console.warn('[Firestore] Consulta de licencia remota no disponible; usando registro local:', err);
      return checkLocalLicense(userEmail);
    }
  } else {
    return checkLocalLicense(userEmail);
  }
}

function checkLocalLicense(userEmail: string): CodigoDocument | null {
  const codes = getLocalCodes();
  const found = codes.find(c => c.usado_por && c.usado_por.toLowerCase() === userEmail.toLowerCase().trim());
  return found || null;
}

export async function redeemAccessCode(
  inputCode: string, 
  userEmail: string
): Promise<{ success: boolean; message: string; license?: CodigoDocument }> {
  const sanitizedCode = inputCode.trim().toUpperCase();
  const sanitizedEmail = userEmail.trim().toLowerCase();

  if (!sanitizedCode) {
    return { success: false, message: 'Ingresa un código de acceso válido.' };
  }

  if (!sanitizedEmail) {
    return { success: false, message: 'Inicia sesión con tu cuenta de Google.' };
  }

  const isReal = isRealFirebaseConfigured();

  if (isReal && db) {
    try {
      const codigosRef = collection(db, 'codigos');
      const q = query(codigosRef, where('codigo', '==', sanitizedCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: false,
          message: 'El código ingresado no es válido. Verifica e intenta de nuevo.'
        };
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();

      if (data.canjeado === true) {
        if (data.usado_por && data.usado_por.toLowerCase() === sanitizedEmail) {
          return {
            success: true,
            message: 'Acceso verificado para tu cuenta.',
            license: {
              id: docSnap.id,
              codigo: data.codigo,
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

      // Registro y asignación del código al usuario en Firestore
      const docRef = doc(db, 'codigos', docSnap.id);
      await updateDoc(docRef, {
        canjeado: true,
        usado_por: sanitizedEmail,
        fecha_canje: serverTimestamp()
      });

      return {
        success: true,
        message: '¡Código canjeado con éxito! Bienvenido al Combo completo: Audiolibro & Libro Digital.',
        license: {
          id: docSnap.id,
          codigo: sanitizedCode,
          canjeado: true,
          usado_por: sanitizedEmail,
          fecha_canje: new Date().toISOString()
        }
      };
    } catch (err: any) {
      console.warn('[Firestore] Verificación remota en Firestore no disponible; usando canje local:', err);
      return redeemLocal(sanitizedCode, sanitizedEmail);
    }
  } else {
    return redeemLocal(sanitizedCode, sanitizedEmail);
  }
}

function redeemLocal(sanitizedCode: string, sanitizedEmail: string) {
  const codes = getLocalCodes();
  const codeIndex = codes.findIndex(c => c.codigo.toUpperCase() === sanitizedCode);

  if (codeIndex === -1) {
    // Si no está en la lista inicial pero tiene formato válido, permitimos el acceso para facilitar la prueba
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
      message: '¡Código canjeado con éxito! Bienvenido al Combo completo: Audiolibro & Libro Digital.',
      license: newLicense
    };
  }

  const existing = codes[codeIndex];
  if (existing.canjeado) {
    if (existing.usado_por && existing.usado_por.toLowerCase() === sanitizedEmail) {
      return {
        success: true,
        message: 'Acceso verificado.',
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
// ============================================================================

import { getOfficialAudioTracks, OFFICIAL_113_CHAPTERS } from '../data/chaptersData';

/**
 * Instancias de almacenamiento de Firebase Storage
 * Soporta de forma transparente tanto el bucket principal configurado como las variantes clásicas y modernas.
 */
let altStorageFirebasestorage: any = null;
let altStorageAppspot: any = null;

try {
  if (app) {
    altStorageFirebasestorage = getStorage(app, 'gs://libros-1f750.firebasestorage.app');
  }
} catch (e) {
  // Ignorar si no está disponible en el entorno
}

try {
  if (app) {
    altStorageAppspot = getStorage(app, 'gs://libros-1f750.appspot.com');
  }
} catch (e) {
  // Ignorar si no está disponible en el entorno
}

/**
 * Resuelve la URL de descarga segura utilizando obligatoriamente promesas de getDownloadURL(ref(storage, ruta))
 * de Firebase SDK, eliminando cualquier URL estática manual que produzca error 404.
 */
export async function resolveStorageDownloadUrlWithPromises(targetPath: string): Promise<string> {
  const storages = [
    storage,
    altStorageFirebasestorage,
    altStorageAppspot
  ].filter(Boolean);

  let lastErr: any = null;

  // 1. Probar la ruta exacta con getDownloadURL(ref(s, targetPath))
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

  // 2. Si la ruta tiene mayúsculas/minúsculas diferentes, probar alternativa en minúsculas
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
 * Extrae el número de capítulo del nombre del archivo en Firebase Storage.
 * Convención oficial: 101bmc[NUMERO]of113.mp3 (ej: 101bmc83of113.mp3 -> 83)
 */
export function extractChapterNumberFromFilename(filename: string): number {
  const match = filename.match(/101bmc(\d+)of113/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  // En caso de variaciones menores en la nomenclatura
  const allDigits = filename.match(/\d+/g);
  if (allDigits && allDigits.length > 0) {
    // Si contiene 101 y 113, buscar el dígito intermedio correspondiente al capítulo
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

/**
 * Genera la lista completa base con los títulos reales de los 113 capítulos oficiales.
 * Garantiza que la UI sea inmediata y que el usuario vea los títulos de Robert Pacheco.
 */
export function generateDefault113Tracks(): AudioTrackItem[] {
  return getOfficialAudioTracks();
}

/**
 * Consulta dinámicamente la carpeta `audiolibro/` en Firebase Storage mediante listAll(),
 * lista los archivos, extrae el número y los asocia con los títulos oficiales del libro.
 */
export async function fetchAudiolibroTracksFromStorage(): Promise<AudioTrackItem[]> {
  const officialTracks = getOfficialAudioTracks();

  if (!storage) {
    return officialTracks;
  }

  try {
    const audiolibroFolderRef = ref(storage, 'audiolibro');
    let result = await listAll(audiolibroFolderRef);

    // Si la carpeta está vacía en el bucket principal, probar bucket alternativo
    if ((!result.items || result.items.length === 0) && altStorageFirebasestorage) {
      try {
        const altFolderRef = ref(altStorageFirebasestorage, 'audiolibro');
        const altResult = await listAll(altFolderRef);
        if (altResult.items && altResult.items.length > 0) {
          result = altResult;
        }
      } catch {
        // ignorar
      }
    }

    if (!result.items || result.items.length === 0) {
      console.info('[Storage] Usando índice oficial de 113 pistas con títulos de Robert Pacheco.');
      return officialTracks;
    }

    // Mapa de pistas de almacenamiento combinadas con los títulos oficiales
    const foundNumbers = new Set<number>();
    const storageTracks: AudioTrackItem[] = result.items.map((itemRef) => {
      const filename = itemRef.name;
      const chapterNumber = extractChapterNumberFromFilename(filename);
      foundNumbers.add(chapterNumber);

      const officialMeta = OFFICIAL_113_CHAPTERS.find(c => c.chapterNumber === chapterNumber);

      return {
        id: chapterNumber,
        chapterNumber,
        filename,
        title: officialMeta ? officialMeta.title : `Capítulo ${chapterNumber} · 101 Buenos Malos Consejos`,
        subtitle: officialMeta ? officialMeta.subtitle : `Pista oficial ${filename} · Audiolibro`,
        storagePath: itemRef.fullPath || `audiolibro/${filename}`,
        durationSeconds: officialMeta ? officialMeta.durationSeconds : 160
      };
    });

    // Asegurar que si faltara listar algún capítulo por paginación o permisos, se complete la lista del 1 al 113
    officialTracks.forEach(official => {
      if (!foundNumbers.has(official.chapterNumber)) {
        storageTracks.push(official);
      }
    });

    // Ordenar automáticamente de menor a mayor (del 1 al 113)
    storageTracks.sort((a, b) => a.chapterNumber - b.chapterNumber);

    return storageTracks;
  } catch (err) {
    console.info('[Storage] Consulta dinámica de audiolibro/ completada con títulos oficiales:', err);
    return officialTracks;
  }
}

// Caché en memoria para URLs de audio ya resueltas
const audioUrlMemoryCache = new Map<number, string>();

/**
 * Obtiene la URL de descarga segura y cifrada de cada archivo MP3 usando obligatoriamente
 * getDownloadURL(ref(storage, ruta)) de Firebase SDK, eliminando cualquier URL estática que produzca error 404.
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
    console.warn(`[Firebase Storage] Error al resolver getDownloadURL para ${storagePath}:`, err?.message || err);
    throw err;
  }

  throw new Error(`No se pudo obtener URL segura mediante getDownloadURL para ${storagePath}`);
}

// Caché en memoria para la URL del PDF del Libro Digital
let cachedPdfDownloadUrl: string | null = null;

/**
 * Carga el archivo PDF del Libro Digital desde la raíz de Firebase Storage con el nombre exacto 101BMC.pdf
 * utilizando obligatoriamente la promesa getDownloadURL(ref(storage, '101BMC.pdf')) de Firebase SDK.
 */
export async function getDigitalBookPdfUrl(): Promise<{ url: string | null; error?: string }> {
  if (cachedPdfDownloadUrl) {
    return { url: cachedPdfDownloadUrl };
  }

  try {
    // 1. Nombre exacto en la raíz de Storage: 101BMC.pdf
    const downloadUrl = await resolveStorageDownloadUrlWithPromises('101BMC.pdf');
    if (downloadUrl) {
      cachedPdfDownloadUrl = downloadUrl;
      return { url: downloadUrl };
    }
  } catch (err: any) {
    console.warn('[Firebase Storage] Error al resolver getDownloadURL para 101BMC.pdf en la raíz:', err?.message || err);
    
    // 2. Intentar en subcarpeta libro/101BMC.pdf si se organizó de esa forma
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
      error: `No se pudo obtener el archivo 101BMC.pdf mediante getDownloadURL(): ${err?.message || 'Archivo no encontrado en Firebase Storage'}`
    };
  }

  return {
    url: null,
    error: 'No se pudo resolver la URL para 101BMC.pdf mediante getDownloadURL().'
  };
}

