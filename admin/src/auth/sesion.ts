/**
 * Sesiones y control de intentos.
 *
 * La sesión es un testigo opaco guardado en KV, no un token firmado que se
 * valide solo. Es a propósito: con un testigo en el servidor, cerrar la sesión
 * de alguien es borrar una clave y queda fuera en el acto. Con un token
 * autovalidado habría que esperar a que caduque o llevar una lista negra, que
 * es el mismo trabajo con más piezas.
 */

const HORAS_DE_SESION = 8;
const COOKIE = 'examlab_panel';

export type Sesion = {
  correo: string;
  rol: 'administrador' | 'editor';
  creada: number;
};

const aBase64Url = (datos: Uint8Array) =>
  btoa(String.fromCharCode(...datos)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Crea la sesión y devuelve el testigo que viaja en la cookie. */
export async function abrirSesion(
  kv: KVNamespace,
  correo: string,
  rol: Sesion['rol'],
): Promise<string> {
  const testigo = aBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const sesion: Sesion = { correo, rol, creada: Date.now() };

  await kv.put(`sesion:${testigo}`, JSON.stringify(sesion), {
    expirationTtl: HORAS_DE_SESION * 3600,
  });

  return testigo;
}

export async function leerSesion(kv: KVNamespace, testigo: string | undefined) {
  if (!testigo) return null;
  const crudo = await kv.get(`sesion:${testigo}`);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as Sesion;
  } catch {
    return null;
  }
}

export async function cerrarSesion(kv: KVNamespace, testigo: string | undefined) {
  if (testigo) await kv.delete(`sesion:${testigo}`);
}

/** Cierra todas las sesiones de una persona. Se usa al desactivarla. */
export async function cerrarSesionesDe(kv: KVNamespace, correo: string) {
  const lista = await kv.list({ prefix: 'sesion:' });
  for (const clave of lista.keys) {
    const crudo = await kv.get(clave.name);
    if (!crudo) continue;
    try {
      if ((JSON.parse(crudo) as Sesion).correo === correo) await kv.delete(clave.name);
    } catch {
      /* una sesión ilegible se ignora: caducará sola */
    }
  }
}

/**
 * Cabecera de la cookie.
 *
 * `HttpOnly` para que ningún script pueda leerla, `Secure` para que no viaje
 * sin cifrar y `SameSite=Strict` para que no se envíe desde otro sitio: sin eso,
 * una página cualquiera podría provocar acciones en el panel con la sesión de
 * quien la visite.
 */
export function cookieDeSesion(testigo: string, segura = true): string {
  const partes = [
    `${COOKIE}=${testigo}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${HORAS_DE_SESION * 3600}`,
  ];
  if (segura) partes.push('Secure');
  return partes.join('; ');
}

export function cookieVacia(segura = true): string {
  const partes = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (segura) partes.push('Secure');
  return partes.join('; ');
}

export function testigoDeCookie(cabecera: string | undefined): string | undefined {
  if (!cabecera) return undefined;
  for (const trozo of cabecera.split(';')) {
    const [nombre, ...resto] = trozo.trim().split('=');
    if (nombre === COOKIE) return resto.join('=') || undefined;
  }
  return undefined;
}

/* ─── Intentos fallidos ──────────────────────────────────────────────────── */

const MAXIMO_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

/**
 * Cuenta por correo y por IP a la vez.
 *
 * Solo por correo, alguien bloquea a una persona a propósito probando
 * contraseñas con su dirección. Solo por IP, un ataque repartido entre muchas
 * direcciones no se frena. Las dos cuentas juntas cubren los dos casos.
 */
export async function intentosAgotados(
  kv: KVNamespace,
  correo: string,
  ip: string,
): Promise<boolean> {
  const cuentas = await Promise.all([
    kv.get(`intentos:correo:${correo.toLowerCase()}`),
    kv.get(`intentos:ip:${ip}`),
  ]);
  return cuentas.some((c) => Number(c ?? 0) >= MAXIMO_INTENTOS);
}

export async function apuntarFallo(kv: KVNamespace, correo: string, ip: string) {
  for (const clave of [`intentos:correo:${correo.toLowerCase()}`, `intentos:ip:${ip}`]) {
    const actual = Number((await kv.get(clave)) ?? 0);
    await kv.put(clave, String(actual + 1), { expirationTtl: BLOQUEO_MINUTOS * 60 });
  }
}

export async function limpiarIntentos(kv: KVNamespace, correo: string, ip: string) {
  await Promise.all([
    kv.delete(`intentos:correo:${correo.toLowerCase()}`),
    kv.delete(`intentos:ip:${ip}`),
  ]);
}

export { BLOQUEO_MINUTOS, HORAS_DE_SESION };
