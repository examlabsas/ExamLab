/**
 * Recorta el emblema circular del logotipo y lo deja listo para el panel.
 *
 * El panel genera los códigos QR dentro de un Worker, donde no corre `sharp`.
 * Recortar el emblema sí necesita `sharp`, pero **solo hace falta una vez**: el
 * logotipo no cambia. Así que se hace aquí, en una máquina normal, y el
 * resultado se guarda como texto en `admin/src/emblema.ts`, que el Worker
 * incrusta en el SVG sin procesar ninguna imagen.
 *
 * `src/assets/logo.png` pesa 1,7 MB y es imposible incrustarlo tal cual. Este
 * recorte pesa unos pocos kilobytes y es lo único que se necesita.
 *
 *   node scripts/generar-emblema.mjs [diámetro]
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const raiz = dirname(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
const logo = join(raiz, 'src/assets/logo.png');
const destino = join(raiz, 'admin/src/emblema.ts');

const DIAMETRO = Number(process.argv[2] ?? 256);

/*
  Las mismas medidas que `generar-qr.mjs`: el emblema está sobre un fondo oscuro
  cuadrado y no centrado. Bordes medidos: 5,47 % izquierda, 1,95 % arriba,
  4,1 % derecha y 3,52 % abajo.
*/
const { width = 0, height = 0 } = await sharp(logo).metadata();
const izq = width * 0.0547;
const arriba = height * 0.0195;
const ancho = width - izq - width * 0.041;
const alto = height - arriba - height * 0.0352;
const lado = Math.floor(Math.min(ancho, alto));

const mascara = Buffer.from(
  `<svg width="${DIAMETRO}" height="${DIAMETRO}">` +
    `<circle cx="${DIAMETRO / 2}" cy="${DIAMETRO / 2}" r="${DIAMETRO / 2}" fill="#fff"/></svg>`,
);

const png = await sharp(logo)
  .extract({
    left: Math.round(izq + (ancho - lado) / 2),
    top: Math.round(arriba + (alto - lado) / 2),
    width: lado,
    height: lado,
  })
  .resize(DIAMETRO, DIAMETRO)
  .composite([{ input: mascara, blend: 'dest-in' }])
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

const datos = `data:image/png;base64,${png.toString('base64')}`;

writeFileSync(
  destino,
  `/**
 * El emblema circular del logotipo, listo para incrustar en un SVG.
 *
 * Lo genera \`node scripts/generar-emblema.mjs\` a partir de
 * \`src/assets/logo.png\`, que pesa 1,7 MB y no cabe aquí. Este recorte son
 * ${DIAMETRO}×${DIAMETRO} y ${(datos.length / 1024).toFixed(1)} KB de texto.
 *
 * Está escrito y no calculado porque recortarlo necesita \`sharp\`, que no corre
 * en un Worker — y no hace falta que corra: el logotipo no cambia.
 *
 * NO SE EDITA A MANO. Si cambia el logotipo, se vuelve a ejecutar el script.
 */
export const EMBLEMA_DIAMETRO = ${DIAMETRO};

export const EMBLEMA =
  '${datos}';
`,
);

console.log(`
  Escrito admin/src/emblema.ts

    diámetro    ${DIAMETRO}px
    PNG         ${(png.length / 1024).toFixed(1)} KB
    en base64   ${(datos.length / 1024).toFixed(1)} KB
`);
