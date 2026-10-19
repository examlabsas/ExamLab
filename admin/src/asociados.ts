/**
 * Catálogo de laboratorios asociados: las 277 pruebas que ExamLab ofrece a
 * otros laboratorios, con su método, su muestra, su plazo — y su precio.
 *
 * El precio es lo que hace esta sección distinta de todo lo demás del panel.
 *
 * El despliegue del sitio va por repositorio, así que cualquier cosa que se
 * versione queda al alcance de quien tenga acceso a él. El tarifario mayorista
 * no puede viajar ahí. Por eso hay dos archivos y uno está fuera de git:
 *
 * - `src/data/catalogo-asociados.json` se versiona, con `precio: null` en todas.
 *   Es lo que compila el sitio, y le basta porque hoy no publica importes
 *   (`MOSTRAR_PRECIOS = false` en la página del catálogo).
 * - `src/data/catalogo-asociados.privado.json` queda en la máquina de quien
 *   importa el Excel. **El panel no puede leerlo ni escribirlo**: solo habla con
 *   GitHub, y ese archivo no está en GitHub.
 *
 * De ahí la decisión de esta fase: **los precios viven en el KV de Cloudflare**,
 * no en el repositorio. El panel los lee y los escribe allí, y dos comandos los
 * llevan de un lado a otro para que reimportar el Excel no pierda lo que se
 * corrigió desde el panel (`npm run tarifario:cargar` y `tarifario:guardar`).
 *
 * Que el tarifario esté en el KV y no en un archivo del portátil no lo expone
 * más: lo protege la misma cuenta de Cloudflare que ya protege el panel entero.
 * Lo que no hace es publicarlo — para eso haría falta además poner
 * `MOSTRAR_PRECIOS = true`, que es una decisión aparte y del laboratorio.
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
  /** Siempre `null` en el archivo versionado. El importe vive en el KV. */
  precio: number | null;
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
  /*
    Se escribe siempre con `precio: null`, pase lo que pase. Es la última
    barrera: si alguna vez un precio llegara hasta aquí dentro de un objeto,
    acabaría en el repositorio y de ahí no se saca — el historial de git lo
    conserva aunque se borre después.
  */
  const limpio: Catalogo = {
    ...opciones.catalogo,
    pruebas: opciones.catalogo.pruebas.map((p) => ({ ...p, precio: null })),
  };

  await escribirVarios(cfg, {
    archivos: [{ ruta: RUTA_ASOCIADOS, texto: aJson(limpio) }],
    cabeza: opciones.cabeza,
    resumen: opciones.resumen,
    autor: opciones.autor,
  });
}

/* ─── El tarifario, en el KV ─────────────────────────────────────────────── */

/** Precios por `claveDe`. Nunca sale del KV hacia el repositorio. */
export type Tarifario = Record<string, number>;

const CLAVE_TARIFARIO = 'tarifario';

export async function leerTarifario(kv: KVNamespace): Promise<Tarifario> {
  return (await kv.get<Tarifario>(CLAVE_TARIFARIO, 'json')) ?? {};
}

export async function guardarTarifario(kv: KVNamespace, tarifario: Tarifario): Promise<void> {
  await kv.put(CLAVE_TARIFARIO, JSON.stringify(tarifario));
}

/** El precio de una prueba, redondeado a céntimos. `null` si no se ha puesto. */
export const precioDe = (tarifario: Tarifario, p: Prueba): number | null =>
  tarifario[claveDe(p)] ?? null;

/**
 * Lee un importe escrito a mano.
 *
 * Se aceptan la coma y el punto como separador decimal porque en Ecuador se
 * escriben los dos, y quien teclea cuarenta precios seguidos no va a estar
 * pendiente de cuál espera el formulario.
 */
export function leerPrecio(texto: string): number | null | 'error' {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!limpio) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(limpio)) return 'error';
  const valor = Number(limpio);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 'error';
}

export const comoPrecio = (valor: number | null): string =>
  valor === null ? '' : valor.toFixed(2);

/* ─── Búsqueda y recuento ────────────────────────────────────────────────── */

export const FILTROS = {
  'sin-precio': { etiqueta: 'sin precio', falta: (p: Prueba) => p.precio === null },
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

export function revisarPrueba(p: Partial<Prueba>): string | null {
  if (!p.nombre?.trim()) return 'Falta el nombre de la prueba.';
  if (!p.especialidad?.trim()) return 'Falta la especialidad.';
  if (p.metodo && p.metodo.length > 120) return 'El método es demasiado largo.';
  if (p.muestra && p.muestra.length > 200) return 'La descripción de la muestra es demasiado larga.';
  return null;
}
