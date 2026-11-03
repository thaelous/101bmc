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
  signInWithRedirect,
  getRedirectResult,
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
  listAll,
  getBytes,
  getBlob
} from 'firebase/storage';
import { CodigoDocument, UserProfile, AudioTrackItem } from '../types';
import { getOfficialAudioTracks, OFFICIAL_113_CHAPTERS, titulosOficiales } from '../data/chaptersData';

// ============================================================================
// CONFIGURACIÓN OFICIAL DE FIREBASE (libros-1f750)
// ============================================================================
export const firebaseConfig = {
    apiKey: "AIzaSyBzno05aK7Xb9x3ZY_k-UkXLCCgum-ZiTs",
    authDomain: "libros-1f750.firebaseapp.com",
    projectId: "libros-1f750",
    storageBucket: "libros-1f750.firebasestorage.app",
    messagingSenderId: "278349377685",
    appId: "1:278349377685:web:34990f3b0f1f6b4bda6b9c"
};

// Inicialización estricta y directa de Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialización de servicios oficiales vinculados a la app inicializada
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Almacenamientos complementarios
let altStorageFirebasestorage: any = null;
let altStorageAppspot: any = null;

try {
  altStorageFirebasestorage = getStorage(app, 'gs://libros-1f750.firebasestorage.app');
} catch (e) {
  // Ignorar si no está soportado
}

try {
  altStorageAppspot = getStorage(app, 'gs://libros-1f750.appspot.com');
} catch (e) {
  // Ignorar si no está soportado
}

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
    multiuso: true,
    tipo: "universal",
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
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!user || !user.email) {
      throw new Error('No se pudo obtener el correo de la cuenta de Google seleccionada.');
    }

    const realGoogleEmail = user.email.toLowerCase().trim();
    const profile: UserProfile = {
      uid: user.uid,
      email: realGoogleEmail,
      displayName: user.displayName || 'Lector Oficial',
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return profile;
  } catch (popupErr: any) {
    console.warn('[Firebase Auth] signInWithPopup aviso:', popupErr?.code || popupErr?.message);

    const isPopupIssue = 
      popupErr?.code === 'auth/popup-blocked' ||
      popupErr?.code === 'auth/cancelled-popup-request' ||
      popupErr?.code === 'auth/popup-closed-by-user' ||
      popupErr?.code === 'auth/operation-not-supported-in-this-environment';

    if (isPopupIssue) {
      try {
        console.info('[Firebase Auth] Redirigiendo automáticamente con signInWithRedirect...');
        await signInWithRedirect(auth, provider);
        return new Promise<UserProfile>(() => {});
      } catch (redirectErr) {
        console.warn('[Firebase Auth] signInWithRedirect falló:', redirectErr);
        throw popupErr;
      }
    }

    throw popupErr;
  }
}

export async function handleGoogleRedirectResult(): Promise<UserProfile | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user && result.user.email) {
      const realGoogleEmail = result.user.email.toLowerCase().trim();
      const profile: UserProfile = {
        uid: result.user.uid,
        email: realGoogleEmail,
        displayName: result.user.displayName || 'Lector Oficial',
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch (err: any) {
    console.warn('[Firebase Auth] Aviso getRedirectResult:', err?.message || err);
  }
  return null;
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

  // 1. Revisar si existe bmc_acceso_autorizado en localStorage
  const authStored = localStorage.getItem('bmc_acceso_autorizado');
  if (authStored && (authStored.toLowerCase().trim() === sanitizedEmail || authStored === 'true')) {
    const cachedLicenseStr = localStorage.getItem('101_active_license');
    if (cachedLicenseStr) {
      try {
        const cached = JSON.parse(cachedLicenseStr);
        if (cached) return cached;
      } catch {}
    }
  }

  // 2. Consulta en Firestore: comprobar colección "codigos" con 'usado_por' y 'usadoPor'
  if (db) {
    try {
      const codigosRef = collection(db, 'codigos');
      
      // Consulta 1: usado_por == sanitizedEmail
      let q1 = query(codigosRef, where('usado_por', '==', sanitizedEmail));
      let querySnapshot = await getDocs(q1);

      // Consulta 2: usadoPor == sanitizedEmail (camelCase)
      if (querySnapshot.empty) {
        let q2 = query(codigosRef, where('usadoPor', '==', sanitizedEmail));
        querySnapshot = await getDocs(q2);
      }

      // Consulta 3: Si el original tenía mayúsculas y no arrojó resultados
      if (querySnapshot.empty && userEmail.trim() !== sanitizedEmail) {
        let q3 = query(codigosRef, where('usado_por', '==', userEmail.trim()));
        querySnapshot = await getDocs(q3);
        if (querySnapshot.empty) {
          let q4 = query(codigosRef, where('usadoPor', '==', userEmail.trim()));
          querySnapshot = await getDocs(q4);
        }
      }

      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        const data = firstDoc.data();
        const license: CodigoDocument = {
          id: firstDoc.id,
          codigo: data.codigo || firstDoc.id,
          canjeado: true,
          usado_por: sanitizedEmail,
          fecha_canje: data.fecha_canje ? (data.fecha_canje.toDate ? data.fecha_canje.toDate().toISOString() : data.fecha_canje) : (data.fechaCanje || null)
        };
        localStorage.setItem('bmc_acceso_autorizado', sanitizedEmail);
        localStorage.setItem('101_active_license', JSON.stringify(license));
        return license;
      }
    } catch (err) {
      console.warn('[Firestore] Consulta de licencia existente:', err);
    }
  }

  // 3. Comprobar registro local persistido
  const codes = getLocalCodes();
  const found = codes.find(c => 
    (c.usado_por && c.usado_por.toLowerCase().trim() === sanitizedEmail) ||
    ((c as any).usadoPor && (c as any).usadoPor.toLowerCase().trim() === sanitizedEmail)
  );
  if (found) {
    localStorage.setItem('bmc_acceso_autorizado', sanitizedEmail);
    localStorage.setItem('101_active_license', JSON.stringify(found));
    return found;
  }
  return null;
}

/**
 * Función auxiliar inteligente para localizar un documento en la colección 'codigos'
 * Comprueba tanto el ID de documento directo como los campos 'codigo', 'code' y 'codigo_acceso', admitiendo variaciones.
 */
async function findCodigoDocument(inputCode: string): Promise<any | null> {
  if (!db || !inputCode) return null;
  const rawCode = inputCode.trim();
  if (!rawCode) return null;

  const upper = rawCode.toUpperCase();
  const lower = rawCode.toLowerCase();
  const clean = rawCode.replace(/[^A-Za-z0-9]/g, '');
  const cleanUpper = clean.toUpperCase();

  const candidates = Array.from(new Set([rawCode, upper, lower, clean, cleanUpper]));
  const codigosRef = collection(db, 'codigos');

  // Paso 1: Búsqueda directa por ID de documento (muy rápido, sin necesidad de índices)
  for (const key of candidates) {
    try {
      const snap = await getDoc(doc(db, 'codigos', key));
      if (snap.exists()) {
        return snap;
      }
    } catch (e: any) {
      // Si la regla de Firestore arrojó permiso denegado, podría ser un código ya canjeado
      console.warn('[Firestore] Intento getDoc para clave:', key, e?.message);
    }
  }

  // Paso 2: Búsqueda por campos 'codigo', 'code', 'codigo_acceso'
  const fieldsToCheck = ['codigo', 'code', 'codigo_acceso'];
  for (const field of fieldsToCheck) {
    for (const key of candidates) {
      try {
        const q = query(codigosRef, where(field, '==', key));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs[0];
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Verifica únicamente la disponibilidad y validez del código en Firestore
 * SIN quemarlo ni registrar ningún correo todavía.
 */
export async function checkCodeAvailability(
  inputCode: string
): Promise<{ valid: boolean; message: string }> {
  const sanitizedCode = inputCode.trim();
  if (!sanitizedCode) {
    return { valid: false, message: 'Por favor ingresa un código de acceso válido.' };
  }

  const docSnap = await findCodigoDocument(sanitizedCode);
  if (docSnap) {
    const data = docSnap.data();
    if (data.canjeado === true) {
      return {
        valid: false,
        message: 'Este código ya ha sido canjeado anteriormente por otra cuenta.'
      };
    }
    return {
      valid: true,
      message: 'Código verificado con éxito. Continúa para desbloquear con tu cuenta de Google.'
    };
  }

  // Comprobar códigos locales de respaldo
  const codes = getLocalCodes();
  const clean = sanitizedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const found = codes.find(c => 
    c.codigo.toUpperCase() === sanitizedCode.toUpperCase() || 
    c.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') === clean
  );

  if (found) {
    if (found.canjeado) {
      return { valid: false, message: 'Este código ya ha sido canjeado.' };
    }
    return { valid: true, message: 'Código verificado con éxito.' };
  }

  return {
    valid: false,
    message: 'El código ingresado no existe en Firestore. Verifica que esté bien escrito.'
  };
}

/**
 * Registra y quema estrictamente el código en Firestore asociándolo ÚNICAMENTE
 * al correo real obtenido de la cuenta autenticada de Google.
 */
export async function linkVerifiedCodeWithGoogleUser(
  inputCode: string,
  user: UserProfile
): Promise<CodigoDocument> {
  if (!user || !user.email || !user.email.includes('@')) {
    throw new Error('No hay un usuario autenticado con Google. Por favor, inicia sesión con Google.');
  }

  const result = await redeemAccessCode(inputCode, user.email);
  if (!result.success || !result.license) {
    throw new Error(result.message || 'No se pudo validar el código en Firestore.');
  }
  return result.license;
}

/**
 * Canje de código para usuarios autenticados con Google.
 * Busca el código exactamente en Firestore, verifica que exista y que no esté usado,
 * lo marca como canjeado, guarda user.email en usado_por y devuelve la licencia.
 */
export async function redeemAccessCode(
  inputCode: string, 
  userEmail: string
): Promise<{ success: boolean; message: string; license?: CodigoDocument }> {
  const codigoLimpio = inputCode.trim().toUpperCase();
  if (!codigoLimpio) {
    return { success: false, message: 'Por favor ingresa un código de acceso válido.' };
  }

  const realGoogleEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  if (db) {
    try {
      // 1. Consultar documento directo en Firestore: doc(db, "codigos", codigoLimpio)
      let docSnap: any = null;
      try {
        const directSnap = await getDoc(doc(db, 'codigos', codigoLimpio));
        if (directSnap.exists()) {
          docSnap = directSnap;
        }
      } catch (errDoc) {
        console.warn('[Firestore] Intento directo doc:', errDoc);
      }

      // Si no se halló por ID exacto, buscar inteligentemente en colección
      if (!docSnap) {
        docSnap = await findCodigoDocument(codigoLimpio);
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();

        // 1. SOPORTE DE CÓDIGO UNIVERSAL PERMANENTE:
        // Si el documento tiene multiuso === true o tipo === "universal":
        // - NO marques el código como canjeado: true. Déjalo siempre intacto en Firestore para que otras personas puedan usarlo.
        // - Guarda la sesión local del usuario: localStorage.setItem('bmc_acceso_autorizado', correoDelUsuario || 'lector_vip').
        // - DESBLOQUEA DIRECTAMENTE el contenido (Audiolibro y Libro Digital) de inmediato.
        const isUniversal = data.multiuso === true || data.tipo === 'universal';

        if (isUniversal) {
          const authUserEmail = (realGoogleEmail && realGoogleEmail !== 'lector_vip') ? realGoogleEmail : 'lector_vip';
          const license: CodigoDocument = {
            id: docSnap.id,
            codigo: data.codigo || codigoLimpio,
            canjeado: false, // Déjalo siempre intacto en Firestore
            usado_por: authUserEmail,
            fecha_canje: new Date().toLocaleString(),
            multiuso: true,
            tipo: 'universal'
          };

          // Guardar sesión local de inmediato y abrir
          localStorage.setItem('bmc_acceso_autorizado', authUserEmail);
          localStorage.setItem('101_active_license', JSON.stringify(license));

          return {
            success: true,
            message: '¡Código universal verificado! Acceso permanente concedido.',
            license
          };
        }

        // 2. CÓDIGOS REGULARES (INDIVIDUALES):
        // Si el código NO es universal, requiere email real y se canjea
        if (!realGoogleEmail || !realGoogleEmail.includes('@')) {
          return {
            success: false,
            message: 'Ingresa tu correo electrónico real para vincular tu licencia individual a tu cuenta.'
          };
        }

        const isCanjeado = data.canjeado === true;
        const currentUsadoPor = (data.usado_por || data.usadoPor || '').toString().toLowerCase().trim();

        // Si ya está canjeado: verificar si coincide con el correo del usuario
        if (isCanjeado) {
          if (currentUsadoPor === realGoogleEmail) {
            const license: CodigoDocument = {
              id: docSnap.id,
              codigo: data.codigo || docSnap.id,
              canjeado: true,
              usado_por: realGoogleEmail,
              fecha_canje: data.fecha_canje || data.fechaCanje || null
            };
            localStorage.setItem('bmc_acceso_autorizado', realGoogleEmail);
            localStorage.setItem('101_active_license', JSON.stringify(license));
            return {
              success: true,
              message: 'Acceso verificado para tu cuenta.',
              license
            };
          }
          return {
            success: false,
            message: 'Este código ya ha sido canjeado por otra cuenta.'
          };
        }

        // Si activo === false
        if (data.activo === false) {
          return {
            success: false,
            message: 'Este código no está activo actualmente.'
          };
        }

        // Marcar como canjeado en Firestore para códigos individuales
        const docRef = doc(db, 'codigos', docSnap.id);
        const fechaCanjeActual = new Date().toLocaleString();
        
        await updateDoc(docRef, {
          canjeado: true,
          usado_por: realGoogleEmail,
          usadoPor: realGoogleEmail,
          fecha_canje: fechaCanjeActual
        });

        const newLicense: CodigoDocument = {
          id: docSnap.id,
          codigo: data.codigo || codigoLimpio,
          canjeado: true,
          usado_por: realGoogleEmail,
          fecha_canje: fechaCanjeActual
        };

        // Guardar bmc_acceso_autorizado y abrir contenido de inmediato
        localStorage.setItem('bmc_acceso_autorizado', realGoogleEmail);
        localStorage.setItem('101_active_license', JSON.stringify(newLicense));

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
      console.warn('[Firestore] Error al canjear código en Firestore:', err);
      return {
        success: false,
        message: err.message || 'Error al conectar con Firestore para validar el código.'
      };
    }
  }

  // Respaldo local si existía en base local
  const codes = getLocalCodes();
  const clean = codigoLimpio.replace(/[^A-Z0-9]/g, '');
  const codeIndex = codes.findIndex(c => 
    c.codigo.toUpperCase() === codigoLimpio || 
    c.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') === clean
  );

  if (codeIndex !== -1) {
    const existing = codes[codeIndex];

    // Soporte universal en respaldo local
    if (existing.multiuso === true || existing.tipo === 'universal') {
      const authUserEmail = (realGoogleEmail && realGoogleEmail !== 'lector_vip') ? realGoogleEmail : 'lector_vip';
      localStorage.setItem('bmc_acceso_autorizado', authUserEmail);
      localStorage.setItem('101_active_license', JSON.stringify(existing));
      return {
        success: true,
        message: '¡Código universal verificado! Acceso permanente concedido.',
        license: existing
      };
    }

    if (!realGoogleEmail || !realGoogleEmail.includes('@')) {
      return {
        success: false,
        message: 'Ingresa tu correo electrónico real para vincular tu licencia individual.'
      };
    }

    if (existing.canjeado && existing.usado_por && existing.usado_por.toLowerCase() !== realGoogleEmail) {
      return {
        success: false,
        message: 'Este código ya ha sido canjeado por otra cuenta.'
      };
    }
    const fechaCanjeActual = new Date().toLocaleString();
    const updatedLicense: CodigoDocument = {
      ...existing,
      canjeado: true,
      usado_por: realGoogleEmail,
      fecha_canje: fechaCanjeActual
    };
    codes[codeIndex] = updatedLicense;
    saveLocalCodes(codes);
    localStorage.setItem('bmc_acceso_autorizado', realGoogleEmail);
    localStorage.setItem('101_active_license', JSON.stringify(updatedLicense));
    return {
      success: true,
      message: '¡Código canjeado con éxito! Bienvenido.',
      license: updatedLicense
    };
  }

  return {
    success: false,
    message: 'El código ingresado no existe en Firestore. Verifica que esté bien escrito.'
  };
}

/**
 * Valida un código directamente requiriendo obligatoriamente un correo de Google autenticado.
 * Si no se proporciona, detiene el proceso e informa al usuario.
 */
export async function validateDirectAccessCode(
  inputCode: string,
  userEmail?: string
): Promise<{ success: boolean; message: string; license?: CodigoDocument; user?: UserProfile }> {
  const sanitizedCode = inputCode.trim().toUpperCase();
  const realGoogleEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  if (!sanitizedCode) {
    return { success: false, message: 'Por favor ingresa un código de acceso válido.' };
  }

  if (!realGoogleEmail || !realGoogleEmail.includes('@')) {
    return {
      success: false,
      message: 'Debes iniciar sesión con tu cuenta de Google para canjear este código y vincularlo a tu correo.'
    };
  }

  const result = await redeemAccessCode(sanitizedCode, realGoogleEmail);
  if (result.success && result.license) {
    const userProfile: UserProfile = {
      uid: `google-${realGoogleEmail}`,
      email: realGoogleEmail,
      displayName: 'Lector Oficial',
      photoURL: null,
      emailVerified: true
    };
    return {
      success: true,
      message: result.message,
      license: result.license,
      user: userProfile
    };
  }

  return {
    success: false,
    message: result.message || 'Código no válido.'
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

// Caché en memoria para la URL del archivo 101BMC.epub
let cachedEpubDownloadUrl: string | null = null;

/**
 * Carga el archivo EPUB del Libro Digital desde la raíz de Firebase Storage con el nombre exacto 101BMC.epub
 * mediante getDownloadURL(ref(storage, '101BMC.epub')).
 */
export async function getDigitalBookEpubUrl(): Promise<{ url: string | null; error?: string }> {
  if (cachedEpubDownloadUrl) {
    return { url: cachedEpubDownloadUrl };
  }

  try {
    // 1. Archivo 101BMC.epub en la raíz de Storage
    const downloadUrl = await resolveStorageDownloadUrlWithPromises('101BMC.epub');
    if (downloadUrl) {
      cachedEpubDownloadUrl = downloadUrl;
      return { url: downloadUrl };
    }
  } catch (err: any) {
    console.warn('[Firebase Storage] Error al resolver 101BMC.epub en la raíz:', err?.message || err);
    
    // 2. Probar en subcarpeta si aplica
    try {
      const subfolderUrl = await resolveStorageDownloadUrlWithPromises('libro/101BMC.epub');
      if (subfolderUrl) {
        cachedEpubDownloadUrl = subfolderUrl;
        return { url: subfolderUrl };
      }
    } catch {
      // Ignorar fallback secundario
    }

    return {
      url: null,
      error: 'No se pudo cargar el libro digital EPUB. Por favor, verifica tu conexión.'
    };
  }

  return {
    url: null,
    error: 'No se pudo resolver el libro digital EPUB.'
  };
}

/**
 * Obtiene los bytes binarios del archivo 101BMC.epub directamente de Firebase Storage
 * utilizando la SDK modular de Firebase (getBlob y getBytes con límite de 100MB).
 */
export async function getDigitalBookEpubBytes(): Promise<ArrayBuffer> {
  const storages = [
    storage,
    altStorageFirebasestorage,
    altStorageAppspot
  ].filter(Boolean);

  let lastError: any = null;

  // 1. Descarga directa con getBlob() de Firebase Storage SDK
  for (const s of storages) {
    try {
      const storageRef = ref(s, '101BMC.epub');
      const blob = await getBlob(storageRef);
      if (blob && blob.size > 1000) {
        return await blob.arrayBuffer();
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. Descarga directa con getBytes() especificando límite de 100MB
  for (const s of storages) {
    try {
      const storageRef = ref(s, '101BMC.epub');
      const bytes = await getBytes(storageRef, 100 * 1024 * 1024);
      if (bytes && bytes.byteLength > 1000) {
        return bytes;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 3. Probar ruta alternativa en minúsculas '101bmc.epub'
  for (const s of storages) {
    try {
      const storageRef = ref(s, '101bmc.epub');
      const blob = await getBlob(storageRef);
      if (blob && blob.size > 1000) {
        return await blob.arrayBuffer();
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 4. Intentar con getDownloadURL() y fetch directo
  try {
    const downloadUrl = await resolveStorageDownloadUrlWithPromises('101BMC.epub');
    if (downloadUrl) {
      const resp = await fetch(downloadUrl);
      if (resp.ok) {
        return await resp.arrayBuffer();
      }
    }
  } catch (err: any) {
    lastError = err;
  }

  // 5. Fallback a subcarpeta 'libro/101BMC.epub'
  try {
    const subRef = ref(storage, 'libro/101BMC.epub');
    const blob = await getBlob(subRef);
    if (blob && blob.size > 1000) {
      return await blob.arrayBuffer();
    }
  } catch (err: any) {
    lastError = err;
  }

  throw lastError || new Error('No se pudo obtener el archivo 101BMC.epub desde Firebase Storage.');
}

/**
 * Obtiene los bytes binarios de un capítulo de audio directamente de Firebase Storage.
 * Utiliza getBlob/getBytes del SDK para eludir restricciones de CORS del navegador.
 */
export async function getChapterAudioBytes(
  chapterNumber: number,
  customFilename?: string
): Promise<ArrayBuffer> {
  const filename = customFilename || `101bmc${chapterNumber}of113.mp3`;
  const storagePath = `audiolibro/${filename}`;

  try {
    const storageRef = ref(storage, storagePath);
    if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
      try {
        const blob = await getBlob(storageRef);
        return await blob.arrayBuffer();
      } catch (blobErr) {
        console.warn(`[Firebase Storage] getBlob aviso para ${storagePath}, probando getBytes:`, blobErr);
      }
    }
    return await getBytes(storageRef);
  } catch (sdkErr) {
    console.warn(`[Firebase Storage] SDK getBytes fallo para ${storagePath}, probando fetch cors:`, sdkErr);
    const url = await getChapterAudioDownloadUrl(chapterNumber, filename);
    const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status} al descargar capítulo de audio`);
    }
    return await resp.arrayBuffer();
  }
}

