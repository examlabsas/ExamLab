/**
 * Genera el código QR de la página de preparación.
 *
 * Se genera aquí, y no en un servicio web gratuito de los que crean QR, porque
 * esos servicios suelen intercalar un redireccionamiento propio: si mañana
 * cierran o empiezan a cobrar, todos los frascos y afiches ya impresos dejan de
 * funcionar. Este QR apunta directo al dominio del laboratorio.
 *
 * Uso:
 *   node scripts/generar-qr.mjs
 *   node scripts/generar-qr.mjs https://otro-dominio.com/preparacion
 *
 * IMPORTANTE: no mandar a imprimir hasta que el dominio esté conectado y la
 * página responda. Un QR impreso no se puede corregir.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'public/descargas');

/** Dominio definitivo del laboratorio. Solo este genera el QR para imprenta. */
const URL_DEFINITIVA = 'https://examlabsas.com/preparacion';

const url = process.argv[2] ?? URL_DEFINITIVA;

/*
  Cualquier dirección que no sea la definitiva produce un archivo aparte,
  marcado como de pruebas. Así un QR provisional —el de pages.dev, por
  ejemplo— nunca puede acabar en la imprenta por confusión de archivos.
*/
const esDefinitiva = url === URL_DEFINITIVA;
const nombre = esDefinitiva ? 'qr-preparacion' : 'qr-preparacion-pruebas';

/*
  Nivel de corrección "H": el QR sigue leyéndose con hasta un 30 % del código
  dañado. Es el adecuado para algo que se imprime en adhesivos que se mojan,
  se rayan y se pegan sobre superficies curvas como un frasco.
*/
const opciones = {
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#005A8C', light: '#FFFFFF' },
};

await mkdir(destino, { recursive: true });

// SVG: es el formato que pide la imprenta, escala sin perder definición.
const svg = await QRCode.toString(url, { ...opciones, type: 'svg', width: 1024 });
await writeFile(resolve(destino, `${nombre}.svg`), svg, 'utf8');

// PNG de 2048 px: para WhatsApp, Word y cualquier cosa que no acepte SVG.
await QRCode.toFile(resolve(destino, `${nombre}.png`), url, {
  ...opciones,
  type: 'png',
  width: 2048,
});

console.log(`\nQR generado para ${url}`);
console.log(`  public/descargas/${nombre}.svg`);
console.log(`  public/descargas/${nombre}.png`);

if (esDefinitiva) {
  console.log('\n  Este es el QR DEFINITIVO. No enviarlo a imprenta hasta que');
  console.log('  examlabsas.com apunte al sitio nuevo y la página responda.');
} else {
  console.log('\n  QR DE PRUEBAS: sirve para revisar y mostrar, no para imprimir.');
}
