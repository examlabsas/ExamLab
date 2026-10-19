/**
 * Noticias del sitio.
 *
 * Cada artículo es un archivo Markdown en `src/content/noticias` con una
 * cabecera YAML. El esquema lo valida Astro al compilar
 * (`src/content.config.ts`), así que aquí se escribe exactamente lo que ese
 * esquema espera: un campo de más o un valor mal puesto y el build falla.
 *
 * Que el build falle no tumba el sitio —Cloudflare sigue sirviendo la última
 * versión buena— pero sí deja el cambio sin publicar, así que se valida antes.
 */
import {
  leerArchivo,
  listarCarpeta,
  escribirArchivo,
  type Config,
  type Archivo,
} from './github';

export const CARPETA = 'src/content/noticias';

/**
 * Fotos disponibles, leídas del propio sitio.
 *
 * Es la misma lista cerrada que valida el esquema de Astro, y se importa en vez
 * de copiarse: aquí había una copia de los nueve nombres y una copia se
 * desincroniza. Si alguien añade una foto al sitio, el panel la ofrece sola; si
 * quita una, el panel deja de ofrecer un nombre que rompería el build.
 *
 * Se puede importar porque `src/lib/fotos.ts` no importa nada: es texto y
 * números, y carga igual dentro de un Worker.
 *
 * Subir fotos nuevas desde el panel sigue sin poder hacerse, y no por la lista:
 * los originales viven fuera de git y de cada uno se generan tres tamaños con
 * `sharp`, que no corre en un Worker ni al compilar.
 */
import { NOMBRES_FOTOS, foto } from '../../src/lib/fotos';

export { NOMBRES_FOTOS as FOTOS, foto as atributosDeFoto };

export type Noticia = {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  fecha: string;
  autor: string;
  foto?: string;
  destacado: boolean;
  borrador: boolean;
  cuerpo: string;
  sha?: string;
};

/* ─── YAML mínimo ────────────────────────────────────────────────────────── */

/**
 * Se escribe y se lee a mano un subconjunto de YAML en vez de traer una
 * librería: la cabecera son ocho campos de tipos conocidos, y una dependencia
 * más es una dependencia más que mantener.
 */
function entrecomillar(valor: string): string {
  // Comillas simples salvo que el texto ya las lleve; entonces, dobles.
  if (!valor.includes("'")) return `'${valor}'`;
  return `"${valor.replace(/"/g, '\\"')}"`;
}

function escribirCabecera(n: Noticia): string {
  const lineas = [
    `titulo: ${entrecomillar(n.titulo)}`,
    `descripcion: ${entrecomillar(n.descripcion)}`,
    `categoria: ${entrecomillar(n.categoria)}`,
    `fecha: ${n.fecha}`,
    `autor: ${entrecomillar(n.autor)}`,
  ];
  if (n.foto) lineas.push(`foto: ${n.foto}`);
  if (n.destacado) lineas.push('destacado: true');
  if (n.borrador) lineas.push('borrador: true');
  return lineas.join('\n');
}

function leerCabecera(texto: string): { campos: Record<string, string>; cuerpo: string } {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { campos: {}, cuerpo: texto };

  const campos: Record<string, string> = {};
  for (const linea of m[1]!.split('\n')) {
    const corte = linea.indexOf(':');
    if (corte === -1) continue;
    const clave = linea.slice(0, corte).trim();
    let valor = linea.slice(corte + 1).trim();
    if (
      (valor.startsWith("'") && valor.endsWith("'")) ||
      (valor.startsWith('"') && valor.endsWith('"'))
    ) {
      valor = valor.slice(1, -1).replace(/\\"/g, '"');
    }
    campos[clave] = valor;
  }

  return { campos, cuerpo: m[2] ?? '' };
}

export function componer(n: Noticia): string {
  return `---\n${escribirCabecera(n)}\n---\n\n${n.cuerpo.trim()}\n`;
}

function desdeArchivo(archivo: Archivo): Noticia {
  const { campos, cuerpo } = leerCabecera(archivo.texto);
  return {
    slug: archivo.ruta.split('/').pop()!.replace(/\.md$/, ''),
    titulo: campos.titulo ?? '',
    descripcion: campos.descripcion ?? '',
    categoria: campos.categoria ?? '',
    fecha: campos.fecha ?? '',
    autor: campos.autor ?? 'Equipo ExamLab',
    foto: campos.foto,
    destacado: campos.destacado === 'true',
    borrador: campos.borrador === 'true',
    cuerpo,
    sha: archivo.sha,
  };
}

/* ─── Operaciones ────────────────────────────────────────────────────────── */

export async function listar(cfg: Config): Promise<Noticia[]> {
  const entradas = await listarCarpeta(cfg, CARPETA);
  const noticias: Noticia[] = [];

  for (const e of entradas.filter((x) => x.nombre.endsWith('.md'))) {
    const archivo = await leerArchivo(cfg, e.ruta);
    if (archivo) noticias.push(desdeArchivo(archivo));
  }

  // Más recientes primero, que es como se publican y como se buscan.
  return noticias.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function obtener(cfg: Config, slug: string): Promise<Noticia | null> {
  const archivo = await leerArchivo(cfg, `${CARPETA}/${slug}.md`);
  return archivo ? desdeArchivo(archivo) : null;
}

export async function guardar(cfg: Config, noticia: Noticia, autor: string): Promise<void> {
  await escribirArchivo(cfg, {
    ruta: `${CARPETA}/${noticia.slug}.md`,
    texto: componer(noticia),
    sha: noticia.sha,
    resumen: `${noticia.sha ? 'Actualiza' : 'Publica'} la noticia «${noticia.titulo}»`,
    autor,
  });
}

/* ─── Validación ─────────────────────────────────────────────────────────── */

/** Convierte un título en un nombre de archivo utilizable. */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/**
 * Comprueba lo mismo que el esquema de Astro, pero antes de escribir: si algo
 * está mal, es mejor decirlo en el formulario que dejar el build roto.
 */
export function revisar(n: Partial<Noticia>): string | null {
  if (!n.titulo?.trim()) return 'Falta el título.';
  if (n.titulo.length > 120) return 'El título es demasiado largo.';
  if (!n.descripcion?.trim()) return 'Falta la descripción: es la que se ve en el listado y en Google.';
  if (n.descripcion.length > 200) return 'La descripción no debería pasar de 200 caracteres.';
  if (!n.categoria?.trim()) return 'Falta la categoría.';
  if (!n.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(n.fecha)) return 'La fecha debe ser AAAA-MM-DD.';
  if (Number.isNaN(new Date(n.fecha).getTime())) return 'Esa fecha no existe.';
  if (n.foto && !NOMBRES_FOTOS.includes(n.foto as (typeof NOMBRES_FOTOS)[number])) {
    return 'Esa foto no está en el sitio.';
  }
  if (!n.cuerpo?.trim()) return 'El artículo está vacío.';
  return null;
}
