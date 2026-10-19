/** Código TOTP del usuario de prueba. Mismo algoritmo que admin/src/auth/totp.ts. */
import { webcrypto as crypto } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRETO = process.argv[2] ?? 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

let bits = '';
for (const c of SECRETO.toUpperCase()) bits += BASE32.indexOf(c).toString(2).padStart(5, '0');
const bytes = new Uint8Array(Math.floor(bits.length / 8));
for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);

const clave = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-1' }, false, [
  'sign',
]);
const contador = new ArrayBuffer(8);
new DataView(contador).setBigUint64(0, BigInt(Math.floor(Date.now() / 30000)), false);
const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, contador));

const d = firma[firma.length - 1] & 0x0f;
const binario =
  ((firma[d] & 0x7f) << 24) | (firma[d + 1] << 16) | (firma[d + 2] << 8) | firma[d + 3];
console.log(String(binario % 1_000_000).padStart(6, '0'));
