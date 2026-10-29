/**
 * Usuarios del panel.
 *
 * Viven en KV y no en el código: dar de alta a alguien es rellenar un
 * formulario, no desplegar una versión nueva.
 *
 * El alta nunca pasa por una contraseña compartida. El administrador escribe un
 * correo, el panel genera un enlace de un solo uso, y esa persona elige su
 * propia contraseña y escanea su código. Nadie dicta contraseñas a nadie —que
 * es como acaban escritas en un papel pegado al monitor.
 */
import { cifrar, type ClaveGuardada } from './auth/password';
import { generarSecreto } from './auth/totp';

export type Rol = 'administrador' | 'editor';

export type Usuario = {
  correo: string;
  nombre: string;
  rol: Rol;
  clave: ClaveGuardada;
  /** Secreto TOTP en base32. */
  totp: string;
  activo: boolean;
  creado: string;
};

/** Lo que el panel enseña: nunca la clave ni el secreto. */
export type UsuarioPublico = Omit<Usuario, 'clave' | 'totp'>;

export const sinSecretos = (u: Usuario): UsuarioPublico => {
  const { clave: _clave, totp: _totp, ...resto } = u;
  return resto;
};

const clave = (correo: string) => `usuario:${correo.toLowerCase().trim()}`;

export async function obtener(kv: KVNamespace, correo: string): Promise<Usuario | null> {
  const crudo = await kv.get(clave(correo));
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as Usuario;
  } catch {
    return null;
  }
}

export async function guardar(kv: KVNamespace, usuario: Usuario) {
  await kv.put(clave(usuario.correo), JSON.stringify(usuario));
}

export async function listar(kv: KVNamespace): Promise<UsuarioPublico[]> {
  const lista = await kv.list({ prefix: 'usuario:' });
  const usuarios: UsuarioPublico[] = [];

  for (const k of lista.keys) {
    const crudo = await kv.get(k.name);
    if (!crudo) continue;
    try {
      usuarios.push(sinSecretos(JSON.parse(crudo) as Usuario));
    } catch {
      /* entrada ilegible: se ignora */
    }
  }

  return usuarios.sort((a, b) => a.correo.localeCompare(b.correo));
}

export async function hayAlguno(kv: KVNamespace): Promise<boolean> {
  const lista = await kv.list({ prefix: 'usuario:', limit: 1 });
  return lista.keys.length > 0;
}

/**
 * Crea el usuario con su contraseña y su secreto.
 *
 * Devuelve el secreto para enseñar el código QR una sola vez: a partir de ahí
 * queda guardado y no se vuelve a mostrar.
 */
export async function crear(
  kv: KVNamespace,
  datos: { correo: string; nombre: string; rol: Rol; contrasena: string },
): Promise<Usuario> {
  const usuario: Usuario = {
    correo: datos.correo.toLowerCase().trim(),
    nombre: datos.nombre.trim(),
    rol: datos.rol,
    clave: await cifrar(datos.contrasena),
    totp: generarSecreto(),
    activo: true,
    creado: new Date().toISOString(),
  };

  await guardar(kv, usuario);
  return usuario;
}

/**
 * Cambia la contraseña de alguien que ya existe, y nada más.
 *
 * No se reutiliza `crear` para esto: `crear` arma un usuario nuevo entero, así
 * que le borraría la fecha de alta, el rol y el estado a quien ya estaba. Un
 * restablecimiento cambia la contraseña; todo lo demás es la misma persona.
 */
export async function cambiarClave(
  kv: KVNamespace,
  correo: string,
  contrasena: string,
): Promise<Usuario | null> {
  const usuario = await obtener(kv, correo);
  if (!usuario) return null;

  const actualizado: Usuario = { ...usuario, clave: await cifrar(contrasena) };
  await guardar(kv, actualizado);
  return actualizado;
}

/* ─── Invitaciones ───────────────────────────────────────────────────────── */

export type Invitacion = {
  correo: string;
  nombre: string;
  rol: Rol;
  invitadoPor: string;
  /**
   * Un enlace de restablecimiento en vez de uno de alta.
   *
   * Es el mismo mecanismo —un testigo de un solo uso que caduca en 24 horas—
   * pero al gastarlo cambia la contraseña de quien ya existe en vez de crear a
   * nadie. Así se recupera un acceso perdido **sin borrar al usuario**, que era
   * lo único que se podía hacer antes y se llevaba por delante su rol y su
   * fecha de alta.
   */
  restablece?: boolean;
};

const HORAS_DE_INVITACION = 24;

const aBase64Url = (datos: Uint8Array) =>
  btoa(String.fromCharCode(...datos)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function invitar(kv: KVNamespace, datos: Invitacion): Promise<string> {
  const testigo = aBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  await kv.put(`invitacion:${testigo}`, JSON.stringify(datos), {
    expirationTtl: HORAS_DE_INVITACION * 3600,
  });
  return testigo;
}

export async function leerInvitacion(
  kv: KVNamespace,
  testigo: string,
): Promise<Invitacion | null> {
  const crudo = await kv.get(`invitacion:${testigo}`);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as Invitacion;
  } catch {
    return null;
  }
}

/** Se consume al usarla: un enlace de alta sirve una sola vez. */
export async function gastarInvitacion(kv: KVNamespace, testigo: string) {
  await kv.delete(`invitacion:${testigo}`);
}

export { HORAS_DE_INVITACION };
