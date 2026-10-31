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

  // Pestaña activa ('combo' por defecto: audiolibro y libro digital lado a lado)
  const [activeTab, setActiveTab] = useState<'combo' | 'audio' | 'book'>('combo');
  
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
        {activeTab === 'combo' && (
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col">
            
            {/* Banner combo activo con badges informativos */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-4 rounded-2xl bg-white/80 border border-white/90 shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-heading font-black text-[#0f2147] uppercase tracking-wide">
                  Combo Completo: Audiolibro y Libro Digital
                </span>
              </div>
              <p className="text-slate-600 font-medium">
                Escucha los 113 capítulos a la izquierda mientras disfrutas del visor oficial <strong className="font-mono text-[#7c3aed]">101BMC.pdf</strong> al lado.
              </p>
            </div>

            {/* Disposición lado a lado en pantallas grandes, apilada en móviles */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
              {/* Columna Izquierda: Reproductor del Audiolibro (113 pistas) */}
              <div className="lg:col-span-5 xl:col-span-5 sticky lg:top-22">
                <AudioPlayer
                  chapters={BOOK_CHAPTERS}
                  currentChapterIndex={currentChapterIndex}
                  onChapterSelect={setCurrentChapterIndex}
                  userEmail={currentUser.email}
                  isSideBySide={true}
                />
              </div>

              {/* Columna Derecha: Visor de Libro Digital (101BMC.pdf en Firebase Storage) */}
              <div className="lg:col-span-7 xl:col-span-7 flex-1 flex flex-col min-h-[650px] lg:min-h-[820px]">
                <BookReader
                  chapters={BOOK_CHAPTERS}
                  currentChapterIndex={currentChapterIndex}
                  onChapterSelect={setCurrentChapterIndex}
                  userEmail={currentUser.email}
                  isSideBySide={true}
                />
              </div>
            </div>

          </div>
        )}

        {activeTab === 'audio' && (
          <AudioPlayer
            chapters={BOOK_CHAPTERS}
            currentChapterIndex={currentChapterIndex}
            onChapterSelect={setCurrentChapterIndex}
            userEmail={currentUser.email}
          />
        )}

        {activeTab === 'book' && (
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
