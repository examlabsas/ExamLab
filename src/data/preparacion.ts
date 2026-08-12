/**
 * Manual de preparación para pacientes.
 *
 * Contenido entregado por el laboratorio (documento INDICACIONES.docx). Las
 * indicaciones médicas se conservan palabra por palabra; solo se corrigió
 * ortografía, acentuación y separación de palabras.
 *
 * Vive como datos y no dentro de la página porque lo consumen tres lugares:
 * la página /preparacion, el enlace automático desde cada ficha del catálogo
 * y —a futuro— la versión en PDF.
 *
 * Lo escrito entre dobles asteriscos se resalta al mostrarse (ver `resaltar`).
 * Se marca solo aquello que, si se pasa por alto, invalida la muestra: tiempos,
 * prohibiciones y condiciones de recolección.
 */
import type { IconName } from '@/lib/iconos';

/**
 * Parte un texto en tramos normales y resaltados, según los `**marcadores**`.
 *
 * Se prefiere esta convención a guardar HTML en el contenido: quien edite estas
 * indicaciones el día de mañana no necesita saber nada de etiquetas, y el texto
 * sigue siendo legible tal cual en el archivo.
 */
export function resaltar(texto: string): { texto: string; fuerte: boolean }[] {
  // `split` con grupo de captura alterna: par = normal, impar = capturado.
  return texto
    .split(/\*\*(.+?)\*\*/g)
    .map((parte, i) => ({ texto: parte, fuerte: i % 2 === 1 }))
    .filter((parte) => parte.texto !== '');
}

export type BloquePreparacion = {
  /** Ancla de la URL: /preparacion#sangre */
  id: string;
  titulo: string;
  /** Frase corta para el índice y para las tarjetas del catálogo. */
  resumen: string;
  icono: IconName;
  /** Aviso destacado que encabeza el bloque. */
  destacado?: string;
  indicaciones: string[];
  imagen?: { src: string; alt: string; pie: string };
  /**
   * Palabras que, encontradas en el campo «tipo de muestra» de un examen,
   * hacen que su ficha enlace a este bloque. Se comparan sin tildes.
   */
  coincidencias: string[];
};

export const bloquesPreparacion: BloquePreparacion[] = [
  {
    id: 'sangre',
    titulo: 'Muestras de sangre',
    resumen: 'Ayuno de 8 a 12 horas, sin esfuerzo físico ni alcohol el día previo.',
    icono: 'gota',
    destacado: 'Acudir al laboratorio previo **ayuno de 8 a 12 horas**.',
    indicaciones: [
      'No realice **esfuerzo físico** durante las **24 horas previas** a realizarse sus exámenes.',
      '**No fumar ni ingerir bebidas alcohólicas** 24 horas antes de la toma de muestra.',
      'Solo se puede tomar **agua** con los medicamentos indicados por el médico.',
      'Se recomienda mantener su dieta habitual, salvo que exista alguna indicación específica de su médico.',
    ],
    coincidencias: ['sangre', 'suero', 'plasma'],
  },
  {
    id: 'orina',
    titulo: 'Muestras de orina',
    resumen: 'Primera orina de la mañana, chorro intermedio, previo aseo solo con agua.',
    icono: 'matraz',
    indicaciones: [
      'Previo a la recolección de la muestra debe realizarse un aseo genital externo **SOLO CON AGUA**.',
      'Recoger la **primera orina de la mañana**, de **CHORRO INTERMEDIO**: luego de haber desechado el **PRIMER CHORRO**, coloque el envase cerca de los genitales (no es necesario llenarlo). **Evite el contacto de la piel con el envase o la tapa.** Tape bien el frasco.',
      'Dejar la muestra en **máximo 2 horas** después de recogerla.',
      '**NO RECOLECTAR MUESTRAS DE BACINILLA NI DEL INODORO.**',
      '**NO recolectar la muestra si está menstruando** o si ha mantenido relaciones sexuales **24 a 48 horas antes** de recoger la muestra.',
    ],
    coincidencias: ['orina'],
  },
  {
    id: 'orina-bebes',
    titulo: 'Orina en bebés',
    resumen: 'Con bolsa pediátrica recolectora. Revisarla entre 30 y 60 minutos.',
    icono: 'bebe',
    destacado: 'Es necesario usar **bolsa pediátrica recolectora**.',
    indicaciones: [
      'Previo a la colocación de la bolsa, con las manos limpias, realice un aseo genital externo a su bebé **SOLO CON AGUA**.',
      'Saque la bolsa de la funda protectora, retire el papel protector del adhesivo, ajuste bien la abertura a los genitales y realice una **presión firme en todos los bordes**.',
      'Coloque el pañal **dejando la bolsa accesible** para poder ver cuándo ha orinado.',
      '**IMPORTANTE: revisar la bolsa entre 30 minutos y máximo 60 minutos.** Si pasada 1 hora no hay orina, colocar otra bolsa realizando nuevamente el aseo.',
    ],
    coincidencias: [],
  },
  {
    id: 'orina-24-horas',
    titulo: 'Orina de 24 horas',
    resumen: 'Frasco de 3 litros. Se descarta la primera orina y se recoge todo un día completo.',
    icono: 'reloj',
    destacado:
      'Para la recolección se necesita un **frasco de 3 litros**, desechable y limpio (envases de galón).',
    indicaciones: [
      '**NO RECOLECTAR la primera orina de la mañana.**',
      'Recoger a partir de la **segunda micción**. Es IMPORTANTE recolectar la **totalidad de las micciones sin sobrepasar las 24 horas** y evitar pérdidas de orina. **Si olvidó alguna micción, se debe iniciar nuevamente la recolección** en un recipiente diferente.',
    ],
    coincidencias: ['orina 24', 'orina de 24'],
  },
  {
    id: 'heces',
    titulo: 'Muestras de heces',
    resumen: 'Sin contaminar con orina y entregada en un máximo de 2 horas.',
    icono: 'tubo',
    indicaciones: [
      'Recoger la muestra **sin contaminar con orina** (**NO RECOGER DEL INODORO NI DE LA BACINILLA**).',
      'Para evitar perder la muestra, coloque **papel higiénico, papel aluminio o una funda nueva en el inodoro**, como se muestra en la imagen.',
      'Tome una porción de heces del **área que más le llame la atención**; utilice el aplicador que se encuentra adjunto a la tapa o una espátula de madera.',
      'En caso de que le soliciten el examen de **INVESTIGACIÓN DE SANGRE OCULTA**, **no consumir carne roja, rábanos ni suplementos de hierro** durante las **48 horas previas** a la toma de muestra.',
      'Para exámenes seriados, la recolección se realiza con **una muestra por cada día solicitado**.',
      '**BEBÉS que usen pañal:** recoger la muestra **inmediatamente después de la defecación** en el pañal. RECOMENDACIÓN: se puede utilizar el pañal al revés, es decir, **el lado absorbente hacia afuera**.',
      'Dejar la muestra en **máximo 2 horas** después de recogerla.',
      '**NO recolectar la muestra si está menstruando.**',
    ],
    imagen: {
      src: '/images/preparacion-heces.png',
      alt: 'Papel colocado sobre la taza del inodoro para recoger la muestra sin que caiga al agua',
      pie: 'Coloque papel sobre la taza para que la muestra no caiga al agua.',
    },
    coincidencias: ['heces', 'materia fecal', 'deposicion'],
  },
  {
    id: 'secrecion-vaginal',
    titulo: 'Secreción vaginal',
    resumen: 'Fuera del periodo menstrual y sin relaciones sexuales de 48 a 72 horas antes.',
    icono: 'microbio',
    indicaciones: [
      '**NO estar en periodo menstrual**, ni haber tenido relaciones sexuales **48 a 72 horas antes** de la realización del examen.',
      'En caso de que se encuentre en tratamiento con **óvulos o cremas vaginales**, acudir **72 horas después de la última aplicación**.',
    ],
    coincidencias: ['secrecion vaginal', 'flujo vaginal', 'hisopado vaginal'],
  },
  {
    id: 'espermatograma',
    titulo: 'Espermatograma',
    resumen: 'Abstinencia de 3 a 7 días y entrega dentro de los 30 minutos.',
    icono: 'microscopio',
    indicaciones: [
      'Utilizar un **frasco estéril de boca ancha** para la recolección de la muestra.',
      'Obtener la muestra mediante **masturbación**.',
      '**Abstinencia sexual entre mínimo 3 y máximo 7 días.**',
      'Entregar la muestra **máximo 30 minutos después de recogerla**. Si se le dificulta entregarla en ese tiempo, acérquese a las instalaciones para recogerla.',
    ],
    coincidencias: ['semen', 'esperma'],
  },
  {
    id: 'faringe',
    titulo: 'Faringe (garganta)',
    resumen: 'En ayunas, sin antisépticos ni pasta dental.',
    icono: 'termometro',
    indicaciones: ['Acudir **en ayunas** y **NO usar antisépticos o pasta dental**.'],
    coincidencias: ['faringe', 'faringea', 'garganta', 'hisopado'],
  },
];

/**
 * Ejemplo de la recolección de orina de 24 horas. Va aparte de la lista de
 * indicaciones porque se muestra como línea de tiempo y no como viñeta.
 */
export const ejemploOrina24 = [
  { hora: '06:00', texto: 'Primera orina de la mañana: DESECHAR en el baño.' },
  { hora: '08:00', texto: 'Segunda micción: colocar en el envase y marcar la hora de inicio.' },
  {
    hora: 'Durante el día',
    texto: 'Todas las micciones siguientes van al envase, incluidas las de la noche y la madrugada.',
  },
  { hora: '08:00 del día siguiente', texto: 'Última micción y fin de la recolección.' },
];
