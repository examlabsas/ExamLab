/**
 * Convierte las fotos originales del laboratorio en las variantes que usa el
 * sitio. Las originales pesan 1–2 MB cada una y no se publican: quedan en
 * `fotos-laboratorio/` (fuera de `public/` y fuera de git).
 *
 * De cada foto salen tres archivos en public/images/:
 *   <nombre>-800.webp   → móvil (800×600)
 *   <nombre>-1400.webp  → escritorio y pantallas 2× (1400×1050)
 *   og/<nombre>.jpg     → vista previa en WhatsApp y redes (1200×630)
 *
 * Todas las variantes se recortan a 4:3 para que `<img width height>` sea el
 * mismo en todas y el navegador reserve el espacio antes de descargarlas. La
 * vista previa va en JPG y por debajo de 300 KB porque WhatsApp no muestra
 * imágenes más pesadas ni, en algunas versiones, WebP.
 *
 * Al procesar se descartan los metadatos EXIF (modelo del teléfono, fecha,
 * y GPS si lo hubiera): son fotos del personal y no hace falta publicar eso.
 * La orientación EXIF sí se aplica antes de descartarla, porque las fotos de
 * teléfono suelen venir giradas.
 *
 * Uso:
 *   npm run imagenes
 *
 * Para añadir una foto: copiarla a fotos-laboratorio/usadas/ con un nombre
 * descriptivo en kebab-case, añadirla a FOTOS y también a NOMBRES_FOTOS en
 * src/lib/fotos.ts, y volver a ejecutar.
 */
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = resolve(raiz, 'fotos-laboratorio/usadas');
const DESTINO = resolve(raiz, 'public/images');

/*
  Tres anchos. El de 2000 es para pantallas grandes: en un iMac de 24", con
  `sizes="50vw"` y densidad 2, la foto de portada necesita unos 2240 px reales
  y recibía 1400 estirados casi el doble. Se notaba blanda, que es justo lo que
  el laboratorio comentó al verla.

  No todas las fotos llegan: las que vengan por debajo de un ancho se saltan
  esa variante en vez de ampliarse, que solo añadiría peso sin añadir detalle.
*/
const ANCHOS = [800, 1400, 2000];
const PROPORCION = 4 / 3;
const OG = { ancho: 1200, alto: 630, pesoMaximo: 300 * 1024 };

/**
 * `recorte` se indica en píxeles de la foto original (ya orientada) cuando el
 * encuadre automático no sirve: por ejemplo, para sacar un 4:3 de una foto
 * vertical sin cortar la cara. `posicion` es el punto de interés para el
 * recorte automático de sharp: 'centre', 'top', 'attention' (busca caras y
 * zonas de detalle), etc.
 */
const FOTOS = [
  { nombre: 'matriz-ficoa-fachada', archivo: 'matriz-ficoa-fachada.jpeg', posicion: 'centre' },
  {
    nombre: 'laboratorio-equipo-trabajando',
    archivo: 'laboratorio-equipo-trabajando.jpeg',
    posicion: 'centre',
  },
  {
    nombre: 'recepcion-de-muestras',
    archivo: 'recepcion-de-muestras.jpeg',
    // Foto vertical (3000×4000): se toma la franja con la cara, las manos y
    // la gradilla. 3000×2250 es exactamente 4:3.
    recorte: { left: 0, top: 650, width: 3000, height: 2250 },
    posicion: 'centre',
  },
  { nombre: 'analizador-automatizado', archivo: 'analizador-automatizado.jpeg', posicion: 'centre' },
  { nombre: 'revision-de-muestra', archivo: 'revision-de-muestra.jpeg', posicion: 'centre' },
  { nombre: 'microscopio', archivo: 'microscopio.png', posicion: 'centre' },
  // 3754×2579 (1,46:1): al recortar a 4:3 se pierden los bordes, la persona
  // está centrada así que no afecta.
  { nombre: 'tecnologa-con-tubos', archivo: 'tecnologa-con-tubos.jpeg', posicion: 'centre' },
  { nombre: 'tecnologa-en-analizador', archivo: 'tecnologa-en-analizador.jpeg', posicion: 'centre' },
  { nombre: 'pipeteo-de-muestra', archivo: 'pipeteo-de-muestra.jpeg', posicion: 'centre' },
];

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function procesar(foto) {
  const ruta = resolve(ORIGEN, foto.archivo);
  const base = sharp(ruta).rotate(); // aplica la orientación EXIF y luego la descarta
  const meta = await base.metadata();
  const origen = foto.recorte ? base.clone().extract(foto.recorte) : base.clone();

  const lineas = [`${foto.nombre}  (original ${meta.width}×${meta.height})`];

  for (const ancho of ANCHOS) {
    // Ampliar una foto no inventa detalle: si el original no da, se omite.
    const anchoDisponible = foto.recorte ? foto.recorte.width : (meta.width ?? 0);
    if (ancho > anchoDisponible) {
      lineas.push(`  ${ancho}px omitido (el original solo da ${anchoDisponible}px)`);
      continue;
    }

    const alto = Math.round(ancho / PROPORCION);
    const salida = resolve(DESTINO, `${foto.nombre}-${ancho}.webp`);
    await origen
      .clone()
      .resize({ width: ancho, height: alto, fit: 'cover', position: foto.posicion })
      .webp({ quality: 80 })
      .toFile(salida);
    lineas.push(`  ${ancho}×${alto} webp  ${kb((await stat(salida)).size)}`);
  }

  // Vista previa para redes: se baja la calidad hasta cumplir el límite de
  // WhatsApp, que es lo que más se comparte en Ecuador.
  const salidaOg = resolve(DESTINO, 'og', `${foto.nombre}.jpg`);
  let calidad = 82;
  let peso;
  do {
    await origen
      .clone()
      .resize({ width: OG.ancho, height: OG.alto, fit: 'cover', position: foto.posicion })
      .jpeg({ quality: calidad, mozjpeg: true })
      .toFile(salidaOg);
    peso = (await stat(salidaOg)).size;
    calidad -= 6;
  } while (peso > OG.pesoMaximo && calidad >= 50);
  lineas.push(`  ${OG.ancho}×${OG.alto} jpg   ${kb(peso)} (calidad ${calidad + 6})`);

  console.log(lineas.join('\n'));
}

await mkdir(resolve(DESTINO, 'og'), { recursive: true });
for (const foto of FOTOS) await procesar(foto);
console.log(`\n${FOTOS.length} fotos → ${DESTINO}`);
