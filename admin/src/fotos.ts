/**
 * Las fotos del laboratorio, desde el panel.
 *
 * La lista vive en `src/data/fotos.json` y la lee `src/lib/fotos.ts` del sitio.
 * Antes estaba escrita a mano en tres literales de TypeScript y añadir una foto
 * era editar los tres; se pasó a JSON precisamente para que esto pudiera
 * escribirla sin que un programa tenga que editar código fuente.
 *
 * **El panel no redimensiona nada.** Las tres o cuatro variantes las genera el
 * navegador de quien sube la foto, antes de enviarla: un Worker no puede correr
 * `sharp`, y pedirle a Cloudflare que las genere costaría dinero. Aquí solo se
 * comprueba lo que llega y se escribe en el repositorio.
 */
import { leerArchivo, escribirVarios, leerCabeza, type Config } from './github';

export const RUTA_FOTOS = 'src/data/fotos.json';
export const CARPETA_IMAGENES = 'public/images';

export type Foto = { nombre: string; alt: string; anchos: number[] };
export type DatosFotos = { nota?: string; fotos: Foto[] };

/** Los anchos que el navegador genera. El de 2000 solo si el original da. */
export const ANCHOS = [800, 1400, 2000] as const;

/**
 * Tope por archivo.
 *
 * Una foto de 2000×1500 en WebP de calidad 80 ronda los 400 KB. Un megabyte y
 * medio deja sitio de sobra y corta en seco cualquier cosa que no sea una foto
 * del laboratorio.
 */
export const TOPE_BYTES = 1_500_000;

/**
 * Suelo por archivo.
 *
 * Un WebP de 800×600 de una foto de verdad no baja de un par de miles de bytes.
 * Esto no para a nadie con malas intenciones —quien entra aquí ya puede
 * publicar en el sitio— sino a un fallo del navegador que mande una imagen
 * medio generada: mejor un error en la pantalla que una foto rota en el sitio.
 */
export const SUELO_BYTES = 500;

const NOMBRE_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function leerFotos(cfg: Config) {
  const archivo = await leerArchivo(cfg, RUTA_FOTOS);
  if (!archivo) throw new Error('No se encontró fotos.json en el repositorio.');
  return { datos: JSON.parse(archivo.texto) as DatosFotos, sha: archivo.sha };
}

/**
 * Convierte un texto en un nombre de archivo: sin tildes, sin eñes y sin nada
 * que haya que escapar en una URL.
 */
export function aNombre(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Revisa lo que llega del formulario.
 *
 * Las cabeceras de archivo se comprueban de verdad —`RIFF…WEBP` y el `FF D8` de
 * JPEG— y no por lo que diga el nombre. Lo que se sube acaba publicado en el
 * sitio del laboratorio: que el navegador diga que generó un WebP no es razón
 * para escribir en el repositorio lo que sea que haya mandado.
 */
export function revisarFoto(opciones: {
  nombre: string;
  alt: string;
  ocupados: string[];
  /**
   * De cada archivo, sus primeros bytes y lo que pesa. No el archivo entero:
   * descodificar medio megabyte de base64 para mirarle doce bytes es la clase
   * de gasto que el plan gratuito de Workers no perdona.
   */
  archivos: { ancho: number | 'og'; cabeza: Uint8Array; pesa: number }[];
}): string | null {
  const { nombre, alt, ocupados, archivos } = opciones;

  if (!nombre) return 'Falta el nombre corto de la foto.';
  if (!NOMBRE_VALIDO.test(nombre)) {
    return 'El nombre corto va en minúsculas, sin tildes ni espacios: palabras unidas por guiones.';
  }
  if (ocupados.includes(nombre)) return `Ya hay una foto que se llama «${nombre}».`;

  const descripcion = alt.trim();
  if (descripcion.length < 10) {
    return 'Describa lo que se ve en la foto: es lo que oye quien usa un lector de pantalla.';
  }
  if (descripcion.length > 300) return 'La descripción es demasiado larga.';

  if (!archivos.some((a) => a.ancho === 800) || !archivos.some((a) => a.ancho === 1400)) {
    return 'Faltan variantes de la foto. Vuelva a elegirla.';
  }
  if (!archivos.some((a) => a.ancho === 'og')) {
    return 'Falta la vista previa para WhatsApp. Vuelva a elegir la foto.';
  }

  for (const archivo of archivos) {
    if (archivo.pesa < SUELO_BYTES) {
      return 'Una de las variantes llegó vacía o a medias. Vuelva a elegir la foto.';
    }
    if (archivo.pesa > TOPE_BYTES) {
      return `Una variante pesa más de ${Math.round(TOPE_BYTES / 1000)} KB. Pruebe con una foto más pequeña.`;
    }
    const b = archivo.cabeza;
    const esWebp =
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    const esJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

    if (archivo.ancho === 'og' ? !esJpeg : !esWebp) {
      return 'Lo que llegó no es una imagen del formato esperado.';
    }
  }

  return null;
}

/**
 * Escribe la foto y la lista **en un solo commit**.
 *
 * De uno en uno serían cuatro o cinco, y cada uno dispara una reconstrucción
 * del sitio: cuatro compilaciones para una foto, y entre la primera y la última
 * un rato con los archivos subidos y la lista todavía sin ellos.
 */
export async function guardarFoto(
  cfg: Config,
  opciones: {
    datos: DatosFotos;
    nombre: string;
    archivos: { ancho: number | 'og'; base64: string }[];
    autor: string;
  },
): Promise<void> {
  const cabeza = await leerCabeza(cfg);

  const imagenes = opciones.archivos.map((a) => ({
    ruta:
      a.ancho === 'og'
        ? `${CARPETA_IMAGENES}/og/${opciones.nombre}.jpg`
        : `${CARPETA_IMAGENES}/${opciones.nombre}-${a.ancho}.webp`,
    base64: a.base64,
  }));

  await escribirVarios(cfg, {
    archivos: [
      ...imagenes,
      { ruta: RUTA_FOTOS, texto: `${JSON.stringify(opciones.datos, null, 2)}\n` },
    ],
    cabeza,
    resumen: `Añade la foto ${opciones.nombre}`,
    autor: opciones.autor,
  });
}
