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
     * Nombre de una foto de src/lib/fotos.ts (por ejemplo `microscopio`).
     * El texto alternativo sale de ahí; un nombre que no exista falla al compilar.
     */
    foto: z.enum(NOMBRES_FOTOS).optional(),
    destacado: z.boolean().default(false),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { noticias };
