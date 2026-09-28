/**
 * Lista de exámenes que arma el paciente.
 *
 * Quien llega con una orden médica suele traer varios exámenes, y hoy tiene
 * que escribirlos uno por uno en WhatsApp o mandar una foto de la orden. Aquí
 * los va marcando mientras navega el catálogo y al final sale un solo mensaje
 * con todos, más la preparación combinada.
 *
 * La lista vive en `localStorage` porque el sitio es estático y porque debe
 * sobrevivir a entrar en una ficha y volver. Nunca sale del navegador de la
 * persona: no se envía a ningún lado hasta que ella pulsa el botón de
 * WhatsApp, y ahí va en el texto del mensaje, no a un servidor nuestro.
 *
 * Lo carga el navegador; no importa datos del catálogo.
 */

export type ExamenEnLista = {
  slug: string;
  nombre: string;
  /** Horas de ayuno; 0 si no requiere. */
  horas: number;
  /** Tipo de muestra, tal como lo entrega el laboratorio. */
  muestra: string;
};

const CLAVE = 'examlab:lista';

/** Avisa a todas las partes de la página que la lista cambió. */
export const EVENTO = 'examlab:lista-cambio';

export function leerLista(): ExamenEnLista[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    // Se filtra por forma y no por confianza: el contenido de localStorage lo
    // pudo dejar una versión anterior del sitio con otros campos.
    return datos.filter(
      (e): e is ExamenEnLista =>
        typeof e?.slug === 'string' && typeof e?.nombre === 'string',
    );
  } catch {
    // Navegación privada con el almacenamiento bloqueado: se sigue sin lista.
    return [];
  }
}

function guardar(lista: ExamenEnLista[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* Sin espacio o sin permiso: la lista vive solo en esta pantalla. */
  }
  document.dispatchEvent(new CustomEvent(EVENTO, { detail: lista }));
}

export function estaEnLista(slug: string): boolean {
  return leerLista().some((e) => e.slug === slug);
}

/** Añade o quita; devuelve `true` si quedó dentro. */
export function alternar(examen: ExamenEnLista): boolean {
  const lista = leerLista();
  const i = lista.findIndex((e) => e.slug === examen.slug);
  if (i >= 0) {
    lista.splice(i, 1);
    guardar(lista);
    return false;
  }
  lista.push(examen);
  guardar(lista);
  return true;
}

export function quitar(slug: string) {
  guardar(leerLista().filter((e) => e.slug !== slug));
}

export function vaciar() {
  guardar([]);
}

/**
 * Preparación combinada.
 *
 * El ayuno se toma el mayor de la lista: si un examen pide 12 horas y otro 8,
 * cumplir 12 cumple los dos. Las muestras se juntan sin repetir para que la
 * persona sepa si además de sangre tiene que traer orina.
 */
export function resumen(lista: ExamenEnLista[]) {
  const horas = Math.max(0, ...lista.map((e) => e.horas || 0));
  const muestras = [...new Set(lista.map((e) => e.muestra).filter(Boolean))];
  return { horas, muestras };
}

/** Texto del mensaje de WhatsApp con la lista completa. */
export function mensajeWhatsApp(lista: ExamenEnLista[]): string {
  const { horas } = resumen(lista);
  const lineas = [
    'Hola ExamLab, quiero agendar estos exámenes:',
    '',
    ...lista.map((e) => `• ${e.nombre}`),
    '',
    horas > 0
      ? `Entiendo que necesito ${horas} horas de ayuno.`
      : 'Entiendo que no necesito ayuno.',
    '¿Me confirman el valor y si debo preparar algo más?',
  ];
  return lineas.join('\n');
}
