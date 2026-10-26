/**
 * Catálogo de laboratorios asociados: las 277 pruebas que ExamLab ofrece a
 * otros laboratorios, con su método, su muestra y su plazo.
 *
 * **Aquí no hay precios, y es a propósito.**
 *
 * Los hubo: vivían en el KV de Cloudflare, fuera del repositorio, porque el
 * despliegue del sitio va por repositorio y cualquier cosa versionada queda al
 * alcance de quien tenga acceso a él. Funcionaba, pero significaba que el
 * tarifario mayorista existía en un sitio más, con una copia que mantener al
 * día y un camino por el que podía escaparse.
 *
 * El laboratorio pidió quitarlos del panel. Al hacerlo desaparece toda esa
 * maquinaria —el tarifario en el KV, los dos comandos que lo movían, la barrera
 * que forzaba `precio: null` al escribir— y con ella el riesgo. El tarifario
 * sigue donde siempre estuvo de verdad: en el Excel del laboratorio.
 *
 * Si algún día hay que volver a ponerlos, está en el historial de git. No se
 * reconstruye desde cero.
 */
import { escribirVarios, leerCabeza, leerTexto, type Cabeza, type Config } from './github';
import { normalizar } from '../../src/lib/examenes-comun';

export const RUTA_ASOCIADOS = 'src/data/catalogo-asociados.json';

/** Lo que el laboratorio ofrece a otro laboratorio. */
export type Prueba = {
  especialidad: string;
  nombre: string;
  /** Qué determinaciones trae, cuando es un panel. */
  incluye?: string;
  metodo?: string;
  muestra?: string;
  entrega?: string;
  /** Números de las notas de muestra que cita, para enlazarlas en la ficha. */
  notas: number[];
};

export type Catalogo = {
  fuente: string;
  generado: string;
  avisos: string[];
  notas: string[];
  pruebas: Prueba[];
};

/** Mismo formato que deja `scripts/importar-catalogo-asociados.mjs`. */
const aJson = (valor: unknown) => JSON.stringify(valor, null, 1);

/* ─── Identidad ──────────────────────────────────────────────────────────── */

/**
 * Qué identifica a una prueba.
 *
 * Especialidad y nombre a la vez, porque el nombre solo no basta: «NICKERSON»
 * aparece en MICROBIOLOGIA y en BACTERIOLOGIA MANUAL, y son dos pruebas. Con
 * las dos partes, las 277 salen distintas.
 */
export const claveDe = (p: { especialidad: string; nombre: string }): string =>
  `${normalizar(p.especialidad)}|${normalizar(p.nombre)}`;

/**
 * Dirección de cada prueba dentro del panel.
 *
 * Se calcula del contenido en vez de guardarse en el archivo: el importador lo
 * reescribe entero cada vez que llega un Excel nuevo, así que un campo guardado
 * ahí no sobreviviría. Y no hace falta que sobreviva — son direcciones internas
 * del panel, no del sitio, que no publica una página por prueba.
 */
export function conSlug(pruebas: Prueba[]): (Prueba & { slug: string })[] {
  const ocupados = new Set<string>();
  return pruebas.map((p) => {
    const base =
      normalizar(p.nombre)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70)
        .replace(/-+$/, '') || 'prueba';
    let slug = base;
    let n = 2;
    while (ocupados.has(slug)) slug = `${base}-${n++}`;
    ocupados.add(slug);
    return { ...p, slug };
  });
}

/* ─── El archivo versionado ──────────────────────────────────────────────── */

export async function leerCatalogo(cfg: Config, ref?: string): Promise<Catalogo> {
  const texto = await leerTexto(cfg, RUTA_ASOCIADOS, ref);
  if (!texto) throw new Error('No se encontró catalogo-asociados.json en el repositorio.');
  return JSON.parse(texto) as Catalogo;
}

export async function leerTodo(cfg: Config): Promise<{ catalogo: Catalogo; cabeza: Cabeza }> {
  const cabeza = await leerCabeza(cfg);
  return { catalogo: await leerCatalogo(cfg, cabeza.commit), cabeza };
}

export async function guardarCatalogo(
  cfg: Config,
  opciones: { catalogo: Catalogo; cabeza: Cabeza; resumen: string; autor: string },
): Promise<void> {
  await escribirVarios(cfg, {
    archivos: [{ ruta: RUTA_ASOCIADOS, texto: aJson(opciones.catalogo) }],
    cabeza: opciones.cabeza,
    resumen: opciones.resumen,
    autor: opciones.autor,
  });
}

/* ─── Búsqueda y recuento ────────────────────────────────────────────────── */

export const FILTROS = {
  'sin-entrega': { etiqueta: 'sin plazo de entrega', falta: (p: Prueba) => !p.entrega?.trim() },
  'sin-metodo': { etiqueta: 'sin método', falta: (p: Prueba) => !p.metodo?.trim() },
  'sin-muestra': { etiqueta: 'sin tipo de muestra', falta: (p: Prueba) => !p.muestra?.trim() },
} as const;

export type Filtro = keyof typeof FILTROS;

export const esFiltro = (valor: string): valor is Filtro => valor in FILTROS;

export function contarFaltas(pruebas: Prueba[]): { clave: Filtro; etiqueta: string; cuantos: number }[] {
  return (Object.keys(FILTROS) as Filtro[]).map((clave) => ({
    clave,
    etiqueta: FILTROS[clave].etiqueta,
    cuantos: pruebas.filter(FILTROS[clave].falta).length,
  }));
}

export function especialidadesDe(pruebas: Prueba[]): string[] {
  return [...new Set(pruebas.map((p) => p.especialidad))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function buscar<T extends Prueba>(
  pruebas: T[],
  criterios: { texto?: string; filtro?: Filtro; especialidad?: string },
): T[] {
  const palabras = normalizar(criterios.texto ?? '').split(/\s+/).filter(Boolean);
  const falta = criterios.filtro ? FILTROS[criterios.filtro].falta : null;

  return pruebas.filter((p) => {
    if (falta && !falta(p)) return false;
    if (criterios.especialidad && p.especialidad !== criterios.especialidad) return false;
    if (!palabras.length) return true;
    const indice = normalizar(
      [p.nombre, p.especialidad, p.metodo, p.muestra, p.incluye].filter(Boolean).join(' '),
    );
    return palabras.every((x) => indice.includes(x));
  });
}

/* ─── Validación ─────────────────────────────────────────────────────────── */

/**
 * Las notas de condiciones de muestra que cita un texto.
 *
 * El laboratorio las escribe dentro de la propia muestra —«Suero. Ver nota 3»—
 * y la ficha las enlaza. Se deducen del texto en vez de guardarse aparte, que
 * es lo que hace el script que importa el Excel; aquí se recalculan al guardar
 * para que no queden enlazando a una condición que ya no es la suya.
 */
export const notasDe = (muestra?: string): number[] =>
  [...new Set([...(muestra ?? '').matchAll(/nota\s*(\d+)/gi)].map((m) => Number(m[1])))].sort(
    (a, b) => a - b,
  );

export function revisarPrueba(p: Partial<Prueba>): string | null {
  if (!p.nombre?.trim()) return 'Falta el nombre de la prueba.';
  if (!p.especialidad?.trim()) return 'Falta la especialidad.';
  if (p.metodo && p.metodo.length > 120) return 'El método es demasiado largo.';
  if (p.muestra && p.muestra.length > 200) return 'La descripción de la muestra es demasiado larga.';
  return null;
}
