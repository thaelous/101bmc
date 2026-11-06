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
  6: "Prologo",
  7: "Introduccion",
  8: "La vida es un sendero",
  9: "En memoria de mi padre",
  10: "Buenos malos consejos",
  11: "HAZ LO QUE QUIERAS",
  12: "NUNCA HIERAS",
  13: "EL SENTIDO DE LA VIDA",
  14: "LADRÓN DE CULPAS",
  15: "ANÉCDOTA DE LOS ERRORES",
  16: "LA ESCUELA Y LA VIDA",
  17: "LA VIDA Y LA PUERTA",
  18: "PERTENECER A UN GRUPO",
  19: "LO QUE POSEES TE POSEE",
  20: "EL MUNDO NO ESTÁ DISEÑADO PARA TI",
  21: "SI PIDES, OFRECES",
  22: "ALGO PARA TI",
  23: "EL SABOR DEL JARABE",
  24: "LUCHANDO CONTRA LO INJUSTO",
  25: "COMO UN CABALLERO",
  26: "AFILA TUS DIENTES",
  27: "QUIEN NO PUEDE SER CRITICADO...",
  28: "DATE A CONOCER",
  29: "CUANDO ME ENOJO CONTIGO",
  30: "EL UNICO RESPONSABLE",
  31: "BUSCANDO SEÑALES",
  32: "PERMÍTETE SER SUPERFICIAL",
  33: "AUNQUE NO LO DECIMOS",
  34: "LA VERDADERA LEALTAD",
  35: "LA VOZ DE LA CONSCIENCIA",
  36: "EL QUÉ Y EL PARA QUÉ",
  37: "ELIJE TUS BATALLAS",
  38: "LOS AMIGOS Y LOS PRINCIPIOS",
  39: "LA LUNA Y TU RODILLA",
  40: "CRECER Y AMAR TU MOMENTO",
  41: "NO CAMBIES POR UNA PAREJA",
  42: "DEFIENDE TUS IDEAS O CAMBIALAS",
  43: "SÉ AUTÓNOMO",
  44: "NO SIEMPRE COMO LO PLANEAS",
  45: "CONFESION DE UN PADRE",
  46: "LA GRATITUD",
  47: "SÉ ATRACTIVO",
  48: "NO CUIDES TUS PALABRAS",
  49: "HACER COSAS DIFERENTES",
  50: "COSAS INELUDIBLES",
  51: "LA LLUVIA",
  52: "LA IGNORANCIA",
  53: "EL CONSEJO DE UN AMIGO",
  54: "VETE A TIEMPO",
  55: "DI QUE NO",
  56: "LIMITA TUS QUEJAS",
  57: "USA PALABRAS SUAVES",
  58: "PEREZA CREATIVA",
  59: "SÁLVATE TÚ PRIMERO",
  60: "LA FELICIDAD Y SU BÚSQUEDA",
  61: "LA VIRTUD Y LA ADMIRACIÓN",
  62: "ESCUCHA ACTIVAMENTE",
  63: "DE MAGIA Y FANTASÍA",
  64: "ES NORMAL",
  65: "EL ROPERO DE EXPECTATIVAS",
  66: "LA DECISION FELIZ",
  67: "ANÉCDOTA DE LA IGNORANCIA",
  68: "¿SIN PEDIR NADA A CAMBIO?",
  69: "EL HUMOR ES HUMOR",
  70: "EL TRINOMIO CUADRADO PERFECTO",
  71: "APRENDE A NEGOCIAR",
  72: "INVIERTIENDO EN TU FELICIDAD",
  73: "CONTIGO",
  74: "LAS GROSERÍAS",
  75: "DE TU MADRE Y DE TU PADRE",
  76: "EL PERDÓN POR ACERTAR",
  77: "NO TODO TIENE QUE VER CONTIGO",
  78: "NO NEGOCIAMOS CON TERRORISTAS",
  79: "APRENDE REALMENTE A RESPETAR",
  80: "LA AUTOCRITICA",
  81: "UN NUEVO HERMANO MAYOR",
  82: "LA DISCULPA Y EL PERDÓN",
  83: "VERDADES Y MENTIRAS",
  84: "LAS PERSONAS NO SON IGUALES",
  85: "EL PROBLEMA DE LA INMEDIATEZ",
  86: "TU ADVERSARIO",
  87: "PENSAMIENTO NEGATIVO",
  88: "SÉ UN CONVENENCIERO",
  89: "APRENDE A GANAR Y APRENDE A PERDER",
  90: "NO SOY TU GUIA",
  91: "APUESTA CORRECTAMENTE",
  92: "NO ES SU OBLIGACIÓN",
  93: "MI SEGUNDA PERSONA FAVORITA",
  94: "MIRAR ESCUCHAR Y HABLAR",
  95: "APRENDE A HUIR",
  96: "DOS TIPOS DE PROBLEMAS",
  97: "INTELIGENCIA Y EXPERIENCIA",
  98: "LAS GALLETAS",
  99: "LAGRIMAS Y DIAMANTES",
  100: "LA LEY DEL 8",
  101: "LO QUE SUCEDE",
  102: "CUANDO NO LO LOGRAS",
  103: "POR RESPETO",
  104: "TRABAJO BAJO PRESION",
  105: "SIN HACER PREGUNTAS",
  106: "EL DÍA EN QUE TÚ NACISTE",
  107: "ELIJE TU DIFICULTAD",
  108: "SÉ INVULNERABLE A LAS PALABRAS",
  109: "AUTOCONCEPTO",
  110: "NO LE TEMO A LA MUERTE",
  111: "ALGÚN DÍA MORIRÉ",
  112: "TU herencia",
  113: "Despedida"
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

import { getOfficialChapterAudioUrl } from './officialAudioUrls';

/**
 * Convierte los metadatos oficiales en el formato AudioTrackItem para la PWA
 * con URLs directas de streaming oficial
 */
export function getOfficialAudioTracks(): AudioTrackItem[] {
  return OFFICIAL_113_CHAPTERS.map(ch => ({
    id: ch.chapterNumber,
    chapterNumber: ch.chapterNumber,
    filename: ch.filename,
    title: ch.title,
    subtitle: ch.subtitle,
    storagePath: `audiolibro/${ch.filename}`,
    audioUrl: getOfficialChapterAudioUrl(ch.chapterNumber),
    durationSeconds: ch.durationSeconds
  }));
}
