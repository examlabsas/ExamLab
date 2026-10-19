/**
 * Catálogo público: las 559 fichas de examen que ve el paciente.
 *
 * Hay dos archivos y la diferencia entre ellos es lo único importante de este
 * módulo:
 *
 * - `src/data/examenes.json` es lo que **publica** el sitio. Es un archivo
 *   derivado: lo reescribe entero `scripts/importar-catalogo-publico.mjs` cada
 *   vez que el laboratorio entrega una lista nueva de pruebas.
 * - `src/data/catalogo-info.json` es la **copia buena de lo que escribió una
 *   persona**, guardada por nombre de examen. Sobrevive a las importaciones.
 *
 * Por eso el panel escribe siempre en los dos: en el primero para que el cambio
 * se vea hoy, en el segundo para que no se pierda con el próximo Excel. Los dos
 * van en un mismo commit, así no existe el momento en que uno está cambiado y el
 * otro no.
 *
 * Y una regla que vale la pena no romper: **el panel no toca un campo que nadie
 * pidió cambiar.** El valor que ya está publicado puede venir de la plantilla de
 * asociados, que el panel no lee; reconstruir la ficha «desde cero» lo borraría.
 */
import { escribirVarios, leerCabeza, leerTexto, type Cabeza, type Config } from './github';
import { normalizar, SIN_DATO } from '../../src/lib/examenes-comun';

export const RUTA_EXAMENES = 'src/data/examenes.json';
export const RUTA_INFO = 'src/data/catalogo-info.json';

/**
 * Un examen del catálogo. Es la misma forma que `Examen` en
 * `src/lib/examenes.ts`; se repite aquí porque ese módulo carga los 288 KB de
 * datos al importarse y no tiene sitio en un Worker.
 */
export type Examen = {
  codigo: string;
  slug: string;
  nombre: string;
  especialidad: string;
  utilidad: string;
  condicionesClinicas: string;
  tiempoEntrega: string;
  tipoMuestra: string;
  tecnica: string;
  sinonimos?: string[];
  ficha?: string | null;
};

/** Lo que el panel sabe escribir, guardado por nombre de examen. */
export type InfoExamen = {
  especialidad?: string;
  utilidad?: string;
  condicionesClinicas?: string;
  tiempoEntrega?: string;
  tipoMuestra?: string;
  tecnica?: string;
  sinonimos?: string[];
};

export type Info = Record<string, InfoExamen>;

/** Los campos que se pueden rellenar desde una hoja de cálculo. */
export const CAMPOS_HOJA = {
  tiempoEntrega: 'Plazo de entrega',
  tipoMuestra: 'Tipo de muestra',
  tecnica: 'Técnica',
  especialidad: 'Especialidad',
} as const;

export type CampoHoja = keyof typeof CAMPOS_HOJA;

/**
 * Los dos archivos se guardan con sangría de 1 y sin salto final, que es como
 * los dejó el importador. Escribirlos con otro formato haría que el primer
 * cambio de un solo campo apareciera en el historial como 559 exámenes
 * reescritos, y entonces el historial deja de servir para nada.
 */
const aJson = (valor: unknown) => JSON.stringify(valor, null, 1);

/* ─── Lectura ────────────────────────────────────────────────────────────── */

export async function leerExamenes(cfg: Config, ref?: string): Promise<Examen[]> {
  const texto = await leerTexto(cfg, RUTA_EXAMENES, ref);
  if (!texto) throw new Error('No se encontró examenes.json en el repositorio.');
  return JSON.parse(texto) as Examen[];
}

export async function leerInfo(cfg: Config, ref?: string): Promise<Info> {
  const texto = await leerTexto(cfg, RUTA_INFO, ref);
  if (!texto) throw new Error('No se encontró catalogo-info.json en el repositorio.');
  return JSON.parse(texto) as Info;
}

/**
 * Los dos archivos leídos en el mismo commit, con la referencia que habrá que
 * dar al guardar. Leerlos en commits distintos es la forma silenciosa de pisar
 * el cambio de otra persona.
 */
export async function leerTodo(
  cfg: Config,
): Promise<{ examenes: Examen[]; info: Info; cabeza: Cabeza }> {
  const cabeza = await leerCabeza(cfg);
  return {
    examenes: await leerExamenes(cfg, cabeza.commit),
    info: await leerInfo(cfg, cabeza.commit),
    cabeza,
  };
}

/* ─── Escritura ──────────────────────────────────────────────────────────── */

export async function guardarCatalogo(
  cfg: Config,
  opciones: { examenes: Examen[]; info: Info; cabeza: Cabeza; resumen: string; autor: string },
): Promise<void> {
  await escribirVarios(cfg, {
    archivos: [
      { ruta: RUTA_EXAMENES, texto: aJson(opciones.examenes) },
      { ruta: RUTA_INFO, texto: aJson(opciones.info) },
    ],
    cabeza: opciones.cabeza,
    resumen: opciones.resumen,
    autor: opciones.autor,
  });
}

/** Deja la entrada de `catalogo-info.json` igual que el examen publicado. */
export function anotarInfo(info: Info, examen: Examen): Info {
  // Mismo orden de campos que en examenes.json, para que los dos archivos se
  // lean igual al compararlos.
  return {
    ...info,
    [examen.nombre]: {
      especialidad: examen.especialidad,
      utilidad: examen.utilidad,
      condicionesClinicas: examen.condicionesClinicas,
      tiempoEntrega: examen.tiempoEntrega,
      tipoMuestra: examen.tipoMuestra,
      tecnica: examen.tecnica,
      sinonimos: examen.sinonimos ?? [],
    },
  };
}

/* ─── Slugs ──────────────────────────────────────────────────────────────── */

/**
 * Nombre de examen a dirección de su ficha. Tiene que dar exactamente lo mismo
 * que `hacerSlug` en `scripts/importar-catalogo-publico.mjs`, o el mismo examen
 * tendría una dirección distinta según por dónde entrara.
 */
export function aSlug(nombre: string): string {
  return (
    normalizar(nombre)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70)
      .replace(/-+$/, '') || 'examen'
  );
}

/** Slug libre para un examen nuevo, sin chocar con los que ya existen. */
export function slugLibre(nombre: string, ocupados: Set<string>): string {
  const base = aSlug(nombre);
  let slug = base;
  let n = 2;
  while (ocupados.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

/* ─── Búsqueda y recuento ────────────────────────────────────────────────── */

/** La especialidad que deja el importador cuando nadie la ha asignado. */
export const ESPECIALIDAD_SIN_ASIGNAR = 'Pruebas especiales';

/**
 * Lo que falta por rellenar, cada cosa con cómo se reconoce.
 *
 * Esta lista hace de dos cosas a la vez: es el recuento que se muestra arriba
 * del catálogo y es el filtro al que lleva cada línea. Definirlas por separado
 * acabaría con un recuento que dice 495 y un filtro que trae 480.
 */
export const FILTROS = {
  'sin-entrega': {
    etiqueta: 'sin plazo de entrega',
    falta: (e: Examen) => e.tiempoEntrega === SIN_DATO,
  },
  'sin-muestra': {
    etiqueta: 'sin tipo de muestra',
    falta: (e: Examen) => e.tipoMuestra === SIN_DATO,
  },
  'sin-tecnica': { etiqueta: 'sin técnica', falta: (e: Examen) => e.tecnica === SIN_DATO },
  'sin-especialidad': {
    etiqueta: 'sin especialidad propia',
    falta: (e: Examen) => e.especialidad === ESPECIALIDAD_SIN_ASIGNAR,
  },
  // `texto(…)` y no `e.utilidad.trim()`: el JSON entra sin validar, y un
  // registro al que le faltara el campo tumbaba la pantalla entera del catálogo
  // en vez de salir señalado como lo que es, un examen sin redactar.
  'sin-texto': { etiqueta: 'sin texto para el paciente', falta: (e: Examen) => !texto(e.utilidad) },
} as const;

export type Filtro = keyof typeof FILTROS;

export const esFiltro = (valor: string): valor is Filtro => valor in FILTROS;

export type Falta = { clave: Filtro; etiqueta: string; cuantos: number };

export function contarFaltas(examenes: Examen[]): Falta[] {
  return (Object.keys(FILTROS) as Filtro[]).map((clave) => ({
    clave,
    etiqueta: FILTROS[clave].etiqueta,
    cuantos: examenes.filter(FILTROS[clave].falta).length,
  }));
}

/**
 * Las especialidades que el catálogo usa hoy.
 *
 * Se sacan de los datos y no de una lista fija por lo mismo que en el sitio: la
 * lista fija se queda vieja. En el formulario se ofrecen estas, porque escribir
 * «Química Clinica» a mano partiría en dos el filtro del catálogo.
 */
export function especialidadesDe(examenes: Examen[]): string[] {
  return [...new Set(examenes.map((e) => e.especialidad))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function buscar(
  examenes: Examen[],
  criterios: { texto?: string; filtro?: Filtro; especialidad?: string },
): Examen[] {
  const palabras = normalizar(criterios.texto ?? '').split(/\s+/).filter(Boolean);
  const falta = criterios.filtro ? FILTROS[criterios.filtro].falta : null;

  return examenes.filter((e) => {
    if (falta && !falta(e)) return false;
    if (criterios.especialidad && e.especialidad !== criterios.especialidad) return false;
    if (!palabras.length) return true;
    /*
      Se indexa lo mismo que el buscador del sitio (`indiceBusqueda`), para que
      buscar aquí y buscar allí encuentren lo mismo: quien administra el catálogo
      busca «suero» esperando los exámenes de suero.
    */
    const indice = normalizar(
      [
        e.nombre,
        e.especialidad,
        e.utilidad,
        e.tipoMuestra,
        e.tecnica,
        ...(e.sinonimos ?? []),
      ]
        .map(texto)
        .join(' '),
    );
    return palabras.every((p) => indice.includes(p));
  });
}

/* ─── Validación ─────────────────────────────────────────────────────────── */

/**
 * Lo que se comprueba antes de escribir. El esquema del sitio no valida estos
 * datos —son un JSON corriente, no una colección de contenido— así que un campo
 * vacío no rompería el build: saldría publicado en blanco, que es peor.
 */
export function revisarExamen(e: Partial<Examen>): string | null {
  if (!e.nombre?.trim()) return 'Falta el nombre del examen.';
  if (!e.especialidad?.trim()) return 'Elija una especialidad.';
  if (e.especialidad.length > 60) return 'La especialidad es demasiado larga.';
  if (!e.utilidad?.trim()) return 'Falta para qué sirve: es lo que se lee en la tarjeta y en Google.';
  if (!e.condicionesClinicas?.trim()) {
    return 'Falta la preparación. Si no necesita ninguna, escriba «No requiere ayuno.».';
  }
  /*
    El plazo, la muestra y la técnica no se comprueban: vacíos se convierten en
    «Consultar» antes de llegar aquí. Es a propósito. Quien está rellenando
    plazos a las seis de la mañana y borra uno que estaba mal quiere dejarlo en
    blanco, no leer un error que le explique que escriba una palabra concreta.
  */
  return null;
}

/**
 * Un campo de texto del examen, tolerante a que no venga.
 *
 * `examenes.json` se convierte con un `as Examen[]` y nada garantiza que cada
 * registro traiga todos los campos: puede faltar uno tras una edición a mano.
 * Que eso señale un examen incompleto es correcto; que deje el panel sin abrir,
 * no.
 */
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

/** Un valor de hoja de cálculo, limpio. Vacío pasa a «Consultar». */
export const limpiar = (valor: string): string => valor.trim().replace(/\s+/g, ' ') || SIN_DATO;
