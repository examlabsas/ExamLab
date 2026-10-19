/**
 * Códigos de un solo uso de aplicación de autenticación (TOTP, RFC 6238).
 *
 * Es el segundo paso del acceso. La contraseña sola viaja por WhatsApp, se
 * apunta en un papel y se repite en otros sitios; el código cambia cada treinta
 * segundos y vive solo en el teléfono de quien entra.
 *
 * HMAC-SHA1 y 6 dígitos porque es lo que esperan Google Authenticator, Authy y
 * las demás. No es elección de seguridad: es la que hace que funcione con la
 * aplicación que la persona ya tenga.
 */

const PASO_SEGUNDOS = 30;
const DIGITOS = 6;

/** Alfabeto base32 del RFC 4648, que es el que usan los códigos QR de TOTP. */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generarSecreto(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');

  let salida = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    salida += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return salida;
}

function deBase32(texto: string): Uint8Array {
  const limpio = texto.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = '';
  for (const c of limpio) {
    const valor = BASE32.indexOf(c);
    if (valor === -1) throw new Error('Secreto inválido');
    bits += valor.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function codigoDelPaso(secreto: string, paso: number): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    deBase32(secreto) as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  // El contador va como entero de 8 bytes, big-endian.
  const contador = new ArrayBuffer(8);
  new DataView(contador).setBigUint64(0, BigInt(paso), false);

  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, contador));

  // Truncado dinámico del RFC 4226: el último nibble dice dónde empezar.
  const desplazamiento = firma[firma.length - 1]! & 0x0f;
  const binario =
    ((firma[desplazamiento]! & 0x7f) << 24) |
    (firma[desplazamiento + 1]! << 16) |
    (firma[desplazamiento + 2]! << 8) |
    firma[desplazamiento + 3]!;

  return (binario % 10 ** DIGITOS).toString().padStart(DIGITOS, '0');
}

/**
 * Comprueba el código.
 *
 * Se aceptan también el paso anterior y el siguiente: el reloj del teléfono
 * casi nunca va exacto, y sin ese margen la gente teclea un código correcto y
 * el panel lo rechaza. Noventa segundos de ventana total es la práctica
 * habitual y no debilita nada en la práctica.
 */
export async function verificarCodigo(secreto: string, codigo: string): Promise<boolean> {
  const limpio = codigo.replace(/\D/g, '');
  if (limpio.length !== DIGITOS) return false;

  const ahora = Math.floor(Date.now() / 1000 / PASO_SEGUNDOS);
  for (const desvio of [-1, 0, 1]) {
    if (await codigoDelPaso(secreto, ahora + desvio) === limpio) return true;
  }
  return false;
}

/**
 * URI que se convierte en código QR para que la persona lo escanee una vez.
 *
 * El secreto viaja dentro, así que esta cadena solo se muestra en el alta y
 * nunca se vuelve a enseñar ni se registra en ningún sitio.
 */
export function uriParaQr(correo: string, secreto: string): string {
  const emisor = encodeURIComponent('ExamLab');
  const cuenta = encodeURIComponent(correo);
  return `otpauth://totp/${emisor}:${cuenta}?secret=${secreto}&issuer=${emisor}&algorithm=SHA1&digits=${DIGITOS}&period=${PASO_SEGUNDOS}`;
}
