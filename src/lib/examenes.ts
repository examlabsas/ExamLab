import datos from '@/data/examenes.json';
import { bloquesPreparacion, type BloquePreparacion } from '@/data/preparacion';
import {
  ayunoDeTexto,
  descripcionMeta,
  normalizar,
  resumenCorto,
  SIN_DATO,
  tieneDato,
  type Ayuno,
} from '@/lib/examenes-comun';

// Se reexportan para que el resto del sitio siga importando todo desde aquí.
export { descripcionMeta, normalizar, resumenCorto, SIN_DATO, tieneDato, type Ayuno };

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
  /** Una línea que resume el examen. Va bajo el título, antes de la utilidad. */
  resumen?: string;
  /** Qué determinaciones trae un perfil o panel, cuando el examen es compuesto. */
  incluye?: string;
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

export function getEspecialidades(lista: Examen[] = examenes): string[] {
  return [...new Set(lista.map((e) => e.especialidad))].sort((a, b) => a.localeCompare(b, 'es'));
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
 * Ayuno que necesita un examen, deducido de su CONDICIONES CLÍNICAS.
 *
 * La interpretación está en `examenes-comun.ts` porque el panel de
 * administración la necesita igual, para enseñarle al laboratorio cómo se va a
 * entender el texto que escribe.
 */
export const interpretarAyuno = (examen: Examen): Ayuno =>
  ayunoDeTexto(examen.condicionesClinicas ?? '');

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

/* ------------------------------------------------------------------
   Textos para el paciente
   ------------------------------------------------------------------
   El importador deja «Consultar» en los campos que el laboratorio todavía no
   entregó (tiempo de entrega de la mayoría, tipo de muestra de unos pocos).
   Mostrar esa palabra suelta suena a mostrador; estas funciones la convierten
   en frases que explican qué pasa y qué puede hacer la persona. Cuando el dato
   sí existe, lo envuelven en una oración completa.
------------------------------------------------------------------- */

/** Para los recuadros y tarjetas: un tiempo, o una promesa amable en su lugar. */
export function etiquetaEntrega(examen: Examen): string {
  return tieneDato(examen.tiempoEntrega) ? examen.tiempoEntrega : 'Se lo confirmamos al agendar';
}

/** Para los recuadros y tarjetas: el tipo de muestra, o de quién depende. */
export function etiquetaMuestra(examen: Examen): string {
  return tieneDato(examen.tipoMuestra) ? examen.tipoMuestra : 'Según lo que indique su médico';
}

/** Respuesta completa a «¿Cuándo tengo el resultado?». */
export function fraseEntrega(examen: Examen): string {
  if (!tieneDato(examen.tiempoEntrega)) {
    return (
      'Depende del examen y de la carga del día: la mayoría de pruebas de rutina se entregan el ' +
      'mismo día y las especializadas pueden tomar algunos días. Cuando agende le decimos la fecha, ' +
      'y le avisamos en cuanto el informe esté listo.'
    );
  }
  return (
    `${oracionEntrega(examen.tiempoEntrega)} Ese tiempo lo contamos desde que la muestra llega a ` +
    'nuestro laboratorio matriz, que es donde se procesa; si la deja en otra sede puede tardar un ' +
    'poco más por el traslado. Le avisamos en cuanto el informe esté listo.'
  );
}

/**
 * El tiempo de entrega viene del laboratorio en formas distintas («El mismo
 * día», «A partir de las 18:00», «2 días 15:00», «45 minutos»), así que la
 * oración se arma según la forma en vez de pegar «en» delante de todo.
 */
function oracionEntrega(tiempo: string): string {
  const t = tiempo.trim();
  const diasHora = t.match(/^(\d+) d[ií]as?\s+(\d{1,2}:\d{2})$/i);
  if (diasHora) return `Normalmente en ${diasHora[1]} días, a partir de las ${diasHora[2]}.`;
  if (/^el mismo d[ií]a$/i.test(t)) return 'Normalmente el mismo día.';
  if (/^a partir de/i.test(t)) return `Normalmente ${t.charAt(0).toLowerCase()}${t.slice(1)}.`;
  if (/^\d+\s*(minutos?|horas?|d[ií]as?)$/i.test(t)) return `Normalmente en ${t}.`;
  return `Tiempo estimado: ${t}.`;
}

/**
 * Respuesta completa a «¿Qué muestra se toma?». Quién obtiene la muestra
 * depende de cuál sea: la sangre la extrae el personal; la orina y las heces
 * las recoge la persona en casa; el resto se explica al agendar.
 */
export function fraseMuestra(examen: Examen): string {
  if (!tieneDato(examen.tipoMuestra)) {
    return (
      'Depende de lo que su médico solicite. Cuando agende le indicamos qué muestra necesitamos ' +
      'y cómo prepararse, sin complicaciones.'
    );
  }
  const tipo = examen.tipoMuestra;
  const bloque = bloqueDePreparacion(examen)?.id;
  const m = normalizar(tipo);

  if (bloque === 'sangre' || /suero|plasma|sangre/.test(m)) {
    return (
      `${tipo}. Es una toma de sangre: la hace nuestro personal con material estéril de un solo ` +
      'uso y dura pocos minutos.'
    );
  }
  if (bloque && ['orina', 'orina-24-horas', 'orina-bebes', 'heces', 'espermatograma'].includes(bloque)) {
    return (
      `${tipo}. La recoge usted en casa siguiendo nuestra guía de preparación; el frasco se lo ` +
      'entregamos en cualquiera de nuestras sedes.'
    );
  }
  return `${tipo}. Si tiene dudas sobre cómo se obtiene, escríbanos por WhatsApp y le explicamos con calma.`;
}

/** Respuesta completa a «¿Tengo que venir en ayunas?». */
export function fraseAyuno(examen: Examen): string {
  const ayuno = interpretarAyuno(examen);
  const condiciones = examen.condicionesClinicas.trim();
  if (ayuno.requiere) {
    return (
      `Sí, este examen necesita ayuno. ${condiciones} Si su médico le dio una indicación distinta, ` +
      'siga la de su médico, que conoce su caso.'
    );
  }
  // Si las condiciones ya dicen «no requiere ayuno», no se repite dos veces.
  const resto = condiciones.replace(/^no requiere ayuno\.?\s*/i, '').trim();
  return resto
    ? `No hace falta ayuno para este examen. ${resto}`
    : 'No hace falta ayuno para este examen: puede desayunar con normalidad.';
}

/** `true` cuando el examen se deriva a un laboratorio de referencia. */
export function esRemision(examen: Examen): boolean {
  return normalizar(examen.tecnica ?? '').includes('remision');
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
