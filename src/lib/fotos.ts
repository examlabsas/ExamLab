/**
 * Fotos reales del laboratorio.
 *
 * La lista vive en `src/data/fotos.json` y no aquí. Antes eran tres literales
 * que había que mantener a mano y en orden —los nombres, los textos
 * alternativos y el conjunto de las que tenían variante de 2000 px—, y añadir
 * una foto significaba editar los tres. Desde que el panel puede subir fotos,
 * eso tendría que hacerlo él: un programa editando TypeScript a ciegas, con
 * tres sitios donde equivocarse. Escribir JSON es lo que el panel ya hace con
 * todo lo demás.
 *
 * Lo que se gana en seguridad se pierde en tipos: `NombreFoto` era una unión
 * cerrada y ahora es `string`. La comprobación que de verdad protegía sigue en
 * pie —`content.config.ts` valida el campo `foto` de cada noticia contra esta
 * lista y **la compilación falla** si el nombre no existe—, que es por donde
 * entran los nombres de verdad.
 *
 * De cada foto hay dos o tres WebP en `public/images/` y un JPG en
 * `public/images/og/`. Quién los genera depende de por dónde entre la foto:
 * `scripts/optimizar-imagenes.mjs` con `sharp` si se procesa aquí, o el propio
 * navegador si se sube desde el panel. Los archivos que salen son los mismos.
 */
import datos from '../data/fotos.json';

export type Foto = { nombre: string; alt: string; anchos: number[] };

const FOTOS: Foto[] = datos.fotos;

/** Los nombres, en el orden del archivo. */
export const NOMBRES_FOTOS = FOTOS.map((f) => f.nombre);

export type NombreFoto = string;

const POR_NOMBRE = new Map(FOTOS.map((f) => [f.nombre, f]));

/** Foto que representa al laboratorio cuando una página no indica otra. */
export const FOTO_POR_DEFECTO: NombreFoto = 'matriz-ficoa-fachada';

/** Todas las variantes se generan a 4:3, así el navegador reserva el espacio exacto. */
export const FOTO_ANCHO = 1400;
export const FOTO_ALTO = 1050;

/**
 * `sizes` para una foto que ocupa media columna en escritorio y todo el ancho
 * en móvil, que es como se usan todas en el sitio.
 */
export const SIZES_MEDIA_COLUMNA = '(min-width: 64rem) 50vw, 100vw';

/**
 * Atributos listos para `<img {...foto('x')} sizes="…" />`. Solo devuelve
 * atributos válidos de `<img>`, así el spread no cuela nada raro en el HTML.
 *
 * El `srcset` sale de los anchos que esa foto tiene de verdad. No todas llegan
 * a 2000: ampliar un original de 1448 px no añadiría detalle, solo peso, así
 * que esa variante ni se genera.
 */
export function foto(nombre: NombreFoto) {
  const ficha = POR_NOMBRE.get(nombre);
  const anchos = ficha?.anchos ?? [800, 1400];

  return {
    src: `/images/${nombre}-1400.webp`,
    srcset: anchos.map((a) => `/images/${nombre}-${a}.webp ${a}w`).join(', '),
    alt: ficha?.alt ?? '',
    width: FOTO_ANCHO,
    height: FOTO_ALTO,
  };
}

/** JPG de 1200×630 para `og:image` y los datos estructurados. */
export function fotoOg(nombre: NombreFoto): string {
  return `/images/og/${nombre}.jpg`;
}
