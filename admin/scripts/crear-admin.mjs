/**
 * Crea el primer administrador del panel.
 *
 * No existe una ruta web de «alta inicial» a propósito: dejaría una ventana
 * entre el despliegue y el primer uso en la que quien la encontrara antes se
 * quedaría con el panel. Esto solo lo puede ejecutar quien ya tiene acceso a la
 * cuenta de Cloudflare.
 *
 *   npm run admin:crear
 *
 * No escribe en Cloudflare: deja el archivo preparado e imprime el comando, para
 * que se vea exactamente qué se va a guardar antes de guardarlo.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { webcrypto as crypto } from 'node:crypto';

const ITERACIONES = 310_000;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const aBase64 = (datos) => Buffer.from(datos).toString('base64');

async function cifrar(contrasena) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(contrasena),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' },
    clave,
    256,
  );
  return { sal: aBase64(sal), hash: aBase64(new Uint8Array(hash)), iteraciones: ITERACIONES };
}

function generarSecreto() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let salida = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) salida += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return salida;
}

const rl = createInterface({ input: stdin, output: stdout });

console.log('\n  Primer administrador del panel ExamLab\n');

const nombre = (await rl.question('  Nombre: ')).trim();
const correo = (await rl.question('  Correo: ')).trim().toLowerCase();
const contrasena = await rl.question('  Contraseña (mínimo 12 caracteres): ');
rl.close();

if (!nombre || !correo.includes('@')) {
  console.error('\n  Falta el nombre o el correo no es válido.\n');
  process.exit(1);
}
if (contrasena.length < 12) {
  console.error('\n  La contraseña debe tener al menos 12 caracteres.\n');
  process.exit(1);
}

const usuario = {
  correo,
  nombre,
  rol: 'administrador',
  clave: await cifrar(contrasena),
  totp: generarSecreto(),
  activo: true,
  creado: new Date().toISOString(),
};

const carpeta = mkdtempSync(join(tmpdir(), 'examlab-admin-'));
const archivo = join(carpeta, 'usuario.json');
writeFileSync(archivo, JSON.stringify(usuario));

const uri = `otpauth://totp/ExamLab:${encodeURIComponent(correo)}?secret=${usuario.totp}&issuer=ExamLab&algorithm=SHA1&digits=6&period=30`;

console.log(`
  ──────────────────────────────────────────────────────────────

  1. Guarde el usuario en Cloudflare:

     npx wrangler kv key put "usuario:${correo}" --path="${archivo}" --binding=PANEL --remote

     (quite --remote para probarlo primero en local con wrangler dev)

  2. Escanee este código en su aplicación de autenticación.
     Péguelo en un generador de QR, o escriba la clave a mano:

     Clave:  ${usuario.totp}

     ${uri}

  3. Borre el archivo temporal cuando termine:

     ${archivo}

  ──────────────────────────────────────────────────────────────

  La contraseña no se guarda en ninguna parte: lo que va a Cloudflare es
  el resultado de derivarla. Si la olvida, hay que repetir este proceso.
`);
