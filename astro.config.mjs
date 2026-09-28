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
  integrations: [
    sitemap({
      filter: (pagina) => !rutasSinIndexar.some((ruta) => new URL(pagina).pathname.startsWith(ruta)),
    }),
  ],
  vite: {
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