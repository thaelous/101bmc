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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeLicense, setActiveLicense] = useState<CodigoDocument | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [needsCodeRedemption, setNeedsCodeRedemption] = useState(false);

  // Pestaña activa ('audio' por defecto, reproductor de audiolibro)
  const [activeTab, setActiveTab] = useState<'book' | 'audio'>('audio');
  
  // Selección de capítulo
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Escuchar estado de autenticación con Firebase
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user && user.email) {
        // Verificar si la cuenta de Google ya tenía el libro canjeado anteriormente
        setIsCheckingLicense(true);
        try {
          const existingLicense = await checkUserExistingLicense(user.email);
          if (existingLicense) {
            // Usuario con código previo: pasa directamente al reproductor
            setActiveLicense(existingLicense);
            setNeedsCodeRedemption(false);
          } else {
            // Usuario nuevo: mostrar formulario para ingresar código de acceso
            setActiveLicense(null);
            setNeedsCodeRedemption(true);
          }
        } catch (err) {
          console.warn('[Acceso] Consulta de licencia:', err);
          setNeedsCodeRedemption(true);
        } finally {
          setIsCheckingLicense(false);
        }
      } else {
        setActiveLicense(null);
        setNeedsCodeRedemption(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    const user = await loginWithGoogle();
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveLicense(null);
    setNeedsCodeRedemption(false);
  };

  const handleCodeRedeemed = (license: CodigoDocument) => {
    setActiveLicense(license);
    setNeedsCodeRedemption(false);
  };

  // Pantalla de carga inicial
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #4f96fe 0%, #1e5ad9 100%)' }}>
        <div className="w-16 h-16 rounded-full p-1 bg-white shadow-xl animate-pulse flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-full h-full rounded-full object-cover" />
        </div>
        <p className="font-heading text-white text-xs font-black tracking-widest uppercase mt-4 drop-shadow-sm">
          Cargando combo: audiolibro &amp; libro digital...
        </p>
      </div>
    );
  }

  // 1. Pantalla Inicial: Si no ha iniciado sesión con Google -> Mostrar LoginScreen
  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <OfflineIndicator />
      </>
    );
  }

  // Estado intermedio mientras se consulta Firestore
  if (isCheckingLicense) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: 'linear-gradient(135deg, #4f96fe 0%, #1e5ad9 100%)' }}>
        <div className="glass-card rounded-3xl p-8 max-w-sm mx-auto flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="font-heading text-lg font-black text-[#0f2147] mb-1">
            Verificando acceso...
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {currentUser.email}
          </p>
        </div>
      </div>
    );
  }

  // 2. Si no tiene código previo -> Mostrar Modal Limpio [ Ingresa tu código de acceso ] y [ Desbloquear audiolibro ]
  if (needsCodeRedemption || !activeLicense) {
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

  // 3. Usuario con acceso verificado -> Reproductor de Audiolibro y Lector de Libro Digital
  return (
    <div className="min-h-screen text-[#0f2147] flex flex-col selection:bg-[#7c3aed]/20 selection:text-[#7c3aed]">
      
      {/* Barra de Navegación */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        licenseCode={activeLicense.codigo}
      />

      {/* Contenido Principal Desbloqueado */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'audio' ? (
          <AudioPlayer
            chapters={BOOK_CHAPTERS}
            currentChapterIndex={currentChapterIndex}
            onChapterSelect={setCurrentChapterIndex}
            userEmail={currentUser.email}
          />
        ) : (
          <BookReader
            chapters={BOOK_CHAPTERS}
            currentChapterIndex={currentChapterIndex}
            onChapterSelect={setCurrentChapterIndex}
            userEmail={currentUser.email}
          />
        )}
      </main>

      {/* Indicador de Estado Offline PWA */}
      <OfflineIndicator />
    </div>
  );
}
