/**
 * Datos del sitio: contacto, redes, sedes, horarios y fechas especiales.
 *
 * Es la parte más delicada del panel. Un horario mal puesto no se nota al
 * guardar: se nota cuando un paciente llega en ayunas a una puerta cerrada
 * porque el indicador decía «Abierto». Por eso aquí se valida más que en las
 * noticias, y se enseña cómo va a quedar antes de guardar.
 */
import { leerArchivo, escribirArchivo, type Config } from './github';

export const RUTA_SITIO = 'src/data/sitio.json';
export const RUTA_SEDES = 'src/data/sedes.json';
export const RUTA_FERIADOS = 'src/data/feriados.json';

export type Tramo = { abre: string; cierra: string };
export type Franja = Tramo[] | null;
export type HorarioSemanal = [Franja, Franja, Franja, Franja, Franja, Franja, Franja];

export type Sede = {
  slug: string;
  nombre: string;
  etiqueta?: string;
  direccion: string;
  referencia?: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  celular: string;
  horarioSemanal: HorarioSemanal;
  servicios: string[];
  geo: { lat: number; lng: number };
  mapsUrl?: string;
  foto?: string;
};

export type DatosSitio = {
  nota?: string;
  email: string;
  emails: { laboratorio: string; administracion: string; facturacion: string };
  telefono: string;
  emergencias: string;
  fundacion: string;
  constituidaSas: string;
  redes: { facebook: string; instagram: string; tiktok: string };
  sistema: { nombre: string; url: string };
};

export type FechaEspecial = {
  fecha: string;
  motivo: string;
  franja: Franja;
  sedes?: string[];
};

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/* ─── Lectura ────────────────────────────────────────────────────────────── */

export async function leerSitio(cfg: Config) {
  const archivo = await leerArchivo(cfg, RUTA_SITIO);
  if (!archivo) throw new Error('No se encontró sitio.json en el repositorio.');
  return { datos: JSON.parse(archivo.texto) as DatosSitio, sha: archivo.sha };
}

export async function leerSedes(cfg: Config) {
  const archivo = await leerArchivo(cfg, RUTA_SEDES);
  if (!archivo) throw new Error('No se encontró sedes.json en el repositorio.');
  return { datos: JSON.parse(archivo.texto) as Sede[], sha: archivo.sha };
}

export async function leerFeriados(cfg: Config) {
  const archivo = await leerArchivo(cfg, RUTA_FERIADOS);
  if (!archivo) throw new Error('No se encontró feriados.json en el repositorio.');
  const json = JSON.parse(archivo.texto) as { nota?: string; fechas: FechaEspecial[] };
  return { datos: json, sha: archivo.sha };
}

/* ─── Escritura ──────────────────────────────────────────────────────────── */

async function guardarJson(
  cfg: Config,
  opciones: { ruta: string; valor: unknown; sha?: string; resumen: string; autor: string },
) {
  await escribirArchivo(cfg, {
    ruta: opciones.ruta,
    texto: `${JSON.stringify(opciones.valor, null, 2)}\n`,
    sha: opciones.sha,
    resumen: opciones.resumen,
    autor: opciones.autor,
  });
}

export const guardarSitio = (cfg: Config, datos: DatosSitio, sha: string, autor: string) =>
  guardarJson(cfg, {
    ruta: RUTA_SITIO,
    valor: datos,
    sha,
    resumen: 'Actualiza los datos de contacto del sitio',
    autor,
  });

export const guardarSedes = (cfg: Config, datos: Sede[], sha: string, autor: string, que: string) =>
  guardarJson(cfg, { ruta: RUTA_SEDES, valor: datos, sha, resumen: que, autor });

export const guardarFeriados = (
  cfg: Config,
  datos: { nota?: string; fechas: FechaEspecial[] },
  sha: string,
  autor: string,
  que: string,
) => guardarJson(cfg, { ruta: RUTA_FERIADOS, valor: datos, sha, resumen: que, autor });

/* ─── Validación ─────────────────────────────────────────────────────────── */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Revisa un día de atención.
 *
 * Lo que de verdad importa son los tramos solapados o invertidos: el cálculo de
 * «Abierto / Cerrado» recorre los tramos en orden y, con uno que cierre antes
 * de abrir, el indicador deja de tener sentido sin que nada falle al compilar.
 */
export function revisarFranja(franja: Franja, etiqueta: string): string | null {
  if (franja === null) return null;
  if (franja.length === 0) return `${etiqueta}: deje el día cerrado o ponga al menos un tramo.`;
  if (franja.length > 2) return `${etiqueta}: como mucho dos tramos (mañana y tarde).`;

  let finAnterior = -1;
  for (const t of franja) {
    if (!HORA.test(t.abre) || !HORA.test(t.cierra)) {
      return `${etiqueta}: las horas van como HH:MM, de 00:00 a 23:59.`;
    }
    const abre = aMinutos(t.abre);
    const cierra = aMinutos(t.cierra);
    if (cierra <= abre) return `${etiqueta}: ${t.cierra} no puede ser antes que ${t.abre}.`;
    if (abre < finAnterior) return `${etiqueta}: los dos tramos se solapan.`;
    finAnterior = cierra;
  }
  return null;
}

export function revisarSede(s: Partial<Sede>): string | null {
  if (!s.nombre?.trim()) return 'Falta el nombre de la sede.';
  if (!s.direccion?.trim()) return 'Falta la dirección.';
  if (!s.ciudad?.trim()) return 'Falta la ciudad.';
  if (!s.telefono?.trim()) return 'Falta el teléfono fijo.';
  if (!s.celular?.trim()) return 'Falta el celular.';

  // El formato internacional se deriva de estos números: si traen algo que no
  // sean dígitos y separadores, el enlace de llamada sale mal.
  for (const [campo, valor] of [
    ['teléfono', s.telefono],
    ['celular', s.celular],
  ] as const) {
    if (!/^[\d\s()+-]{7,20}$/.test(valor ?? '')) return `El ${campo} tiene caracteres raros.`;
  }

  if (!s.horarioSemanal || s.horarioSemanal.length !== 7) return 'El horario debe tener 7 días.';
  for (let i = 0; i < 7; i++) {
    const problema = revisarFranja(s.horarioSemanal[i] ?? null, DIAS[i]!);
    if (problema) return problema;
  }

  if (!s.geo || Number.isNaN(s.geo.lat) || Number.isNaN(s.geo.lng)) {
    return 'Las coordenadas no son válidas.';
  }
  return null;
}

export function revisarFechaEspecial(f: Partial<FechaEspecial>): string | null {
  if (!f.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) return 'La fecha va como AAAA-MM-DD.';
  if (Number.isNaN(new Date(f.fecha).getTime())) return 'Esa fecha no existe.';
  if (!f.motivo?.trim()) return 'Ponga el motivo: es lo que se le muestra al paciente.';
  return revisarFranja(f.franja ?? null, 'Ese día');
}

/* ─── Vista previa del estado ────────────────────────────────────────────── */

/**
 * Qué diría el indicador con el horario que se está a punto de guardar.
 *
 * Se enseña antes de confirmar porque es el error que más caro sale y el que
 * menos se ve: nadie revisa un JSON de horarios, pero todo el mundo entiende
 * «los martes diría Cerrado».
 */
export function resumenSemana(semana: HorarioSemanal): string[] {
  return semana.map((franja, dia) => {
    const nombre = DIAS[dia]!;
    if (!franja || franja.length === 0) return `${nombre}: cerrado`;
    return `${nombre}: ${franja.map((t) => `${t.abre}–${t.cierra}`).join(' y ')}`;
  });
}
