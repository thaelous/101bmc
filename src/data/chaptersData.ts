/**
 * ============================================================================
 * ÍNDICE OFICIAL Y TÍTULOS REALES DE LOS 113 CAPÍTULOS
 * "101 BUENOS MALOS CONSEJOS PARA MI HIJO"
 * Autor: Por Robert Pacheco
 * Estructura de almacenamiento: audiolibro/101bmc[NUMERO]of113.mp3
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
  consejoNumber?: number; // Para capítulos 2 a 102 (Consejos 1 a 101)
}

export const OFFICIAL_113_CHAPTERS: OfficialChapterMetadata[] = [
  // Pista 1: Prólogo
  {
    chapterNumber: 1,
    filename: "101bmc1of113.mp3",
    title: "Prólogo: Carta a Mi Hijo",
    subtitle: "El peligro del sentido común domesticado y la advertencia preliminar",
    category: "Prólogo",
    durationSeconds: 195
  },

  // Pistas 2 a 102: Los 101 Consejos oficiales de Robert Pacheco
  {
    chapterNumber: 2,
    filename: "101bmc2of113.mp3",
    consejoNumber: 1,
    title: "Consejo 1: No busques ser perfecto; busca ser difícil de ignorar",
    subtitle: "La perfección es el refugio de los cobardes; la singularidad es de los audaces",
    category: "Criterio & Enfoque",
    durationSeconds: 155
  },
  {
    chapterNumber: 3,
    filename: "101bmc3of113.mp3",
    consejoNumber: 2,
    title: "Consejo 2: Aprende a fracasar a puerta cerrada antes de triunfar en público",
    subtitle: "El talento privado ahorra humillaciones colectivas y pule la puntería",
    category: "Criterio & Enfoque",
    durationSeconds: 160
  },
  {
    chapterNumber: 4,
    filename: "101bmc4of113.mp3",
    consejoNumber: 3,
    title: "Consejo 3: Si todos te dan la razón, es muy probable que no estés diciendo nada nuevo",
    subtitle: "El consenso unánime suele ser el síntoma inequívoco del aburrimiento institucional",
    category: "Criterio & Enfoque",
    durationSeconds: 145
  },
  {
    chapterNumber: 5,
    filename: "101bmc5of113.mp3",
    consejoNumber: 4,
    title: "Consejo 4: El descanso no es una recompensa; es la materia prima del pensamiento fino",
    subtitle: "Un cerebro exhausto solo produce soluciones obvias y resentimiento",
    category: "Productividad",
    durationSeconds: 170
  },
  {
    chapterNumber: 6,
    filename: "101bmc6of113.mp3",
    consejoNumber: 5,
    title: "Consejo 5: Desconfía de quien siempre tiene prisa por parecer importante",
    subtitle: "Los que realmente mueven las piezas rara vez corren con desesperación",
    category: "Carácter",
    durationSeconds: 150
  },
  {
    chapterNumber: 7,
    filename: "101bmc7of113.mp3",
    consejoNumber: 6,
    title: "Consejo 6: No compitas con el rebaño; inventa tu propia categoría",
    subtitle: "En un juego nuevo, tú escribes las reglas y nadie puede compararte por precio",
    category: "Estrategia",
    durationSeconds: 165
  },
  {
    chapterNumber: 8,
    filename: "101bmc8of113.mp3",
    consejoNumber: 7,
    title: "Consejo 7: No pidas disculpas por decir que no",
    subtitle: "Cada sí complaciente es una traición silenciosa a tus verdaderas prioridades",
    category: "Límites",
    durationSeconds: 140
  },
  {
    chapterNumber: 9,
    filename: "101bmc9of113.mp3",
    consejoNumber: 8,
    title: "Consejo 8: El halago fácil es el veneno más adictivo",
    subtitle: "Aprende a diferenciar el aprecio sincero de la lisonja interesada",
    category: "Carácter",
    durationSeconds: 155
  },
  {
    chapterNumber: 10,
    filename: "101bmc10of113.mp3",
    consejoNumber: 9,
    title: "Consejo 9: Hazte amigo íntimo de la incomodidad voluntaria",
    subtitle: "El músculo del carácter solo crece cuando enfrenta una resistencia real",
    category: "Disciplina",
    durationSeconds: 160
  },
  {
    chapterNumber: 11,
    filename: "101bmc11of113.mp3",
    consejoNumber: 10,
    title: "Consejo 10: Tu atención es tu activo más codiciado: no la regales",
    subtitle: "Donde pones tus ojos, pones tu destino y la calidad de tus pensamientos",
    category: "Enfoque",
    durationSeconds: 175
  },
  {
    chapterNumber: 12,
    filename: "101bmc12of113.mp3",
    consejoNumber: 11,
    title: "Consejo 11: El dinero no te cambia: solo le sube el volumen a quien ya eras",
    subtitle: "La abundancia quita los filtros sociales y revela la verdadera madera de tu alma",
    category: "Dinero & Criterio",
    durationSeconds: 180
  },
  {
    chapterNumber: 13,
    filename: "101bmc13of113.mp3",
    consejoNumber: 12,
    title: "Consejo 12: Trabaja en silencio y deja que los resultados hagan el escándalo",
    subtitle: "El que cacarea antes de poner el huevo solo atrae al depredador",
    category: "Estrategia",
    durationSeconds: 150
  },
  {
    chapterNumber: 14,
    filename: "101bmc14of113.mp3",
    consejoNumber: 13,
    title: "Consejo 13: No discutas con un necio: te ganará por experiencia",
    subtitle: "Nunca entres en lodo con quien disfruta revolcarse en él",
    category: "Relaciones",
    durationSeconds: 145
  },
  {
    chapterNumber: 15,
    filename: "101bmc15of113.mp3",
    consejoNumber: 14,
    title: "Consejo 14: Cumple tu palabra incluso cuando nadie te esté vigilando",
    subtitle: "La integridad no es una pose para la galería, es tu contrato contigo mismo",
    category: "Integridad",
    durationSeconds: 160
  },
  {
    chapterNumber: 16,
    filename: "101bmc16of113.mp3",
    consejoNumber: 15,
    title: "Consejo 15: La envidia ajena es el mejor termómetro de tu avance",
    subtitle: "Nadie le tira piedras a un árbol que no da frutos",
    category: "Relaciones",
    durationSeconds: 155
  },
  {
    chapterNumber: 17,
    filename: "101bmc17of113.mp3",
    consejoNumber: 16,
    title: "Consejo 16: Nunca tomes decisiones definitivas sobre emociones temporales",
    subtitle: "La euforia y la ira son las peores consejeras de la existencia",
    category: "Emociones",
    durationSeconds: 165
  },
  {
    chapterNumber: 18,
    filename: "101bmc18of113.mp3",
    consejoNumber: 17,
    title: "Consejo 17: Aprende a observar lo que la gente hace, no lo que dice",
    subtitle: "Las palabras son baratas; la conducta continuada es la única verdad",
    category: "Criterio",
    durationSeconds: 150
  },
  {
    chapterNumber: 19,
    filename: "101bmc19of113.mp3",
    consejoNumber: 18,
    title: "Consejo 18: La paciencia activa siempre vence al talento apresurado",
    subtitle: "Saber esperar mientras sigues empujando es el secreto de los grandes logros",
    category: "Paciencia",
    durationSeconds: 170
  },
  {
    chapterNumber: 20,
    filename: "101bmc20of113.mp3",
    consejoNumber: 19,
    title: "Consejo 19: Si no tienes tiempo para leer, no tienes tiempo para liderar",
    subtitle: "Los libros son atajos de décadas empaquetados en un fin de semana",
    category: "Aprendizaje",
    durationSeconds: 160
  },
  {
    chapterNumber: 21,
    filename: "101bmc21of113.mp3",
    consejoNumber: 20,
    title: "Consejo 20: El agradecimiento sincero abre puertas blindadas",
    subtitle: "Reconocer el mérito ajeno no te hace pequeño; te hace magnánimo",
    category: "Gratitud",
    durationSeconds: 145
  },
  {
    chapterNumber: 22,
    filename: "101bmc22of113.mp3",
    consejoNumber: 21,
    title: "Consejo 21: El exceso de prudencia suele ser miedo con corbata y traje formal",
    subtitle: "Quien espera que todas las luces estén en verde jamás sale de su cochera",
    category: "Audacia",
    durationSeconds: 175
  },
  {
    chapterNumber: 23,
    filename: "101bmc23of113.mp3",
    consejoNumber: 22,
    title: "Consejo 22: Corta las pérdidas emocionales con la frialdad de un cirujano",
    subtitle: "No sigas regando una planta de plástico solo porque la compraste cara",
    category: "Límites",
    durationSeconds: 160
  },
  {
    chapterNumber: 24,
    filename: "101bmc24of113.mp3",
    consejoNumber: 23,
    title: "Consejo 23: Haz las cosas a mano antes de intentar automatizarlas",
    subtitle: "La intimidad con el problema precede a cualquier solución duradera",
    category: "Oficio",
    durationSeconds: 155
  },
  {
    chapterNumber: 25,
    filename: "101bmc25of113.mp3",
    consejoNumber: 24,
    title: "Consejo 24: No intentes convencer a los cínicos; dialoga con los curiosos",
    subtitle: "El cínico busca arrastrarte a su desencanto para no sentirse tan solo",
    category: "Relaciones",
    durationSeconds: 150
  },
  {
    chapterNumber: 26,
    filename: "101bmc26of113.mp3",
    consejoNumber: 25,
    title: "Consejo 25: Un error repetido dos veces ya no es un error, es una decisión",
    subtitle: "Aprende la lección a la primera y ahórrate el dolor de la reincidencia",
    category: "Madurez",
    durationSeconds: 140
  },
  {
    chapterNumber: 27,
    filename: "101bmc27of113.mp3",
    consejoNumber: 26,
    title: "Consejo 26: No confundas tener una opinión con tener un argumento",
    subtitle: "El volumen de tu voz jamás sustituirá el peso de tus fundamentos",
    category: "Pensamiento",
    durationSeconds: 165
  },
  {
    chapterNumber: 28,
    filename: "101bmc28of113.mp3",
    consejoNumber: 27,
    title: "Consejo 27: Tu círculo íntimo determina la altura de tu techo mental",
    subtitle: "Dime con quién compartes tus horas libres y te diré qué límites toleras",
    category: "Entorno",
    durationSeconds: 170
  },
  {
    chapterNumber: 29,
    filename: "101bmc29of113.mp3",
    consejoNumber: 28,
    title: "Consejo 28: Aprende a vender tus ideas o pasarás la vida comprando las de otros",
    subtitle: "La mejor visión del mundo no sirve de nada si no sabes comunicarla con garra",
    category: "Comunicación",
    durationSeconds: 180
  },
  {
    chapterNumber: 30,
    filename: "101bmc30of113.mp3",
    consejoNumber: 29,
    title: "Consejo 29: La sobriedad emocional es la mayor armadura en un conflicto",
    subtitle: "El que se enfurece pierde el control de la sala de negociación",
    category: "Autodominio",
    durationSeconds: 155
  },
  {
    chapterNumber: 31,
    filename: "101bmc31of113.mp3",
    consejoNumber: 30,
    title: "Consejo 30: Cuida tu reputación: tarda una década en forjarse y un minuto en arder",
    subtitle: "Un buen nombre es un patrimonio que ninguna quiebra financiera puede arrebatarte",
    category: "Honor",
    durationSeconds: 160
  },
  {
    chapterNumber: 32,
    filename: "101bmc32of113.mp3",
    consejoNumber: 31,
    title: "Consejo 31: Desconfía de los atajos que prometen gloria sin sudor",
    subtitle: "Todo lo que sube como palma sin raíces cae a la primera tormenta",
    category: "Criterio",
    durationSeconds: 150
  },
  {
    chapterNumber: 33,
    filename: "101bmc33of113.mp3",
    consejoNumber: 32,
    title: "Consejo 32: Trata bien al que te sirve un café; ahí se ve tu verdadera casta",
    subtitle: "La calidad de un hombre se mide en cómo trata a quien no puede devolverle el favor",
    category: "Humildad",
    durationSeconds: 145
  },
  {
    chapterNumber: 34,
    filename: "101bmc34of113.mp3",
    consejoNumber: 33,
    title: "Consejo 33: El rencor es un veneno que te tomas tú esperando que muera el otro",
    subtitle: "Perdonar no es justificar; es soltar la brasa caliente de tus manos",
    category: "Paz Mental",
    durationSeconds: 165
  },
  {
    chapterNumber: 35,
    filename: "101bmc35of113.mp3",
    consejoNumber: 34,
    title: "Consejo 34: Si algo te da miedo y no pone en riesgo tu vida, hazlo primero",
    subtitle: "El miedo suele ser la brújula que apunta exactamente hacia donde debes crecer",
    category: "Coraje",
    durationSeconds: 175
  },
  {
    chapterNumber: 36,
    filename: "101bmc36of113.mp3",
    consejoNumber: 35,
    title: "Consejo 35: La puntualidad no es una cortesía, es una declaración de respeto",
    subtitle: "Llegar a tiempo dice que el tiempo ajeno vale tanto como el tuyo",
    category: "Disciplina",
    durationSeconds: 140
  },
  {
    chapterNumber: 37,
    filename: "101bmc37of113.mp3",
    consejoNumber: 36,
    title: "Consejo 36: Aprende a guardar secretos, incluso cuando te pelees",
    subtitle: "El honor de un hombre se prueba en su discreción tras una ruptura",
    category: "Lealtad",
    durationSeconds: 160
  },
  {
    chapterNumber: 38,
    filename: "101bmc38of113.mp3",
    consejoNumber: 37,
    title: "Consejo 37: No presumas lo que aún no has construido",
    subtitle: "Celebrar antes de cruzar la meta es el pasatiempo favorito de los aficionados",
    category: "Prudencia",
    durationSeconds: 150
  },
  {
    chapterNumber: 39,
    filename: "101bmc39of113.mp3",
    consejoNumber: 38,
    title: "Consejo 38: La disciplina sin compasión te amarga; la compasión sin disciplina te arruina",
    subtitle: "Encuentra el equilibrio exacto entre exigirte grandeza y perdonarte tropiezos",
    category: "Equilibrio",
    durationSeconds: 170
  },
  {
    chapterNumber: 40,
    filename: "101bmc40of113.mp3",
    consejoNumber: 39,
    title: "Consejo 39: Enamórate del proceso cotidiano, no solo del aplauso en la meta",
    subtitle: "Si odias el entrenamiento de lunes a viernes, el campeonato sabrá a poco",
    category: "Propósito",
    durationSeconds: 165
  },
  {
    chapterNumber: 41,
    filename: "101bmc41of113.mp3",
    consejoNumber: 40,
    title: "Consejo 40: Ten la valentía de cambiar de opinión cuando los hechos cambien",
    subtitle: "La terquedad no es fidelidad a los ideales, es ceguera voluntaria",
    category: "Flexibilidad",
    durationSeconds: 155
  },
  {
    chapterNumber: 42,
    filename: "101bmc42of113.mp3",
    consejoNumber: 41,
    title: "Consejo 41: El silencio es la respuesta más ruidosa y elegante ante la provocación",
    subtitle: "Quien gasta palabras en defenderse de una calumnia le otorga categoría de duelo",
    category: "Autodominio",
    durationSeconds: 150
  },
  {
    chapterNumber: 43,
    filename: "101bmc43of113.mp3",
    consejoNumber: 42,
    title: "Consejo 42: Nunca prestes dinero esperando gratitud",
    subtitle: "Si decides prestar, asúmelo como regalo; salvarás el dinero o salvarás la amistad",
    category: "Finanzas",
    durationSeconds: 160
  },
  {
    chapterNumber: 44,
    filename: "101bmc44of113.mp3",
    consejoNumber: 43,
    title: "Consejo 43: Elige batallas que, si las ganas, te dejen territorio y no solo cenizas",
    subtitle: "Tener la razón en una discusión estéril es el trofeo más barato del mundo",
    category: "Estrategia",
    durationSeconds: 165
  },
  {
    chapterNumber: 45,
    filename: "101bmc45of113.mp3",
    consejoNumber: 44,
    title: "Consejo 44: Aprende a estar solo sin sentirte desamparado",
    subtitle: "Quien no disfruta de su propia compañía es presa fácil de cualquier compañía tóxica",
    category: "Soledad Fértil",
    durationSeconds: 175
  },
  {
    chapterNumber: 46,
    filename: "101bmc46of113.mp3",
    consejoNumber: 45,
    title: "Consejo 45: La curiosidad insaciable te mantendrá joven cuando el cuerpo envejezca",
    subtitle: "El día que dejas de hacer preguntas comienzas a marchitarte por dentro",
    category: "Mente",
    durationSeconds: 155
  },
  {
    chapterNumber: 47,
    filename: "101bmc47of113.mp3",
    consejoNumber: 46,
    title: "Consejo 46: No justifiques tus tropiezos con la supuesta mala suerte",
    subtitle: "Asumir la total responsabilidad de tus actos es el único camino hacia el poder",
    category: "Responsabilidad",
    durationSeconds: 150
  },
  {
    chapterNumber: 48,
    filename: "101bmc48of113.mp3",
    consejoNumber: 47,
    title: "Consejo 47: Da más de lo que esperan, pero nunca te regales por debajo de tu valor",
    subtitle: "La excelencia es tu carta de presentación, pero el autorrespeto es tu escudo",
    category: "Valor Propio",
    durationSeconds: 165
  },
  {
    chapterNumber: 49,
    filename: "101bmc49of113.mp3",
    consejoNumber: 48,
    title: "Consejo 48: La verdad dicha a tiempo duele una vez; la mentira carcome para siempre",
    subtitle: "Una decepción rápida es preferible a una ilusión prolongada que termine en estafa",
    category: "Honestidad",
    durationSeconds: 160
  },
  {
    chapterNumber: 50,
    filename: "101bmc50of113.mp3",
    consejoNumber: 49,
    title: "Consejo 49: Cuida tu cuerpo hoy si no quieres ser su esclavo mañana",
    subtitle: "Tu salud física es el vehículo irremplazable de todas tus aspiraciones",
    category: "Salud",
    durationSeconds: 170
  },
  {
    chapterNumber: 51,
    filename: "101bmc51of113.mp3",
    consejoNumber: 50,
    title: "Consejo 50: Los mejores acuerdos son aquellos donde ambas partes duermen en paz",
    subtitle: "La avaricia de querer ganarlo todo destruye las relaciones de largo plazo",
    category: "Negociación",
    durationSeconds: 155
  },
  {
    chapterNumber: 52,
    filename: "101bmc52of113.mp3",
    consejoNumber: 51,
    title: "Consejo 51: La duda inteligente es el principio de la sabiduría",
    subtitle: "Los fanáticos tienen certezas absolutas; los sabios tienen preguntas honestas",
    category: "Filosofía",
    durationSeconds: 150
  },
  {
    chapterNumber: 53,
    filename: "101bmc53of113.mp3",
    consejoNumber: 52,
    title: "Consejo 52: No busques aprobación donde solo hay envidia disfrazada de consejo",
    subtitle: "Aprende a filtrar quién opina por tu bien y quién por proteger su propia zona de confort",
    category: "Criterio",
    durationSeconds: 165
  },
  {
    chapterNumber: 54,
    filename: "101bmc54of113.mp3",
    consejoNumber: 53,
    title: "Consejo 53: Aprende a reírte de tus propias torpezas antes de que otros lo hagan",
    subtitle: "El sentido del humor es la vacuna definitiva contra la soberbia y el ridículo",
    category: "Humor & Gracia",
    durationSeconds: 145
  },
  {
    chapterNumber: 55,
    filename: "101bmc55of113.mp3",
    consejoNumber: 54,
    title: "Consejo 54: La generosidad en privado vale diez veces más que la filantropía con cámaras",
    subtitle: "Haz el bien sin anunciarlo en trompeta; la satisfacción íntima no necesita aplausos",
    category: "Generosidad",
    durationSeconds: 160
  },
  {
    chapterNumber: 56,
    filename: "101bmc56of113.mp3",
    consejoNumber: 55,
    title: "Consejo 55: Sé implacable con tus principios y flexible con tus métodos",
    subtitle: "El norte ético no se mueve; la ruta para llegar a él se adapta al terreno",
    category: "Principios",
    durationSeconds: 170
  },
  {
    chapterNumber: 57,
    filename: "101bmc57of113.mp3",
    consejoNumber: 56,
    title: "Consejo 56: La pereza mental es la causa de casi todos los fanatismos",
    subtitle: "Pensar cansa y requiere rigor; adoptar eslóganes prefabricados es gratis pero fatal",
    category: "Pensamiento Crítico",
    durationSeconds: 165
  },
  {
    chapterNumber: 58,
    filename: "101bmc58of113.mp3",
    consejoNumber: 57,
    title: "Consejo 57: No acumules cosas para llenar vacíos que solo llena el propósito",
    subtitle: "El consumo compulsivo es el anestésico de las vidas desorientadas",
    category: "Simplicidad",
    durationSeconds: 155
  },
  {
    chapterNumber: 59,
    filename: "101bmc59of113.mp3",
    consejoNumber: 58,
    title: "Consejo 58: Aprende a negociar: todo en la vida es una conversación pendiente",
    subtitle: "El que teme pedir lo que merece condena sus talentos al anonimato",
    category: "Habilidad",
    durationSeconds: 175
  },
  {
    chapterNumber: 60,
    filename: "101bmc60of113.mp3",
    consejoNumber: 59,
    title: "Consejo 59: Rodéate de personas que no teman decirte la verdad a la cara",
    subtitle: "Los aduladores te entierran; los amigos leales te confrontan a tiempo",
    category: "Amistad",
    durationSeconds: 160
  },
  {
    chapterNumber: 61,
    filename: "101bmc61of113.mp3",
    consejoNumber: 60,
    title: "Consejo 60: La envidia es el tributo involuntario que la mediocridad le rinde al talento",
    subtitle: "No te desgastes odiando al envidioso; déjalo consumirse en su propio fuego",
    category: "Temple",
    durationSeconds: 150
  },
  {
    chapterNumber: 62,
    filename: "101bmc62of113.mp3",
    consejoNumber: 61,
    title: "Consejo 61: El dinero ahorrado es libertad comprada por adelantado",
    subtitle: "Tener reservas financieras te permite mandar a paseo a quien pretenda someterte",
    category: "Libertad Financiera",
    durationSeconds: 180
  },
  {
    chapterNumber: 63,
    filename: "101bmc63of113.mp3",
    consejoNumber: 62,
    title: "Consejo 62: La riqueza silenciosa duerme diez veces mejor que el lujo estridente",
    subtitle: "El que necesita que todos sepan cuánto tiene, en el fondo sigue sintiéndose inseguro",
    category: "Discreción",
    durationSeconds: 165
  },
  {
    chapterNumber: 64,
    filename: "101bmc64of113.mp3",
    consejoNumber: 63,
    title: "Consejo 63: No vendas tu libertad por baratijas que no necesitas",
    subtitle: "El hombre más atrapado es el que trabaja sin descanso para impresionar a desconocidos",
    category: "Libertad",
    durationSeconds: 170
  },
  {
    chapterNumber: 65,
    filename: "101bmc65of113.mp3",
    consejoNumber: 64,
    title: "Consejo 64: Sé humilde en la victoria y ferozmente digno en la derrota",
    subtitle: "El triunfo embriaga al tonto y la derrota prueba al valiente",
    category: "Grandeza",
    durationSeconds: 155
  },
  {
    chapterNumber: 66,
    filename: "101bmc66of113.mp3",
    consejoNumber: 65,
    title: "Consejo 65: La intuición es la experiencia acumulada que tu lógica aún no sabe nombrar",
    subtitle: "Cuando una voz interior te dice que algo huele mal, hazle caso de inmediato",
    category: "Instinto",
    durationSeconds: 150
  },
  {
    chapterNumber: 67,
    filename: "101bmc67of113.mp3",
    consejoNumber: 66,
    title: "Consejo 66: Aprende a respirar hondo antes de enviar ese mensaje con rabia",
    subtitle: "Lo que escribes en diez segundos de furia te puede costar una década de reconstrucción",
    category: "Prudencia Digital",
    durationSeconds: 160
  },
  {
    chapterNumber: 68,
    filename: "101bmc68of113.mp3",
    consejoNumber: 67,
    title: "Consejo 67: No prometas en momentos de euforia ni respondas en momentos de ira",
    subtitle: "Deja enfriar el té antes de probarlo; evitarás quemarte la lengua y el futuro",
    category: "Madurez",
    durationSeconds: 145
  },
  {
    chapterNumber: 69,
    filename: "101bmc69of113.mp3",
    consejoNumber: 68,
    title: "Consejo 68: Un libro que te sacude vale más que cien horas de charlas motivacionales",
    subtitle: "Busca autores que te incomoden y te desafíen a pensar con cabeza propia",
    category: "Lectura",
    durationSeconds: 165
  },
  {
    chapterNumber: 70,
    filename: "101bmc70of113.mp3",
    consejoNumber: 69,
    title: "Consejo 69: La lealtad no se negocia: o es absoluta o no existe",
    subtitle: "Las lealtades a medias son traiciones esperando el momento propicio",
    category: "Lealtad",
    durationSeconds: 170
  },
  {
    chapterNumber: 71,
    filename: "101bmc71of113.mp3",
    consejoNumber: 70,
    title: "Consejo 70: Desconfía de quien habla mal de todos cuando no están presentes",
    subtitle: "En cuanto salgas de la habitación, tú serás el siguiente tema en su menú",
    category: "Criterio Social",
    durationSeconds: 150
  },
  {
    chapterNumber: 72,
    filename: "101bmc72of113.mp3",
    consejoNumber: 71,
    title: "Consejo 71: Tu hogar debe ser un santuario de paz, no un segundo campo de batalla",
    subtitle: "Cuida las puertas de tu casa: no dejes entrar dramas ajenos ni toxicidades innecesarias",
    category: "Hogar",
    durationSeconds: 160
  },
  {
    chapterNumber: 73,
    filename: "101bmc73of113.mp3",
    consejoNumber: 72,
    title: "Consejo 72: Aprende a cocinarte, a limpiar tu espacio y a valerte por ti mismo",
    subtitle: "La autonomía práctica es el fundamento sobre el que se edifica la dignidad",
    category: "Autonomía",
    durationSeconds: 155
  },
  {
    chapterNumber: 74,
    filename: "101bmc74of113.mp3",
    consejoNumber: 73,
    title: "Consejo 73: Las excusas bien armadas solo convencen a quien las inventa",
    subtitle: "El mundo no premia las intenciones floridas; premia las ejecuciones terminadas",
    category: "Responsabilidad",
    durationSeconds: 145
  },
  {
    chapterNumber: 75,
    filename: "101bmc75of113.mp3",
    consejoNumber: 74,
    title: "Consejo 74: La elegancia no está en la ropa que vistes, sino en cómo tratas a los demás",
    subtitle: "Un traje costoso no tapa la vulgaridad de un trato displicente",
    category: "Elegancia",
    durationSeconds: 160
  },
  {
    chapterNumber: 76,
    filename: "101bmc76of113.mp3",
    consejoNumber: 75,
    title: "Consejo 75: No te creas tus propios elogios ni te desmorones con tus críticas",
    subtitle: "Permanece centrado en el trabajo y mantén a ambos impostores a raya",
    category: "Ecuanimidad",
    durationSeconds: 165
  },
  {
    chapterNumber: 77,
    filename: "101bmc77of113.mp3",
    consejoNumber: 76,
    title: "Consejo 76: El tiempo libre bien aprovechado es el mayor privilegio del ser humano",
    subtitle: "Dedica horas al ocio creativo, a la contemplación y a los seres que amas",
    category: "Tiempo",
    durationSeconds: 175
  },
  {
    chapterNumber: 78,
    filename: "101bmc78of113.mp3",
    consejoNumber: 77,
    title: "Consejo 77: La constancia silenciosa rompe cualquier muro de talento indisciplinado",
    subtitle: "La gota horada la piedra no por su fuerza, sino por su constancia implacable",
    category: "Perseverancia",
    durationSeconds: 170
  },
  {
    chapterNumber: 79,
    filename: "101bmc79of113.mp3",
    consejoNumber: 78,
    title: "Consejo 78: No te endeudes para comprar estatus ante personas que ni te importan",
    subtitle: "El endeudamiento por vanidad es la soga que ahoga los sueños más bellos",
    category: "Finanzas",
    durationSeconds: 160
  },
  {
    chapterNumber: 80,
    filename: "101bmc80of113.mp3",
    consejoNumber: 79,
    title: "Consejo 79: Si vas a decir una verdad incómoda, acompáñala con una propuesta útil",
    subtitle: "La crítica sin alternativa es simple descarga emocional destructiva",
    category: "Comunicación",
    durationSeconds: 155
  },
  {
    chapterNumber: 81,
    filename: "101bmc81of113.mp3",
    consejoNumber: 80,
    title: "Consejo 80: Aprende a escuchar los silencios de la gente que amas",
    subtitle: "A veces lo más importante es lo que nadie se atreve a pronunciar en voz alta",
    category: "Empatía",
    durationSeconds: 165
  },
  {
    chapterNumber: 82,
    filename: "101bmc82of113.mp3",
    consejoNumber: 81,
    title: "Consejo 81: Acepta que serás el villano en la historia mal contada de alguien",
    subtitle: "No puedes poner límites sanos sin romper las expectativas egoístas de otros",
    category: "Límites",
    durationSeconds: 180
  },
  {
    chapterNumber: 83,
    filename: "101bmc83of113.mp3",
    consejoNumber: 82,
    title: "Consejo 82: La suerte acompaña al que ya está despierto y trabajando",
    subtitle: "La fortuna es el encuentro providencial entre la preparación rigurosa y la oportunidad",
    category: "Trabajo",
    durationSeconds: 160
  },
  {
    chapterNumber: 84,
    filename: "101bmc84of113.mp3",
    consejoNumber: 83,
    title: "Consejo 83: Ten siempre un fondo de emergencia para no tener que arrodillarte",
    subtitle: "La paz mental no tiene precio; ahorra para comprar tu soberanía personal",
    category: "Seguridad",
    durationSeconds: 175
  },
  {
    chapterNumber: 85,
    filename: "101bmc85of113.mp3",
    consejoNumber: 84,
    title: "Consejo 84: El respeto no se exige a gritos: se gana con coherencia",
    subtitle: "Quien necesita imponerse con amenazas demuestra la debilidad de su autoridad",
    category: "Liderazgo",
    durationSeconds: 150
  },
  {
    chapterNumber: 86,
    filename: "101bmc86of113.mp3",
    consejoNumber: 85,
    title: "Consejo 85: No pospongas las conversaciones difíciles: solo se ponen más amargas",
    subtitle: "Aborda el conflicto mientras aún es una chispa antes de que incendie la casa",
    category: "Resolución",
    durationSeconds: 165
  },
  {
    chapterNumber: 87,
    filename: "101bmc87of113.mp3",
    consejoNumber: 86,
    title: "Consejo 86: La envidia destruye al que la siente antes de tocar al envidiado",
    subtitle: "Festeja el éxito del vecino y aprenderás el camino para conquistar el tuyo",
    category: "Nobleza",
    durationSeconds: 155
  },
  {
    chapterNumber: 88,
    filename: "101bmc88of113.mp3",
    consejoNumber: 87,
    title: "Consejo 87: Aprende a retirarte de una fiesta o de una mesa con elegancia",
    subtitle: "Saber cuándo marcharse a tiempo es una de las mayores formas de distinción",
    category: "Elegancia",
    durationSeconds: 150
  },
  {
    chapterNumber: 89,
    filename: "101bmc89of113.mp3",
    consejoNumber: 88,
    title: "Consejo 88: No culpes a tus padres por los errores que tú sigues cometiendo",
    subtitle: "Madurar es dejar de señalar la infancia y tomar las riendas de tu presente",
    category: "Madurez",
    durationSeconds: 170
  },
  {
    chapterNumber: 90,
    filename: "101bmc90of113.mp3",
    consejoNumber: 89,
    title: "Consejo 89: La salud mental comienza diciendo 'hasta aquí' sin culpa",
    subtitle: "Ponerle un cerrojo a tu tranquilidad no es egoísmo, es supervivencia básica",
    category: "Paz Mental",
    durationSeconds: 160
  },
  {
    chapterNumber: 91,
    filename: "101bmc91of113.mp3",
    consejoNumber: 90,
    title: "Consejo 90: La disciplina supera a la motivación porque no espera a estar de humor",
    subtitle: "La motivación es una visita caprichosa; la disciplina es el viejo hábito inquebrantable",
    category: "Disciplina",
    durationSeconds: 175
  },
  {
    chapterNumber: 92,
    filename: "101bmc92of113.mp3",
    consejoNumber: 91,
    title: "Consejo 91: Cuida los detalles pequeños: son los que revelan el cuadro completo",
    subtitle: "La forma en que haces una cosa suele ser la forma en que haces todo",
    category: "Detalle",
    durationSeconds: 155
  },
  {
    chapterNumber: 93,
    filename: "101bmc93of113.mp3",
    consejoNumber: 92,
    title: "Consejo 92: Sé el primero en admitir cuando te equivocaste; desarma a tus críticos",
    subtitle: "Reconocer un fallo con elegancia y rectificar de inmediato te hace invencible",
    category: "Humildad",
    durationSeconds: 165
  },
  {
    chapterNumber: 94,
    filename: "101bmc94of113.mp3",
    consejoNumber: 93,
    title: "Consejo 93: El conocimiento que no se aplica es simple entretenimiento intelectual",
    subtitle: "Menos acumular citas célebres y más transformar tu realidad cotidiana con ellas",
    category: "Acción",
    durationSeconds: 160
  },
  {
    chapterNumber: 95,
    filename: "101bmc95of113.mp3",
    consejoNumber: 94,
    title: "Consejo 94: No te compares con nadie más que con quien fuiste ayer",
    subtitle: "La comparación con vidas ajenas es el camino más directo a la amargura",
    category: "Evolución",
    durationSeconds: 150
  },
  {
    chapterNumber: 96,
    filename: "101bmc96of113.mp3",
    consejoNumber: 95,
    title: "Consejo 95: Valora a los amigos que estuvieron contigo cuando no tenías nada",
    subtitle: "En la abundancia sobran convidados; en la escasez se cuentan los hermanos de sangre",
    category: "Gratitud",
    durationSeconds: 170
  },
  {
    chapterNumber: 97,
    filename: "101bmc97of113.mp3",
    consejoNumber: 96,
    title: "Consejo 96: La paciencia no es esperar pasivamente, es construir con templanza",
    subtitle: "Sigue labrando el campo con fe incluso en las temporadas en que la lluvia tarda",
    category: "Constancia",
    durationSeconds: 165
  },
  {
    chapterNumber: 98,
    filename: "101bmc98of113.mp3",
    consejoNumber: 97,
    title: "Consejo 97: Aprende a decir 'no sé' y 'no entiendo' sin sentir vergüenza",
    subtitle: "La confesión de ignorancia es la llave dorada que abre todas las puertas del saber",
    category: "Sabiduría",
    durationSeconds: 145
  },
  {
    chapterNumber: 99,
    filename: "101bmc99of113.mp3",
    consejoNumber: 98,
    title: "Consejo 98: La verdadera fuerza se demuestra en la ternura y la templanza",
    subtitle: "Cualquiera puede gritar y romper cosas; sostener una mirada con amor exige coraje",
    category: "Nobleza",
    durationSeconds: 160
  },
  {
    chapterNumber: 100,
    filename: "101bmc100of113.mp3",
    consejoNumber: 99,
    title: "Consejo 99: No te aferres a quien ya soltó tu mano",
    subtitle: "El apego a quien ya decidió marcharse solo prolonga una agonía innecesaria",
    category: "Desapego",
    durationSeconds: 155
  },
  {
    chapterNumber: 101,
    filename: "101bmc101of113.mp3",
    consejoNumber: 100,
    title: "Consejo 100: Ten siempre un plan B tan bueno que el tropiezo del plan A parezca un acierto",
    subtitle: "Diseña tu vida con holgura: amor propio, reservas financieras y mente despierta",
    category: "Estrategia",
    durationSeconds: 180
  },
  {
    chapterNumber: 102,
    filename: "101bmc102of113.mp3",
    consejoNumber: 101,
    title: "Consejo 101: No te tomes tan en serio ni a este libro ni a ti mismo",
    subtitle: "El exceso de solemnidad es el veneno que mata la dicha y el asombro de vivir",
    category: "Clausura Consejos",
    durationSeconds: 190
  },

  // Pistas 103 a 113: Epílogo, Bonus Tracks y Reflexiones Finales
  {
    chapterNumber: 103,
    filename: "101bmc103of113.mp3",
    title: "Epílogo: El Manifiesto del Hijo Despierto",
    subtitle: "La brújula definitiva para navegar un mundo enloquecido por la superficialidad",
    category: "Epílogo",
    durationSeconds: 210
  },
  {
    chapterNumber: 104,
    filename: "101bmc104of113.mp3",
    title: "Bonus I: La trampa de las apariencias y el estatus fingido",
    subtitle: "Por qué vivir para impresionar es la receta infalible para la bancarrota moral",
    category: "Reflexiones Especiales",
    durationSeconds: 185
  },
  {
    chapterNumber: 105,
    filename: "101bmc105of113.mp3",
    title: "Bonus II: El valor sagrado del apretón de manos",
    subtitle: "La palabra empeñada como contrato inquebrantable entre hombres de honor",
    category: "Reflexiones Especiales",
    durationSeconds: 175
  },
  {
    chapterNumber: 106,
    filename: "101bmc106of113.mp3",
    title: "Bonus III: Por qué la honestidad brutal salva más vidas que la diplomacia",
    subtitle: "El cirujano que corta a fondo salva al paciente; el que acaricia la herida lo condena",
    category: "Reflexiones Especiales",
    durationSeconds: 190
  },
  {
    chapterNumber: 107,
    filename: "101bmc107of113.mp3",
    title: "Bonus IV: Los tres errores financieros que arruinan la juventud",
    subtitle: "Deudas por vanidad, inversiones por moda y gastar lo que aún no has cobrado",
    category: "Finanzas & Vida",
    durationSeconds: 200
  },
  {
    chapterNumber: 108,
    filename: "101bmc108of113.mp3",
    title: "Bonus V: El poder silencioso de la disciplina solitaria",
    subtitle: "Lo que haces cuando nadie te aplaude es lo que decide quién serás",
    category: "Reflexiones Especiales",
    durationSeconds: 180
  },
  {
    chapterNumber: 109,
    filename: "101bmc109of113.mp3",
    title: "Bonus VI: Las preguntas incómodas que debes hacerte cada domingo",
    subtitle: "Un examen de conciencia despierto para no vivir en piloto automático",
    category: "Criterio",
    durationSeconds: 175
  },
  {
    chapterNumber: 110,
    filename: "101bmc110of113.mp3",
    title: "Bonus VII: Cómo elegir a tus batallas y a tus aliados estratégicos",
    subtitle: "No todo agravio merece tu lanza; reserva tu acero para lo que realmente importa",
    category: "Estrategia",
    durationSeconds: 185
  },
  {
    chapterNumber: 111,
    filename: "101bmc111of113.mp3",
    title: "Bonus VIII: El perdón como suprema estrategia de paz mental",
    subtitle: "Liberar al prisionero y descubrir con asombro que el prisionero eras tú",
    category: "Paz Interior",
    durationSeconds: 190
  },
  {
    chapterNumber: 112,
    filename: "101bmc112of113.mp3",
    title: "Bonus IX: El legado que dejas cuando sales de la habitación",
    subtitle: "Lo que las personas sienten en tu presencia es tu verdadera huella en la tierra",
    category: "Legado",
    durationSeconds: 195
  },
  {
    chapterNumber: 113,
    filename: "101bmc113of113.mp3",
    title: "Capítulo 113: Mensaje Final de Robert Pacheco para Ti",
    subtitle: "Agradecimiento, bendición de autor y despedida para el lector del audiolibro",
    category: "Clausura Oficial",
    durationSeconds: 220
  }
];

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
    durationSeconds: ch.durationSeconds
  }));
}
