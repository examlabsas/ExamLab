/**
 * Crea el usuario de prueba del panel en el KV **local**.
 *
 * Nada de esto sirve en producción: la contraseña y el secreto del código están
 * escritos aquí a la vista, y el comando lleva `--local` fijo, así que solo toca
 * el almacén que `wrangler dev` guarda en `admin/.wrangler/`. Para el panel de
 * verdad está `npm run admin:crear`, que pide los datos y no guarda nada por su
 * cuenta.
 *
 *   npm run pruebas:usuario
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { webcrypto as crypto } from 'node:crypto';

export const CORREO = 'prueba@examlabsas.com';
export const CONTRASENA = 'laboratorio-2026';
/** Fijo a propósito, para poder generar el código desde `pruebas/codigo.mjs`. */
export const SECRETO = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

const ITERACIONES = 310_000;
const aBase64 = (datos) => Buffer.from(datos).toString('base64');

const sal = crypto.getRandomValues(new Uint8Array(16));
const clave = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(CONTRASENA),
  'PBKDF2',
  false,
  ['deriveBits'],
);
const hash = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' },
  clave,
  256,
);

const usuario = {
  correo: CORREO,
  nombre: 'Usuario de prueba',
  rol: 'administrador',
  clave: { sal: aBase64(sal), hash: aBase64(new Uint8Array(hash)), iteraciones: ITERACIONES },
  totp: SECRETO,
  activo: true,
  creado: new Date().toISOString(),
};

const aqui = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const archivo = join(aqui, 'usuario-temporal.json');
writeFileSync(archivo, JSON.stringify(usuario));

// Se llama al wrangler instalado con el mismo Node, sin pasar por `npx` ni por
// una shell: en Windows lanzar el .cmd directamente da EINVAL, y hacerlo con
// `shell: true` concatena los argumentos sin escaparlos.
const resultado = spawnSync(
  process.execPath,
  [
    join(dirname(aqui), 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'kv',
    'key',
    'put',
    `usuario:${CORREO}`,
    `--path=${archivo}`,
    '--binding=PANEL',
    '--local',
  ],
  { cwd: dirname(aqui), stdio: 'inherit' },
);

unlinkSync(archivo);

if (resultado.status !== 0) {
  console.error('\n  No se pudo guardar en el KV local. ¿Está instalado wrangler? (npm install)\n');
  process.exit(1);
}

console.log(`
  ──────────────────────────────────────────────────────────────
  Usuario de prueba listo, solo en el KV local.

    Correo      ${CORREO}
    Contraseña  ${CONTRASENA}
    Código      npm run pruebas:codigo

  O escanee esta clave en su aplicación de autenticación para
  entrar como lo hará el laboratorio:

    ${SECRETO}
  ──────────────────────────────────────────────────────────────
`);
