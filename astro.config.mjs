// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/*
  Páginas que llevan `noindex` y por tanto no deben anunciarse en el sitemap:
  sería contradictorio pedirle a Google que no las indexe y a la vez
  entregárselas en la lista de URL. La integración no lee la etiqueta de cada
  página, así que se declaran aquí; si se añade otra página con `noindex`,
  hay que sumarla a esta lista.
*/
const rutasSinIndexar = ['/laboratorios-asociados/catalogo'];

// https://astro.build/config
export default defineConfig({
  /*
    Dominio definitivo del laboratorio. Afecta al sitemap, a las URL canónicas
    y a los datos estructurados Schema.org.
    Si se prefiere usar www, cambiar por 'https://www.examlabsas.com'.
  */
  site: 'https://examlabsas.com',

  /*
    Sitio completamente estático: el build genera HTML, CSS e imágenes en
    `dist/`, sin adaptador ni servidor. Esa carpeta funciona en Cloudflare
    Pages, Netlify o cualquier hosting con FTP.
  */
  output: 'static',

  /*
    Precarga de páginas al pasar el cursor o el dedo por encima de un enlace.
    El router ya está puesto, así que esto solo decide cuándo traer el HTML.

    `hover` y no `viewport`: el catálogo tiene 559 enlaces y la estrategia por
    viewport los pediría todos al asomar la lista. Con `hover` se trae uno solo
    y justo el que la persona está a punto de abrir, que en un teléfono es el
    `touchstart` —unos 100 ms de ventaja— y en escritorio bastante más.
  */
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      filter: (pagina) => !rutasSinIndexar.some((ruta) => new URL(pagina).pathname.startsWith(ruta)),
      /*
        `lastmod` ayuda a Google a decidir qué volver a rastrear. Con 581 URL
        en el sitemap, sin esa pista reparte el presupuesto de rastreo a ciegas
        y las páginas que de verdad cambian tardan más en actualizarse.
      */
      lastmod: new Date(),
    }),
  ],
  vite: {
    build: {
      /*
        Astro mete dentro del HTML los scripts por debajo de este límite. Con
        el valor por omisión (4 KB) eso eran ~7 KB repetidos en cada una de las
        583 páginas: cabecera, banner de cookies, estado de apertura, revelado…
        Medido, la portada pasa de 165 a 152 KB y una ficha de examen de 84 a
        77; comprimidas, de 27,9 a 22,4 KB y de 18,5 a 15,5.

        Sacándolos a archivos propios se descargan una vez y el navegador los
        reutiliza en todo el sitio. De paso, los `<script>` en línea bajan de
        14 distintos a 2, que es lo que hace viable una CSP sin `unsafe-inline`
        el día que se quiera cerrar del todo.
      */
      assetsInlineLimit: 0,
    },
    plugins: [tailwindcss()],
    server: {
      /*
        Vite solo responde a hosts conocidos (protección contra rebinding de
        DNS). Al exponer el servidor de desarrollo por un túnel para que el
        cliente revise el avance, el dominio es distinto y lo bloquea: aquí se
        autorizan los dominios de los túneles más usados.

        El punto inicial autoriza también los subdominios, así que sirve aunque
        el túnel genere un nombre aleatorio distinto en cada arranque.
        Solo afecta a `npm run dev`; el sitio publicado no usa nada de esto.
      */
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.loca.lt'],
    },
  },
});