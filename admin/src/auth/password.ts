/**
 * Derivación y verificación de contraseñas.
 *
 * PBKDF2-HMAC-SHA256 porque es lo que ofrece Web Crypto en Workers: bcrypt y
 * argon2 necesitarían WebAssembly y aquí no compensa. Con un número alto de
 * iteraciones es defensa suficiente para un panel de tres o cuatro personas.
 *
 * Nunca se guarda la contraseña: solo la sal y el resultado de derivarla. Si
 * alguien se llevara el almacén, no saca las contraseñas de ahí.
 */

/**
 * Techo de Workers, no la recomendación de OWASP.
 *
 * OWASP pide 310 000 para PBKDF2-HMAC-SHA256, y eso figuraba aquí hasta el
 * primer despliegue. `crypto.subtle` de Workers rechaza cualquier número por
 * encima de 100 000 con `NotSupportedError: iteration counts above 100000 are
 * not supported`, así que entrar fallaba con cualquier contraseña y el panel
 * respondía 500. No se vio antes porque `wrangler dev` no aplica ese tope: el
 * límite solo existe en producción.
 *
 * El número se guarda junto al hash, así que si Cloudflare lo levanta se puede
 * subir sin invalidar las contraseñas ya creadas: al verificar se usa aquel con
 * el que se derivó. Ese mismo rescate es lo que obliga a rehacer los usuarios
 * creados con 310 000 — su registro pide 310 000 al verificar y vuelve a fallar
 * aunque esta constante baje.
 *
 * Está repetido en `scripts/crear-admin.mjs` y en `pruebas/usuario.mjs`, que no
 * pueden importar este módulo. Si cambia aquí, cambia en los tres.
 */
export const ITERACIONES = 100_000;

const codificar = (texto: string) => new TextEncoder().encode(texto);

const aBase64 = (datos: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(datos)));

const deBase64 = (texto: string) =>
  Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function derivar(contrasena: string, sal: Uint8Array, iteraciones: number) {
  const clave = await crypto.subtle.importKey('raw', codificar(contrasena), 'PBKDF2', false, [
    'deriveBits',
  ]);

  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: iteraciones, hash: 'SHA-256' },
    clave,
    256,
  );
}

export type ClaveGuardada = {
  sal: string;
  hash: string;
  iteraciones: number;
};

/** Prepara una contraseña nueva para guardarla. */
export async function cifrar(contrasena: string): Promise<ClaveGuardada> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(contrasena, sal, ITERACIONES);
  return { sal: aBase64(sal.buffer), hash: aBase64(hash), iteraciones: ITERACIONES };
}

/**
 * Comparación en tiempo constante.
 *
 * Una comparación normal se detiene en el primer byte distinto, y ese tiempo
 * de más es medible: con suficientes intentos se puede adivinar el hash byte a
 * byte. Aquí siempre se recorre entero.
 */
function igualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i]! ^ b[i]!;
  return diferencia === 0;
}

/** `true` si la contraseña corresponde a lo guardado. */
export async function verificar(
  contrasena: string,
  guardada: ClaveGuardada,
): Promise<boolean> {
  const sal = deBase64(guardada.sal);
  const esperado = deBase64(guardada.hash);
  const obtenido = new Uint8Array(await derivar(contrasena, sal, guardada.iteraciones));
  return igualesEnTiempoConstante(obtenido, esperado);
}

/**
 * Reglas mínimas de la contraseña.
 *
 * Longitud por encima de todo: una frase larga resiste más que ocho caracteres
 * con símbolos, y además se recuerda. No se exigen mayúsculas ni signos porque
 * eso solo empuja a la gente hacia «Laboratorio1!», que es justo lo que primero
 * se prueba.
 */
export function revisarContrasena(contrasena: string): string | null {
  if (contrasena.length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
  if (contrasena.length > 200) return 'La contraseña es demasiado larga.';
  if (/^\s|\s$/.test(contrasena)) return 'La contraseña no puede empezar ni terminar con espacios.';
  return null;
}
