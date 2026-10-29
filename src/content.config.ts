import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { NOMBRES_FOTOS } from './lib/fotos';

/** Blog de noticias: un archivo Markdown por artículo en src/content/noticias. */
const noticias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/noticias' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    categoria: z.string(),
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    autor: z.string().default('Equipo ExamLab'),
    /**
     * Nombre de una foto de `src/data/fotos.json` (por ejemplo `microscopio`).
     * El texto alternativo sale de ahí; un nombre que no exista falla al compilar.
     *
     * El `as` es porque la lista ya no es una tupla de literales sino un array
     * que sale del JSON. `z.enum` necesita la forma de tupla para el tipo, pero
     * **la comprobación en tiempo de compilación es la misma**: un nombre que
     * no esté en la lista rompe la compilación igual que antes, que es lo que
     * protege de verdad.
     */
    foto: z.enum(NOMBRES_FOTOS as [string, ...string[]]).optional(),
    destacado: z.boolean().default(false),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { noticias };
