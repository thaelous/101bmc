/**
 * ============================================================================
 * ÍNDICE OFICIAL Y TÍTULOS REALES DE LOS 113 CAPÍTULOS
 * "101 BUENOS MALOS CONSEJOS" - ROBERT PACHECO
 * Archivos en Firebase Storage: audiolibro/101bmc[NUMERO]of113.mp3
 * ============================================================================
 */

import { AudioTrackItem } from '../types';

export interface OfficialChapterMetadata {
  chapterNumber: number; // 1 a 113
  filename: string; // 101bmc[NUMERO]of113.mp3
  title: string;
  subtitle: string;
  category: string;
  durationSeconds: number;
}

/**
 * Diccionario oficial de títulos para los 113 archivos del audiolibro
 */
export const titulosOficiales: Record<number, string> = {
  1: "Portada",
  2: "Contraportada",
  3: "Semblanza",
  4: "Dedicatoria",
  5: "Agradecimientos",
  6: "Prólogo",
  7: "Introducción",
  8: "La vida es un sendero",
  9: "En memoria de mi padre",
  10: "Buenos malos consejos",
  11: "1 - Haz lo que quieras",
  12: "2 - Nunca hieras",
  13: "3 - El sentido de la vida",
  14: "4 - Ladrón de culpas",
  15: "5 - Anécdota de los errores",
  16: "6 - La escuela y la vida",
  17: "7 - La vida y la puerta",
  18: "8 - Pertenecer a un grupo",
  19: "9 - Lo que posees, te posee",
  20: "10 - El mundo no está diseñado para ti",
  21: "11 - Sidel oficiales",
  22: "12 - Algo para ti",
  23: "13 - El sabor del jarabe",
  24: "14 - Yo no merezco esto",
  25: "15 - Afila tus dientes",
  26: "16 - Como un caballero",
  27: "17 - Quien no puede ser criticado",
  28: "18 - Date a conocer",
  29: "19 - Cuando me enojo contigo",
  30: "20 - El único responsable",
  31: "21 - Permítete ser superficial",
  32: "22 - Aunque no lo digamos",
  33: "23 - La verdadera lezaid",
  34: "24 - La voz de la conciencia",
  35: "25 - El que y el para qué",
  36: "26 - Elige tus batallas",
  37: "27 - Los amigos y los principios",
  38: "28 - Crecer y amar tu momento",
  39: "29 - No cambies tu idea o cámbialas",
  40: "30 - Sé autónomo",
  41: "31 - No siempre como planeas",
  42: "32 - Confesión de un padre",
  43: "33 - La gratitud",
  44: "34 - No cuides tus palabras",
  45: "35 - Hacer cosas diferentes",
  46: "36 - Cosas indeseables",
  47: "37 - Sé atractivo",
  48: "38 - Perca creativa",
  49: "39 - Salvarte tu primero",
  50: "40 - La felicidad y su búsqueda",
  51: "51 - La virtud y la admiración",
  52: "52 - Escucha activamente",
  53: "53 - De magia y fantasía",
  54: "54 - Es normal",
  55: "55 - Romper de expectativas",
  56: "56 - La decisión feliz",
  57: "57 - Anécdota de la ignorancia y la soberbia",
  58: "58 - ¿Sin pedir nada a cambio?",
  59: "59 - El humor es humor",
  60: "60 - El trinomio cuadrado perfecto",
  61: "61 - Aprende a negociar",
  62: "62 - Cuida de tu felicidad",
  63: "63 - Contigo",
  64: "64 - De tu madre y de tu padre",
  65: "65 - Mi segunda persona favorita",
  66: "66 - No tengo que ver contigo",
  67: "67 - No negociaras con terroristas",
  68: "68 - Aprende realmente a respetar",
  69: "69 - La disculpa y el perdón",
  70: "70 - Verdades y mentiras",
  71: "71 - Un nuevo hermano mayor",
  72: "72 - El disimulo y el perdón",
  73: "73 - Lo que no pude ver criticado",
  74: "74 - Las personas no son iguales",
  75: "75 - El problema de la inmediatez",
  76: "76 - Tu adversario",
  77: "77 - Pensamiento negativo",
  78: "78 - Sé un convenciero",
  79: "79 - Aprende a ganar y aprende a perder",
  80: "80 - No son tu guía",
  81: "81 - Apuesta correctamente",
  82: "82 - No es su obligación",
  83: "83 - Mi segunda persona favorita",
  84: "84 - Mirar escuchar y hablar",
  85: "85 - Aprende a huir",
  86: "86 - Dos tipos de problemas",
  87: "87 - Inteligencia y experiencia",
  88: "88 - Las galletas",
  89: "89 - Lágrimas y diamantes",
  90: "90 - La ley del él",
  91: "91 - Lo que busque",
  92: "92 - Cuando no lo logras",
  93: "93 - Por respeto",
  94: "94 - Trabajo bajo presión",
  95: "95 - El día en que tú naciste",
  96: "96 - Elige tu dificultad",
  97: "97 - Sé invulnerable a las palabras",
  98: "98 - Zereia creativa",
  99: "99 - No le temo a la muerte",
  100: "100 - Algún día morirá",
  101: "101 - Disfruta tu búsqueda",
  102: "102 - Autoconcepto",
  103: "103 - No temo a la muerte",
  104: "104 - Algún día morirá",
  105: "105 - El ca en que tú naciste",
  106: "106 - Elige tu dificultad",
  107: "107 - Sé invulnerable a las palabras",
  108: "108 - Autoconcepto",
  109: "109 - No le temo a la muerte",
  110: "110 - Algún día morirá",
  111: "111 - Disfruta tu búsqueda",
  112: "112 - Autoconcepto",
  113: "113 - Despedida"
};

export const TITULOS_OFICIALES = titulosOficiales;

/**
 * Array ordenado con los 113 capítulos generados a partir de titulosOficiales
 */
export const OFFICIAL_113_CHAPTERS: OfficialChapterMetadata[] = Array.from({ length: 113 }, (_, i) => {
  const chapterNumber = i + 1;
  const title = titulosOficiales[chapterNumber] || `Capítulo ${chapterNumber}`;
  const filename = `101bmc${chapterNumber}of113.mp3`;

  let category = "Consejo";
  if (chapterNumber <= 10) {
    category = "Introductorio";
  } else if (chapterNumber === 113) {
    category = "Despedida";
  }

  return {
    chapterNumber,
    filename,
    title,
    subtitle: `101 Buenos Malos Consejos · Robert Pacheco`,
    category,
    durationSeconds: 160
  };
});

import { getGoogleDriveDirectDownloadUrl } from './googleDriveAudioMap';

/**
 * Convierte los metadatos oficiales en el formato AudioTrackItem para la PWA
 */
export function getOfficialAudioTracks(): AudioTrackItem[] {
  return OFFICIAL_113_CHAPTERS.map(ch => ({
    id: ch.chapterNumber,
    chapterNumber: ch.chapterNumber,
    filename: ch.filename,
    title: ch.title,
    subtitle: ch.subtitle,
    storagePath: `audiolibro/${ch.filename}`,
    audioUrl: getGoogleDriveDirectDownloadUrl(ch.chapterNumber),
    durationSeconds: ch.durationSeconds
  }));
}
