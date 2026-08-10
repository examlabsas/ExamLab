/** Formato corto usado en las tarjetas: "12 jul 2026". */
export function formatoFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(fecha)
    .replace(/\./g, '');
}

/** Formato largo para la cabecera del artículo: "12 de julio de 2026". */
export function formatoFechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
}

/** Valor para el atributo datetime de <time>. */
export function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
