/**
 * Los emblemas que pueden ir en el centro de un código QR.
 *
 * Cada uno es una imagen cuadrada lista para incrustar. El de ExamLab vive en
 * `emblema.ts` porque son 31 KB de PNG que recorta un script; los demás son SVG
 * pequeños y caben aquí escritos.
 *
 * **Para añadir uno nuevo** —Instagram, Facebook, TikTok— hace falta su SVG
 * oficial, cuadrado y con el fondo ya puesto: un círculo de color detrás del
 * símbolo, como el de WhatsApp. Sin fondo, el emblema se pierde sobre los
 * módulos negros del código. Se convierte con:
 *
 *     node -e "console.log(require('fs').readFileSync('marca.svg').toString('base64'))"
 *
 * y se añade una entrada más a `EMBLEMAS`. No hay que tocar nada más: la
 * pantalla ofrece lo que haya en este objeto.
 *
 * **No se dibujan marcas de memoria.** Si no está el SVG oficial, es mejor «sin
 * emblema» que un parecido: esto acaba impreso en adhesivos y recetarios, y una
 * marca mal dibujada se nota.
 *
 * El de WhatsApp no se inventó aquí: estaba ya en el repositorio, dentro de
 * `public/descargas/qr-whatsapp-cotizacion-marca.svg`, que es un código que el
 * laboratorio generó antes con el script antiguo.
 */
import { EMBLEMA } from './emblema';

export type Emblema = {
  /** Lo que se lee en la pantalla al elegirlo. */
  etiqueta: string;
  /** La imagen, lista para el atributo `href` de un `<image>`. */
  imagen: string;
  /**
   * Dominios a los que le corresponde. La pantalla lo propone sola cuando la
   * dirección apunta a uno de ellos, así nadie tiene que acordarse de
   * cambiarlo — y se puede cambiar igualmente.
   */
  dominios?: string[];
};

export const EMBLEMAS: Record<string, Emblema> = {
  examlab: {
    etiqueta: 'Logotipo de ExamLab',
    imagen: EMBLEMA,
    dominios: ['examlabsas.com'],
  },
  whatsapp: {
    etiqueta: 'Logotipo de WhatsApp',
    imagen: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIj48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1NiIgZmlsbD0iI0ZGRkZGRiIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMjEzLjc2IiBmaWxsPSIjMjVEMzY2Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAxLjMzMzMzMzMzMzMzMzM0IDEwMS4zMzMzMzMzMzMzMzMzNCkgc2NhbGUoMTIuODg4ODg4ODg4ODg4ODg4KSI+PHBhdGggZD0iTTE3LjQ3MiAxNC4zODJjLS4yOTctLjE0OS0xLjc1OC0uODY3LTIuMDMtLjk2Ny0uMjczLS4wOTktLjQ3MS0uMTQ4LS42Ny4xNS0uMTk3LjI5Ny0uNzY3Ljk2Ni0uOTQgMS4xNjQtLjE3My4xOTktLjM0Ny4yMjMtLjY0NC4wNzUtLjI5Ny0uMTUtMS4yNTUtLjQ2My0yLjM5LTEuNDc1LS44ODMtLjc4OC0xLjQ4LTEuNzYxLTEuNjUzLTIuMDU5LS4xNzMtLjI5Ny0uMDE4LS40NTguMTMtLjYwNi4xMzQtLjEzMy4yOTgtLjM0Ny40NDYtLjUyLjE0OS0uMTc0LjE5OC0uMjk4LjI5OC0uNDk3LjA5OS0uMTk4LjA1LS4zNzEtLjAyNS0uNTItLjA3NS0uMTQ5LS42NjktMS42MTItLjkxNi0yLjIwNy0uMjQyLS41NzktLjQ4Ny0uNS0uNjY5LS41MS0uMTczLS4wMDgtLjM3MS0uMDEtLjU3LS4wMS0uMTk4IDAtLjUyLjA3NC0uNzkyLjM3Mi0uMjcyLjI5Ny0xLjA0IDEuMDE2LTEuMDQgMi40NzkgMCAxLjQ2MiAxLjA2NSAyLjg3NSAxLjIxMyAzLjA3NC4xNDkuMTk4IDIuMDk2IDMuMiA1LjA3NyA0LjQ4Ny43MDkuMzA2IDEuMjYyLjQ4OSAxLjY5NC42MjUuNzEyLjIyNyAxLjM2LjE5NSAxLjg3Mi4xMTguNTcxLS4wODUgMS43NTgtLjcxOSAyLjAwNi0xLjQxMy4yNDgtLjY5NC4yNDgtMS4yODkuMTczLTEuNDEzLS4wNzQtLjEyNC0uMjcyLS4xOTgtLjU3LS4zNDdtLTUuNDIxIDcuNDAzaC0uMDA0YTkuODcgOS44NyAwIDAgMS01LjAzMS0xLjM3OGwtLjM2MS0uMjE0LTMuNzQxLjk4Mi45OTgtMy42NDgtLjIzNS0uMzc0YTkuODYgOS44NiAwIDAgMS0xLjUxLTUuMjZjLjAwMS01LjQ1IDQuNDM2LTkuODg0IDkuODg4LTkuODg0IDIuNjQgMCA1LjEyMiAxLjAzIDYuOTg4IDIuODk4YTkuODI1IDkuODI1IDAgMCAxIDIuODkzIDYuOTk0Yy0uMDAzIDUuNDUtNC40MzcgOS44ODQtOS44ODUgOS44ODRtOC40MTMtMTguMjk3QTExLjgxNSAxMS44MTUgMCAwIDAgMTIuMDUgMEM1LjQ5NSAwIC4xNiA1LjMzNS4xNTcgMTEuODkyYzAgMi4wOTYuNTQ3IDQuMTQyIDEuNTg4IDUuOTQ1TC4wNTcgMjRsNi4zMDUtMS42NTRhMTEuODgyIDExLjg4MiAwIDAgMCA1LjY4MyAxLjQ0OGguMDA1YzYuNTU0IDAgMTEuODktNS4zMzUgMTEuODkzLTExLjg5M2ExMS44MjEgMTEuODIxIDAgMCAwLTMuNDgtOC40MTNaIiBmaWxsPSIjRkZGRkZGIi8+PC9nPjwvc3ZnPg==',
    dominios: ['wa.me', 'api.whatsapp.com'],
  },
};

/** `ninguno` es una opción de verdad: un código limpio se lee en más sitios. */
export const SIN_EMBLEMA = 'ninguno';

export const esEmblema = (valor: string): boolean =>
  valor === SIN_EMBLEMA || valor in EMBLEMAS;

/**
 * El emblema que le toca a una dirección cuando nadie ha elegido.
 *
 * Un código de WhatsApp con el logotipo de ExamLab en medio no está mal, pero
 * el de WhatsApp dice de un vistazo qué va a abrir, que es justo para lo que
 * sirve el emblema.
 */
export function emblemaPara(hostname: string): string {
  for (const [clave, emblema] of Object.entries(EMBLEMAS)) {
    if (emblema.dominios?.some((d) => hostname === d || hostname.endsWith('.' + d))) {
      return clave;
    }
  }
  return 'examlab';
}
