import datos from '@/data/examenes.json';
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

/* ------------------------------------------------------------------
   Textos para el paciente
   ------------------------------------------------------------------
   El importador deja «Consultar» en los campos que el laboratorio todavía no
   entregó (tiempo de entrega de la mayoría, tipo de muestra de unos pocos).
   Mostrar esa palabra suelta suena a mostrador; estas funciones la convierten
   en frases que explican qué pasa y qué puede hacer la persona. Cuando el dato
   sí existe, lo envuelven en una oración completa.
------------------------------------------------------------------- */

/** Valor que deja el importador cuando el laboratorio aún no entregó el dato. */
export const SIN_DATO = 'Consultar';

export const tieneDato = (valor?: string): valor is string => !!valor && valor !== SIN_DATO;

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

/** Primera oración de UTILIDAD, para las tarjetas del listado. */
export function resumenCorto(examen: Examen, maximo = 160): string {
  const primera = (examen.utilidad ?? '').split(/(?<=\.)\s/)[0] ?? '';
  if (primera.length <= maximo) return primera;
  return `${primera.slice(0, maximo).trimEnd()}…`;
}

/**
 * Descripción de la ficha para buscadores y redes.
 *
 * Solo menciona los datos que existen. La plantilla anterior interpolaba los
 * campos en crudo, así que los 495 exámenes sin plazo confirmado publicaban
 * «Entrega en consultar.» y otros 17 «muestra: Consultar.» — el texto que el
 * doctor pidió suavizar, corregido en la página visible pero no en lo que sale
 * en Google, que es justo donde más se lee.
 *
 * Se recorta a 160 caracteres porque por encima de ahí Google trunca.
 */
export function descripcionMeta(examen: Examen, maximo = 160): string {
  const frases = [resumenCorto(examen), `Especialidad ${examen.especialidad.toLowerCase()}.`];
  // La muestra conserva sus mayúsculas: hay siglas («Sangre total con EDTA»)
  // que en minúscula dejan de leerse como lo que son. Y cinco exámenes ya
  // traen la palabra dentro del valor («Muestra cervicovaginal»), así que
  // añadir la etiqueta daría «Muestra: Muestra cervicovaginal».
  if (tieneDato(examen.tipoMuestra)) {
    const muestra = examen.tipoMuestra;
    frases.push(/^muestra/i.test(muestra) ? `${muestra}.` : `Muestra: ${muestra}.`);
  }
  if (tieneDato(examen.tiempoEntrega)) {
    frases.push(`Entrega en ${examen.tiempoEntrega.toLowerCase()}.`);
  }

  const texto = frases.join(' ').replace(/\s+/g, ' ').trim();
  if (texto.length <= maximo) return texto;
  // Se corta por la última palabra entera para no dejar sílabas sueltas.
  const recorte = texto.slice(0, maximo - 1);
  return `${recorte.slice(0, recorte.lastIndexOf(' ')).trimEnd()}…`;
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
