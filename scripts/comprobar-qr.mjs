/**
 * Comprueba que un código QR se decodifica a la dirección que debería.
 *
 * El panel genera los códigos dentro de un Worker, donde no se puede
 * decodificar una imagen para verificarla: eso necesita rasterizar y leer
 * píxeles. Allí la comprobación la hace una persona escaneando con el móvil,
 * que es lo que de verdad importa.
 *
 * Esto es la red de seguridad mecánica, para pasarla aquí antes de mandar algo
 * a la imprenta. Rasteriza el SVG a varios tamaños —incluido uno pequeño, que es
 * donde fallan los códigos con el centro tapado— y comprueba que los cuatro se
 * leen y dicen lo mismo.
 *
 *   node scripts/comprobar-qr.mjs <archivo.svg> [dirección esperada]
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import jsQR from 'jsqr';

const archivo = process.argv[2];
const esperada = process.argv[3];

if (!archivo) {
  console.error('\n  Uso: node scripts/comprobar-qr.mjs <archivo.svg> [dirección esperada]\n');
  process.exit(1);
}

const svg = readFileSync(archivo);

/*
 * De grande a pequeño. El de 160 px no es un tamaño de imprenta: está para
 * detectar un código que solo se lee en condiciones ideales, que es como se
 * manifiesta un emblema demasiado grande.
 */
const TAMANOS = [2048, 600, 300, 160];

let fallos = 0;
let leida = null;

for (const lado of TAMANOS) {
  const { data, info } = await sharp(svg, { density: 300 })
    .resize(lado, lado)
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const resultado = jsQR(new Uint8ClampedArray(data), info.width, info.height);

  if (!resultado) {
    console.log(`  ${String(lado).padStart(5)} px   NO SE LEE`);
    fallos++;
    continue;
  }
  if (leida === null) leida = resultado.data;
  else if (leida !== resultado.data) {
    console.log(`  ${String(lado).padStart(5)} px   LEE OTRA COSA: ${resultado.data}`);
    fallos++;
    continue;
  }
  console.log(`  ${String(lado).padStart(5)} px   se lee`);
}

console.log();

if (fallos) {
  console.error(`  ${fallos} de ${TAMANOS.length} tamaños fallaron. NO lo mande a imprenta.\n`);
  process.exit(1);
}

console.log(`  Abre: ${leida}`);

if (esperada && leida !== esperada) {
  console.error(`
  PERO NO ES LA QUE SE ESPERABA:

    esperada  ${esperada}
    leída     ${leida}
`);
  process.exit(1);
}

console.log(`  ${esperada ? 'Coincide con lo esperado. ' : ''}Listo para imprenta.\n`);
