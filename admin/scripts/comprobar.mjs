/**
 * Las dos comprobaciones del panel, en orden: los tipos y el empaquetado.
 *
 * El empaquetado está aquí porque **`tsc` no basta**, y eso costó tres averías
 * iguales. `ESTILOS` y `GUION` son plantillas de cadena de miles de líneas; un
 * acento invertido dentro de un comentario las cierra antes de tiempo. A veces
 * lo que queda detrás es TypeScript inválido y `tsc` protesta; otras veces es
 * válido —una plantilla etiquetada, por ejemplo— y `tsc` pasa limpio mientras
 * el Worker se niega a arrancar. La tercera vez fue así: `npm run check` en
 * verde y el panel caído.
 *
 * `wrangler deploy --dry-run` hace el mismo empaquetado que el despliegue y se
 * para antes de subir nada. No habla con Cloudflare, así que corre sin estar
 * autenticado y sin tocar producción.
 *
 * Va en un script y no encadenado con `&&` en package.json porque npm en
 * Windows lanza los scripts con PowerShell, y ahí `&&` es un error de sintaxis.
 *
 *   npm run check
 */
import { spawnSync } from 'node:child_process';

const pasos = [
  { nombre: 'Tipos', orden: 'tsc', args: ['--noEmit'] },
  {
    nombre: 'Empaquetado del Worker',
    orden: 'wrangler',
    args: ['deploy', '--dry-run', '--outdir', '.wrangler/comprobacion'],
  },
];

for (const paso of pasos) {
  process.stdout.write(`\n── ${paso.nombre} ──\n`);
  const { status } = spawnSync(paso.orden, paso.args, {
    stdio: 'inherit',
    shell: true,
  });
  if (status !== 0) {
    process.stdout.write(`\n✗ ${paso.nombre}: falló. No se sigue.\n`);
    process.exit(status ?? 1);
  }
}

process.stdout.write('\n✓ Tipos y empaquetado, los dos en orden.\n');
