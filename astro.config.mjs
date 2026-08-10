// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

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
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        /*
          Los componentes de Framer importan utilidades de `"framer"`, un
          paquete que solo existe dentro del editor. Se redirige a un
          sustituto local para que funcionen en el sitio publicado.
          Ver src/lib/framer-shim.ts
        */
        framer: fileURLToPath(new URL('./src/lib/framer-shim.ts', import.meta.url)),
      },
    },
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