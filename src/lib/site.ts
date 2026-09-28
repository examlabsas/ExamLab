/**
 * Datos únicos del negocio.
 * Todo lo que aparece repetido en el sitio (teléfonos, direcciones, horarios,
 * menú) sale de aquí para que se edite en un solo lugar.
 *
 * FASE 1 (diseño): los valores marcados como PROVISIONAL son de maquetación y
 * deben reemplazarse con los datos reales que entregue el laboratorio.
 */

import type { NombreFoto } from './fotos';

export const site = {
  nombre: 'ExamLab',
  razonSocial: 'ExamLab S.A.S.',
  claim: 'Laboratorio clínico de innovación y desarrollo',
  descripcion:
    'Laboratorio clínico de alta complejidad en Ambato y Pelileo: análisis de rutina y pruebas especializadas, con personal profesional y resultados en línea.',
  // Debe coincidir con `site` de astro.config.mjs: de ahí salen el sitemap,
  // las etiquetas canonical y el QR impreso de /preparacion.
  url: 'https://examlabsas.com', // Confirmado por Netlife: dominio del laboratorio.
  /**
   * Buzones reales del laboratorio (Netlife). El Dr. Silva pidió que cada uno
   * aparezca donde corresponde: el de laboratorio para pacientes, médicos y
   * laboratorios asociados; el de administración para asuntos legales y de
   * datos personales. `email` es el de contacto general.
   */
  email: 'laboratorio@examlabsas.com',
  emails: {
    laboratorio: 'laboratorio@examlabsas.com',
    administracion: 'administracion@examlabsas.com',
    facturacion: 'facturacion@examlabsas.com',
  },
  // Número que consta en el manual para pacientes entregado por el laboratorio.
  telefono: '096 382 0177',
  telefonoE164: '+593963820177',
  emergencias: '096 382 0177', // POR CONFIRMAR: ¿hay una línea distinta para urgencias?
  emergenciasE164: '+593963820177',
  ciudad: 'Ambato',
  provincia: 'Tungurahua',
  pais: 'Ecuador',
  fundacion: '2008', // PROVISIONAL: aún sin confirmar con el Dr. Silva.
  // Confirmadas por el Dr. Silva (7 sep 2026). @examlab_s.a.s es la cuenta oficial.
  redes: {
    facebook: 'https://www.facebook.com/share/1HqUjdUXC6/',
    instagram: 'https://www.instagram.com/examlab_s.a.s',
    tiktok: 'https://www.tiktok.com/@examlab_s.a.s',
  },
  /**
   * Sistema del laboratorio (proveedor externo), donde viven las órdenes y los
   * resultados. En septiembre de 2026 el laboratorio cambió Avalab por Saluto;
   * la URL la entregó el laboratorio. Los pacientes, los médicos y los
   * laboratorios asociados entran por la misma puerta.
   */
  sistema: {
    nombre: 'Saluto',
    url: 'https://erp.salutoapps.com/',
  },
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

// Horarios estructurados. Índice 0 = domingo, 6 = sábado.
// Confirmados por el Dr. Silva (7 sep 2026).
const horarioMatriz: HorarioSemanal = [
  null, // domingo
  [{ abre: '06:30', cierra: '20:00' }],
  [{ abre: '06:30', cierra: '20:00' }],
  [{ abre: '06:30', cierra: '20:00' }],
  [{ abre: '06:30', cierra: '20:00' }],
  [{ abre: '06:30', cierra: '20:00' }],
  [{ abre: '07:30', cierra: '17:00' }], // sábado
];

// Laboratorio 1 (Castillo) cierra al mediodía.
const horarioLaboratorio1: HorarioSemanal = [
  null,
  [{ abre: '07:00', cierra: '13:00' }, { abre: '14:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '13:00' }, { abre: '14:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '13:00' }, { abre: '14:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '13:00' }, { abre: '14:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '13:00' }, { abre: '14:00', cierra: '18:30' }],
  [{ abre: '07:30', cierra: '13:00' }],
];

const horarioLaboratorio2: HorarioSemanal = [
  null,
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:30', cierra: '13:00' }],
];

const horarioPelileo: HorarioSemanal = [
  null,
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:00', cierra: '18:30' }],
  [{ abre: '07:30', cierra: '13:00' }],
];

export const sedes: Sede[] = [
  {
    slug: 'ambato-matriz',
    nombre: 'Matriz Ficoa',
    etiqueta: 'Matriz',
    // Confirmada por el Dr. Silva (7 sep 2026).
    direccion: 'Av. Rodrigo Pachano y Reina Claudia',
    referencia: 'Junto a Salas de Velación Parques del Recuerdo, sector Ficoa',
    ciudad: 'Ambato',
    provincia: 'Tungurahua',
    telefono: '03 2425081', // Línea fija de la sede.
    telefonoE164: '+59332425081',
    horarioSemanal: horarioMatriz,
    horarios: horariosLegibles(horarioMatriz),
    servicios: [
      'Toma de muestra general',
      'Exámenes urgentes',
      'Toma de muestra a domicilio',
      'Atención pediátrica',
    ],
    // Coordenadas exactas, extraídas del propio enlace de Google Maps que
    // entregó el laboratorio (las anteriores eran una estimación a ojo y
    // caían a unos 2 km de la sede).
    geo: { lat: -1.2423638, lng: -78.6349171 },
    mapsUrl: 'https://maps.app.goo.gl/QfQRWBftLTQin8TY7',
    foto: 'matriz-ficoa-fachada',
  },
  {
    slug: 'ambato-laboratorio-1',
    nombre: 'Laboratorio 1 · Castillo',
    etiqueta: 'Laboratorio 1',
    direccion: 'Castillo y Rocafuerte, altos de la Coop. CACPECO',
    referencia: 'Edificio Thomas Crammer',
    ciudad: 'Ambato',
    provincia: 'Tungurahua',
    telefono: '03 2425081',
    telefonoE164: '+59332425081',
    horarioSemanal: horarioLaboratorio1,
    horarios: horariosLegibles(horarioLaboratorio1),
    servicios: ['Toma de muestra general', 'Toma de muestra a domicilio'],
    geo: { lat: -1.2414923, lng: -78.6303705 },
    mapsUrl: 'https://maps.app.goo.gl/Nkugtu3jRxZLeKDVA',
  },
  {
    slug: 'ambato-laboratorio-2',
    nombre: 'Laboratorio 2 · Av. Cevallos',
    etiqueta: 'Laboratorio 2',
    direccion: 'Av. Cevallos 12-24 entre Espejo y Mariano Egüez',
    referencia: 'Junto al C.C. Teófilo López',
    ciudad: 'Ambato',
    provincia: 'Tungurahua',
    telefono: '03 2826128',
    telefonoE164: '+59332826128',
    horarioSemanal: horarioLaboratorio2,
    horarios: horariosLegibles(horarioLaboratorio2),
    servicios: ['Toma de muestra general', 'Toma de muestra a domicilio'],
    geo: { lat: -1.2404654, lng: -78.6259428 },
    mapsUrl: 'https://maps.app.goo.gl/CeMHepkG76KUwn5r5',
  },
  {
    slug: 'pelileo',
    nombre: 'Laboratorio 3 · Pelileo',
    etiqueta: 'Pelileo',
    direccion: 'Club Chacaritas y Antonio Clavijo',
    referencia: 'Frente al Mercado 10 de Agosto',
    ciudad: 'Pelileo',
    provincia: 'Tungurahua',
    telefono: '03 2830445',
    telefonoE164: '+59332830445',
    horarioSemanal: horarioPelileo,
    horarios: horariosLegibles(horarioPelileo),
    servicios: [
      'Toma de muestra general',
      'Toma de muestra a domicilio',
      'Chequeos preventivos',
    ],
    geo: { lat: -1.3289029, lng: -78.5413766 },
    mapsUrl: 'https://maps.app.goo.gl/YQcBWuneKEYe5mkPA',
  },
];

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
  // barra superior («Ambato y Pelileo») y en el pie.
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
