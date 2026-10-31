/**
 * ============================================================================
 * CONTENIDO OFICIAL DEL LIBRO Y AUDIOLIBRO
 * Obra: "101 Buenos Malos Consejos"
 * Autor: por Robert Pacheco
 * ============================================================================
 * 
 * NOTA PARA EL DESARROLLADOR / AUTOR:
 * Puedes actualizar las URLs de los audios en la propiedad `audioUrl` de cada capítulo
 * (Firebase Storage, Google Cloud Storage, AWS S3 o CDN con streaming HTTPS).
 */

import { BookInfo, Chapter } from '../types';

export const BOOK_METADATA: BookInfo = {
  title: "101 Buenos Malos Consejos Para Mi Hijo",
  subtitle: "Ironías lúcidas, verdades incómodas y sentido común sin domesticar",
  author: "Por Robert Pacheco",
  edition: "Edición Digital & Audiolibro Oficial",
  synopsis: "101 reflexiones irreverentes, afiladas y honestas que desafían la autoayuda convencional. Robert Pacheco desmantela las trampas de la complacencia social y nos entrega una brújula directa para pensar con cabeza propia.",
  totalChapters: 6,
  totalAdviceCount: 101,
  totalAudioDuration: "2h 45m"
};

export const BOOK_CHAPTERS: Chapter[] = [
  {
    id: 1,
    numberRange: "Prólogo",
    title: "El peligro del sentido común domesticado",
    subtitle: "Por qué los consejos estándar nos hunden en la mediocridad",
    category: "Fundamentos",
    readTimeMinutes: 7,
    audioDurationSeconds: 420,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
    consejos: [
      {
        number: 0,
        title: "La advertencia preliminar",
        quote: "No hay nada más destructivo que seguir al pie de la letra los consejos de quienes nunca han arriesgado nada.",
        reflection: "La mayoría de los consejos bienintencionados están diseñados para una sola cosa: mantenerte a salvo de los errores a costa de mantenerte a salvo de la grandeza. Este libro no busca consolarte con clichés azucarados; busca provocarte una incomodidad fértil.",
        ruleOfThumb: "Escucha a quien tiene cicatrices y sentido del humor, jamás a quien solo vende certezas empaquetadas."
      }
    ]
  },
  {
    id: 2,
    numberRange: "Consejos 01 – 20",
    title: "La Paradoja del Esfuerzo y las Falsas Certezas",
    subtitle: "Cuando trabajar más duro es el peor camino posible",
    category: "Productividad & Criterio",
    readTimeMinutes: 18,
    audioDurationSeconds: 1080,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/fireplace.ogg",
    consejos: [
      {
        number: 1,
        title: "No busques ser perfecto; busca ser difícil de ignorar",
        quote: "La perfección es el refugio de los cobardes; la singularidad es el terreno de los audaces.",
        reflection: "El perfeccionismo paraliza. Mientras tú retocas los detalles insignificantes por décima vez, alguien con la mitad de tus dudas pero el triple de tu descaro ya lanzó su proyecto y aprendió de la respuesta de la realidad.",
        ruleOfThumb: "Lanza cuando aún sientas un ligero pudor. La perfección se descubre en la fricción con el mundo real."
      },
      {
        number: 2,
        title: "Aprende a fracasar a puerta cerrada antes de triunfar en público",
        quote: "El talento privado ahorra humillaciones colectivas.",
        reflection: "Vivimos obsesionados con documentar cada tropiezo en redes sociales. Ten la disciplina de ser malo en algo en absoluto secreto. Pulir tu oficio sin espectadores te da la libertad de arriesgar sin miedo al juicio ajeno.",
        ruleOfThumb: "Construye tu ventaja en el taller; déjalos adivinar de dónde salió tu puntería."
      },
      {
        number: 3,
        title: "Si todos te dan la razón, es muy probable que no estés diciendo nada nuevo",
        quote: "El consenso unánime suele ser el síntoma inequívoco del aburrimiento institucional.",
        reflection: "Cualquier idea que valga la pena desafiará al menos a un grupo de personas. Cuando tu discurso no incomoda a nadie, es porque tu discurso no contiene nada que valga la pena defender.",
        ruleOfThumb: "Mide el impacto de tu pensamiento por la calidad de las objeciones que provoca."
      },
      {
        number: 4,
        title: "El descanso no es una recompensa; es la materia prima del pensamiento fino",
        quote: "Un cerebro exhausto solo produce soluciones obvias y resentimiento.",
        reflection: "La cultura del agotamiento idolatra las ojeras como si no dormir fuera un mérito. Si quieres tomar decisiones agudas y creativas, duerme bien y date permiso de aburrirte con frecuencia.",
        ruleOfThumb: "Programa tus pausas con la misma seriedad con que programas tus citas más importantes."
      },
      {
        number: 5,
        title: "Desconfía de quien siempre tiene prisa por parecer importante",
        quote: "Los que realmente mueven las piezas rara vez corren con desesperación.",
        reflection: "La prisa artificial es un truco teatral para proyectar estatus. Las personas que realmente tienen el control tienen tiempo para pensar, para escuchar y para sostener una mirada con calma.",
        ruleOfThumb: "Conserva la calma ante la histeria ajena; tu serenidad desarmará al histriónico."
      },
      {
        number: 6,
        title: "No compitas con el rebaño; inventa tu propia categoría",
        quote: "En una carrera de cien metros, el segundo es el primer perdedor; en un juego nuevo, tú escribes las reglas.",
        reflection: "Cuando compites en lo que todos hacen, el cliente te compara por precio. Cuando creas una combinación atípica de tus habilidades, no hay tabla comparativa en la que puedan encasillarte.",
        ruleOfThumb: "Combina dos disciplinas que nadie más asocia: la intersección es tu territorio exclusivo."
      },
      {
        number: 7,
        title: "No pidas disculpas por decir que no",
        quote: "Cada sí complaciente es un puñal por la espalda a tus verdaderas prioridades.",
        reflection: "La cobardía de no querer quedar mal te llena la agenda de compromisos vacíos. La palabra 'no' dicha con respeto y firmeza es la única muralla que protege tu tiempo y tu paz.",
        ruleOfThumb: "Un 'no' a tiempo es el mayor acto de lealtad hacia ti mismo."
      }
    ]
  },
  {
    id: 3,
    numberRange: "Consejos 21 – 40",
    title: "El Arte de la Imprudencia Conveniente",
    subtitle: "Riesgos calculados y la sabiduría de desafiar la norma",
    category: "Estrategia & Criterio",
    readTimeMinutes: 20,
    audioDurationSeconds: 1200,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    consejos: [
      {
        number: 21,
        title: "El exceso de prudencia suele ser miedo con traje formal",
        quote: "Quien espera a que todas las luces del camino estén en verde jamás sale de su cochera.",
        reflection: "Muchos llaman 'análisis' a lo que en realidad es pánico a equivocarse. La información perfecta nunca existirá en el momento oportuno; aprende a dar el paso con un 70% de certeza y ajusta en el camino.",
        ruleOfThumb: "El costo de no hacer nada suele ser invisible, pero es infinitamente más caro."
      },
      {
        number: 22,
        title: "Corta las pérdidas emocionales con la frialdad de un cirujano",
        quote: "No sigas regando una planta de plástico solo porque la compraste cara.",
        reflection: "La falacia del costo hundido arruina vidas enteras. Si una relación, una sociedad o un hábito ya no tiene remedio, retírate hoy. El tiempo que perdiste ya no vuelve; no le regales también tu futuro.",
        ruleOfThumb: "Saber cuándo marcharse a tiempo es la forma suprema de la elegancia mental."
      },
      {
        number: 23,
        title: "Haz cosas a mano hasta que entiendas qué es lo que importa",
        quote: "El artesano que entiende a un solo cliente derrota al burócrata que se ahoga en hojas de cálculo.",
        reflection: "La prisa por automatizar todo antes de tener algo con alma es un error común. Habla personalmente, escucha las quejas reales y cuida los detalles antes de pensar en la escala.",
        ruleOfThumb: "La intimidad con el problema precede a cualquier solución duradera."
      },
      {
        number: 24,
        title: "No intentes convencer a los cínicos; dialoga con los curiosos",
        quote: "El cínico ya decidió que el mundo está podrido; gastar argumentos en él es intentar iluminar un pozo ciego.",
        reflection: "Dirige tu energía hacia aquellos con ojos despiertos y apetito de aprender. El resto solo busca arrastrarte a su desencanto para no sentirse tan solos.",
        ruleOfThumb: "Ignora al provocador de turno; alimenta a quienes están construyendo algo."
      }
    ]
  },
  {
    id: 4,
    numberRange: "Consejos 41 – 60",
    title: "Relaciones, Envidias y Otros Accidentes Sociales",
    subtitle: "Cómo convivir con la fauna humana sin volverte un cascarrabias",
    category: "Relaciones & Dinámicas Humanas",
    readTimeMinutes: 19,
    audioDurationSeconds: 1140,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/gentle_stream_in_forest.ogg",
    consejos: [
      {
        number: 41,
        title: "El silencio es la respuesta más ruidosa que puedes regalar",
        quote: "Quien gasta palabras en defenderse de una calumnia mezquina solo le otorga categoría de duelo.",
        reflection: "No todo ataque merece tu atención. La indiferencia bien administrada no solo te ahorra bilis; le niega al provocador la recompensa de saberse relevante en tu vida.",
        ruleOfThumb: "Trata los agravios menores como ruidos del tráfico: se escuchan pero no se contestan."
      },
      {
        number: 42,
        title: "Nunca prestes dinero esperando gratitud",
        quote: "El dinero prestado a amigos o familiares tiene dos precios: el capital y el afecto.",
        reflection: "Si decides ayudar a alguien cercano, asume mentalmente que se trata de un regalo a fondo perdido. Si te pagan, será una grata sorpresa; si no lo hacen, ya habrás pagado el precio de la claridad.",
        ruleOfThumb: "Solo presta la suma que estés dispuesto a perder para conservar la paz."
      },
      {
        number: 43,
        title: "Elige batallas que, si las ganas, te dejen territorio y no solo cenizas",
        quote: "Tener la razón en una discusión estéril es el trofeo más barato del mundo.",
        reflection: "Pregúntate antes de engancharte: 'Si salgo victorioso de esto, ¿qué habré ganado en realidad?'. Si la respuesta es solo acariciar tu propio ego, estás perdiendo tiempo precioso.",
        ruleOfThumb: "La victoria que solo alimenta el ego te deja sin aliados y con la cuenta vacía."
      }
    ]
  },
  {
    id: 5,
    numberRange: "Consejos 61 – 80",
    title: "Dinero, Ambición y Vanidad Honesta",
    subtitle: "La relación sana con la abundancia y sus trampas",
    category: "Finanzas & Criterio",
    readTimeMinutes: 21,
    audioDurationSeconds: 1260,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/ocean_waves_crashing.ogg",
    consejos: [
      {
        number: 61,
        title: "El dinero no te cambia; solo le sube el volumen a quien ya eras",
        quote: "La abundancia quita los filtros sociales y revela la verdadera madera de la que estás hecho.",
        reflection: "El dinero simplemente retira las presiones cotidianas que obligan al hipócrita a fingir templanza. Quien era generoso se vuelve magnánimo; quien era mezquino se vuelve insoportable.",
        ruleOfThumb: "Observa cómo trata una persona a quien no puede ofrecerle ningún beneficio."
      },
      {
        number: 62,
        title: "La riqueza silenciosa duerme diez veces mejor que el lujo estridente",
        quote: "El que necesita que todos sepan cuánto tiene, en el fondo sigue sintiéndose inseguro.",
        reflection: "El verdadero poder es la discreción. La necesidad de presumir logotipos y excesos es un grito desesperado de validación que suele atraer a los peores compañeros de ruta.",
        ruleOfThumb: "Vive por debajo de tus posibilidades pero muy por encima de tus temores."
      },
      {
        number: 63,
        title: "No vendas tu libertad por baratijas que no necesitas",
        quote: "El hombre más atrapado es aquel que trabaja jornadas interminables para impresionar a gente que ni le agrada.",
        reflection: "La verdadera prosperidad no se mide en objetos acumulados sino en la cantidad de mañanas en las que puedes decidir qué hacer con tu propio tiempo sin pedirle permiso a nadie.",
        ruleOfThumb: "El tiempo libre bien empleado es el activo más valioso de la existencia."
      }
    ]
  },
  {
    id: 6,
    numberRange: "Consejos 81 – 101",
    title: "Secretos Inconfesables y el Gran Remate",
    subtitle: "Cómo reconciliarse con la imperfección de estar vivo",
    category: "Cierre & Conclusiones",
    readTimeMinutes: 24,
    audioDurationSeconds: 1440,
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/night_crickets.ogg",
    consejos: [
      {
        number: 81,
        title: "Acepta que serás el villano en la historia mal contada de alguien",
        quote: "No puedes poner límites sanos sin romper las expectativas egoístas de quienes se beneficiaban de tu silencio.",
        reflection: "En el momento en que aprendes a velar por tu propia integridad, aquellos acostumbrados a aprovecharse de ti te acusarán de haber cambiado. Sonríe y continúa: esa es la prueba de que maduraste.",
        ruleOfThumb: "Tu reputación en mentes ajenas no paga tus cuentas ni cura tus heridas."
      },
      {
        number: 90,
        title: "La disciplina supera a la motivación porque no espera a estar de humor",
        quote: "La motivación es una visita caprichosa que no llega los días fríos; la disciplina es el viejo hábito que se presenta sin importar el clima.",
        reflection: "Esperar a 'sentirse inspirado' para crear o avanzar es la trampa del aficionado. Los que logran cosas se sientan a trabajar a la hora acordada, con o sin ganas.",
        ruleOfThumb: "El hábito firme te sostiene cuando la euforia inicial se desvanece."
      },
      {
        number: 100,
        title: "Ten siempre un plan B tan bueno que el tropiezo del plan A parezca un acierto",
        quote: "La serenidad no proviene de saber que nada saldrá mal, sino de saber que podrás maniobrar cuando todo cambie.",
        reflection: "La resiliencia no consiste en recibir golpes con los ojos cerrados; es haber previsto de antemano el siguiente movimiento con lucidez y calma.",
        ruleOfThumb: "Diseña tu vida con márgenes de seguridad: amor propio, ahorros y amigos sinceros."
      },
      {
        number: 101,
        title: "El consejo final: no te tomes tan en serio ni a este libro ni a ti mismo",
        quote: "El exceso de solemnidad es el veneno que mata la dicha de existir.",
        reflection: "Al final del día, todos estamos navegando la vida lo mejor que podemos. Reírte de tus propios tropiezos y mantener la curiosidad encendida es el acto de libertad más genuino que puedes practicar.",
        ruleOfThumb: "Aprende las reglas con rigor para saber romperlas con gracia y elegancia."
      }
    ]
  }
];
