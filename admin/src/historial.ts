/**
 * De qué sección es cada cambio del historial.
 *
 * Lo honesto sería preguntarle a GitHub qué archivos tocó cada commit, pero esa
 * información solo viene al pedir un commit suelto: treinta cambios serían
 * treinta peticiones, y el plan gratuito de Workers corta a los 10 ms de CPU.
 *
 * Se deduce del mensaje, que es fiable porque **lo escribe el propio panel**.
 * Cada ruta que guarda compone su resumen con una fórmula fija —«Corrige el
 * examen «X»», «Actualiza la sede «Y»»— y de ahí sale la sección sin pedir nada.
 *
 * Lo que no reconoce cae en «otros cambios», que es lo correcto: ahí van los
 * commits que no vinieron del panel, como los que sube Juan desde su máquina.
 * Si algún día se cambia el texto de un resumen, hay que tocar también el
 * patrón de aquí — por eso están juntos en un solo sitio y no repartidos.
 */

export type Seccion =
  | 'noticias'
  | 'aviso'
  | 'catalogo'
  | 'asociados'
  | 'sedes'
  | 'contacto'
  | 'feriados'
  | 'otros';

/**
 * `soloAdmin` marca las secciones que un editor no puede abrir. El historial
 * sí le enseña la etiqueta —saber que alguien tocó la cartera no tiene nada
 * de reservado— pero no se la pone como enlace: antes se la ponía, y al
 * pulsarla recibía «No tiene permiso.» en texto plano, sin armazón y sin
 * vuelta. Un enlace que a la mitad de la gente le responde que no puede hace
 * que el panel parezca roto.
 */
export const SECCIONES: Record<Seccion, { etiqueta: string; ruta?: string; soloAdmin?: boolean }> = {
  noticias: { etiqueta: 'Noticias', ruta: '/noticias' },
  aviso: { etiqueta: 'Aviso del sitio', ruta: '/aviso' },
  catalogo: { etiqueta: 'Catálogo', ruta: '/catalogo' },
  asociados: { etiqueta: 'Asociados', ruta: '/asociados', soloAdmin: true },
  sedes: { etiqueta: 'Sedes', ruta: '/sedes' },
  contacto: { etiqueta: 'Contacto', ruta: '/contacto' },
  feriados: { etiqueta: 'Feriados', ruta: '/feriados' },
  otros: { etiqueta: 'Otros cambios' },
};

/*
  El orden importa: «Actualiza la prueba de asociados» tiene que mirarse antes
  que cualquier patrón más general, o acabaría contada como catálogo.
*/
const PATRONES: [RegExp, Seccion][] = [
  [/\bde asociados\b/i, 'asociados'],
  [/\bla noticia\b/i, 'noticias'],
  [/\bel aviso\b/i, 'aviso'],
  [/\bel examen\b|\bel catálogo\b/i, 'catalogo'],
  [/\bla sede\b/i, 'sedes'],
  [/\bdatos de contacto\b/i, 'contacto'],
  // Los feriados se guardan como «Añade Navidad (2026-12-25)»: lo que los
  // distingue es la fecha entre paréntesis al final.
  [/\(\d{4}-\d{2}-\d{2}\)\s*$/, 'feriados'],
];

export function seccionDe(mensaje: string): Seccion {
  for (const [patron, seccion] of PATRONES) if (patron.test(mensaje)) return seccion;
  return 'otros';
}

export const esSeccion = (valor: string): valor is Seccion => valor in SECCIONES;

/**
 * El día al que pertenece un cambio, en hora de Ecuador.
 *
 * Agrupar por día es lo que convierte una lista de treinta líneas en algo que se
 * lee: «el martes se tocaron cuatro cosas». Y tiene que ser la hora de Ecuador,
 * no la del servidor, o un cambio de las siete de la tarde aparecería al día
 * siguiente.
 */
export const diaDe = (fecha: string): string =>
  new Date(fecha).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

export function nombreDelDia(dia: string, hoy: string): string {
  if (dia === hoy) return 'Hoy';
  const ayer = new Date(`${hoy}T12:00:00Z`);
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  if (dia === ayer.toISOString().slice(0, 10)) return 'Ayer';
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-EC', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
