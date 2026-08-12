/**
 * Genera los códigos QR de la página de preparación.
 *
 * Se generan aquí, y no en un servicio web gratuito de los que crean QR, porque
 * esos servicios suelen intercalar un redireccionamiento propio: si mañana
 * cierran o empiezan a cobrar, todos los frascos y afiches ya impresos dejan de
 * funcionar. Estos apuntan directo al dominio del laboratorio.
 *
 * Uso:
 *   node scripts/generar-qr.mjs
 *   node scripts/generar-qr.mjs https://otro-dominio.com/preparacion
 *
 * Cada ejecución verifica que el código resultante se decodifique de vuelta a
 * la URL correcta. El de marca lleva el logo encima, así que esa comprobación
 * deja de ser una formalidad.
 *
 * IMPORTANTE: no mandar a imprimir hasta que el dominio esté conectado y la
 * página responda. Un QR impreso no se puede corregir.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'public/descargas');
const logo = resolve(raiz, 'public/images/logo.png');

/** Dominio definitivo del laboratorio. Solo este genera QR para imprenta. */
const URL_DEFINITIVA = 'https://examlabsas.com/preparacion';

const url = process.argv[2] ?? URL_DEFINITIVA;

/*
  Cualquier dirección que no sea la definitiva produce archivos marcados como
  de pruebas. Así un QR provisional nunca puede acabar en la imprenta por
  confusión de nombres.
*/
const esDefinitiva = url === URL_DEFINITIVA;
const base = esDefinitiva ? 'qr-preparacion' : 'qr-preparacion-pruebas';

const TAM = 2048;

/*
  Nivel "H": el QR se sigue leyendo con hasta un 30 % del código dañado u
  oculto. Es el que permite tapar el centro con el logo, y el adecuado para
  algo que se imprime en adhesivos que se mojan, se rayan y se pegan sobre
  superficies curvas como un frasco.
*/
const opciones = {
  errorCorrectionLevel: 'H',
  // Cuatro módulos es el margen que pide la norma. Con menos, los lectores
  // tienen dificultad para encontrar el código sobre fondos con textura.
  margin: 4,
  color: { dark: '#005A8C', light: '#FFFFFF' },
};

/** Proporción del ancho del QR que ocupa el logo. Por encima de ~0,25 falla. */
const PROPORCION_LOGO = 0.2;
/** Disco blanco bajo el logo, para que no se confunda con los módulos. */
const PROPORCION_DISCO = 0.26;

/**
 * Recorta el emblema circular del logotipo.
 *
 * `logo.png` es el emblema sobre un fondo oscuro cuadrado, y no está centrado:
 * los bordes medidos son 5,47 % izquierda, 1,95 % arriba, 4,1 % derecha y
 * 3,52 % abajo. Se recorta a un cuadrado centrado en el emblema y se enmascara
 * en círculo para que el fondo oscuro de las esquinas desaparezca.
 */
async function emblemaCircular(diametro) {
  const { width = 0, height = 0 } = await sharp(logo).metadata();

  const izq = width * 0.0547;
  const arriba = height * 0.0195;
  const ancho = width - izq - width * 0.041;
  const alto = height - arriba - height * 0.0352;

  const lado = Math.floor(Math.min(ancho, alto));
  const left = Math.round(izq + (ancho - lado) / 2);
  const top = Math.round(arriba + (alto - lado) / 2);

  const mascara = Buffer.from(
    `<svg width="${diametro}" height="${diametro}">` +
      `<circle cx="${diametro / 2}" cy="${diametro / 2}" r="${diametro / 2}" fill="#fff"/></svg>`,
  );

  return sharp(logo)
    .extract({ left, top, width: lado, height: lado })
    .resize(diametro, diametro)
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

const disco = (diametro) =>
  Buffer.from(
    `<svg width="${diametro}" height="${diametro}">` +
      `<circle cx="${diametro / 2}" cy="${diametro / 2}" r="${diametro / 2}" fill="#fff"/></svg>`,
  );

/** Decodifica el PNG resultante y comprueba que devuelve la URL esperada. */
async function verificar(png, etiqueta) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const leido = jsQR(new Uint8ClampedArray(data), info.width, info.height);

  if (!leido) throw new Error(`${etiqueta}: el código no se pudo decodificar`);
  if (leido.data !== url) {
    throw new Error(`${etiqueta}: decodifica a "${leido.data}" y no a "${url}"`);
  }
  return true;
}

await mkdir(destino, { recursive: true });

// ── Versión limpia ────────────────────────────────────────────────────────
const svg = await QRCode.toString(url, { ...opciones, type: 'svg', width: 1024 });
await writeFile(resolve(destino, `${base}.svg`), svg, 'utf8');

const png = await QRCode.toBuffer(url, { ...opciones, type: 'png', width: TAM });
await writeFile(resolve(destino, `${base}.png`), png);
await verificar(png, `${base}.png`);

// ── Versión con el logo ───────────────────────────────────────────────────
const dLogo = Math.round(TAM * PROPORCION_LOGO);
const dDisco = Math.round(TAM * PROPORCION_DISCO);
const emblema = await emblemaCircular(dLogo);

const pngMarca = await sharp(png)
  .composite([
    { input: disco(dDisco), top: Math.round((TAM - dDisco) / 2), left: Math.round((TAM - dDisco) / 2) },
    { input: emblema, top: Math.round((TAM - dLogo) / 2), left: Math.round((TAM - dLogo) / 2) },
  ])
  .png()
  .toBuffer();

await writeFile(resolve(destino, `${base}-marca.png`), pngMarca);
await verificar(pngMarca, `${base}-marca.png`);

/*
  Para el SVG se incrusta el emblema como imagen en base64. Se mide en módulos,
  no en píxeles: el viewBox del QR usa la retícula del código.
*/
const modulos = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0);
const emblemaSvg = (await emblemaCircular(512)).toString('base64');
const centro = modulos / 2;
const rDisco = (modulos * PROPORCION_DISCO) / 2;
const ladoLogo = modulos * PROPORCION_LOGO;

const svgMarca = svg.replace(
  '</svg>',
  `<circle cx="${centro}" cy="${centro}" r="${rDisco}" fill="#FFFFFF"/>` +
    `<image x="${centro - ladoLogo / 2}" y="${centro - ladoLogo / 2}" ` +
    `width="${ladoLogo}" height="${ladoLogo}" ` +
    `href="data:image/png;base64,${emblemaSvg}"/></svg>`,
);
await writeFile(resolve(destino, `${base}-marca.svg`), svgMarca, 'utf8');

console.log(`\nQR generados para ${url}`);
console.log(`  ${base}.svg / .png             limpio`);
console.log(`  ${base}-marca.svg / .png       con el logo al centro`);
console.log('\n  Verificado: ambos decodifican a la URL correcta.');

if (esDefinitiva) {
  console.log('\n  Son los DEFINITIVOS. No enviarlos a imprenta hasta que');
  console.log('  examlabsas.com apunte al sitio nuevo y la página responda.');
} else {
  console.log('\n  DE PRUEBAS: para revisar y mostrar, no para imprimir.');
}
