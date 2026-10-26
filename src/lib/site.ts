/**
 * Datos únicos del negocio.
 * Todo lo que aparece repetido en el sitio (teléfonos, direcciones, horarios,
 * menú) sale de aquí para que se edite en un solo lugar.
 *
 * FASE 1 (diseño): los valores marcados como PROVISIONAL son de maquetación y
 * deben reemplazarse con los datos reales que entregue el laboratorio.
 */
import datosFeriados from '@/data/feriados.json';
import datosSitio from '@/data/sitio.json';
import datosSedes from '@/data/sedes.json';

import type { NombreFoto } from './fotos';

/**
 * Número en formato internacional, derivado del que se muestra.
 *
 * Antes se guardaban los dos y podían discrepar: una corrección en uno y no en
 * el otro deja un botón de llamada que marca un número distinto al que se lee.
 * Ecuador descarta el cero inicial y antepone +593, y eso vale igual para los
 * fijos («03 2425081») que para los celulares («096 382 0177»).
 */
export const aE164 = (numero: string): string =>
  `+593${numero.replace(/\D/g, '').replace(/^0/, '')}`;

/*
  Lo editable vive en `src/data/sitio.json` para que el panel pueda escribirlo.
  Lo que se queda aquí es lo que no se cambia sin tocar también el diseño o la
  configuración del despliegue: el nombre, el claim, la descripción y la URL
  —esta última tiene que coincidir con la de astro.config.mjs, de donde salen
  el sitemap y las etiquetas canónicas.
*/
export const site = {
  nombre: 'ExamLab',
  razonSocial: 'ExamLab S.A.S.',
  claim: 'Laboratorio clínico de innovación y desarrollo',
  descripcion:
    'Laboratorio clínico de alta complejidad en la provincia de Tungurahua, con sedes en Ambato y Pelileo: análisis de rutina y pruebas especializadas, con personal profesional y resultados en línea.',
  url: 'https://examlabsas.com',
  ciudad: 'Ambato',
  provincia: 'Tungurahua',
  pais: 'Ecuador',

  email: datosSitio.email,
  emails: datosSitio.emails,
  telefono: datosSitio.telefono,
  telefonoE164: aE164(datosSitio.telefono),
  /** Línea de urgencias, distinta de la general. La entregó el Dr. Silva. */
  emergencias: datosSitio.emergencias,
  emergenciasE164: aE164(datosSitio.emergencias),
  fundacion: datosSitio.fundacion,
  constituidaSas: datosSitio.constituidaSas,
  redes: datosSitio.redes,
  sistema: datosSitio.sistema,
} as const;

/** Zona horaria del laboratorio. Ecuador continental no cambia de hora. */
export const ZONA_HORARIA = 'America/Guayaquil';

/** Un rango de atención dentro de un día (por ejemplo, la jornada de la tarde). */
export type Tramo = { abre: string; cierra: string };

/**
 * Atención de un día: uno o dos tramos (cuando hay pausa de mediodía), o
 * `null` si ese día está cerrado.
 */
export type Franja = Tramo[] | null;

/** Horario de la semana. El índice es el día de JavaScript: 0 = domingo. */
export type HorarioSemanal = [Franja, Franja, Franja, Franja, Franja, Franja, Franja];

/**
 * Excepción al horario semanal para una fecha concreta: un feriado, un día que
 * se cierra antes, una jornada especial.
 *
 * Hacía falta porque el horario era un patrón semanal fijo y el sitio ya
 * anuncia en la página de sedes que «en feriados atendemos únicamente urgencias
 * coordinadas por teléfono». Sin esto, el indicador decía «Abierto» un 24 de
 * mayo y mandaba a un paciente en ayunas a una puerta cerrada.
 */
export type FechaEspecial = {
  /** `AAAA-MM-DD` en la hora de Ecuador. */
  fecha: string;
  motivo: string;
  /** `null` cierra el día; con tramos, abre con ese horario. */
  franja: Franja;
  /** Slugs de las sedes afectadas. Si falta, aplica a todas. */
  sedes?: string[];
};

export const fechasEspeciales: FechaEspecial[] = (datosFeriados.fechas as FechaEspecial[])
  .slice()
  .sort((a, b) => a.fecha.localeCompare(b.fecha));

/** Las que afectan a una sede, de hoy en adelante. */
export function fechasEspecialesDe(slug: string, desde = hoyEnEcuador()): FechaEspecial[] {
  return fechasEspeciales.filter(
    (f) => f.fecha >= desde && (!f.sedes || f.sedes.includes(slug)),
  );
}

/** `AAAA-MM-DD` de hoy en la hora del laboratorio, no en la del visitante. */
export function hoyEnEcuador(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Orden de lectura: la semana se muestra empezando el lunes. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/**
 * Convierte el horario estructurado en las líneas que se muestran al público,
 * agrupando días consecutivos con el mismo horario ("Lunes a viernes").
 * Se genera desde los mismos datos que usa el indicador de "abierto ahora",
 * así que no pueden quedar desincronizados.
 */
export function horariosLegibles(semana: HorarioSemanal): { dias: string; horas: string }[] {
  const grupos: { desde: number; hasta: number; franja: Franja }[] = [];

  const mismaFranja = (a: Franja, b: Franja) =>
    a === null
      ? b === null
      : b !== null &&
        a.length === b.length &&
        a.every((tramo, i) => tramo.abre === b[i]!.abre && tramo.cierra === b[i]!.cierra);

  for (const dia of ORDEN_SEMANA) {
    const franja = semana[dia]!;
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && mismaFranja(ultimo.franja, franja)) ultimo.hasta = dia;
    else grupos.push({ desde: dia, hasta: dia, franja });
  }

  return grupos.map((g) => ({
    dias:
      g.desde === g.hasta
        ? DIAS[g.desde]!
        : `${DIAS[g.desde]} a ${DIAS[g.hasta]!.toLowerCase()}`,
    horas: g.franja ? g.franja.map((t) => `${t.abre} – ${t.cierra}`).join(' y ') : 'Cerrado',
  }));
}

export type Sede = {
  slug: string;
  nombre: string;
  etiqueta?: string;
  direccion: string;
  referencia?: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  telefonoE164: string;
  /**
   * Celular de la sede, el que consta en el material impreso del laboratorio.
   * Sirve para llamar; el WhatsApp sigue siendo uno solo y es el de la matriz
   * (lo confirmó el Dr. Silva: todo lo que entra por redes y por la web se
   * capta desde ahí).
   */
  celular: string;
  celularE164: string;
  /** Fuente de verdad del horario. Alimenta el texto y el estado de apertura. */
  horarioSemanal: HorarioSemanal;
  /** Aclaración que no cabe en la tabla de horarios. */
  notaHorario?: string;
  /** Generado desde `horarioSemanal`; no editar a mano. */
  horarios: { dias: string; horas: string }[];
  servicios: string[];
  geo: { lat: number; lng: number };
  /** Enlace oficial de Google Maps para esta sede (maps.app.goo.gl). */
  mapsUrl?: string;
  /** Foto de la sede (nombre de src/lib/fotos.ts). Se muestra en su página. */
  foto?: NombreFoto;
};

/** Lo que trae `sedes.json`: la sede sin los campos que se calculan. */
type RegistroSede = Omit<Sede, 'telefonoE164' | 'celularE164' | 'horarios'>;

/*
  Las sedes salen de `src/data/sedes.json` para que el panel pueda editarlas.
  Aquí solo se completan los campos derivados: el número internacional y las
  líneas legibles del horario, que se calculan del propio `horarioSemanal` y no
  se escriben a mano — así no pueden quedar desincronizados.
*/
export const sedes: Sede[] = (datosSedes as unknown as RegistroSede[]).map((s) => ({
  ...s,
  telefonoE164: aE164(s.telefono),
  celularE164: aE164(s.celular),
  horarios: horariosLegibles(s.horarioSemanal),
}));

/**
 * URL del mapa embebido de Google Maps (no requiere API key).
 *
 * Se usa la coordenada exacta y no la dirección en texto: Google geocodifica
 * mal «Castillo y Rocafuerte» y dejaba el pin a varias cuadras.
 */
export function mapaEmbed(sede: Sede, zoom = 16): string {
  return `https://maps.google.com/maps?q=${sede.geo.lat},${sede.geo.lng}&z=${zoom}&output=embed`;
}

/** URL para abrir la ubicación en la app de mapas del usuario. */
export function mapaEnlace(sede: Sede): string {
  // Se prefiere el enlace oficial que entregó el laboratorio: apunta al pin
  // exacto, mientras que la búsqueda por texto puede fallar con direcciones
  // que Google no geocodifica bien.
  if (sede.mapsUrl) return sede.mapsUrl;
  const consulta = encodeURIComponent(
    `${sede.direccion}, ${sede.ciudad}, ${sede.provincia}, Ecuador`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${consulta}`;
}

export type NavLink = {
  label: string;
  href: string;
  descripcion?: string;
  hijos?: NavLink[];
};

export const navPrincipal: NavLink[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Catálogo', href: '/catalogo' },
  {
    label: 'Soy Paciente',
    href: '/soy-paciente',
    // Se muestra como primera entrada del submenú: sin ella la página no
    // tendría forma de alcanzarse, porque el título solo despliega la lista.
    descripcion: 'Antes, durante y después de su examen',
    hijos: [
      {
        label: 'Pedir cita',
        href: '/soy-paciente/pedir-cita',
        descripcion: 'Agende por WhatsApp en dos pasos',
      },
      {
        label: 'Resultados',
        href: '/soy-paciente/resultados',
        descripcion: 'Cómo ver y descargar su informe',
      },
      {
        label: 'Puntos de atención',
        href: '/sedes',
        descripcion: 'Direcciones, mapas y horarios',
      },
      {
        label: 'Preparación para sus exámenes',
        href: '/preparacion',
        descripcion: 'Cómo prepararse según el tipo de muestra',
      },
      {
        label: 'Preguntas frecuentes',
        href: '/soy-paciente#preguntas-frecuentes',
        descripcion: 'Ayunas, tiempos, convenios y pagos',
      },
      {
        label: 'Califica tu experiencia',
        href: '/soy-paciente/califica-tu-experiencia',
        descripcion: 'Déjenos su reseña en Google',
      },
    ],
  },
  {
    label: 'Soy Profesional',
    href: '/soy-profesional',
    descripcion: 'Convenios, catálogo técnico y contacto directo',
    hijos: [
      {
        label: 'Catálogo de exámenes',
        href: '/catalogo',
        descripcion: 'Consulta técnica por especialidad',
      },
      {
        label: 'Convenios para médicos',
        href: '/soy-profesional#convenios-medicos',
        descripcion: 'Beneficios para médicos referentes',
      },
      {
        label: 'Contacto directo',
        href: '/soy-profesional#contacto',
        descripcion: 'Línea de WhatsApp para profesionales',
      },
    ],
  },
  {
    label: 'Laboratorios Asociados',
    href: '/laboratorios-asociados',
    descripcion: 'Órdenes, catálogo de derivación y resultados',
    hijos: [
      {
        label: 'Ingresar orden',
        href: '/laboratorios-asociados#ingresar-orden',
        descripcion: 'Registre una orden en el sistema del laboratorio',
      },
      {
        label: 'Catálogo laboratorios',
        href: '/laboratorios-asociados/catalogo',
        descripcion: 'Cartera de pruebas para laboratorios',
      },
      {
        label: 'Resultados',
        href: '/laboratorios-asociados#resultados',
        descripcion: 'Consulte los informes de sus derivaciones',
      },
    ],
  },
  { label: 'Noticias', href: '/noticias' },
  // «Sedes» salió del menú a pedido del Dr. Silva, para dar más espacio al
  // botón de resultados. Sigue en Soy Paciente → Puntos de atención, en la
  // barra superior («Provincia de Tungurahua») y en el pie.
];

export const footerEnlaces: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Catálogo de exámenes', href: '/catalogo' },
  { label: 'Soy paciente', href: '/soy-paciente' },
  { label: 'Soy profesional', href: '/soy-profesional' },
  { label: 'Laboratorios asociados', href: '/laboratorios-asociados' },
  { label: 'Noticias', href: '/noticias' },
];

export const footerServicios: NavLink[] = [
  { label: 'Pedir cita', href: '/soy-paciente/pedir-cita' },
  { label: 'Preparación para sus exámenes', href: '/preparacion' },
  { label: 'Resultados en línea', href: '/soy-paciente/resultados' },
  { label: 'Exámenes a domicilio', href: '/servicios#domicilio' },
  { label: 'Convenios para médicos', href: '/soy-profesional#convenios-medicos' },
  { label: 'Nuestras sedes', href: '/sedes' },
];

export const footerLegales: NavLink[] = [
  { label: 'Política de privacidad', href: '/privacidad' },
  { label: 'Términos y condiciones', href: '/terminos' },
  { label: 'Cookies', href: '/cookies' },
];
