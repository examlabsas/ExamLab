/**
 * Lectura y escritura de archivos del repositorio del sitio.
 *
 * El panel no tiene base de datos para el contenido: escribe en el repositorio
 * y el build de siempre lo publica. Así cada cambio queda en el historial con
 * quién y cuándo, y se puede revertir — que en un sitio de laboratorio importa
 * más que cualquier interfaz.
 *
 * Se usa la API de contenidos de GitHub, que trabaja archivo a archivo. Es
 * suficiente: una noticia es un archivo y un aviso es otro.
 */

export type Config = {
  token: string;
  repo: string;
  rama: string;
  /**
   * Dirección de la API. Se puede cambiar para probar el panel entero contra un
   * GitHub simulado en local, sin usar un token de verdad ni escribir en el
   * repositorio. En producción no se toca.
   */
  api?: string;
};

const API_POR_DEFECTO = 'https://api.github.com';

/** GitHub rechaza las peticiones sin `User-Agent`. */
const cabeceras = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'examlab-panel',
});

/**
 * `btoa` no admite caracteres fuera de Latin-1, y los textos llevan tildes.
 *
 * Solo lo usa la API de contenidos, que obliga a base64, y por ahí pasan archivos
 * de unos pocos kilobytes. El catálogo —288 KB— va por otro camino justamente
 * para no pasar por aquí: medido, convertir ese tamaño cuesta unos 11 ms y el
 * plan gratuito de Workers corta a los 10 ms de CPU.
 */
function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(base64: string): string {
  const binario = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class ErrorGitHub extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message);
  }
}

async function pedir(cfg: Config, ruta: string, init?: RequestInit) {
  const res = await fetch(`${cfg.api ?? API_POR_DEFECTO}${ruta}`, {
    ...init,
    headers: { ...cabeceras(cfg.token), ...(init?.headers ?? {}) },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    // 409 es el caso real: alguien guardó el mismo archivo mientras tanto.
    const mensaje =
      res.status === 409
        ? 'Alguien más guardó este archivo mientras usted lo editaba. Vuelva a abrirlo para no pisar su cambio.'
        : // 422 al mover la rama significa lo mismo que un 409, pero para un
          // cambio de varios archivos a la vez: el repositorio avanzó en medio.
          res.status === 422 && ruta.includes('/git/refs/')
          ? 'El repositorio cambió mientras usted preparaba esto. Vuelva a empezar para no pisar el otro cambio.'
          : res.status === 401 || res.status === 403
            ? 'El token de GitHub no tiene permiso o caducó.'
            : `GitHub respondió ${res.status}. ${detalle.slice(0, 200)}`;
    throw new ErrorGitHub(mensaje, res.status);
  }

  return res.json() as Promise<any>;
}

export type Archivo = { ruta: string; texto: string; sha: string };

/**
 * Devuelve el archivo con su `sha`, que hace falta para volver a escribirlo.
 *
 * `ref` sirve para leer en un commit concreto en vez de en la punta de la rama.
 * Hace falta cuando se van a cambiar varios archivos juntos: si uno se lee en la
 * punta y otro en el commit anterior, el commit que se arme con los dos puede
 * deshacer un cambio ajeno sin que nada falle.
 */
export async function leerArchivo(
  cfg: Config,
  ruta: string,
  ref?: string,
): Promise<Archivo | null> {
  const datos = await pedir(cfg, `/repos/${cfg.repo}/contents/${ruta}?ref=${ref ?? cfg.rama}`);
  if (!datos || Array.isArray(datos) || typeof datos.content !== 'string') return null;
  return { ruta, texto: deBase64(datos.content), sha: datos.sha };
}

/**
 * El contenido de un archivo, sin pasar por base64.
 *
 * La API de contenidos devuelve el archivo metido en un JSON y codificado. Para
 * los 288 KB del catálogo eso cuesta unos 29 ms de CPU solo en descodificar —
 * tres veces el presupuesto del plan gratuito de Workers, y en cada carga de la
 * pantalla. Pidiendo el tipo `raw` llega el texto tal cual: 0,01 ms.
 *
 * Lo que no trae es el `sha` del archivo. No hace falta: quien usa esto escribe
 * con la API de git, donde el control de concurrencia va por el commit entero.
 */
export async function leerTexto(cfg: Config, ruta: string, ref?: string): Promise<string | null> {
  const res = await fetch(
    `${cfg.api ?? API_POR_DEFECTO}/repos/${cfg.repo}/contents/${ruta}?ref=${ref ?? cfg.rama}`,
    { headers: { ...cabeceras(cfg.token), Accept: 'application/vnd.github.raw' } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ErrorGitHub(
      res.status === 401 || res.status === 403
        ? 'El token de GitHub no tiene permiso o caducó.'
        : `GitHub respondió ${res.status} al leer ${ruta}.`,
      res.status,
    );
  }
  return res.text();
}

export type EntradaCarpeta = { nombre: string; ruta: string; sha: string };

export async function listarCarpeta(cfg: Config, ruta: string): Promise<EntradaCarpeta[]> {
  const datos = await pedir(cfg, `/repos/${cfg.repo}/contents/${ruta}?ref=${cfg.rama}`);
  if (!Array.isArray(datos)) return [];
  return datos
    .filter((e: any) => e.type === 'file')
    .map((e: any) => ({ nombre: e.name, ruta: e.path, sha: e.sha }));
}

/**
 * Crea o reemplaza un archivo.
 *
 * El `sha` del archivo anterior viaja en la petición: si otra persona lo cambió
 * entretanto, GitHub devuelve 409 en vez de pisar su trabajo en silencio.
 *
 * El mensaje del commit lleva a la persona. Todos los cambios llegan con el
 * mismo token, así que sin esto el historial diría siempre «el panel» y nunca
 * quién fue.
 */
export async function escribirArchivo(
  cfg: Config,
  opciones: { ruta: string; texto: string; sha?: string; resumen: string; autor: string },
): Promise<void> {
  await pedir(cfg, `/repos/${cfg.repo}/contents/${opciones.ruta}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${opciones.resumen}\n\nDesde el panel · ${opciones.autor}`,
      content: aBase64(opciones.texto),
      branch: cfg.rama,
      ...(opciones.sha ? { sha: opciones.sha } : {}),
    }),
  });
}

export async function borrarArchivo(
  cfg: Config,
  opciones: { ruta: string; sha: string; resumen: string; autor: string },
): Promise<void> {
  await pedir(cfg, `/repos/${cfg.repo}/contents/${opciones.ruta}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message: `${opciones.resumen}\n\nDesde el panel · ${opciones.autor}`,
      sha: opciones.sha,
      branch: cfg.rama,
    }),
  });
}

/* ─── Varios archivos en un solo commit ──────────────────────────────────── */

/**
 * La API de contenidos trabaja de archivo en archivo, y el catálogo se guarda
 * en dos: el que publica el sitio (`examenes.json`) y el que conserva lo que
 * escribió una persona (`catalogo-info.json`). Guardarlos por separado haría
 * dos commits, dos compilaciones, y dejaría un hueco en el que el sitio ya
 * cambió y el respaldo todavía no.
 *
 * Con la API de git se arma un único commit con los dos. Sale más barato de
 * explicar en el historial —un cambio, una línea— y al fallar, falla entero.
 */
export type Cabeza = { commit: string; arbol: string };

/** Dónde está la rama ahora. Hay que leerlo antes de preparar el cambio. */
export async function leerCabeza(cfg: Config): Promise<Cabeza> {
  const ref = await pedir(cfg, `/repos/${cfg.repo}/git/ref/heads/${cfg.rama}`);
  if (!ref?.object?.sha) throw new ErrorGitHub(`No se encontró la rama ${cfg.rama}.`, 404);
  const commit = await pedir(cfg, `/repos/${cfg.repo}/git/commits/${ref.object.sha}`);
  if (!commit?.tree?.sha) throw new ErrorGitHub('No se pudo leer el último commit.', 404);
  return { commit: ref.object.sha, arbol: commit.tree.sha };
}

/**
 * Escribe varios archivos en un commit.
 *
 * `cabeza` es la que se leyó antes de empezar. Si alguien más subió algo
 * entretanto, la rama ya no apunta ahí y GitHub rechaza el movimiento en vez de
 * dejar el commit colgando: la misma protección que el `sha` por archivo, pero
 * para el conjunto.
 */
export async function escribirVarios(
  cfg: Config,
  opciones: {
    /** Cada archivo va en texto o, si es binario, ya en base64. */
    archivos: { ruta: string; texto?: string; base64?: string }[];
    cabeza: Cabeza;
    resumen: string;
    autor: string;
  },
): Promise<void> {
  const arbol = [];
  for (const archivo of opciones.archivos) {
    const blob = await pedir(cfg, `/repos/${cfg.repo}/git/blobs`, {
      method: 'POST',
      /*
        El texto va en plano, que esta API sí acepta: codificar los 288 KB del
        catálogo costaría 11 ms de CPU y así cuesta 1. Lo binario —las fotos que
        sube el panel— no tiene esa suerte y viaja en base64, que es la otra
        codificación que GitHub admite aquí.
      */
      body: JSON.stringify(
        archivo.base64 !== undefined
          ? { content: archivo.base64, encoding: 'base64' }
          : { content: archivo.texto ?? '', encoding: 'utf-8' },
      ),
    });
    if (!blob?.sha) throw new ErrorGitHub('No se pudo subir el contenido.', 502);
    // 100644 es un archivo normal; el modo hay que darlo siempre.
    arbol.push({ path: archivo.ruta, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const nuevoArbol = await pedir(cfg, `/repos/${cfg.repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: opciones.cabeza.arbol, tree: arbol }),
  });
  if (!nuevoArbol?.sha) throw new ErrorGitHub('No se pudo preparar el cambio.', 502);

  const commit = await pedir(cfg, `/repos/${cfg.repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `${opciones.resumen}\n\nDesde el panel · ${opciones.autor}`,
      tree: nuevoArbol.sha,
      parents: [opciones.cabeza.commit],
    }),
  });
  if (!commit?.sha) throw new ErrorGitHub('No se pudo crear el commit.', 502);

  await pedir(cfg, `/repos/${cfg.repo}/git/refs/heads/${cfg.rama}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}

export type Commit = { mensaje: string; autor: string; fecha: string; url: string };

/** Últimos commits, para la pantalla de «estado del último cambio». */
export async function ultimosCommits(cfg: Config, cuantos = 5): Promise<Commit[]> {
  const datos = await pedir(
    cfg,
    `/repos/${cfg.repo}/commits?sha=${cfg.rama}&per_page=${cuantos}`,
  );
  if (!Array.isArray(datos)) return [];

  return datos.map((c: any) => {
    const mensaje: string = c.commit?.message ?? '';
    const [titulo, ...resto] = mensaje.split('\n');
    // Si vino del panel, la persona está en el cuerpo del mensaje.
    const desdePanel = resto.join('\n').match(/Desde el panel · (.+)/);
    return {
      mensaje: titulo ?? '',
      autor: desdePanel?.[1]?.trim() ?? c.commit?.author?.name ?? 'desconocido',
      fecha: c.commit?.author?.date ?? '',
      url: c.html_url ?? '',
    };
  });
}
