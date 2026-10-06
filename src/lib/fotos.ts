/**
 * Fotos reales del laboratorio.
 *
 * Los originales viven en `fotos-laboratorio/usadas/` (fuera de git) y
 * `scripts/optimizar-imagenes.mjs` genera de cada uno las variantes que se
 * publican en public/images/: dos WebP para `<img>` y un JPG de 1200×630 para
 * la vista previa en WhatsApp y redes. Este archivo es el único lugar que
 * conoce esa convención de nombres.
 *
 * Al añadir una foto hay que sumarla a NOMBRES_FOTOS (así una errata en el
 * nombre falla al compilar, no en producción) y darle su texto alternativo.
 */
export const NOMBRES_FOTOS = [
  'matriz-ficoa-fachada',
  'laboratorio-equipo-trabajando',
  'recepcion-de-muestras',
  'analizador-automatizado',
  'revision-de-muestra',
  'microscopio',
  'tecnologa-con-tubos',
  'tecnologa-en-analizador',
  'pipeteo-de-muestra',
] as const;

export type NombreFoto = (typeof NOMBRES_FOTOS)[number];

/** Se describe lo que se ve, sin «imagen de»: los lectores de pantalla ya lo anuncian. */
const ALT: Record<NombreFoto, string> = {
  'matriz-ficoa-fachada': 'Fachada de la matriz de ExamLab en Ficoa, Ambato',
  'laboratorio-equipo-trabajando':
    'Personal de ExamLab procesando muestras en el área de análisis de la matriz',
  'recepcion-de-muestras':
    'Tecnóloga de ExamLab ordenando tubos de muestra en la gradilla del analizador',
  'analizador-automatizado':
    'Tecnólogo de ExamLab operando la pantalla de un analizador automatizado',
  'revision-de-muestra': 'Bioquímica de ExamLab revisando un tubo de muestra etiquetado',
  microscopio: 'Bioquímica de ExamLab observando una muestra al microscopio',
  'tecnologa-con-tubos': 'Tecnóloga de ExamLab comparando dos tubos de muestra en el área de análisis',
  'tecnologa-en-analizador': 'Tecnóloga de ExamLab registrando una orden en el analizador',
  'pipeteo-de-muestra': 'Tecnóloga de ExamLab preparando una muestra para el microscopio',
};

/** Foto que representa al laboratorio cuando una página no indica otra. */
export const FOTO_POR_DEFECTO: NombreFoto = 'matriz-ficoa-fachada';

/** Todas las variantes se generan a 4:3, así el navegador reserva el espacio exacto. */
export const FOTO_ANCHO = 1400;
export const FOTO_ALTO = 1050;

/**
 * Fotos cuyo original da para la variante de 2000 px. Las dos que faltan son
 * de 1448 px de ancho: ampliarlas no añadiría detalle, solo peso, así que
 * `npm run imagenes` ni siquiera las genera. Si el laboratorio entrega esos
 * dos originales en mayor resolución, basta con sumarlos a esta lista.
 */
const CON_2000: ReadonlySet<NombreFoto> = new Set([
  'analizador-automatizado',
  'laboratorio-equipo-trabajando',
  'pipeteo-de-muestra',
  'recepcion-de-muestras',
  'revision-de-muestra',
  'tecnologa-con-tubos',
  'tecnologa-en-analizador',
]);

/**
 * `sizes` para una foto que ocupa media columna en escritorio y todo el ancho
 * en móvil, que es como se usan todas en el sitio.
 */
export const SIZES_MEDIA_COLUMNA = '(min-width: 64rem) 50vw, 100vw';

/**
 * Atributos listos para `<img {...foto('x')} sizes="…" />`. Solo devuelve
 * atributos válidos de `<img>`, así el spread no cuela nada raro en el HTML.
 */
export function foto(nombre: NombreFoto) {
  const fuentes = [
    `/images/${nombre}-800.webp 800w`,
    `/images/${nombre}-1400.webp 1400w`,
    ...(CON_2000.has(nombre) ? [`/images/${nombre}-2000.webp 2000w`] : []),
  ];

  return {
    src: `/images/${nombre}-1400.webp`,
    srcset: fuentes.join(', '),
    alt: ALT[nombre],
    width: FOTO_ANCHO,
    height: FOTO_ALTO,
  };
}

/** JPG de 1200×630 para `og:image` y los datos estructurados. */
export function fotoOg(nombre: NombreFoto): string {
  return `/images/og/${nombre}.jpg`;
}
