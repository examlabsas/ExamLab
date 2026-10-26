/**
 * Códigos QR del laboratorio, generados dentro del Worker.
 *
 * El script `scripts/generar-qr.mjs` hace esto mismo en PNG, y no se puede
 * traer tal cual: usa `sharp` para pegar el emblema encima y `jsQR` para
 * comprobar que el código resultante vuelve a leerse. Ninguna de las dos corre
 * en un Worker.
 *
 * La salida aquí es **SVG**, y eso resuelve las dos cosas a la vez:
 *
 * - Montar el emblema sobre el código deja de ser procesar imágenes y pasa a ser
 *   escribir texto: un círculo blanco, una imagen recortada con `clipPath`.
 * - Un SVG es vectorial, así que la imprenta lo amplía a cualquier tamaño sin
 *   que se pixele. Para algo que acaba en un afiche, es mejor que el PNG.
 *
 * Lo que no se puede hacer aquí es decodificar el código para verificarlo. Se
 * cubre por dos lados: el emblema ocupa la misma proporción que ya está probada
 * en imprenta —por debajo de lo que tolera el nivel de corrección— y la pantalla
 * enseña el código en grande para escanearlo con el móvil antes de descargarlo,
 * que es la prueba que de verdad importa.
 */
import crear from 'qrcode/lib/core/qrcode.js';
import { EMBLEMAS, emblemaPara, SIN_EMBLEMA } from './emblemas';

/** El dominio del laboratorio, para los textos de la pantalla. */
export const DOMINIO = 'examlabsas.com';

/**
 * Los destinos que se dan por buenos para imprenta.
 *
 * Cualquier otro sale marcado como «pruebas» en el nombre del archivo, para que
 * un código provisional no acabe impreso por una confusión de nombres. `wa.me`
 * entra porque el enlace de WhatsApp del laboratorio es uno de los códigos que
 * ya se imprimen — tiene su propio script hoy.
 */
const DESTINOS = new Set([DOMINIO, 'wa.me']);

/** Azul de la marca, el mismo del script que ya imprimió. */
const TINTA = '#005A8C';

/**
 * Margen en módulos. Cuatro es lo que pide la norma: con menos, los lectores
 * tienen dificultad para encontrar el código sobre fondos con textura.
 */
const MARGEN = 4;

/**
 * Proporción del ancho total que ocupan el emblema y el disco blanco de debajo.
 * Son las mismas del script. Por encima de ~0,25 el código deja de leerse, y
 * estas están medidas por debajo a propósito.
 */
const PROPORCION_EMBLEMA = 0.2;
const PROPORCION_DISCO = 0.26;

export type Qr = {
  svg: string;
  modulos: number;
  archivo: string;
  esDefinitiva: boolean;
  /** El emblema que se usó, para que la pantalla marque la opción elegida. */
  emblema: string;
};

/**
 * Nombre del archivo a partir de la dirección.
 *
 * «/» → inicio · «/preparacion» → preparacion · «/a/b» → a-b. Lo que no apunte
 * al dominio del laboratorio se marca como de pruebas, para que un código
 * provisional no acabe en la imprenta por una confusión de nombres.
 */
export function nombreDeArchivo(url: URL, pedido?: string): { archivo: string; esDefinitiva: boolean } {
  const esDefinitiva = DESTINOS.has(url.hostname);
  const partes = url.pathname.split('/').filter(Boolean);
  const base = pedido?.trim()
    ? pedido.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    : partes.length
      ? partes.join('-').toLowerCase()
      : 'inicio';
  return { archivo: `qr-${base || 'inicio'}${esDefinitiva ? '' : '-pruebas'}`, esDefinitiva };
}

export function generar(direccion: string, nombrePedido?: string, emblemaPedido?: string): Qr {
  const url = new URL(direccion);
  const { archivo, esDefinitiva } = nombreDeArchivo(url, nombrePedido);

  /*
    Sin elección, el emblema lo decide el destino: un código de wa.me sale con
    el de WhatsApp y uno del sitio con el de ExamLab. Es lo que alguien
    elegiría, y así no hay que acordarse.
  */
  const emblema =
    emblemaPedido && (emblemaPedido === SIN_EMBLEMA || emblemaPedido in EMBLEMAS)
      ? emblemaPedido
      : emblemaPara(url.hostname);
  const imagen = EMBLEMAS[emblema]?.imagen;

  /*
    Nivel «H»: el código se sigue leyendo con hasta un 30 % oculto o dañado. Es
    el que permite tapar el centro con el emblema, y el adecuado para algo que
    se imprime en adhesivos que se mojan, se rayan y se pegan sobre superficies
    curvas como un frasco.
  */
  const qr = crear.create(url.toString(), { errorCorrectionLevel: 'H' });
  const n: number = qr.modules.size;
  const datos: Uint8Array = qr.modules.data;
  const total = n + MARGEN * 2;

  /*
    Los módulos se juntan por filas en un solo trazo. Un rectángulo por módulo
    daría más de mil elementos y un archivo cinco veces mayor, que para algo que
    se manda a una imprenta por correo importa.
  */
  const trazos: string[] = [];
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!datos[y * n + x]) {
        x++;
        continue;
      }
      let ancho = 1;
      while (x + ancho < n && datos[y * n + x + ancho]) ancho++;
      trazos.push(`M${x + MARGEN} ${y + MARGEN}h${ancho}v1h-${ancho}z`);
      x += ancho;
    }
  }

  const centro = total / 2;
  const radioDisco = (total * PROPORCION_DISCO) / 2;
  const ladoEmblema = total * PROPORCION_EMBLEMA;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="2048" height="2048" shape-rendering="crispEdges">
<title>Código QR de ${esc(url.toString())}</title>
<rect width="${total}" height="${total}" fill="#FFFFFF"/>
<path fill="${TINTA}" d="${trazos.join('')}"/>
${
  // Sin emblema no se dibuja ni el disco blanco: un código limpio aprovecha
  // toda la corrección de errores y se lee en más sitios.
  imagen
    ? `<circle cx="${centro}" cy="${centro}" r="${radioDisco.toFixed(3)}" fill="#FFFFFF"/>
<clipPath id="emblema"><circle cx="${centro}" cy="${centro}" r="${(ladoEmblema / 2).toFixed(3)}"/></clipPath>
<image href="${imagen}" x="${(centro - ladoEmblema / 2).toFixed(3)}" y="${(centro - ladoEmblema / 2).toFixed(3)}" width="${ladoEmblema.toFixed(3)}" height="${ladoEmblema.toFixed(3)}" clip-path="url(#emblema)"/>`
    : ''
}
</svg>`;

  return { svg, modulos: n, archivo, esDefinitiva, emblema };
}

/** `shape-rendering` aparte, el único texto que entra aquí es la dirección. */
const esc = (texto: string): string =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Qué tiene de malo la dirección escrita, si algo. */
export function revisarDireccion(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return 'Escriba la dirección que debe abrir el código.';
  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return 'Eso no es una dirección completa. Tiene que empezar por https://.';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'La dirección tiene que ser http o https.';
  }
  if (limpio.length > 300) return 'Esa dirección es demasiado larga para un código legible.';
  return null;
}
