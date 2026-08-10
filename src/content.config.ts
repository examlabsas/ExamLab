import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
    /** Ruta desde /public, por ejemplo /images/Fotolaboratorio.png */
    imagen: z.string().optional(),
    imagenAlt: z.string().optional(),
    destacado: z.boolean().default(false),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { noticias };
