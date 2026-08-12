import datos from '@/data/examenes.json';
import datosLaboratorios from '@/data/examenes-laboratorios.json';
import { bloquesPreparacion, type BloquePreparacion } from '@/data/preparacion';

/**
 * Estructura de un examen.
 *
 * Los campos siguen el formato en que el laboratorio entrega su cartera:
 * especialidad, nombre, UTILIDAD, CONDICIONES CLÍNICAS, TIEMPO DE ENTREGA,
 * TIPO DE MUESTRA y TÉCNICA. El código lo asigna el laboratorio.
 */
export type Examen = {
  /** Código interno del laboratorio. Prefijo de especialidad + correlativo. */
  codigo: string;
  /** Define la URL de la ficha. */
  slug: string;
  nombre: string;
  especialidad: string;
  /** UTILIDAD: para qué sirve el examen, en prosa. */
  utilidad: string;
  /** CONDICIONES CLÍNICAS: preparación del paciente, tal como la entrega el laboratorio. */
  condicionesClinicas: string;
  /** TIEMPO DE ENTREGA */
  tiempoEntrega: string;
  /** TIPO DE MUESTRA, incluido el volumen. */
  tipoMuestra: string;
  /** TÉCNICA analítica. "REMISIÓN" indica que se deriva a un laboratorio de referencia. */
  tecnica: string;
  /** Nombres alternativos; se indexan en el buscador. */
  sinonimos?: string[];
  /** Ficha informativa en PDF, o null si aún no existe. */
  ficha?: string | null;
  /** Datos ampliados que solo muestra el catálogo de laboratorios asociados. */
  tecnico?: FichaTecnica;
};

/** Especificaciones adicionales dirigidas a bioquímicos. */
export type FichaTecnica = {
  equipo?: string;
  volumenMinimo?: string;
  conservacion?: string;
  transporte?: string;
  diasProceso?: string;
  /** Código LOINC. El laboratorio debe validarlo antes de publicar. */
  loinc?: string;
  unidades?: string;
  criteriosRechazo?: string[];
};

/** Catálogo público, para pacientes. */
export const examenes: Examen[] = datos as Examen[];

/**
 * Catálogo para laboratorios asociados. Cuando el laboratorio entregue su
 * cartera de derivación basta con reemplazar el JSON, sin tocar código.
 */
export const examenesLaboratorios: Examen[] = datosLaboratorios as Examen[];

export function getExamen(slug: string, lista: Examen[] = examenes): Examen | undefined {
  return lista.find((e) => e.slug === slug);
}

export function getEspecialidades(lista: Examen[] = examenes): string[] {
  return [...new Set(lista.map((e) => e.especialidad))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function contarPorEspecialidad(especialidad: string, lista: Examen[] = examenes): number {
  return lista.filter((e) => e.especialidad === especialidad).length;
}

export function getRelacionados(examen: Examen, lista: Examen[] = examenes, limite = 3): Examen[] {
  return lista
    .filter((e) => e.slug !== examen.slug)
    .sort((a, b) => {
      const puntaje = (e: Examen) => (e.especialidad === examen.especialidad ? 0 : 1);
      return puntaje(a) - puntaje(b);
    })
    .slice(0, limite);
}

/**
 * Deduce el ayuno a partir del texto de CONDICIONES CLÍNICAS.
 *
 * El laboratorio lo escribe en prosa ("AYUNO 8-12 horas."), así que se
 * interpreta en vez de pedir un campo aparte: con 400 exámenes, mantener dos
 * fuentes sincronizadas a mano sería un problema.
 *
 * Ante un rango se toma el valor mayor: indicar más ayuno del necesario es
 * inocuo, indicar menos obliga a repetir la toma.
 */
export function interpretarAyuno(examen: Examen): {
  requiere: boolean;
  horas: number;
  texto: string;
} {
  const condiciones = examen.condicionesClinicas ?? '';
  const normalizado = normalizar(condiciones);

  const mencionaAyuno = /\bayuno\b/.test(normalizado);
  const niega = /no requiere ayuno|sin ayuno|no necesita ayuno/.test(normalizado);

  if (!mencionaAyuno || niega) {
    return { requiere: false, horas: 0, texto: 'No requiere ayuno' };
  }

  // Toma los números que aparecen junto a la palabra "ayuno".
  const cerca = normalizado.slice(normalizado.indexOf('ayuno'), normalizado.indexOf('ayuno') + 40);
  const numeros = [...cerca.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n > 0 && n <= 24);

  if (numeros.length === 0) return { requiere: true, horas: 8, texto: 'Requiere ayuno' };

  const horas = Math.max(...numeros);
  const texto =
    numeros.length > 1
      ? `Ayuno de ${Math.min(...numeros)} a ${horas} horas`
      : `Ayuno de ${horas} horas`;

  return { requiere: true, horas, texto };
}

/**
 * Bloque del manual de preparación que le corresponde a un examen, deducido de
 * su TIPO DE MUESTRA. Igual que el ayuno, se interpreta en vez de etiquetarse:
 * los 400 exámenes reales quedan enlazados sin trabajo manual.
 *
 * Devuelve `undefined` cuando la muestra no encaja en ningún bloque (por
 * ejemplo un examen que se toma en el propio laboratorio).
 */
export function bloqueDePreparacion(examen: Examen): BloquePreparacion | undefined {
  const muestra = normalizar(examen.tipoMuestra ?? '');
  if (!muestra) return undefined;

  // De más específico a más general: "orina de 24 horas" debe ganarle a "orina".
  const ordenados = [...bloquesPreparacion].sort(
    (a, b) => longitudMayor(b.coincidencias) - longitudMayor(a.coincidencias),
  );

  return ordenados.find((bloque) =>
    bloque.coincidencias.some((clave) => muestra.includes(normalizar(clave))),
  );
}

const longitudMayor = (claves: string[]) => Math.max(0, ...claves.map((c) => c.length));

/** `true` cuando el examen se deriva a un laboratorio de referencia. */
export function esRemision(examen: Examen): boolean {
  return normalizar(examen.tecnica ?? '').includes('remision');
}

/** Primera oración de UTILIDAD, para las tarjetas del listado. */
export function resumenCorto(examen: Examen, maximo = 160): string {
  const primera = (examen.utilidad ?? '').split(/(?<=\.)\s/)[0] ?? '';
  if (primera.length <= maximo) return primera;
  return `${primera.slice(0, maximo).trimEnd()}…`;
}

/** Texto plano que indexa el buscador del catálogo. */
export function indiceBusqueda(examen: Examen): string {
  return normalizar(
    [
      examen.codigo,
      examen.nombre,
      examen.especialidad,
      examen.utilidad,
      examen.tipoMuestra,
      examen.tecnica,
      ...(examen.sinonimos ?? []),
    ].join(' '),
  );
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
