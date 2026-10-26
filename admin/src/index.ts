/**
 * Panel de administración de ExamLab.
 *
 * Fase 1: la puerta. Todavía no edita nada del sitio — solo deja entrar y
 * gestiona quién puede hacerlo. Las secciones llegan en las fases siguientes.
 *
 * Va en un Worker aparte del sitio a propósito: si esto se rompe, la página
 * por la que los pacientes consultan sus resultados sigue publicándose.
 */
import { Hono } from 'hono';

import { verificar, revisarContrasena } from './auth/password';
import {
  abrirSesion,
  leerSesion,
  cerrarSesion,
  cerrarSesionesDe,
  cookieDeSesion,
  cookieVacia,
  testigoDeCookie,
  intentosAgotados,
  apuntarFallo,
  limpiarIntentos,
  BLOQUEO_MINUTOS,
  type Sesion,
} from './auth/sesion';
import {
  obtener,
  guardar,
  listar,
  crear,
  invitar,
  leerInvitacion,
  gastarInvitacion,
  type Rol,
} from './usuarios';
import { paginaAcceso, paginaInvitacion, paginaPanel } from './paginas/acceso';
import { paginaFallo } from './paginas/plantilla';
import { paginaUsuarios } from './paginas/usuarios';
import {
  paginaNoticias,
  paginaNoticia,
  paginaAviso,
  paginaEstado,
} from './paginas/contenido';
import * as noticias from './noticias';
import * as sitio from './sitio';
import * as catalogo from './catalogo';
import * as importar from './importar';
import * as importarAsoc from './importar-asociados';
import * as asociados from './asociados';
import { esSeccion } from './historial';
import * as qr from './qr';
import { paginaQr } from './paginas/qr';
import { paginaContacto, paginaSedes, paginaSede, paginaFeriados } from './paginas/datos';
import {
  paginaCatalogo,
  paginaExamen,
  paginaImportar,
  paginaColumnas,
  paginaResumen,
} from './paginas/catalogo';
import { paginaAsociados, paginaPrueba } from './paginas/asociados';
import {
  paginaImportarAsociados,
  paginaColumnasAsociados,
  paginaResumenAsociados,
} from './paginas/importar-asociados';
import { leerArchivo, escribirArchivo, ultimosCommits, ErrorGitHub, type Config } from './github';

type Entorno = {
  Bindings: {
    PANEL: KVNamespace;
    REPO: string;
    RAMA: string;
    GITHUB_TOKEN: string;
    /** Solo para pruebas en local. Vacío en producción. */
    GITHUB_API?: string;
  };
  Variables: { sesion: Sesion };
};

/** Config de GitHub a partir del entorno del Worker. */
const github = (env: Entorno['Bindings']): Config => ({
  token: env.GITHUB_TOKEN,
  repo: env.REPO,
  rama: env.RAMA,
  api: env.GITHUB_API,
});

/**
 * Traduce un fallo de GitHub a algo que se pueda leer.
 *
 * Importa porque el caso frecuente no es un error de programación, sino dos
 * personas editando lo mismo: eso hay que contarlo, no esconderlo detrás de un
 * «error inesperado».
 */
const motivo = (e: unknown, siNoSeSabe = 'No se pudo guardar. Inténtelo de nuevo.'): string =>
  e instanceof ErrorGitHub ? e.message : siNoSeSabe;

/**
 * El respaldo de las pantallas que solo leen.
 *
 * El respaldo de `motivo` habla de guardar, que es lo que hace casi todo el
 * panel. En una pantalla que únicamente lee —el listado de noticias, el
 * historial— eso le dice a la persona que se perdió algo que ni siquiera
 * intentó escribir.
 */
const AL_LEER = 'No se pudo leer el repositorio. Vuelva a intentarlo en un momento.';

const app = new Hono<Entorno>();

/**
 * `Secure` solo tiene sentido sobre https. Se mira el protocolo y no el nombre
 * del host: `wrangler dev` sirve en 127.0.0.1 unas veces y en localhost otras,
 * y comprobar el nombre deja fuera uno de los dos casos.
 */
const sinCifrar = (url: string) => new URL(url).protocol === 'http:';

const ipDe = (c: { req: { header: (n: string) => string | undefined } }) =>
  c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

/* ─── Cabeceras ──────────────────────────────────────────────────────────── */

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  // El panel no carga absolutamente nada de fuera. El código QR del segundo
  // factor se dibujaba pidiéndoselo a un servicio externo, al que iba el secreto
  // dentro de la URL; ahora se genera aquí y esa excepción desapareció.
  //
  // `data:` en img-src no es una puerta a terceros: sigue siendo contenido que
  // sale de este Worker. Hace falta porque dos imágenes son datos y no archivos
  // —la flecha de los desplegables y el emblema del centro de los QR—, y el
  // emblema tiene que ir incrustado para que el SVG descargado llegue entero a
  // la imprenta. Con `'self'` a secas el navegador las bloqueaba las dos: los
  // desplegables se quedaban sin flecha y el QR de la pantalla salía sin
  // emblema, distinto del que se descargaba.
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
});

app.get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'));

/* ─── Guardas ────────────────────────────────────────────────────────────── */

async function exigirSesion(c: any, next: () => Promise<void>) {
  const testigo = testigoDeCookie(c.req.header('Cookie'));
  const sesion = await leerSesion(c.env.PANEL, testigo);
  if (!sesion) return c.redirect('/', 302);

  // La sesión guarda el rol, pero el usuario pudo desactivarse después.
  const usuario = await obtener(c.env.PANEL, sesion.correo);
  if (!usuario?.activo) {
    await cerrarSesion(c.env.PANEL, testigo);
    return c.redirect('/', 302);
  }

  c.set('sesion', { ...sesion, rol: usuario.rol });
  await next();
}

async function exigirAdministrador(c: any, next: () => Promise<void>) {
  if (c.get('sesion').rol !== 'administrador') return c.text('No tiene permiso.', 403);
  await next();
}

/* ─── Acceso ─────────────────────────────────────────────────────────────── */

app.get('/', async (c) => {
  const sesion = await leerSesion(c.env.PANEL, testigoDeCookie(c.req.header('Cookie')));
  if (!sesion) return c.html(paginaAcceso());

  const usuario = await obtener(c.env.PANEL, sesion.correo);
  if (!usuario?.activo) return c.html(paginaAcceso());

  return c.html(
    paginaPanel({ sesion: { correo: usuario.correo, rol: usuario.rol }, nombre: usuario.nombre }),
  );
});

app.post('/entrar', async (c) => {
  const cuerpo = await c.req.parseBody();
  const correo = String(cuerpo.correo ?? '').toLowerCase().trim();
  const contrasena = String(cuerpo.contrasena ?? '');
  const ip = ipDe(c);

  if (await intentosAgotados(c.env.PANEL, correo, ip)) {
    return c.html(
      paginaAcceso({
        correo,
        error: `Demasiados intentos. Vuelva a probar en ${BLOQUEO_MINUTOS} minutos.`,
      }),
      429,
    );
  }

  const usuario = await obtener(c.env.PANEL, correo);

  /*
    Un único mensaje para todos los fallos. Si el panel dijera «ese correo no
    existe», estaría regalando la lista de quién tiene acceso.

    Aquí se pedía además un código de seis cifras de una aplicación de
    autenticación. El laboratorio pidió quitarlo. Lo que queda protegiendo la
    puerta es la contraseña —derivada con PBKDF2 y 310 000 iteraciones—, el
    límite de cinco intentos por correo y por IP, y que la sesión sea un
    testigo revocable en el KV. El secreto de cada usuario se sigue guardando,
    así que volver a pedirlo es restaurar esta comprobación y el campo del
    formulario, no rehacer el sistema.
  */
  const claveOk = usuario ? await verificar(contrasena, usuario.clave) : false;

  if (!usuario || !usuario.activo || !claveOk) {
    await apuntarFallo(c.env.PANEL, correo, ip);
    return c.html(paginaAcceso({ correo, error: 'Datos incorrectos.' }), 401);
  }

  await limpiarIntentos(c.env.PANEL, correo, ip);
  const testigo = await abrirSesion(c.env.PANEL, usuario.correo, usuario.rol);
  c.header('Set-Cookie', cookieDeSesion(testigo, !sinCifrar(c.req.url)));
  return c.redirect('/', 302);
});

app.get('/salir', async (c) => {
  await cerrarSesion(c.env.PANEL, testigoDeCookie(c.req.header('Cookie')));
  c.header('Set-Cookie', cookieVacia(!sinCifrar(c.req.url)));
  return c.redirect('/', 302);
});

/* ─── Invitaciones ───────────────────────────────────────────────────────── */

app.get('/invitacion/:testigo', async (c) => {
  const testigo = c.req.param('testigo');
  const invitacion = await leerInvitacion(c.env.PANEL, testigo);
  if (!invitacion) return c.text('Este enlace ya no sirve. Pida uno nuevo.', 410);

  return c.html(
    paginaInvitacion({ testigo, correo: invitacion.correo, nombre: invitacion.nombre }),
  );
});

app.post('/invitacion/:testigo', async (c) => {
  const testigo = c.req.param('testigo');
  const invitacion = await leerInvitacion(c.env.PANEL, testigo);
  if (!invitacion) return c.text('Este enlace ya no sirve. Pida uno nuevo.', 410);

  const cuerpo = await c.req.parseBody();
  const contrasena = String(cuerpo.contrasena ?? '');
  const repetir = String(cuerpo.repetir ?? '');

  const problema =
    contrasena !== repetir ? 'Las dos contraseñas no coinciden.' : revisarContrasena(contrasena);

  if (problema) {
    return c.html(
      paginaInvitacion({
        testigo,
        correo: invitacion.correo,
        nombre: invitacion.nombre,
        error: problema,
      }),
      400,
    );
  }

  const usuario = await crear(c.env.PANEL, {
    correo: invitacion.correo,
    nombre: invitacion.nombre,
    rol: invitacion.rol,
    contrasena,
  });

  await gastarInvitacion(c.env.PANEL, testigo);

  /*
    Antes aquí venía una pantalla más: el código QR para la aplicación de
    autenticación. Sin segundo factor no hay nada que escanear, así que la
    persona entra directamente con la contraseña que acaba de elegir.
  */
  const sesion = await abrirSesion(c.env.PANEL, usuario.correo, usuario.rol);
  c.header('Set-Cookie', cookieDeSesion(sesion, !sinCifrar(c.req.url)));
  return c.redirect('/', 302);
});

/* ─── Usuarios ───────────────────────────────────────────────────────────── */

app.get('/usuarios', exigirSesion, exigirAdministrador, async (c) => {
  return c.html(
    paginaUsuarios({
      sesion: c.get('sesion'),
      usuarios: await listar(c.env.PANEL),
    }),
  );
});

app.post('/usuarios/invitar', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const correo = String(cuerpo.correo ?? '').toLowerCase().trim();
  const nombre = String(cuerpo.nombre ?? '').trim();
  const rol = (String(cuerpo.rol ?? 'editor') === 'administrador'
    ? 'administrador'
    : 'editor') as Rol;

  const error = !correo || !nombre
    ? 'Hacen falta el nombre y el correo.'
    : (await obtener(c.env.PANEL, correo))
      ? 'Ya existe un usuario con ese correo.'
      : undefined;

  if (error) {
    return c.html(
      paginaUsuarios({
        sesion: c.get('sesion'),
        usuarios: await listar(c.env.PANEL),
        error,
      }),
      400,
    );
  }

  const testigo = await invitar(c.env.PANEL, {
    correo,
    nombre,
    rol,
    invitadoPor: c.get('sesion').correo,
  });

  return c.html(
    paginaUsuarios({
      sesion: c.get('sesion'),
      usuarios: await listar(c.env.PANEL),
      enlaceNuevo: new URL(`/invitacion/${testigo}`, c.req.url).toString(),
    }),
  );
});

app.post('/usuarios/estado', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const correo = String(cuerpo.correo ?? '').toLowerCase().trim();
  const activo = String(cuerpo.activo ?? '') === 'si';

  // Nadie se desactiva a sí mismo: dejaría el panel sin quien lo administre.
  if (correo === c.get('sesion').correo) {
    return c.html(
      paginaUsuarios({
        sesion: c.get('sesion'),
        usuarios: await listar(c.env.PANEL),
        error: 'No puede desactivar su propio acceso.',
      }),
      400,
    );
  }

  const usuario = await obtener(c.env.PANEL, correo);
  if (usuario) {
    usuario.activo = activo;
    await guardar(c.env.PANEL, usuario);
    // Al desactivar, sus sesiones mueren en el acto.
    if (!activo) await cerrarSesionesDe(c.env.PANEL, correo);
  }

  return c.redirect('/usuarios', 302);
});

/* ─── Noticias ───────────────────────────────────────────────────────────── */

app.get('/noticias', exigirSesion, async (c) => {
  try {
    return c.html(
      paginaNoticias({
        sesion: c.get('sesion'),
        noticias: await noticias.listar(github(c.env)),
        guardado: c.req.query('ok') === '1',
      }),
    );
  } catch (e) {
    return c.html(
      paginaNoticias({ sesion: c.get('sesion'), noticias: [], aviso: motivo(e, AL_LEER) }),
      502,
    );
  }
});

app.get('/noticias/nueva', exigirSesion, (c) =>
  c.html(
    paginaNoticia({
      sesion: c.get('sesion'),
      esNueva: true,
      noticia: {
        fecha: new Date().toISOString().slice(0, 10),
        autor: 'Equipo ExamLab',
        borrador: true,
      },
    }),
  ),
);

/** Lee el formulario y lo convierte en una noticia. */
async function noticiaDelFormulario(c: any, slug?: string): Promise<noticias.Noticia> {
  const cuerpo = await c.req.parseBody();
  const titulo = String(cuerpo.titulo ?? '').trim();
  return {
    slug: slug ?? noticias.aSlug(titulo),
    titulo,
    descripcion: String(cuerpo.descripcion ?? '').trim(),
    categoria: String(cuerpo.categoria ?? '').trim(),
    fecha: String(cuerpo.fecha ?? '').trim(),
    autor: String(cuerpo.autor ?? 'Equipo ExamLab').trim() || 'Equipo ExamLab',
    foto: String(cuerpo.foto ?? '') || undefined,
    destacado: cuerpo.destacado === 'si',
    borrador: cuerpo.borrador === 'si',
    cuerpo: String(cuerpo.cuerpo ?? ''),
    sha: String(cuerpo.sha ?? '') || undefined,
  };
}

app.post('/noticias/nueva', exigirSesion, async (c) => {
  const noticia = await noticiaDelFormulario(c);
  const error = !noticia.slug ? 'El título no da un nombre de archivo válido.' : noticias.revisar(noticia);

  if (error) {
    return c.html(
      paginaNoticia({ sesion: c.get('sesion'), noticia, esNueva: true, error }),
      400,
    );
  }

  // Sin `sha`, GitHub crea; si el archivo ya existía, responde 409 y no se pisa.
  try {
    await noticias.guardar(github(c.env), noticia, c.get('sesion').correo);
  } catch (e) {
    return c.html(
      paginaNoticia({
        sesion: c.get('sesion'),
        noticia,
        esNueva: true,
        error: motivo(e),
      }),
      502,
    );
  }

  return c.redirect('/noticias?ok=1', 302);
});

app.get('/noticias/:slug', exigirSesion, async (c) => {
  const noticia = await noticias.obtener(github(c.env), c.req.param('slug'));
  if (!noticia) return c.text('Esa noticia no existe.', 404);
  return c.html(paginaNoticia({ sesion: c.get('sesion'), noticia, esNueva: false }));
});

app.post('/noticias/:slug', exigirSesion, async (c) => {
  const noticia = await noticiaDelFormulario(c, c.req.param('slug'));
  const error = noticias.revisar(noticia);

  if (error) {
    return c.html(
      paginaNoticia({ sesion: c.get('sesion'), noticia, esNueva: false, error }),
      400,
    );
  }

  try {
    await noticias.guardar(github(c.env), noticia, c.get('sesion').correo);
  } catch (e) {
    return c.html(
      paginaNoticia({
        sesion: c.get('sesion'),
        noticia,
        esNueva: false,
        error: motivo(e),
      }),
      502,
    );
  }

  return c.redirect('/noticias?ok=1', 302);
});

/* ─── Aviso temporal ─────────────────────────────────────────────────────── */

const RUTA_AVISO = 'src/data/aviso.json';

app.get('/aviso', exigirSesion, async (c) => {
  const archivo = await leerArchivo(github(c.env), RUTA_AVISO);
  const aviso = archivo
    ? JSON.parse(archivo.texto)
    : { activo: false, texto: '', hasta: '' };

  return c.html(
    paginaAviso({ sesion: c.get('sesion'), aviso, guardado: c.req.query('ok') === '1' }),
  );
});

app.post('/aviso', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const aviso = {
    activo: cuerpo.activo === 'si',
    texto: String(cuerpo.texto ?? '').trim(),
    hasta: String(cuerpo.hasta ?? '').trim(),
  };

  if (aviso.activo && !aviso.texto) {
    return c.html(
      paginaAviso({
        sesion: c.get('sesion'),
        aviso,
        error: 'Para mostrarlo hace falta un texto.',
      }),
      400,
    );
  }

  try {
    const actual = await leerArchivo(github(c.env), RUTA_AVISO);
    await escribirArchivo(github(c.env), {
      ruta: RUTA_AVISO,
      texto: `${JSON.stringify(aviso, null, 2)}\n`,
      sha: actual?.sha,
      resumen: aviso.activo ? `Pone el aviso «${aviso.texto}»` : 'Quita el aviso del sitio',
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return c.html(
      paginaAviso({ sesion: c.get('sesion'), aviso, error: motivo(e) }),
      502,
    );
  }

  return c.redirect('/aviso?ok=1', 302);
});

/* ─── Estado ─────────────────────────────────────────────────────────────── */

app.get('/estado', exigirSesion, async (c) => {
  const pedida = c.req.query('seccion') ?? '';
  // El día de hoy se calcula aquí y se pasa: el Worker corre en UTC y la
  // pantalla tiene que decir «Hoy» cuando en Ambato es hoy.
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  try {
    return c.html(
      paginaEstado({
        sesion: c.get('sesion'),
        // Treinta y no ocho: el historial solo sirve si llega hasta el cambio
        // que alguien está buscando, y ya no cuesta una petición más.
        commits: await ultimosCommits(github(c.env), 30),
        seccion: esSeccion(pedida) ? pedida : undefined,
        hoy,
      }),
    );
  } catch (e) {
    return c.html(
      paginaEstado({ sesion: c.get('sesion'), commits: [], hoy, error: motivo(e, AL_LEER) }),
      502,
    );
  }
});


/* ─── Contacto y redes ───────────────────────────────────────────────────── */

app.get('/contacto', exigirSesion, async (c) => {
  const { datos } = await sitio.leerSitio(github(c.env));
  return c.html(
    paginaContacto({ sesion: c.get('sesion'), datos, ok: c.req.query('ok') === '1' }),
  );
});

app.post('/contacto', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { datos: actual, sha } = await sitio.leerSitio(github(c.env));
  const datos: sitio.DatosSitio = {
    ...actual,
    telefono: t('telefono'),
    emergencias: t('emergencias'),
    email: t('email'),
    emails: {
      laboratorio: t('laboratorio'),
      administracion: t('administracion'),
      facturacion: t('facturacion'),
    },
    redes: { facebook: t('facebook'), instagram: t('instagram'), tiktok: t('tiktok') },
    sistema: { ...actual.sistema, url: t('sistemaUrl') },
    fundacion: t('fundacion'),
  };

  const error =
    !/^[\d\s()+-]{7,20}$/.test(datos.telefono) || !/^[\d\s()+-]{7,20}$/.test(datos.emergencias)
      ? 'Los teléfonos solo pueden llevar dígitos, espacios y los signos + ( ) -.'
      : !/^\d{4}$/.test(datos.fundacion)
        ? 'El año de fundación son cuatro cifras.'
        : undefined;

  if (error) {
    return c.html(paginaContacto({ sesion: c.get('sesion'), datos, error }), 400);
  }

  try {
    await sitio.guardarSitio(github(c.env), datos, sha, c.get('sesion').correo);
  } catch (e) {
    return c.html(
      paginaContacto({ sesion: c.get('sesion'), datos, error: motivo(e) }),
      502,
    );
  }
  return c.redirect('/contacto?ok=1', 302);
});

/* ─── Sedes ──────────────────────────────────────────────────────────────── */

app.get('/sedes', exigirSesion, async (c) => {
  const { datos } = await sitio.leerSedes(github(c.env));
  return c.html(
    paginaSedes({ sesion: c.get('sesion'), sedes: datos, ok: c.req.query('ok') === '1' }),
  );
});

app.get('/sedes/:slug', exigirSesion, async (c) => {
  const { datos } = await sitio.leerSedes(github(c.env));
  const sede = datos.find((s) => s.slug === c.req.param('slug'));
  if (!sede) return c.text('Esa sede no existe.', 404);
  return c.html(paginaSede({ sesion: c.get('sesion'), sede }));
});

app.post('/sedes/:slug', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { datos, sha } = await sitio.leerSedes(github(c.env));
  const i = datos.findIndex((s) => s.slug === c.req.param('slug'));
  if (i === -1) return c.text('Esa sede no existe.', 404);

  /*
    El formulario trae un día por fila con dos parejas de horas. Una pareja
    vacía no es un tramo; el día sin marcar es `null`, que es como el sitio
    representa «cerrado».
  */
  const horario = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    if (cuerpo[`abre${d}`] !== 'si') return null;
    const tramos: sitio.Tramo[] = [];
    for (const par of [1, 2]) {
      const abre = t(`d${d}a${par}`);
      const cierra = t(`d${d}c${par}`);
      if (abre && cierra) tramos.push({ abre, cierra });
    }
    return tramos.length ? tramos : null;
  }) as sitio.HorarioSemanal;

  const sede: sitio.Sede = {
    ...datos[i]!,
    nombre: t('nombre'),
    direccion: t('direccion'),
    referencia: t('referencia') || undefined,
    telefono: t('telefono'),
    celular: t('celular'),
    horarioSemanal: horario,
  };

  const error = sitio.revisarSede(sede);
  if (error) return c.html(paginaSede({ sesion: c.get('sesion'), sede, error }), 400);

  datos[i] = sede;
  try {
    await sitio.guardarSedes(
      github(c.env),
      datos,
      sha,
      c.get('sesion').correo,
      `Actualiza la sede «${sede.nombre}»`,
    );
  } catch (e) {
    return c.html(paginaSede({ sesion: c.get('sesion'), sede, error: motivo(e) }), 502);
  }
  return c.redirect('/sedes?ok=1', 302);
});

/* ─── Feriados ───────────────────────────────────────────────────────────── */

app.get('/feriados', exigirSesion, async (c) => {
  const { datos } = await sitio.leerFeriados(github(c.env));
  return c.html(
    paginaFeriados({
      sesion: c.get('sesion'),
      fechas: datos.fechas,
      ok: c.req.query('ok') === '1',
    }),
  );
});

app.post('/feriados', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { datos, sha } = await sitio.leerFeriados(github(c.env));
  const cerrado = cuerpo.cerrado === 'si';
  const abre = t('abre');
  const cierra = t('cierra');

  const nueva: sitio.FechaEspecial = {
    fecha: t('fecha'),
    motivo: t('motivo'),
    franja: cerrado || !abre || !cierra ? null : [{ abre, cierra }],
  };

  const error =
    sitio.revisarFechaEspecial(nueva) ??
    (datos.fechas.some((f) => f.fecha === nueva.fecha)
      ? 'Ya hay una fecha especial ese día.'
      : undefined);

  if (error) {
    return c.html(
      paginaFeriados({ sesion: c.get('sesion'), fechas: datos.fechas, error }),
      400,
    );
  }

  datos.fechas = [...datos.fechas, nueva].sort((a, b) => a.fecha.localeCompare(b.fecha));

  try {
    await sitio.guardarFeriados(
      github(c.env),
      datos,
      sha,
      c.get('sesion').correo,
      `Añade ${nueva.motivo} (${nueva.fecha})`,
    );
  } catch (e) {
    return c.html(
      paginaFeriados({ sesion: c.get('sesion'), fechas: datos.fechas, error: motivo(e) }),
      502,
    );
  }
  return c.redirect('/feriados?ok=1', 302);
});

app.post('/feriados/quitar', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const fecha = String(cuerpo.fecha ?? '');
  const { datos, sha } = await sitio.leerFeriados(github(c.env));
  const quitada = datos.fechas.find((f) => f.fecha === fecha);

  datos.fechas = datos.fechas.filter((f) => f.fecha !== fecha);

  try {
    await sitio.guardarFeriados(
      github(c.env),
      datos,
      sha,
      c.get('sesion').correo,
      `Quita ${quitada?.motivo ?? 'una fecha especial'} (${fecha})`,
    );
  } catch (e) {
    return c.html(
      paginaFeriados({ sesion: c.get('sesion'), fechas: datos.fechas, error: motivo(e) }),
      502,
    );
  }
  return c.redirect('/feriados?ok=1', 302);
});

/* ─── Catálogo público ───────────────────────────────────────────────────── */

/**
 * Mensajes de «ya está» tras una redirección.
 *
 * Va en un `Map` y no en un objeto porque un objeto responde también a las
 * claves que hereda: `?ok=constructor` pintaba el código de `Object` dentro del
 * recuadro de confirmación.
 */
const AVISOS = new Map([
  ['1', 'Guardado. En uno o dos minutos se ve en el sitio.'],
  ['importado', 'Catálogo actualizado. En uno o dos minutos se ve en el sitio.'],
]);

app.get('/catalogo', exigirSesion, async (c) => {
  const examenes = await catalogo.leerExamenes(github(c.env));
  const falta = c.req.query('falta') ?? '';
  const texto = c.req.query('q') ?? '';
  const especialidad = c.req.query('especialidad') ?? '';
  const filtro = catalogo.esFiltro(falta) ? falta : undefined;

  return c.html(
    paginaCatalogo({
      sesion: c.get('sesion'),
      examenes,
      resultados: catalogo.buscar(examenes, { texto, filtro, especialidad }),
      texto,
      filtro,
      especialidad,
      especialidades: catalogo.especialidadesDe(examenes),
      ok: AVISOS.get(c.req.query('ok') ?? ''),
    }),
  );
});

/*
  Alta de un examen suelto.

  Va **antes** de `/catalogo/:slug` a propósito: Hono resuelve por orden, y
  puesta después, la ruta con parámetro se quedaría con la palabra «nuevo» y
  esto no se alcanzaría nunca.

  El camino normal para dar de alta sigue siendo la hoja de cálculo, que trae
  decenas de una vez. Esto es para el examen suelto que el laboratorio añade un
  martes, donde montar una hoja entera —y arriesgarse a que falte alguno y
  salga como baja— no compensa.
*/

/** Un examen en blanco, como lo deja el importador cuando no hay dato. */
const examenEnBlanco = (): catalogo.Examen => ({
  codigo: '',
  slug: '',
  nombre: '',
  especialidad: '',
  utilidad: '',
  condicionesClinicas: '',
  tiempoEntrega: catalogo.limpiar(''),
  tipoMuestra: catalogo.limpiar(''),
  tecnica: catalogo.limpiar(''),
  sinonimos: [],
});

app.get('/catalogo/nuevo', exigirSesion, async (c) => {
  const examenes = await catalogo.leerExamenes(github(c.env));
  return c.html(
    paginaExamen({
      sesion: c.get('sesion'),
      examen: examenEnBlanco(),
      especialidades: catalogo.especialidadesDe(examenes),
      desde: {},
      esNuevo: true,
    }),
  );
});

app.post('/catalogo/nuevo', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { examenes, info, cabeza } = await catalogo.leerTodo(github(c.env));

  const examen: catalogo.Examen = {
    ...examenEnBlanco(),
    nombre: t('nombre').replace(/\s+/g, ' '),
    especialidad: t('especialidadNueva') || t('especialidad'),
    utilidad: t('utilidad'),
    condicionesClinicas: t('condicionesClinicas'),
    tiempoEntrega: catalogo.limpiar(t('tiempoEntrega')),
    tipoMuestra: catalogo.limpiar(t('tipoMuestra')),
    tecnica: catalogo.limpiar(t('tecnica')),
    sinonimos: t('sinonimos')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const responder = (mensaje: string, estado: 400 | 502) =>
    c.html(
      paginaExamen({
        sesion: c.get('sesion'),
        examen,
        especialidades: catalogo.especialidadesDe(examenes),
        desde: {},
        nueva: t('especialidadNueva') || undefined,
        esNuevo: true,
        error: mensaje,
      }),
      estado,
    );

  const error = catalogo.revisarExamen(examen);
  if (error) return responder(error, 400);

  /*
    Un nombre repetido no se rechaza por pedantería: el nombre es la clave con
    la que la carga por hoja reconoce cada examen. Dos que se comparen iguales
    harían que la hoja no supiera a cuál de los dos corresponde cada fila.
  */
  const yaEsta = examenes.find(
    (e) => catalogo.aSlug(e.nombre) === catalogo.aSlug(examen.nombre),
  );
  if (yaEsta) {
    return responder(
      `Ya hay un examen que se llama igual: «${yaEsta.nombre}». Ábralo desde el catálogo para corregirlo.`,
      400,
    );
  }

  examen.slug = catalogo.slugLibre(examen.nombre, new Set(examenes.map((e) => e.slug)));

  try {
    await catalogo.guardarCatalogo(github(c.env), {
      examenes: [...examenes, examen],
      info: catalogo.anotarInfo(info, examen),
      cabeza,
      resumen: `Añade el examen «${examen.nombre}»`,
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return responder(motivo(e), 502);
  }

  return c.redirect('/catalogo?ok=1', 302);
});

app.get('/catalogo/:slug', exigirSesion, async (c) => {
  const examenes = await catalogo.leerExamenes(github(c.env));
  const examen = examenes.find((e) => e.slug === c.req.param('slug'));
  if (!examen) return c.text('Ese examen no existe.', 404);

  return c.html(
    paginaExamen({
      sesion: c.get('sesion'),
      examen,
      especialidades: catalogo.especialidadesDe(examenes),
      desde: {
        q: c.req.query('q'),
        falta: c.req.query('falta'),
        especialidad: c.req.query('especialidad'),
      },
    }),
  );
});

app.post('/catalogo/:slug', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { examenes, info, cabeza } = await catalogo.leerTodo(github(c.env));
  const i = examenes.findIndex((e) => e.slug === c.req.param('slug'));
  if (i === -1) return c.text('Ese examen no existe.', 404);

  const desde = {
    q: t('desde_q') || undefined,
    falta: t('desde_falta') || undefined,
    especialidad: t('desde_especialidad') || undefined,
  };

  /*
    El nombre y el slug no se tocan: el nombre es la clave que une la ficha con
    el Excel del laboratorio y con su texto guardado, y el slug es la dirección
    que ya está en Google.
  */
  const examen: catalogo.Examen = {
    ...examenes[i]!,
    especialidad: t('especialidadNueva') || t('especialidad'),
    utilidad: t('utilidad'),
    condicionesClinicas: t('condicionesClinicas'),
    tiempoEntrega: catalogo.limpiar(t('tiempoEntrega')),
    tipoMuestra: catalogo.limpiar(t('tipoMuestra')),
    tecnica: catalogo.limpiar(t('tecnica')),
    sinonimos: t('sinonimos')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const error = catalogo.revisarExamen(examen);
  const responder = (mensaje: string, estado: 400 | 502) =>
    c.html(
      paginaExamen({
        sesion: c.get('sesion'),
        examen,
        especialidades: catalogo.especialidadesDe(examenes),
        desde,
        // Lo que escribió en «especialidad nueva» vuelve al formulario: si no,
        // se perdía y el desplegable elegía otra por su cuenta.
        nueva: t('especialidadNueva') || undefined,
        error: mensaje,
      }),
      estado,
    );

  if (error) return responder(error, 400);

  examenes[i] = examen;
  try {
    await catalogo.guardarCatalogo(github(c.env), {
      examenes,
      info: catalogo.anotarInfo(info, examen),
      cabeza,
      resumen: `Corrige el examen «${examen.nombre}»`,
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return responder(motivo(e), 502);
  }

  const parametros = new URLSearchParams(
    Object.entries({ ...desde, ok: '1' }).filter(([, v]) => v) as [string, string][],
  );
  return c.redirect(`/catalogo?${parametros.toString()}`, 302);
});

/* ─── Catálogo: carga por hoja de cálculo ────────────────────────────────── */

/**
 * La hoja leída espera en el KV entre un paso y el siguiente.
 *
 * Guarda también el correo de quien la subió —nadie publica la hoja de otra
 * persona— y el commit contra el que se calculó la comparación, para no publicar
 * una previsualización que ya no corresponde a lo que hay en el repositorio.
 */
type Pendiente = {
  correo: string;
  tabla: importar.Tabla;
  asignacion?: importar.Asignacion;
  commit?: string;
};

const CADUCADA =
  'La hoja que estaba revisando ya no está guardada. Vuelva a subirla: así se compara contra el catálogo de ahora.';

const clavePendiente = (id: string) => `importacion:${id}`;
/** Media hora: lo que tarda alguien en revisar una lista de 559 nombres. */
const VIDA_PENDIENTE = 30 * 60;
/** Un CSV de 559 exámenes ocupa unos 30 KB. Dos megas es de sobra. */
const TOPE_ARCHIVO = 2 * 1024 * 1024;
/** Lo mismo medido en caracteres, para el texto venga de donde venga. */
const TOPE_TEXTO = 1_000_000;

async function leerPendiente(c: any, id: string): Promise<Pendiente | null> {
  const crudo = await c.env.PANEL.get(clavePendiente(id));
  if (!crudo) return null;
  const pendiente = JSON.parse(crudo) as Pendiente;
  return pendiente.correo === c.get('sesion').correo ? pendiente : null;
}

const guardarPendiente = (c: any, id: string, pendiente: Pendiente) =>
  c.env.PANEL.put(clavePendiente(id), JSON.stringify(pendiente), {
    expirationTtl: VIDA_PENDIENTE,
  });

app.get('/catalogo-importar', exigirSesion, (c) =>
  c.html(paginaImportar({ sesion: c.get('sesion') })),
);

app.post('/catalogo-importar', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const archivo = cuerpo.archivo;
  const pegado = String(cuerpo.pegado ?? '');

  const noVale = (mensaje: string) =>
    c.html(paginaImportar({ sesion: c.get('sesion'), error: mensaje }), 400);

  let texto = pegado;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TOPE_ARCHIVO) {
      return noVale('Ese archivo es demasiado grande para ser una lista de exámenes.');
    }
    const bytes = await archivo.arrayBuffer();
    // Se reconoce el formato antes de descodificar: así el mensaje dice qué
    // archivo es y qué hacer con él, en vez de dejar pasar basura descodificada.
    const binario = importar.formatoBinario(bytes);
    if (binario) return noVale(binario);
    texto = importar.aTexto(bytes);
  }

  /*
    El tope vale para los dos caminos. El archivo ya estaba limitado, pero el
    cuadro de texto no: un pegado enorme se recorre cuatro veces al buscar el
    separador y se come los 10 ms de CPU del plan gratuito, con lo que Cloudflare
    corta la petición sin dar ninguna explicación.
  */
  if (texto.length > TOPE_TEXTO) {
    return noVale(
      'Eso es demasiado texto para una lista de exámenes. Pegue solo las columnas del catálogo.',
    );
  }
  if (texto.trim() && !importar.pareceTexto(texto)) {
    return noVale(
      'Ese contenido no parece una hoja en texto. Guárdelo desde Excel como CSV UTF-8, o copie las celdas y péguelas.',
    );
  }

  const tabla = importar.parsear(texto);
  if (!tabla.filas.length) {
    return noVale('No se encontró ninguna fila. Suba un archivo CSV o pegue las celdas.');
  }

  const examenes = await catalogo.leerExamenes(github(c.env));
  const id = crypto.randomUUID();
  await guardarPendiente(c, id, { correo: c.get('sesion').correo, tabla });

  return c.html(
    paginaColumnas({
      sesion: c.get('sesion'),
      id,
      tabla,
      asignacion: importar.adivinar(tabla, examenes),
    }),
  );
});

/** Lee del formulario qué columna es qué. */
function asignacionDelFormulario(
  cuerpo: Record<string, unknown>,
  tabla: importar.Tabla,
): importar.Asignacion {
  const campos: importar.Asignacion['campos'] = {};
  let nombre = -1;

  for (let col = 0; col < tabla.columnas; col++) {
    const elegido = String(cuerpo[`col${col}`] ?? '');
    if (elegido === 'nombre') {
      if (nombre === -1) nombre = col;
    } else if (elegido in catalogo.CAMPOS_HOJA) {
      const campo = elegido as catalogo.CampoHoja;
      if (campos[campo] === undefined) campos[campo] = col;
    }
  }

  return { nombre, campos, cabecera: cuerpo.cabecera === 'si' };
}

/** Calcula la comparación y la enseña. Se usa en el paso 2 y al reintentar. */
async function mostrarResumen(c: any, id: string, pendiente: Pendiente, aviso?: string) {
  const { examenes, cabeza } = await catalogo.leerTodo(github(c.env));
  const asignacion = pendiente.asignacion!;
  const lectura = importar.leer(pendiente.tabla, asignacion);
  const comparacion = importar.comparar(examenes, lectura);

  await guardarPendiente(c, id, { ...pendiente, commit: cabeza.commit });

  return c.html(
    paginaResumen({
      sesion: c.get('sesion'),
      id,
      comparacion,
      asignacion,
      total: examenes.length,
      error: aviso,
    }),
  );
}

app.post('/catalogo-importar/columnas', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const id = String(cuerpo.id ?? '');
  const pendiente = await leerPendiente(c, id);
  if (!pendiente) return c.html(paginaImportar({ sesion: c.get('sesion'), error: CADUCADA }), 410);

  const asignacion = asignacionDelFormulario(cuerpo, pendiente.tabla);
  if (asignacion.nombre === -1) {
    return c.html(
      paginaColumnas({
        sesion: c.get('sesion'),
        id,
        tabla: pendiente.tabla,
        asignacion: { ...asignacion, nombre: 0 },
        error: 'Marque cuál es la columna con el nombre del examen: sin eso no se puede comparar.',
      }),
      400,
    );
  }

  return mostrarResumen(c, id, { ...pendiente, asignacion });
});

app.post('/catalogo-importar/publicar', exigirSesion, async (c) => {
  const cuerpo = await c.req.parseBody();
  const id = String(cuerpo.id ?? '');
  const pendiente = await leerPendiente(c, id);
  if (!pendiente?.asignacion) {
    return c.html(paginaImportar({ sesion: c.get('sesion'), error: CADUCADA }), 410);
  }

  const { examenes, info, cabeza } = await catalogo.leerTodo(github(c.env));

  // Si el repositorio avanzó entre la previsualización y el botón, lo que se vio
  // ya no es lo que pasaría. Se vuelve a enseñar antes de escribir.
  if (pendiente.commit && pendiente.commit !== cabeza.commit) {
    return mostrarResumen(
      c,
      id,
      pendiente,
      'El catálogo cambió mientras usted revisaba. Esta es la comparación con lo que hay ahora: vuelva a confirmarla.',
    );
  }

  const lectura = importar.leer(pendiente.tabla, pendiente.asignacion);
  const comparacion = importar.comparar(examenes, lectura);

  // Dar de baja exámenes es lo único de aquí que no se nota hasta que un
  // paciente no encuentra el suyo, así que se pide decirlo aparte.
  if (comparacion.salen.length && cuerpo.confirmaBajas !== 'si') {
    return c.html(
      paginaResumen({
        sesion: c.get('sesion'),
        id,
        comparacion,
        asignacion: pendiente.asignacion,
        total: examenes.length,
        error: 'Marque la casilla para confirmar que esos exámenes dejan de verse.',
      }),
      400,
    );
  }

  // La misma comparación que se acaba de revisar: así lo que se escribe es
  // exactamente lo que la pantalla prometió.
  const resultado = importar.aplicar(examenes, info, lectura, comparacion);

  try {
    await catalogo.guardarCatalogo(github(c.env), {
      examenes: resultado.examenes,
      info: resultado.info,
      cabeza,
      resumen: importar.resumirCambio(comparacion),
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return c.html(
      paginaResumen({
        sesion: c.get('sesion'),
        id,
        comparacion,
        asignacion: pendiente.asignacion,
        total: examenes.length,
        error: motivo(e),
      }),
      502,
    );
  }

  await c.env.PANEL.delete(clavePendiente(id));
  return c.redirect('/catalogo?ok=importado', 302);
});


/* ─── Catálogo de laboratorios asociados ─────────────────────────────────── */

/*
  Toda la sección exige administrador.

  Ya no por el tarifario —los precios salieron del panel— sino porque la cartera
  de convenio es lo que ExamLab ofrece a otros laboratorios, y no es información
  que recepción necesite para su trabajo.
*/

app.get('/asociados', exigirSesion, exigirAdministrador, async (c) => {
  const catalogoAsoc = await asociados.leerCatalogo(github(c.env));
  const falta = c.req.query('falta') ?? '';
  const texto = c.req.query('q') ?? '';
  const especialidad = c.req.query('especialidad') ?? '';
  const filtro = asociados.esFiltro(falta) ? falta : undefined;

  const pruebas = asociados.conSlug(catalogoAsoc.pruebas);

  return c.html(
    paginaAsociados({
      sesion: c.get('sesion'),
      pruebas,
      resultados: asociados.buscar(pruebas, { texto, filtro, especialidad }),
      texto,
      filtro,
      especialidad,
      especialidades: asociados.especialidadesDe(pruebas),
      ok: AVISOS.get(c.req.query('ok') ?? ''),
    }),
  );
});

/*
  Alta de una prueba suelta en la cartera de asociados.

  Va **antes** de `/asociados/:slug`, igual que `/catalogo/nuevo`: Hono resuelve
  por orden y, puesta después, el parámetro se quedaría con la palabra «nueva».
*/

const pruebaEnBlanco = (): asociados.Prueba => ({
  especialidad: '',
  nombre: '',
  notas: [],
});

app.get('/asociados/nueva', exigirSesion, exigirAdministrador, async (c) => {
  const catalogoAsoc = await asociados.leerCatalogo(github(c.env));
  const pruebas = asociados.conSlug(catalogoAsoc.pruebas);
  return c.html(
    paginaPrueba({
      sesion: c.get('sesion'),
      prueba: { ...pruebaEnBlanco(), slug: '' },
      especialidades: asociados.especialidadesDe(pruebas),
      desde: {},
      esNueva: true,
    }),
  );
});

app.post('/asociados/nueva', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { catalogo: catalogoAsoc, cabeza } = await asociados.leerTodo(github(c.env));
  const pruebas = asociados.conSlug(catalogoAsoc.pruebas);

  const prueba: asociados.Prueba = {
    nombre: t('nombre').replace(/\s+/g, ' '),
    especialidad: t('especialidadNueva') || t('especialidad'),
    metodo: t('metodo') || undefined,
    muestra: t('muestra') || undefined,
    entrega: t('entrega') || undefined,
    incluye: t('incluye') || undefined,
    notas: asociados.notasDe(t('muestra')),
  };

  const responder = (mensaje: string, estado: 400 | 502) =>
    c.html(
      paginaPrueba({
        sesion: c.get('sesion'),
        prueba: { ...prueba, slug: '' },
        especialidades: asociados.especialidadesDe(pruebas),
        desde: {},
        esNueva: true,
        nueva: t('especialidadNueva') || undefined,
        error: mensaje,
      }),
      estado,
    );

  const error = asociados.revisarPrueba(prueba);
  if (error) return responder(error, 400);

  /*
    Un nombre repetido se rechaza porque el nombre es la clave con la que la
    carga por hoja reconoce cada prueba: dos iguales dejarían a la hoja sin
    saber a cuál corresponde cada fila.
  */
  const yaEsta = catalogoAsoc.pruebas.find(
    (p) => importarAsoc.claveDePrueba(p) === importarAsoc.claveDePrueba(prueba),
  );
  if (yaEsta) {
    return responder(
      `Ya hay una prueba que se llama igual en ${yaEsta.especialidad}: «${yaEsta.nombre}». Ábrala desde la cartera para corregirla.`,
      400,
    );
  }

  try {
    await asociados.guardarCatalogo(github(c.env), {
      catalogo: { ...catalogoAsoc, pruebas: [...catalogoAsoc.pruebas, prueba] },
      cabeza,
      resumen: `Añade la prueba de asociados «${prueba.nombre}»`,
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return responder(motivo(e), 502);
  }

  return c.redirect('/asociados?ok=1', 302);
});

/* ─── Asociados: carga por hoja de cálculo ───────────────────────────────── */

type PendienteAsoc = {
  correo: string;
  tabla: importar.Tabla;
  asignacion?: importarAsoc.Asignacion;
  commit?: string;
};

const clavePendienteAsoc = (id: string) => `importacion-asociados:${id}`;

async function leerPendienteAsoc(c: any, id: string): Promise<PendienteAsoc | null> {
  const crudo = await c.env.PANEL.get(clavePendienteAsoc(id));
  if (!crudo) return null;
  const pendiente = JSON.parse(crudo) as PendienteAsoc;
  return pendiente.correo === c.get('sesion').correo ? pendiente : null;
}

const guardarPendienteAsoc = (c: any, id: string, pendiente: PendienteAsoc) =>
  c.env.PANEL.put(clavePendienteAsoc(id), JSON.stringify(pendiente), {
    expirationTtl: VIDA_PENDIENTE,
  });

app.get('/asociados-importar', exigirSesion, exigirAdministrador, (c) =>
  c.html(paginaImportarAsociados({ sesion: c.get('sesion') })),
);

app.post('/asociados-importar', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const archivo = cuerpo.archivo;
  const pegado = String(cuerpo.pegado ?? '');

  const noVale = (mensaje: string) =>
    c.html(paginaImportarAsociados({ sesion: c.get('sesion'), error: mensaje }), 400);

  let texto = pegado;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TOPE_ARCHIVO) {
      return noVale('Ese archivo es demasiado grande para ser una cartera de pruebas.');
    }
    const bytes = await archivo.arrayBuffer();
    const binario = importar.formatoBinario(bytes);
    if (binario) return noVale(binario);
    texto = importar.aTexto(bytes);
  }

  if (texto.length > TOPE_TEXTO) {
    return noVale('Eso es demasiado texto. Pegue solo las columnas de la cartera.');
  }
  if (texto.trim() && !importar.pareceTexto(texto)) {
    return noVale(
      'Ese contenido no parece una hoja en texto. Guárdelo desde Excel como CSV UTF-8, o copie las celdas y péguelas.',
    );
  }

  const tabla = importar.parsear(texto);
  if (!tabla.filas.length) {
    return noVale('No se encontró ninguna fila. Suba un archivo CSV o pegue las celdas.');
  }

  const catalogoAsoc = await asociados.leerCatalogo(github(c.env));
  const id = crypto.randomUUID();
  await guardarPendienteAsoc(c, id, { correo: c.get('sesion').correo, tabla });

  return c.html(
    paginaColumnasAsociados({
      sesion: c.get('sesion'),
      id,
      tabla,
      asignacion: importarAsoc.adivinar(tabla, catalogoAsoc.pruebas),
    }),
  );
});

function asignacionAsocDelFormulario(
  cuerpo: Record<string, unknown>,
  tabla: importar.Tabla,
): importarAsoc.Asignacion {
  const campos: importarAsoc.Asignacion['campos'] = {};
  let nombre = -1;

  for (let col = 0; col < tabla.columnas; col++) {
    const elegido = String(cuerpo[`col${col}`] ?? '');
    if (elegido === 'nombre') {
      if (nombre === -1) nombre = col;
    } else if (elegido in importarAsoc.CAMPOS) {
      const campo = elegido as importarAsoc.Campo;
      if (campos[campo] === undefined) campos[campo] = col;
    }
  }

  return { nombre, campos, cabecera: cuerpo.cabecera === 'si' };
}

async function mostrarResumenAsoc(c: any, id: string, pendiente: PendienteAsoc, aviso?: string) {
  const { catalogo: catalogoAsoc, cabeza } = await asociados.leerTodo(github(c.env));
  const asignacion = pendiente.asignacion!;
  const lectura = importarAsoc.leer(pendiente.tabla, asignacion);
  const comparacion = importarAsoc.comparar(catalogoAsoc.pruebas, lectura);

  await guardarPendienteAsoc(c, id, { ...pendiente, commit: cabeza.commit });

  return c.html(
    paginaResumenAsociados({
      sesion: c.get('sesion'),
      id,
      comparacion,
      total: catalogoAsoc.pruebas.length,
      sinEspecialidad: importarAsoc.sinEspecialidad(
        importarAsoc.aplicar(catalogoAsoc.pruebas, lectura),
      ),
      error: aviso,
    }),
  );
}

app.post('/asociados-importar/columnas', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const id = String(cuerpo.id ?? '');
  const pendiente = await leerPendienteAsoc(c, id);
  if (!pendiente) {
    return c.html(paginaImportarAsociados({ sesion: c.get('sesion'), error: CADUCADA }), 410);
  }

  const asignacion = asignacionAsocDelFormulario(cuerpo, pendiente.tabla);
  if (asignacion.nombre === -1) {
    return c.html(
      paginaColumnasAsociados({
        sesion: c.get('sesion'),
        id,
        tabla: pendiente.tabla,
        asignacion: { ...asignacion, nombre: 0 },
        error: 'Marque cuál es la columna con el nombre de la prueba: sin eso no se puede comparar.',
      }),
      400,
    );
  }

  return mostrarResumenAsoc(c, id, { ...pendiente, asignacion });
});

app.post('/asociados-importar/publicar', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const id = String(cuerpo.id ?? '');
  const pendiente = await leerPendienteAsoc(c, id);
  if (!pendiente?.asignacion) {
    return c.html(paginaImportarAsociados({ sesion: c.get('sesion'), error: CADUCADA }), 410);
  }

  const { catalogo: catalogoAsoc, cabeza } = await asociados.leerTodo(github(c.env));

  if (pendiente.commit && pendiente.commit !== cabeza.commit) {
    return mostrarResumenAsoc(
      c,
      id,
      pendiente,
      'La cartera cambió mientras usted revisaba. Esta es la comparación con lo que hay ahora: vuelva a confirmarla.',
    );
  }

  const lectura = importarAsoc.leer(pendiente.tabla, pendiente.asignacion);
  const comparacion = importarAsoc.comparar(catalogoAsoc.pruebas, lectura);
  const pruebas = importarAsoc.aplicar(catalogoAsoc.pruebas, lectura);

  const responder = (mensaje: string, estado: 400 | 502) =>
    c.html(
      paginaResumenAsociados({
        sesion: c.get('sesion'),
        id,
        comparacion,
        total: catalogoAsoc.pruebas.length,
        sinEspecialidad: importarAsoc.sinEspecialidad(pruebas),
        error: mensaje,
      }),
      estado,
    );

  // Dar de baja una prueba no se nota hasta que un laboratorio no la encuentra,
  // así que se pide decirlo aparte.
  if (comparacion.salen.length && cuerpo.confirmaBajas !== 'si') {
    return responder('Marque la casilla para confirmar que esas pruebas dejan de ofrecerse.', 400);
  }

  try {
    await asociados.guardarCatalogo(github(c.env), {
      catalogo: { ...catalogoAsoc, pruebas },
      cabeza,
      resumen: `Actualiza la cartera de asociados: ${importarAsoc.resumirCambio(comparacion)}`,
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return responder(motivo(e), 502);
  }

  return c.redirect('/asociados?ok=importado', 302);
});

app.get('/asociados/:slug', exigirSesion, exigirAdministrador, async (c) => {
  const catalogoAsoc = await asociados.leerCatalogo(github(c.env));
  const pruebas = asociados.conSlug(catalogoAsoc.pruebas);
  const prueba = pruebas.find((p) => p.slug === c.req.param('slug'));
  if (!prueba) return c.text('Esa prueba no existe.', 404);

  return c.html(
    paginaPrueba({
      sesion: c.get('sesion'),
      prueba,
      especialidades: asociados.especialidadesDe(pruebas),
      desde: {
        q: c.req.query('q'),
        falta: c.req.query('falta'),
        especialidad: c.req.query('especialidad'),
      },
    }),
  );
});

app.post('/asociados/:slug', exigirSesion, exigirAdministrador, async (c) => {
  const cuerpo = await c.req.parseBody();
  const t = (k: string) => String(cuerpo[k] ?? '').trim();

  const { catalogo: catalogoAsoc, cabeza } = await asociados.leerTodo(github(c.env));
  const pruebas = asociados.conSlug(catalogoAsoc.pruebas);
  const i = pruebas.findIndex((p) => p.slug === c.req.param('slug'));
  if (i === -1) return c.text('Esa prueba no existe.', 404);

  const anterior = pruebas[i]!;
  const desde = {
    q: t('desde_q') || undefined,
    falta: t('desde_falta') || undefined,
    especialidad: t('desde_especialidad') || undefined,
  };

  const prueba: asociados.Prueba = {
    ...catalogoAsoc.pruebas[i]!,
    nombre: t('nombre'),
    especialidad: t('especialidad'),
    metodo: t('metodo') || undefined,
    muestra: t('muestra') || undefined,
    entrega: t('entrega') || undefined,
    incluye: t('incluye') || undefined,
  };

  const responder = (mensaje: string, estado: 400 | 502) =>
    c.html(
      paginaPrueba({
        sesion: c.get('sesion'),
        prueba: { ...prueba, slug: anterior.slug },
        especialidades: asociados.especialidadesDe(pruebas),
        desde,
        error: mensaje,
      }),
      estado,
    );

  const error = asociados.revisarPrueba(prueba);
  if (error) return responder(error, 400);

  catalogoAsoc.pruebas[i] = prueba;
  try {
    await asociados.guardarCatalogo(github(c.env), {
      catalogo: catalogoAsoc,
      cabeza,
      resumen: `Actualiza la prueba de asociados «${prueba.nombre}»`,
      autor: c.get('sesion').correo,
    });
  } catch (e) {
    return responder(motivo(e), 502);
  }

  const parametros = new URLSearchParams(
    Object.entries({ ...desde, ok: '1' }).filter(([, v]) => v) as [string, string][],
  );
  return c.redirect(`/asociados?${parametros.toString()}`, 302);
});


/* ─── Códigos QR ─────────────────────────────────────────────────────────── */

/*
  El código se genera en cada petición y no se guarda en ninguna parte.
  Guardarlo significaría escribir un binario en el repositorio y esperar a que
  el sitio se vuelva a compilar, cuando lo que hace falta es un archivo para
  mandar a la imprenta. Se descarga y ya.
*/

const qrDelFormulario = (cuerpo: Record<string, unknown>) => ({
  direccion: String(cuerpo.direccion ?? '').trim(),
  nombre: String(cuerpo.nombre ?? '').trim(),
  emblema: String(cuerpo.emblema ?? '').trim(),
});

app.get('/qr', exigirSesion, (c) =>
  c.html(paginaQr({ sesion: c.get('sesion'), direccion: '', nombre: '' })),
);

app.post('/qr', exigirSesion, async (c) => {
  const { direccion, nombre, emblema } = qrDelFormulario(await c.req.parseBody());
  const error = qr.revisarDireccion(direccion);
  if (error) {
    return c.html(paginaQr({ sesion: c.get('sesion'), direccion, nombre, emblema, error }), 400);
  }

  return c.html(
    paginaQr({
      sesion: c.get('sesion'),
      direccion,
      nombre,
      emblema,
      qr: qr.generar(direccion, nombre, emblema),
    }),
  );
});

app.post('/qr/descargar', exigirSesion, async (c) => {
  const { direccion, nombre, emblema } = qrDelFormulario(await c.req.parseBody());
  const error = qr.revisarDireccion(direccion);
  if (error) {
    return c.html(paginaQr({ sesion: c.get('sesion'), direccion, nombre, emblema, error }), 400);
  }

  const codigo = qr.generar(direccion, nombre, emblema);
  c.header('Content-Type', 'image/svg+xml; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${codigo.archivo}.svg"`);
  return c.body(codigo.svg);
});

/*
  El primer administrador NO se crea por una ruta web.

  Una ruta abierta de «alta inicial» deja una ventana entre el despliegue y el
  primer uso en la que quien la encuentre antes se queda con el panel. Se crea
  desde la línea de comandos con `npm run admin:crear`, que solo puede ejecutar
  quien ya tenga acceso a la cuenta de Cloudflare.
*/

app.notFound((c) => c.text('No existe.', 404));

/**
 * Red de seguridad para los fallos que no se capturaron en su sitio.
 *
 * Las rutas que escriben ya tratan el error donde pasa, porque ahí pueden
 * devolver el formulario con lo que la persona había escrito. Las que solo leen
 * no tenían nada, y un token caducado o una caída de la API de GitHub dejaba un
 * «Internal Server Error» en blanco en la pantalla principal del panel.
 *
 * Solo se muestran mensajes propios —los de `ErrorGitHub` están escritos para
 * leerse—; lo demás va al registro y al visitante le llega una línea genérica,
 * porque esto también cubre las rutas a las que se llega sin haber entrado.
 */
app.onError((e, c) => {
  console.error('Fallo sin capturar en el panel', e);
  const sesion = c.get('sesion') as Sesion | undefined;
  return c.html(
    paginaFallo({
      sesion,
      mensaje: motivo(e, AL_LEER),
    }),
    // 502 cuando el que falló fue GitHub; 500 cuando el fallo es nuestro.
    e instanceof ErrorGitHub ? 502 : 500,
  );
});

export default app;
