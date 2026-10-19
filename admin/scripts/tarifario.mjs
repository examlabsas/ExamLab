/**
 * Lleva el tarifario de asociados entre el archivo privado y el KV de Cloudflare.
 *
 * El panel no puede leer `src/data/catalogo-asociados.privado.json`: solo habla
 * con GitHub, y ese archivo está fuera de git a propósito, porque el despliegue
 * va por repositorio y los precios mayoristas no pueden viajar ahí. Por eso los
 * precios viven en el KV, y estos dos comandos son el puente:
 *
 *   npm run tarifario:cargar    archivo privado  →  KV   (la primera vez)
 *   npm run tarifario:guardar   KV  →  archivo privado   (antes de reimportar
 *                                                        el Excel, para no
 *                                                        perder lo corregido
 *                                                        desde el panel)
 *
 * Por defecto trabajan contra el KV **local** de `wrangler dev`. Para tocar el
 * de producción hay que añadir `--remoto` a propósito: subir un tarifario entero
 * sin querer no debería costar una tecla.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

const aqui = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const admin = dirname(aqui);
const raiz = dirname(admin);

const PRIVADO = join(raiz, 'src/data/catalogo-asociados.privado.json');
const PUBLICO = join(raiz, 'src/data/catalogo-asociados.json');
const CLAVE = 'tarifario';

const modo = process.argv[2];
const remoto = process.argv.includes('--remoto');
const donde = remoto ? '--remote' : '--local';

if (modo !== 'cargar' && modo !== 'guardar') {
  console.error('\n  Uso: node scripts/tarifario.mjs cargar|guardar [--remoto]\n');
  process.exit(1);
}

/**
 * La misma clave que `claveDe` en `src/asociados.ts`. Se repite porque aquel es
 * TypeScript y esto un script suelto; si alguna vez dejan de coincidir, los
 * precios se quedan huérfanos sin que nada falle, así que al final se comprueba
 * que cuadren y se avisa.
 */
const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const claveDe = (p) => `${normalizar(p.especialidad)}|${normalizar(p.nombre)}`;

/** Llama al wrangler instalado con este mismo Node, sin pasar por npx ni shell. */
function wrangler(args, opciones = {}) {
  return spawnSync(
    process.execPath,
    [join(admin, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args],
    { cwd: admin, ...opciones },
  );
}

if (modo === 'cargar') {
  let privado;
  try {
    privado = JSON.parse(readFileSync(PRIVADO, 'utf8'));
  } catch {
    console.error(`
  No se encontró el archivo con los precios:

    ${PRIVADO}

  Es el que genera 'node scripts/importar-catalogo-asociados.mjs <excel>' y que
  queda fuera de git. Sin él no hay tarifario que cargar.
`);
    process.exit(1);
  }

  const tarifario = {};
  let sinPrecio = 0;
  for (const p of privado.pruebas) {
    if (typeof p.precio === 'number') tarifario[claveDe(p)] = p.precio;
    else sinPrecio++;
  }

  const temporal = join(aqui, 'tarifario-temporal.json');
  writeFileSync(temporal, JSON.stringify(tarifario));
  const res = wrangler(
    ['kv', 'key', 'put', CLAVE, `--path=${temporal}`, '--binding=PANEL', donde],
    { stdio: 'inherit' },
  );
  unlinkSync(temporal);
  if (res.status !== 0) process.exit(1);

  console.log(`
  ──────────────────────────────────────────────────────────────
  Tarifario cargado en el KV ${remoto ? 'de PRODUCCIÓN' : 'local'}.

    precios        ${Object.keys(tarifario).length}
    sin precio     ${sinPrecio}

  A partir de ahora se editan desde el panel, en /asociados. Antes de
  reimportar el Excel, pase 'npm run tarifario:guardar' para no perder
  lo que se haya corregido desde allí.
  ──────────────────────────────────────────────────────────────
`);
}

if (modo === 'guardar') {
  const res = wrangler(['kv', 'key', 'get', CLAVE, '--binding=PANEL', donde], {
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  if (res.status !== 0) process.exit(1);

  const crudo = String(res.stdout ?? '').trim();
  if (!crudo) {
    console.error('\n  El KV no tiene ningún tarifario guardado.\n');
    process.exit(1);
  }
  const tarifario = JSON.parse(crudo);

  // La cartera se toma del archivo versionado, que es el que manda sobre qué
  // pruebas existen; el privado solo aporta los importes.
  const publico = JSON.parse(readFileSync(PUBLICO, 'utf8'));
  let conPrecio = 0;
  const pruebas = publico.pruebas.map((p) => {
    const precio = tarifario[claveDe(p)];
    if (typeof precio === 'number') conPrecio++;
    return { ...p, precio: typeof precio === 'number' ? precio : null };
  });

  const sobran = Object.keys(tarifario).filter(
    (k) => !publico.pruebas.some((p) => claveDe(p) === k),
  );

  writeFileSync(
    PRIVADO,
    JSON.stringify(
      {
        ...publico,
        fuente: 'Plantilla Asociados · lista de precios para laboratorios',
        pruebas,
      },
      null,
      1,
    ),
  );

  console.log(`
  ──────────────────────────────────────────────────────────────
  Escrito ${PRIVADO}

    pruebas        ${pruebas.length}
    con precio     ${conPrecio}
    sin precio     ${pruebas.length - conPrecio}
${
  sobran.length
    ? `
  Hay ${sobran.length} precio(s) en el KV de pruebas que ya no están en la
  cartera. No se pierden —siguen en el KV— pero tampoco se escriben aquí.`
    : ''
}
  Este archivo NO se versiona. Compruébelo antes de reimportar el Excel.
  ──────────────────────────────────────────────────────────────
`);
}
