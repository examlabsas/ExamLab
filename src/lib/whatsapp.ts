/**
 * Enlaces de WhatsApp con mensaje precargado.
 *
 * Cada sección del sitio abre el chat con un texto distinto para que en
 * recepción se identifique de inmediato de dónde viene la consulta.
 */

/**
 * Número que recibe los mensajes, en formato internacional sin signos.
 * Es el que consta en el manual para pacientes del laboratorio (0963820177).
 */
export const WHATSAPP_NUMERO = '593963820177';

export const mensajes = {
  general: 'Hola ExamLab, quisiera información sobre sus servicios.',
  cita: 'Hola ExamLab, quiero agendar una cita para tomarme un examen. ¿Qué horarios tienen disponibles?',
  home: 'Hola ExamLab, vengo desde su página web y quiero agendar una cita.',
  servicios: 'Hola ExamLab, quiero conocer más sobre los servicios del laboratorio.',
  domicilio:
    'Hola ExamLab, quiero solicitar la toma de muestra a domicilio en Ambato. ¿Cómo agendo la visita?',
  chequeos:
    'Hola ExamLab, me interesa un chequeo preventivo. ¿Me indican qué incluye y el precio?',
  catalogo:
    'Hola ExamLab, estoy revisando el catálogo de exámenes y necesito ayuda para elegir el que necesito.',
  resultados:
    'Hola ExamLab, necesito ayuda para acceder a mis resultados en línea.',
  paciente:
    'Hola ExamLab, soy paciente y tengo una consulta sobre la preparación de mi examen.',
  profesional:
    'Hola, soy profesional de la salud y quiero información sobre convenios y envío de pacientes a ExamLab.',
  convenios:
    'Hola ExamLab, represento a una empresa/institución y quiero información sobre convenios corporativos.',
  medicos:
    'Hola, soy médico y quiero información sobre el convenio para profesionales que refieren pacientes a ExamLab.',
  laboratorios:
    'Hola ExamLab, represento a un laboratorio y quiero información sobre el convenio de laboratorios asociados.',
  califica:
    'Hola ExamLab, quiero contarles cómo fue mi experiencia en el laboratorio.',
  sedes: 'Hola ExamLab, quiero confirmar horarios y dirección de una de sus sedes.',
  emergencia:
    'Hola ExamLab, necesito un examen urgente con entrega el mismo día. ¿Es posible?',
  noticias:
    'Hola ExamLab, leí un artículo en su sitio web y quisiera hacer una consulta.',
  privacidad:
    'Hola ExamLab, tengo una consulta sobre el tratamiento de mis datos personales.',
} as const;

export type SeccionWhatsApp = keyof typeof mensajes;

/** Construye el enlace wa.me con el mensaje ya codificado. */
export function whatsappUrl(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace para una sección conocida del sitio. */
export function whatsappLink(seccion: SeccionWhatsApp = 'general'): string {
  return whatsappUrl(mensajes[seccion]);
}

/** Consulta sobre un examen puntual del catálogo. */
export function whatsappExamen(nombre: string, codigo?: string): string {
  const ref = codigo ? ` (código ${codigo})` : '';
  return whatsappUrl(
    `Hola ExamLab, quiero agendar el examen "${nombre}"${ref}. ¿Qué preparación necesito?`,
  );
}

/** Consulta dirigida a una sede concreta. */
export function whatsappSede(nombre: string): string {
  return whatsappUrl(
    `Hola ExamLab, quiero agendar una cita en la sede ${nombre}. ¿Qué disponibilidad tienen?`,
  );
}

/** Consulta a partir de un artículo del blog. */
export function whatsappNoticia(titulo: string): string {
  return whatsappUrl(
    `Hola ExamLab, leí el artículo "${titulo}" y tengo una consulta.`,
  );
}
