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
  checkUserExistingLicense
} from './firebase/config';
import { UserProfile, CodigoDocument } from './types';
import { BOOK_CHAPTERS } from './data/bookContent';
import { Navbar } from './components/Navbar';
import { BookReader } from './components/BookReader';
import { AudioPlayer } from './components/AudioPlayer';
import { LoginScreen } from './components/LoginScreen';
import { CodeRedemptionModal } from './components/CodeRedemptionModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // 1. Al abrir la aplicación, revisa si existe localStorage.getItem('bmc_acceso_autorizado')
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return !!localStorage.getItem('bmc_acceso_autorizado');
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const authorizedEmail = localStorage.getItem('bmc_acceso_autorizado');
    if (authorizedEmail) {
      const savedUser = localStorage.getItem('101_direct_user');
      if (savedUser) {
        try { return JSON.parse(savedUser); } catch {}
      }
      return {
        uid: `user-${authorizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: authorizedEmail,
        displayName: authorizedEmail.split('@')[0] || 'Lector Oficial',
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
    const authorizedEmail = localStorage.getItem('bmc_acceso_autorizado');
    if (authorizedEmail) {
      return {
        id: 'AUTH_PREV',
        codigo: 'ACCESO_AUTORIZADO',
        canjeado: true,
        usado_por: authorizedEmail,
        fecha_canje: null
      };
    }
    return null;
  });

  const [isAuthLoading, setIsAuthLoading] = useState(!localStorage.getItem('bmc_acceso_autorizado'));
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [needsCodeRedemption, setNeedsCodeRedemption] = useState(false);

  // Pestaña activa ('audio' por defecto: dos secciones independientes Audiolibro y Libro Digital)
  const [activeTab, setActiveTab] = useState<'audio' | 'book'>('audio');
  
  // Selección de capítulo
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Escuchar estado de autenticación con Firebase
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setIsAuthLoading(false);

      if (user && user.email) {
        const cleanEmail = user.email.toLowerCase().trim();
        setCurrentUser(user);

        // Si ya está autorizado con este correo, mantener el acceso directo
        const currentAuthorized = localStorage.getItem('bmc_acceso_autorizado');
        if (currentAuthorized && currentAuthorized.toLowerCase().trim() === cleanEmail) {
          setIsAuthorized(true);
          setNeedsCodeRedemption(false);
          return;
        }

        // Consultar colección 'codigos' en Firestore para comprobar si algún doc tiene usado_por o usadoPor == user.email
        setIsCheckingLicense(true);
        try {
          const existingLicense = await checkUserExistingLicense(cleanEmail);
          if (existingLicense) {
            localStorage.setItem('bmc_acceso_autorizado', cleanEmail);
            setActiveLicense(existingLicense);
            setIsAuthorized(true);
            setNeedsCodeRedemption(false);
          } else {
            // Si no tiene código canjeado a su nombre y no estaba previamente autorizado
            if (!localStorage.getItem('bmc_acceso_autorizado')) {
              setActiveLicense(null);
              setIsAuthorized(false);
              setNeedsCodeRedemption(true);
            }
          }
        } catch (err) {
          console.warn('[Acceso] Consulta de licencia:', err);
          if (!localStorage.getItem('bmc_acceso_autorizado')) {
            setNeedsCodeRedemption(true);
          }
        } finally {
          setIsCheckingLicense(false);
        }
      } else {
        const authorizedEmail = localStorage.getItem('bmc_acceso_autorizado');
        if (authorizedEmail) {
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
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        licenseCode={activeLicense?.codigo || 'OFICIAL'}
      />

      {/* Contenido Principal Desbloqueado: Dos Secciones Independientes */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'audio' && (
          <div className="flex-1 flex flex-col justify-center py-3 sm:py-6">
            <AudioPlayer
              chapters={BOOK_CHAPTERS}
              currentChapterIndex={currentChapterIndex}
              onChapterSelect={setCurrentChapterIndex}
              userEmail={currentUser?.email || localStorage.getItem('bmc_acceso_autorizado') || ''}
              isSideBySide={false}
            />
          </div>
        )}

        {activeTab === 'book' && (
          <div className="flex-1 flex flex-col py-3 sm:py-6">
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
