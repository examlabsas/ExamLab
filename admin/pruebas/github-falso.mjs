/**
 * GitHub simulado, SOLO para probar el panel en local.
 *
 * No toca el repositorio de verdad ni necesita un token: guarda todo en memoria
 * y se olvida al cerrarlo. Carga los datos reales del sitio —los 559 exámenes,
 * las sedes, los feriados— porque probar el catálogo con dos exámenes de juguete
 * no enseña nada de lo que pasa con 559.
 *
 *   node pruebas/github-falso.mjs [puerto]
 *
 * Implementa dos APIs:
 *
 *   - Contenidos: leer, listar y escribir un archivo con control de `sha`.
 *   - Base de datos de git: refs, commits, árboles y blobs, que es lo que usa el
 *     panel para escribir varios archivos en un solo commit.
 *
 * Todo en memoria, con árboles de verdad para que `?ref=<commit>` devuelva lo que
 * había en ese commit y no lo último. Sin eso no se puede probar el caso que
 * importa: dos personas guardando a la vez.
 */
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PUERTO = Number(process.argv[2] ?? 8799);

/** La raíz del repositorio, subiendo desde admin/pruebas/. */
const RAIZ = dirname(dirname(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))));

const blobs = new Map(); // sha -> texto
const arboles = new Map(); // sha -> Map(ruta -> blobSha)
const commits = new Map(); // sha -> { arbol, padres, mensaje, fecha }
let cabeza = null;

const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
const deB64 = (t) => Buffer.from(t, 'base64').toString('utf8');

/** El mismo sha que da git: sobre "blob <bytes>\0<contenido>". */
function shaBlob(texto) {
  const cuerpo = Buffer.from(texto, 'utf8');
  return createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${cuerpo.length}\0`), cuerpo]))
    .digest('hex');
}

const shaDe = (objeto) => createHash('sha1').update(JSON.stringify(objeto)).digest('hex');

function guardarBlob(texto) {
  const sha = shaBlob(texto);
  blobs.set(sha, texto);
  return sha;
}

function guardarArbol(mapa) {
  const sha = shaDe([...mapa.entries()].sort());
  arboles.set(sha, new Map(mapa));
  return sha;
}

function guardarCommit({ arbol, padres, mensaje }) {
  const fecha = new Date().toISOString();
  const sha = shaDe({ arbol, padres, mensaje, fecha, n: commits.size });
  commits.set(sha, { arbol, padres, mensaje, fecha });
  return sha;
}

/** Los archivos tal como estaban en una referencia (rama o sha de commit). */
function archivosEn(ref) {
  const sha = !ref || ref === 'main' ? cabeza : ref;
  const commit = commits.get(sha);
  if (!commit) return null;
  return arboles.get(commit.arbol) ?? new Map();
}

/* ─── Estado inicial ─────────────────────────────────────────────────────── */

const inicial = new Map();

inicial.set(
  'src/content/noticias/primera.md',
  "---\ntitulo: 'Primera noticia'\ndescripcion: Una descripcion\ncategoria: 'Laboratorio'\nfecha: 2026-06-01\nautor: 'Equipo ExamLab'\nfoto: microscopio\n---\n\nCuerpo de la primera.\n",
);
inicial.set(
  'src/content/noticias/segunda.md',
  "---\ntitulo: 'Segunda noticia'\ndescripcion: Otra descripcion\ncategoria: 'Chequeos'\nfecha: 2026-07-15\nautor: 'Equipo ExamLab'\nborrador: true\n---\n\nCuerpo de la segunda.\n",
);

// Datos reales del sitio: probar el catálogo con dos exámenes de juguete no
// enseña nada de lo que pasa con 559.
for (const ruta of [
  'src/data/sitio.json',
  'src/data/sedes.json',
  'src/data/feriados.json',
  'src/data/examenes.json',
  'src/data/catalogo-info.json',
  'src/data/catalogo-asociados.json',
]) {
  inicial.set(ruta, readFileSync(join(RAIZ, ruta), 'utf8'));
}

inicial.set(
  'src/data/aviso.json',
  JSON.stringify({ activo: false, texto: '', hasta: '' }, null, 2) + '\n',
);

{
  const mapa = new Map();
  for (const [ruta, texto] of inicial) mapa.set(ruta, guardarBlob(texto));
  cabeza = guardarCommit({
    arbol: guardarArbol(mapa),
    padres: [],
    mensaje: 'Estado inicial',
  });
}

/* ─── Servidor ───────────────────────────────────────────────────────────── */

const json = (res, estado, cuerpo) => {
  res.writeHead(estado, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(cuerpo));
};

const leerCuerpo = (req) =>
  new Promise((resolver) => {
    let datos = '';
    req.on('data', (d) => (datos += d));
    req.on('end', () => resolver(datos ? JSON.parse(datos) : {}));
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const partes = url.pathname.split('/').filter(Boolean);
    const seccion = partes[3]; // /repos/:owner/:repo/<seccion>/...
    const resto = partes.slice(4).map(decodeURIComponent);

    /* ── Base de datos de git ── */

    if (seccion === 'git') {
      const que = resto[0];

      // GET /git/ref/heads/:rama
      if (req.method === 'GET' && que === 'ref') {
        return json(res, 200, { ref: `refs/${resto.slice(1).join('/')}`, object: { sha: cabeza } });
      }

      // GET /git/commits/:sha
      if (req.method === 'GET' && que === 'commits') {
        const commit = commits.get(resto[1]);
        if (!commit) return json(res, 404, { message: 'Not Found' });
        return json(res, 200, { sha: resto[1], tree: { sha: commit.arbol } });
      }

      if (req.method === 'POST' && que === 'blobs') {
        const datos = await leerCuerpo(req);
        // Como GitHub: 'utf-8' guarda el texto tal cual, 'base64' lo descodifica.
        const texto = datos.encoding === 'base64' ? deB64(datos.content) : datos.content;
        return json(res, 201, { sha: guardarBlob(texto) });
      }

      if (req.method === 'POST' && que === 'trees') {
        const datos = await leerCuerpo(req);
        const base = arboles.get(datos.base_tree);
        if (!base) return json(res, 404, { message: 'base_tree desconocido' });
        const mapa = new Map(base);
        for (const entrada of datos.tree ?? []) {
          if (entrada.sha === null) mapa.delete(entrada.path);
          else mapa.set(entrada.path, entrada.sha);
        }
        return json(res, 201, { sha: guardarArbol(mapa) });
      }

      if (req.method === 'POST' && que === 'commits') {
        const datos = await leerCuerpo(req);
        if (!arboles.has(datos.tree)) return json(res, 404, { message: 'árbol desconocido' });
        return json(res, 201, {
          sha: guardarCommit({ arbol: datos.tree, padres: datos.parents ?? [], mensaje: datos.message }),
        });
      }

      // PATCH /git/refs/heads/:rama
      if (req.method === 'PATCH' && que === 'refs') {
        const datos = await leerCuerpo(req);
        // Para probar el mensaje de conflicto sin montar una carrera de verdad.
        if (process.env.FALSO_CONFLICTO) {
          return json(res, 422, { message: 'Update is not a fast forward' });
        }
        const commit = commits.get(datos.sha);
        if (!commit) return json(res, 422, { message: 'commit desconocido' });
        // Igual que GitHub: sin `force`, solo avanza si el padre es la cabeza.
        if (!datos.force && !commit.padres.includes(cabeza)) {
          return json(res, 422, { message: 'Update is not a fast forward' });
        }
        cabeza = datos.sha;
        return json(res, 200, { object: { sha: cabeza } });
      }

      return json(res, 404, { message: 'no' });
    }

    /* ── Commits, para la pantalla de estado ── */

    if (seccion === 'commits') {
      const lista = [];
      let sha = cabeza;
      while (sha && lista.length < 20) {
        const commit = commits.get(sha);
        if (!commit) break;
        lista.push({
          commit: { message: commit.mensaje, author: { name: 'panel', date: commit.fecha } },
          html_url: 'https://example.invalid/commit',
        });
        sha = commit.padres[0];
      }
      return json(res, 200, lista);
    }

    /* ── API de contenidos ── */

    if (seccion !== 'contents') return json(res, 404, { message: 'no' });

    const ruta = resto.join('/');
    const archivos = archivosEn(url.searchParams.get('ref'));
    if (!archivos) return json(res, 404, { message: 'ref desconocida' });

    if (req.method === 'GET') {
      if (archivos.has(ruta)) {
        const sha = archivos.get(ruta);
        // Tipo `raw`: el archivo tal cual, sin JSON ni base64. Es por donde lee
        // el catálogo, para no gastar 29 ms de CPU descodificando 288 KB.
        if ((req.headers.accept ?? '').includes('raw')) {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(blobs.get(sha));
        }
        return json(res, 200, { type: 'file', path: ruta, content: b64(blobs.get(sha)), sha });
      }
      const hijos = [...archivos.keys()].filter((k) => k.startsWith(`${ruta}/`));
      if (hijos.length) {
        return json(
          res,
          200,
          hijos.map((k) => ({ type: 'file', name: k.split('/').pop(), path: k, sha: archivos.get(k) })),
        );
      }
      return json(res, 404, { message: 'Not Found' });
    }

    if (req.method === 'PUT') {
      const datos = await leerCuerpo(req);
      const actuales = archivosEn(null);
      const shaActual = actuales.get(ruta);

      // Mismo control que GitHub: si el sha no cuadra, 409.
      if (shaActual && datos.sha !== shaActual) return json(res, 409, { message: 'conflict' });
      if (!shaActual && datos.sha) return json(res, 409, { message: 'conflict' });

      const mapa = new Map(actuales);
      mapa.set(ruta, guardarBlob(deB64(datos.content)));
      cabeza = guardarCommit({
        arbol: guardarArbol(mapa),
        padres: [cabeza],
        mensaje: datos.message,
      });
      return json(res, 200, { content: { path: ruta, sha: mapa.get(ruta) } });
    }

    if (req.method === 'DELETE') {
      const datos = await leerCuerpo(req);
      const actuales = archivosEn(null);
      if (actuales.get(ruta) !== datos.sha) return json(res, 409, { message: 'conflict' });
      const mapa = new Map(actuales);
      mapa.delete(ruta);
      cabeza = guardarCommit({
        arbol: guardarArbol(mapa),
        padres: [cabeza],
        mensaje: datos.message,
      });
      return json(res, 200, {});
    }

    return json(res, 405, { message: 'method' });
  })
  .listen(PUERTO, () => console.log(`github falso en ${PUERTO}`));
