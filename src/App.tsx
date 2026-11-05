/**
 * ============================================================================
 * 101 BUENOS MALOS CONSEJOS PARA MI HIJO — APLICACIÓN OFICIAL
 * Autor: Por Robert Pacheco
 * Branding: buenosmalosconsejos.com
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuthChanges, 
  checkUserExistingLicense,
  handleGoogleRedirectResult
} from './firebase/config';
import { UserProfile, CodigoDocument } from './types';
import { BOOK_CHAPTERS } from './data/bookContent';
import { Navbar } from './components/Navbar';
import { BookReader } from './components/BookReader';
import { AudioPlayer } from './components/AudioPlayer';
import { LoginScreen } from './components/LoginScreen';
import { CodeRedemptionModal } from './components/CodeRedemptionModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { isEpubOfflineAvailable, saveEpubOffline } from './services/offlineEpubVault';
import { getChapterAudioDownloadUrl } from './firebase/config';
import { isChapterOfflineAvailable, saveChapterWithTimeout } from './services/offlineAudioVault';

export default function App() {
  // 1. Al cargar la página, revisa de inmediato: sesionGuardada = localStorage.getItem('bmc_acceso_autorizado')
  // Si existe y no está vacía, desbloquea directamente la aplicación.
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    const sesionGuardada = localStorage.getItem('bmc_acceso_autorizado');
    return !!(sesionGuardada && sesionGuardada.trim() !== '');
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const sesionGuardada = localStorage.getItem('bmc_acceso_autorizado');
    if (sesionGuardada && sesionGuardada.trim() !== '') {
      const savedUser = localStorage.getItem('101_direct_user');
      if (savedUser) {
        try { return JSON.parse(savedUser); } catch {}
      }
      return {
        uid: `user-${sesionGuardada.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: sesionGuardada,
        displayName: sesionGuardada.split('@')[0] || 'Lector Oficial',
        photoURL: null,
        emailVerified: true
      };
    }
    return null;
  });

  const [activeLicense, setActiveLicense] = useState<CodigoDocument | null>(() => {
    const saved = localStorage.getItem('101_active_license');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const sesionGuardada = localStorage.getItem('bmc_acceso_autorizado');
    if (sesionGuardada && sesionGuardada.trim() !== '') {
      return {
        id: 'AUTH_PREV',
        codigo: 'ACCESO_AUTORIZADO',
        canjeado: true,
        usado_por: sesionGuardada,
        fecha_canje: null
      };
    }
    return null;
  });

  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    const sesion = localStorage.getItem('bmc_acceso_autorizado');
    return !(sesion && sesion.trim() !== '');
  });
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [needsCodeRedemption, setNeedsCodeRedemption] = useState(false);

  // Pestaña activa: guardada en localStorage para abrir exactamente donde se quedó ('audio' o 'book')
  const [activeTab, setActiveTab] = useState<'audio' | 'book'>(() => {
    try {
      const savedTab = localStorage.getItem('bmc_ultima_pestana_activa');
      if (savedTab === 'audio' || savedTab === 'book') return savedTab;
    } catch {}
    return 'audio';
  });
  
  // Selección del último capítulo escuchado del audiolibro
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(() => {
    try {
      const savedChapter = localStorage.getItem('bmc_ultimo_capitulo_audio');
      if (savedChapter !== null) {
        const idx = parseInt(savedChapter, 10);
        if (!isNaN(idx) && idx >= 0 && idx < 113) {
          return idx;
        }
      }
    } catch {}
    return 0;
  });

  const handleTabChange = (tab: 'audio' | 'book') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('bmc_ultima_pestana_activa', tab);
    } catch {}
  };

  const handleChapterSelect = (index: number) => {
    setCurrentChapterIndex(index);
    try {
      localStorage.setItem('bmc_ultimo_capitulo_audio', index.toString());
    } catch {}
  };

  // Escuchar estado de autenticación con Firebase y capturar redirección
  useEffect(() => {
    // 1. Si hubo redirección desde Google Auth, procesar resultado
    handleGoogleRedirectResult().then(async (redirectUser) => {
      if (redirectUser && redirectUser.email) {
        const cleanEmail = redirectUser.email.toLowerCase().trim();
        setCurrentUser(redirectUser);
        const existingLicense = await checkUserExistingLicense(cleanEmail);
        if (existingLicense) {
          localStorage.setItem('bmc_acceso_autorizado', cleanEmail);
          setActiveLicense(existingLicense);
          setIsAuthorized(true);
          setNeedsCodeRedemption(false);
        }
      }
    });

    // 2. Suscripción a cambios de autenticación
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setIsAuthLoading(false);

      // Si ya hay una sesión guardada autorizada, nunca bloquear al usuario
      const sesionGuardada = localStorage.getItem('bmc_acceso_autorizado');
      if (sesionGuardada && sesionGuardada.trim() !== '') {
        setIsAuthorized(true);
        setNeedsCodeRedemption(false);
        if (user) setCurrentUser(user);
        return;
      }

      if (user && user.email) {
        const cleanEmail = user.email.toLowerCase().trim();
        setCurrentUser(user);

        // Consultar colección 'codigos' en Firestore
        setIsCheckingLicense(true);
        try {
          const existingLicense = await checkUserExistingLicense(cleanEmail);
          if (existingLicense) {
            localStorage.setItem('bmc_acceso_autorizado', cleanEmail);
            setActiveLicense(existingLicense);
            setIsAuthorized(true);
            setNeedsCodeRedemption(false);
          } else {
            setActiveLicense(null);
            setIsAuthorized(false);
            setNeedsCodeRedemption(true);
          }
        } catch (err) {
          console.warn('[Acceso] Consulta de licencia:', err);
          setNeedsCodeRedemption(true);
        } finally {
          setIsCheckingLicense(false);
        }
      } else {
        const sesion = localStorage.getItem('bmc_acceso_autorizado');
        if (sesion && sesion.trim() !== '') {
          setIsAuthorized(true);
          setNeedsCodeRedemption(false);
        } else {
          setIsAuthorized(false);
          setCurrentUser(null);
          setActiveLicense(null);
          setNeedsCodeRedemption(false);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Lógica de Seguridad e Ingesta en Memoria (Blob / Cache Storage) tras autenticación exitosa
  useEffect(() => {
    if (!isAuthorized) return;

    let isMounted = true;
    const runSilentBackgroundIngest = async () => {
      // 1. Ingesta local en IndexedDB del libro EPUB para lectura offline instantánea
      try {
        const isEpubCached = await isEpubOfflineAvailable();
        if (!isEpubCached && isMounted) {
          const resp = await fetch('/101BMC.epub');
          if (resp.ok && isMounted) {
            const bytes = await resp.arrayBuffer();
            if (bytes && bytes.byteLength > 1000 && isMounted) {
              await saveEpubOffline(bytes);
            }
          }
        }
      } catch (err) {
        console.warn('[SecurityVault] Ingesta local EPUB en segundo plano:', err);
      }

      // 2. Ingesta invisible del capítulo actual del audiolibro en caché interna protegida
      try {
        const capNum = currentChapterIndex + 1;
        const isAudioCached = await isChapterOfflineAvailable(capNum);
        if (!isAudioCached && isMounted && navigator.onLine) {
          const audioUrl = await getChapterAudioDownloadUrl(capNum);
          if (audioUrl && isMounted) {
            await saveChapterWithTimeout(capNum, audioUrl, undefined, undefined, 8000);
          }
        }
      } catch (err) {
        console.warn('[SecurityVault] Ingesta invisible Audio en segundo plano:', err);
      }
    };

    const timer = setTimeout(runSilentBackgroundIngest, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isAuthorized, currentChapterIndex]);

  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
      if (user && user.email) {
        const cleanEmail = user.email.toLowerCase().trim();
        setIsCheckingLicense(true);
        try {
          const existingLicense = await checkUserExistingLicense(cleanEmail);
          if (existingLicense) {
            localStorage.setItem('bmc_acceso_autorizado', cleanEmail);
            setActiveLicense(existingLicense);
            setIsAuthorized(true);
            setNeedsCodeRedemption(false);
          } else {
            if (!localStorage.getItem('bmc_acceso_autorizado')) {
              setActiveLicense(null);
              setIsAuthorized(false);
              setNeedsCodeRedemption(true);
            }
          }
        } finally {
          setIsCheckingLicense(false);
        }
      }
    } catch (err: any) {
      console.warn('[App] Error en inicio de sesión con Google:', err);
      throw err;
    }
  };

  const handleDirectCodeAccess = (license: CodigoDocument, user: UserProfile) => {
    localStorage.setItem('bmc_acceso_autorizado', user.email);
    localStorage.setItem('101_active_license', JSON.stringify(license));
    localStorage.setItem('101_direct_user', JSON.stringify(user));
    setActiveLicense(license);
    setCurrentUser(user);
    setIsAuthorized(true);
    setNeedsCodeRedemption(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem('bmc_acceso_autorizado');
    localStorage.removeItem('101_active_license');
    localStorage.removeItem('101_direct_user');
    setIsAuthorized(false);
    setCurrentUser(null);
    setActiveLicense(null);
    setNeedsCodeRedemption(false);
  };

  const handleCodeRedeemed = (license: CodigoDocument) => {
    const userEmail = license.usado_por || currentUser?.email || '';
    if (userEmail) {
      localStorage.setItem('bmc_acceso_autorizado', userEmail);
    }
    localStorage.setItem('101_active_license', JSON.stringify(license));
    setActiveLicense(license);
    setIsAuthorized(true);
    setNeedsCodeRedemption(false);
  };

  // 1. Pantalla de carga inicial (solo si no estaba autorizado previamente en localStorage)
  if (isAuthLoading && !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #4f96fe 0%, #1e5ad9 100%)' }}>
        <div className="w-16 h-16 rounded-full p-1 bg-white shadow-xl animate-pulse flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-full h-full rounded-full object-cover" />
        </div>
        <p className="font-heading text-white text-xs font-black tracking-widest uppercase mt-4 drop-shadow-sm">
          Cargando contenido oficial...
        </p>
      </div>
    );
  }

  // 2. Estado intermedio mientras se consulta Firestore (solo si no estaba autorizado)
  if (isCheckingLicense && !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: 'linear-gradient(135deg, #4f96fe 0%, #1e5ad9 100%)' }}>
        <div className="glass-card rounded-3xl p-8 max-w-sm mx-auto flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="font-heading text-lg font-black text-[#0f2147] mb-1">
            Verificando acceso...
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {currentUser?.email}
          </p>
        </div>
      </div>
    );
  }

  // 3. Si no tiene acceso activo ni usuario -> Mostrar LoginScreen
  if (!isAuthorized && !currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onDirectCodeAccess={handleDirectCodeAccess} />
        <OfflineIndicator />
      </>
    );
  }

  // 4. Si el usuario está autenticado pero necesita canjear código
  if (!isAuthorized && (needsCodeRedemption || !activeLicense) && currentUser) {
    return (
      <>
        <CodeRedemptionModal
          user={currentUser}
          onCodeRedeemed={handleCodeRedeemed}
          onLogout={handleLogout}
        />
        <OfflineIndicator />
      </>
    );
  }

  // 5. Usuario autorizado (o con código canjeado) -> Desbloquear contenido de inmediato
  return (
    <div className="min-h-screen text-[#0f2147] flex flex-col selection:bg-[#7c3aed]/20 selection:text-[#7c3aed]">
      
      {/* Barra de Navegación */}
      <Navbar
        user={currentUser || {
          uid: 'autorizado',
          email: localStorage.getItem('bmc_acceso_autorizado') || '',
          displayName: 'Lector Oficial',
          photoURL: null,
          emailVerified: true
        }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        licenseCode={activeLicense?.codigo || 'OFICIAL'}
      />

      {/* Contenido Principal Desbloqueado: Dos Secciones Independientes */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'audio' && (
          <div className="flex-1 flex flex-col justify-center py-1.5 sm:py-3">
            <AudioPlayer
              chapters={BOOK_CHAPTERS}
              currentChapterIndex={currentChapterIndex}
              onChapterSelect={handleChapterSelect}
              userEmail={currentUser?.email || localStorage.getItem('bmc_acceso_autorizado') || ''}
              isSideBySide={false}
            />
          </div>
        )}

        {activeTab === 'book' && (
          <div className="flex-1 flex flex-col py-1 sm:py-3">
            <BookReader
              userEmail={currentUser?.email || localStorage.getItem('bmc_acceso_autorizado') || ''}
              isSideBySide={false}
            />
          </div>
        )}
      </main>

      {/* Indicador de Estado Offline PWA */}
      <OfflineIndicator />
    </div>
  );
}
