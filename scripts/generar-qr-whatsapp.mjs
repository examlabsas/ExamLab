/**
 * Genera el código QR que abre WhatsApp con un mensaje de cotización ya escrito.
 *
 * Al escanearlo se abre el chat con el laboratorio y el texto listo para que el
 * paciente rellene los tres huecos (nombre, ciudad y quién le refirió). No envía
 * nada solo: el paciente ve el mensaje y pulsa enviar.
 *
 * Uso:
 *   node scripts/generar-qr-whatsapp.mjs
 *
 * Sobre el color: el verde claro de WhatsApp (#25D366) NO sirve para los módulos
 * de un QR. Mide 1,98:1 contra el blanco, y un lector necesita separar bien lo
 * oscuro de lo claro; sobre papel, con poca luz o con brillo, falla. Por eso los
 * módulos van en el verde azulado oscuro de la misma paleta oficial (#075E54,
 * 7,67:1) y el verde reconocible se reserva para el disco del centro, que es
 * donde la marca se lee de un vistazo.
 *
 * Cada ejecución decodifica el PNG resultante y comprueba que devuelve el enlace
 * exacto. Con el logo tapando el centro, esa comprobación no es una formalidad.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'public/descargas');

/** Mismo número que usa el sitio (src/lib/whatsapp.ts). */
const NUMERO = '593963820177';

/*
  Los puntos suspensivos son huecos a rellenar. Se dejan largos a propósito:
  un «...» corto pasa desapercibido y el paciente envía el mensaje sin completar.
*/
const MENSAJE = [
  'Hola, buen día. Mi nombre es .............',
  'y soy de la ciudad de .............',
  '',
  'Quisiera saber el precio y la cotización de unos exámenes que debo realizar.',
  'Vengo de parte de .............',
].join('\n');

const url = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAJE)}`;

const TAM = 2048;

/** Verde azulado oscuro de la paleta oficial de WhatsApp. */
const VERDE_OSCURO = '#075E54';
/** Verde claro de WhatsApp: solo para el disco del centro, nunca para módulos. */
const VERDE_MARCA = '#25D366';

/*
  Nivel "H": el código se sigue leyendo con hasta un 30 % oculto. Es el que
  permite tapar el centro con el logo y aguanta impresión sobre adhesivo.
*/
const opciones = {
  errorCorrectionLevel: 'H',
  margin: 4, // los cuatro módulos de margen que pide la norma
  color: { dark: VERDE_OSCURO, light: '#FFFFFF' },
};

/** Proporción del ancho que ocupa el disco verde del centro. */
const PROPORCION_DISCO = 0.24;
/** El glifo dentro del disco. */
const PROPORCION_GLIFO = 0.145;

/** Glifo oficial de WhatsApp, el mismo que usa el sitio (src/lib/iconos.ts). */
const GLIFO =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z';

/**
 * Disco verde con el glifo blanco encima y un aro blanco alrededor.
 * El aro separa el disco de los módulos para que el lector no lo confunda
 * con parte del código.
 */
function insignia(diametro) {
  const aro = diametro * 0.055;
  const r = diametro / 2 - aro / 2;
  const ladoGlifo = diametro * (PROPORCION_GLIFO / PROPORCION_DISCO);
  const escala = ladoGlifo / 24;
  const off = (diametro - ladoGlifo) / 2;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diametro}" height="${diametro}">` +
      `<circle cx="${diametro / 2}" cy="${diametro / 2}" r="${diametro / 2}" fill="#FFFFFF"/>` +
      `<circle cx="${diametro / 2}" cy="${diametro / 2}" r="${r - aro}" fill="${VERDE_MARCA}"/>` +
      `<g transform="translate(${off} ${off}) scale(${escala})">` +
      `<path d="${GLIFO}" fill="#FFFFFF"/></g></svg>`,
  );
}

/** Decodifica el PNG y comprueba que devuelve exactamente el enlace esperado. */
async function verificar(png, etiqueta) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const leido = jsQR(new Uint8ClampedArray(data), info.width, info.height);

  if (!leido) throw new Error(`${etiqueta}: el código no se pudo decodificar`);
  if (leido.data !== url) {
    throw new Error(`${etiqueta}: decodifica a otra cosa\n  esperado: ${url}\n  leído:    ${leido.data}`);
  }
  return leido.data;
}

await mkdir(destino, { recursive: true });

// ── Versión limpia ─────────────────────────────────────────────────────────
const svg = await QRCode.toString(url, { ...opciones, type: 'svg', width: 1024 });
await writeFile(resolve(destino, 'qr-whatsapp-cotizacion.svg'), svg, 'utf8');

const png = await QRCode.toBuffer(url, { ...opciones, type: 'png', width: TAM });
await writeFile(resolve(destino, 'qr-whatsapp-cotizacion.png'), png);
await verificar(png, 'qr-whatsapp-cotizacion.png');

// ── Versión con el glifo de WhatsApp al centro ─────────────────────────────
const dDisco = Math.round(TAM * PROPORCION_DISCO);
const pngMarca = await sharp(png)
  .composite([
    {
      input: insignia(dDisco),
      top: Math.round((TAM - dDisco) / 2),
      left: Math.round((TAM - dDisco) / 2),
    },
  ])
  .png()
  .toBuffer();

await writeFile(resolve(destino, 'qr-whatsapp-cotizacion-marca.png'), pngMarca);
await verificar(pngMarca, 'qr-whatsapp-cotizacion-marca.png');

// El SVG lleva la insignia incrustada, medida en la retícula de módulos.
const modulos = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0);
const insigniaB64 = insignia(512).toString('base64');
const centro = modulos / 2;
const lado = modulos * PROPORCION_DISCO;

const svgMarca = svg.replace(
  '</svg>',
  `<image x="${centro - lado / 2}" y="${centro - lado / 2}" width="${lado}" height="${lado}" ` +
    `href="data:image/svg+xml;base64,${insigniaB64}"/></svg>`,
);
await writeFile(resolve(destino, 'qr-whatsapp-cotizacion-marca.svg'), svgMarca, 'utf8');

console.log('\nQR de WhatsApp generado');
console.log(`  número   ${NUMERO}`);
console.log(`  módulos  ${modulos - 8} × ${modulos - 8}  (sin contar el margen)`);
console.log(`  longitud ${url.length} caracteres`);
console.log('\n  qr-whatsapp-cotizacion.svg / .png          limpio');
console.log('  qr-whatsapp-cotizacion-marca.svg / .png   con el glifo al centro');
console.log('\n  Verificado: ambos decodifican al enlace correcto.');
console.log('\nMensaje que verá el paciente:');
console.log(MENSAJE.split('\n').map((l) => '  │ ' + l).join('\n'));
