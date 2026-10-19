/**
 * Lo único que se usa del paquete `qrcode`.
 *
 * Se entra por el archivo interno y no por la puerta principal a propósito: esa
 * arrastra `pngjs` y `yargs` —el dibujo en PNG y la línea de órdenes— que en un
 * Worker no sirven de nada y hacen el paquete mucho más grande. Este archivo
 * solo depende de otros del mismo paquete.
 *
 * El precio de entrar por ahí es que no viene con tipos y que una versión nueva
 * podría mover el archivo. Por eso está escrito aquí lo que se espera de él, que
 * es poco: una matriz de módulos y su tamaño.
 */
declare module 'qrcode/lib/core/qrcode.js' {
  export type Matriz = {
    /** Lado del código en módulos, sin contar el margen. */
    size: number;
    /** Un byte por módulo, por filas. Distinto de cero es módulo oscuro. */
    data: Uint8Array;
  };

  export function create(
    datos: string,
    opciones?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; version?: number },
  ): { modules: Matriz; version: number };

  const _default: { create: typeof create };
  export default _default;
}
