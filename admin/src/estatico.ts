/**
 * Lo que el panel sirve además de HTML: la tipografía, el emblema y el guion.
 *
 * Los archivos viajan dentro del Worker como módulos `Data` —así los declara
 * `wrangler.jsonc`— y salen por estas rutas. No hay nada de fuera: la cabecera
 * de seguridad sigue siendo `default-src 'self'`, sin excepciones nuevas, y el
 * panel no le cuenta a ningún tercero quién lo abre ni desde dónde.
 *
 * Son 192 KB en total, que se piden una vez y se quedan cacheados un año. La
 * alternativa era el tipo del sistema, que es lo que había: el panel parecía de
 * otra casa que el sitio, y eso lo paga la persona que usa los dos.
 *
 * Solo el subconjunto latino de Montserrat. El sitio sirve además `latin-ext`,
 * que empieza en U+0100: el español entero cabe por debajo —ñ, tildes, ¿ y ¡
 * están en U+0000-00FF— y ese archivo pesa el doble.
 */
import montserrat400 from '../activos/montserrat-400.woff2';
import montserrat600 from '../activos/montserrat-600.woff2';
import montserrat700 from '../activos/montserrat-700.woff2';
import emblema96 from '../activos/emblema-96.webp';
import emblema180 from '../activos/emblema-180.png';
import emblema192 from '../activos/emblema-192.png';
import { GUION } from './paginas/guion';

/**
 * Huella corta del contenido, para poder cachear el guion para siempre sin que
 * un despliegue quede servido con la versión vieja.
 *
 * FNV-1a de 32 bits en base 36. No es criptográfica y no tiene por qué serlo:
 * solo distingue una versión del guion de la siguiente.
 */
function huella(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** La ruta del guion lleva su huella, así que cambia cuando cambia el guion. */
export const RUTA_GUION = `/guion.${huella(GUION)}.js`;

/**
 * Las fuentes y el emblema no llevan huella en el nombre, igual que en el
 * sitio. Son archivos que no cambian: si alguna vez se sustituye uno, hay que
 * cambiarle el nombre aquí y en la hoja de estilos, o los navegadores que ya lo
 * tengan seguirán con el viejo durante un año.
 */
type Activo = { cuerpo: ArrayBuffer | string; tipo: string };

export const ACTIVOS: Record<string, Activo> = {
  '/fuentes/montserrat-400.woff2': { cuerpo: montserrat400, tipo: 'font/woff2' },
  '/fuentes/montserrat-600.woff2': { cuerpo: montserrat600, tipo: 'font/woff2' },
  '/fuentes/montserrat-700.woff2': { cuerpo: montserrat700, tipo: 'font/woff2' },
  '/emblema.webp': { cuerpo: emblema96, tipo: 'image/webp' },
  '/emblema-180.png': { cuerpo: emblema180, tipo: 'image/png' },
  '/emblema-192.png': { cuerpo: emblema192, tipo: 'image/png' },
  [RUTA_GUION]: { cuerpo: GUION, tipo: 'text/javascript; charset=utf-8' },
};

/**
 * El manifiesto, para que el panel se pueda añadir a la pantalla de inicio del
 * teléfono con su nombre y su emblema en vez de con una captura y la dirección.
 * Se usa desde el mostrador todos los días; abrirlo como una aplicación ahorra
 * el paso por el navegador.
 */
export const MANIFIESTO = JSON.stringify({
  name: 'Panel ExamLab',
  short_name: 'Panel',
  description: 'Noticias, catálogos y datos del sitio de ExamLab.',
  lang: 'es-EC',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#f4f7f9',
  theme_color: '#00456b',
  icons: [
    { src: '/emblema-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/emblema-180.png', sizes: '180x180', type: 'image/png' },
  ],
});
