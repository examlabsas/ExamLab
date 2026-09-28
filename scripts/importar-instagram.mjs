/**
 * Trae a la portada las publicaciones de Instagram del laboratorio.
 *
 * De cada enlace se saca, sin credenciales ni tokens:
 *   · la imagen de portada, desde la etiqueta `og:image` de la publicación
 *   · el tipo (reel o publicación), desde `og:url`
 *
 * La imagen se descarga y se guarda local en public/images/instagram/ como
 * WebP de 600×800 (3:4, el vertical de Instagram). Esto no es opcional: la
 * URL que devuelve Instagram apunta a su CDN con una firma que caduca en
 * días, así que enlazarla directamente dejaría la portada con huecos en una
 * semana.
 *
 * El pie NO se puede traer así: en la página pública va detrás del muro de
 * sesión y en el embed lo pinta JavaScript. Se escribe a mano en el JSON y
 * este script lo respeta al volver a ejecutarse. Conviene que sea corto: en
 * la tarjeta se ven tres líneas y el texto completo está a un clic.
 *
 * Uso:
 *   npm run instagram                        → actualiza las de `fuentes`
 *   npm run instagram -- <url> [<url>…]      → añade publicaciones nuevas
 *
 * Para quitar una, se borra su enlace de `fuentes` en src/data/instagram.json
 * y se vuelve a ejecutar.
 *
 * Si Instagram cambia sus etiquetas y una publicación falla, el script avisa
 * y conserva lo que ya estaba: nunca deja la portada peor de como la encontró.
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = resolve(raiz, 'public/images/instagram');
const JSON_PATH = resolve(raiz, 'src/data/instagram.json');

/*
  3:4, la proporción vertical de Instagram. La portada que entrega `og:image`
  ya viene en ese encuadre o en cuadrado; recortar a 3:4 respeta el original
  de los reels y solo quita franjas laterales en los cuadrados.
*/
const ANCHO = 600;
const ALTO = 800;
// Instagram entrega las etiquetas Open Graph a los rastreadores, no al
// navegador anónimo: con el agente de un navegador normal responde el muro.
const AGENTE = 'facebookexternalhit/1.1';

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

/** El identificador corto de la publicación, que sirve de nombre de archivo. */
const codigoDe = (url) => url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;

async function leerEtiquetas(url) {
  const respuesta = await fetch(url, { headers: { 'user-agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const html = await respuesta.text();

  const etiqueta = (propiedad) => {
    const encontrado = html.match(
      new RegExp(`<meta property="${propiedad}" content="([^"]*)"`, 'i'),
    );
    // Instagram escapa los `&` de la URL firmada como `&amp;`.
    return encontrado?.[1]?.replaceAll('&amp;', '&') ?? null;
  };

  const imagen = etiqueta('og:image');
  if (!imagen) throw new Error('sin og:image (¿publicación privada o borrada?)');

  return { imagen, canonica: etiqueta('og:url') ?? url };
}

async function descargarYRecortar(urlImagen, codigo) {
  const respuesta = await fetch(urlImagen, { headers: { 'user-agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`la imagen respondió HTTP ${respuesta.status}`);
  const original = Buffer.from(await respuesta.arrayBuffer());

  const salida = resolve(DESTINO, `${codigo}.webp`);
  // Los reels vienen verticales: `attention` centra el recorte donde hay más
  // detalle, que en una portada de reel suele ser la cara o el rótulo.
  await sharp(original)
    .resize({ width: ANCHO, height: ALTO, fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toFile(salida);

  return salida;
}

await mkdir(DESTINO, { recursive: true });

const datos = JSON.parse(await readFile(JSON_PATH, 'utf8'));
const previas = new Map((datos.publicaciones ?? []).map((p) => [p.codigo, p]));

const nuevas = process.argv.slice(2).filter((a) => a.includes('instagram.com'));
const fuentes = [...new Set([...nuevas, ...(datos.fuentes ?? [])])];

if (fuentes.length === 0) {
  console.log('No hay enlaces en `fuentes` de src/data/instagram.json.');
  console.log('Añádalos ahí, o páselos por la línea de comandos:');
  console.log('  npm run instagram -- https://www.instagram.com/p/XXXX/');
  process.exit(0);
}

const publicaciones = [];
let fallos = 0;

for (const fuente of fuentes) {
  const codigo = codigoDe(fuente);
  if (!codigo) {
    console.log(`${fuente}\n  no parece un enlace de publicación; se omite`);
    fallos++;
    continue;
  }

  const previa = previas.get(codigo);

  try {
    const { imagen, canonica } = await leerEtiquetas(fuente);
    const salida = await descargarYRecortar(imagen, codigo);
    const tipo = canonica.includes('/reel/') ? 'reel' : (previa?.tipo ?? 'foto');

    publicaciones.push({
      codigo,
      url: `https://www.instagram.com/p/${codigo}/`,
      imagen: `/images/instagram/${codigo}.webp`,
      tipo,
      pie: previa?.pie ?? '',
      alt: previa?.alt ?? '',
    });

    const pendientes = [!previa?.pie && 'pie', !previa?.alt && 'alt'].filter(Boolean);
    console.log(
      `${codigo.padEnd(14)} ${tipo.padEnd(8)} ${kb((await stat(salida)).size).padStart(7)}` +
        (pendientes.length ? `   ← falta ${pendientes.join(' y ')}` : ''),
    );
  } catch (error) {
    fallos++;
    console.log(`${codigo.padEnd(14)} ERROR    ${error.message}`);
    // Se conserva la entrada anterior: un fallo de red no debe borrarla.
    if (previa) publicaciones.push(previa);
  }
}

await writeFile(
  JSON_PATH,
  `${JSON.stringify({ ...datos, fuentes, publicaciones }, null, 2)}\n`,
  'utf8',
);

console.log(`\n${publicaciones.length} publicaciones → ${JSON_PATH}`);
if (fallos > 0) console.log(`${fallos} con problemas (ver arriba).`);
const sinPie = publicaciones.filter((p) => !p.pie).length;
if (sinPie > 0) console.log(`${sinPie} sin pie: escríbalo en el JSON, se ve al pasar el cursor.`);
