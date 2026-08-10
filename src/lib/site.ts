/**
 * Datos únicos del negocio.
 * Todo lo que aparece repetido en el sitio (teléfonos, direcciones, horarios,
 * menú) sale de aquí para que se edite en un solo lugar.
 *
 * FASE 1 (diseño): los valores marcados como PROVISIONAL son de maquetación y
 * deben reemplazarse con los datos reales que entregue el laboratorio.
 */

export const site = {
  nombre: 'ExamLab',
  razonSocial: 'ExamLab S.A.S.',
  claim: 'Laboratorio clínico de innovación y desarrollo',
  descripcion:
    'Laboratorio clínico en Ambato y Pelileo con tecnología de análisis moderna, personal profesional y entrega oportuna de resultados.',
  url: 'https://www.examlab.ec', // PROVISIONAL: dominio por definir
  email: 'info@examlab.ec', // PROVISIONAL
  telefono: '(03) 242 8899', // PROVISIONAL
  telefonoE164: '+59332428899', // PROVISIONAL
  emergencias: '0999 123 456', // PROVISIONAL
  emergenciasE164: '+593999123456', // PROVISIONAL
  ciudad: 'Ambato',
  provincia: 'Tungurahua',
  pais: 'Ecuador',
  horarioResumen: 'Lun a Sáb · 06:30 – 19:00',
  fundacion: '2008', // PROVISIONAL
  redes: {
    facebook: 'https://facebook.com/examlab',
    instagram: 'https://instagram.com/examlab',
    tiktok: 'https://tiktok.com/@examlab',
  },
  /** Sistema de resultados del laboratorio (proveedor externo). */
  avalab: 'https://avalab.examlab.ec', // PROVISIONAL: URL real de Avalab
  portalProfesional: 'https://avalab.examlab.ec', // PROVISIONAL
  /**
   * Accesos de laboratorios asociados. Avalab todavía no está implementado:
   * cuando el proveedor entregue las URL definitivas se reemplazan aquí y los
   * enlaces del sitio quedan actualizados.
   */
  avalabOrden: 'https://avalab.examlab.ec/ingresar-orden', // PROVISIONAL
  avalabResultados: 'https://avalab.examlab.ec/resultados', // PROVISIONAL
  /** Mientras Avalab no exista, los enlaces avisan que está en implementación. */
  avalabDisponible: false,
  /** Enlace directo al formulario de reseña de Google Business Profile. */
  resenasGoogle: 'https://search.google.com/local/writereview?placeid=PLACE_ID', // PROVISIONAL
  /** Manual de Servicios en PDF (lo entrega el laboratorio). */
  manualServicios: '/descargas/manual-de-servicios-examlab.pdf',
} as const;

/** Zona horaria del laboratorio. Ecuador continental no cambia de hora. */
export const ZONA_HORARIA = 'America/Guayaquil';

/** Franja de atención de un día, o `null` si ese día está cerrado. */
export type Franja = { abre: string; cierra: string } | null;

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

  for (const dia of ORDEN_SEMANA) {
    const franja = semana[dia]!;
    const ultimo = grupos[grupos.length - 1];
    const mismoHorario =
      ultimo &&
      ((ultimo.franja === null && franja === null) ||
        (ultimo.franja !== null &&
          franja !== null &&
          ultimo.franja.abre === franja.abre &&
          ultimo.franja.cierra === franja.cierra));

    if (mismoHorario) ultimo.hasta = dia;
    else grupos.push({ desde: dia, hasta: dia, franja });
  }

  return grupos.map((g) => ({
    dias:
      g.desde === g.hasta
        ? DIAS[g.desde]!
        : `${DIAS[g.desde]} a ${DIAS[g.hasta]!.toLowerCase()}`,
    horas: g.franja ? `${g.franja.abre} – ${g.franja.cierra}` : 'Cerrado',
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
};

// Horarios estructurados. Índice 0 = domingo, 6 = sábado.
const horarioMatriz: HorarioSemanal = [
  null, // domingo
  { abre: '06:30', cierra: '19:00' },
  { abre: '06:30', cierra: '19:00' },
  { abre: '06:30', cierra: '19:00' },
  { abre: '06:30', cierra: '19:00' },
  { abre: '06:30', cierra: '19:00' },
  { abre: '07:00', cierra: '13:00' }, // sábado
];

const horarioPelileo: HorarioSemanal = [
  null,
  { abre: '07:00', cierra: '18:00' },
  { abre: '07:00', cierra: '18:00' },
  { abre: '07:00', cierra: '18:00' },
  { abre: '07:00', cierra: '18:00' },
  { abre: '07:00', cierra: '18:00' },
  { abre: '07:00', cierra: '12:30' },
];

export const sedes: Sede[] = [
  {
    slug: 'ambato-matriz',
    nombre: 'Matriz Ambato',
    etiqueta: 'Matriz',
    direccion: 'Av. Rodrigo Pachano y Reina Claudia',
    referencia: 'Sector Ficoa, junto al parque',
    ciudad: 'Ambato',
    provincia: 'Tungurahua',
    telefono: '(03) 242 8899', // PROVISIONAL
    telefonoE164: '+59332428899',
    horarioSemanal: horarioMatriz,
    horarios: horariosLegibles(horarioMatriz),
    notaHorario: 'Domingos y feriados: solo urgencias coordinadas por teléfono.',
    servicios: [
      'Toma de muestra general',
      'Exámenes urgentes',
      'Toma de muestra a domicilio',
      'Atención pediátrica',
    ],
    geo: { lat: -1.2606, lng: -78.6266 }, // PROVISIONAL
  },
  {
    slug: 'pelileo',
    nombre: 'Sede Pelileo',
    direccion: 'Dirección por confirmar', // PROVISIONAL
    ciudad: 'Pelileo',
    provincia: 'Tungurahua',
    telefono: '(03) 242 8890', // PROVISIONAL
    telefonoE164: '+59332428890',
    horarioSemanal: horarioPelileo,
    horarios: horariosLegibles(horarioPelileo),
    servicios: [
      'Toma de muestra general',
      'Toma de muestra a domicilio',
      'Chequeos preventivos',
    ],
    geo: { lat: -1.3299, lng: -78.5423 }, // PROVISIONAL
  },
];

/** URL del mapa embebido de Google Maps (no requiere API key). */
export function mapaEmbed(sede: Sede): string {
  const consulta = encodeURIComponent(
    `${sede.direccion}, ${sede.ciudad}, ${sede.provincia}, Ecuador`,
  );
  return `https://maps.google.com/maps?q=${consulta}&z=16&output=embed`;
}

/** URL para abrir la ubicación en la app de mapas del usuario. */
export function mapaEnlace(sede: Sede): string {
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
    hijos: [
      {
        label: 'Pedir cita',
        href: '/soy-paciente/pedir-cita',
        descripcion: 'Agende por WhatsApp en dos pasos',
      },
      {
        label: 'Resultados',
        href: '/soy-paciente/resultados',
        descripcion: 'Cómo acceder al sistema Avalab',
      },
      {
        label: 'Puntos de atención',
        href: '/sedes',
        descripcion: 'Direcciones, mapas y horarios',
      },
      {
        label: 'Guía para pacientes',
        href: '/soy-paciente#guia',
        descripcion: 'Recomendaciones antes de su examen',
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
    hijos: [
      {
        label: 'Catálogo de Exámenes',
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
    hijos: [
      {
        label: 'Ingresar orden',
        href: '/laboratorios-asociados#ingresar-orden',
        descripcion: 'Registre una orden en el sistema Avalab',
      },
      {
        label: 'Catálogo laboratorios',
        href: '/laboratorios-asociados/catalogo',
        descripcion: 'Cartera de pruebas para laboratorios',
      },
      {
        label: 'Resultados',
        href: '/laboratorios-asociados#resultados',
        descripcion: 'Consulte resultados en Avalab',
      },
    ],
  },
  { label: 'Noticias', href: '/noticias' },
  { label: 'Sedes', href: '/sedes' },
];

export const footerEnlaces: NavLink[] = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Catálogo de exámenes', href: '/catalogo' },
  { label: 'Soy paciente', href: '/soy-paciente' },
  { label: 'Soy profesional', href: '/soy-profesional' },
  { label: 'Noticias', href: '/noticias' },
];

export const footerServicios: NavLink[] = [
  { label: 'Pedir cita', href: '/soy-paciente/pedir-cita' },
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
