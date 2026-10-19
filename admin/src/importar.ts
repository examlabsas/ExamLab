/**
 * Carga del catálogo desde una hoja de cálculo.
 *
 * El laboratorio entrega su cartera en Excel, así que esta es la única forma
 * realista de que los 559 exámenes se mantengan al día. Pero también es la
 * operación más peligrosa del panel: una hoja mal pegada puede dejar fuera
 * doscientos exámenes y nadie se enteraría hasta que un paciente no encuentra el
 * suyo. Por eso **nunca se escribe sin enseñar antes qué va a cambiar**.
 *
 * Se lee texto separado por comas, punto y coma o tabuladores — lo que sale de
 * «Guardar como CSV» y lo que sale de copiar y pegar un rango de Excel. El
 * archivo propio del laboratorio es un .xls binario de Excel 97, y leer eso aquí
 * pediría un analizador de formato binario dentro de la puerta de
 * administración: justo donde no conviene abrir un analizador de archivos que
 * sube alguien. Excel convierte a CSV en un clic, y copiar y pegar no necesita
 * ni eso.
 */
import { normalizar, SIN_DATO } from '../../src/lib/examenes-comun';
import {
  CAMPOS_HOJA,
  limpiar,
  slugLibre,
  type CampoHoja,
  type Examen,
  type Info,
  type InfoExamen,
} from './catalogo';

/* ─── Leer el texto ──────────────────────────────────────────────────────── */

/**
 * Nombre comparable: sin acentos, sin mayúsculas y sin puntuación.
 *
 * Es lo que permite reconocer que «AC. ANTI SIFILIS IgG» y «AC ANTI SÍFILIS
 * IGG» son el mismo examen. Sin esto, corregir una tilde en el Excel se leería
 * como un examen que se va y otro que llega, y la ficha cambiaría de dirección.
 */
export const clave = (texto: string): string =>
  normalizar(texto).replace(/[^a-z0-9]+/g, ' ').trim();

export type Tabla = { filas: string[][]; columnas: number };

/** Un carácter que no va a aparecer en el texto: deja una sola columna. */
const SIN_SEPARADOR = '\u0000';

function trocear(texto: string, separador: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entrecomillado = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;

    if (entrecomillado) {
      if (c === '"') {
        // Dos comillas seguidas dentro de un campo son una comilla literal.
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else entrecomillado = false;
      } else campo += c;
      continue;
    }

    // Solo abre comillas al principio del campo: así un 5" suelto no rompe
    // el resto del archivo.
    if (c === '"' && campo === '') {
      entrecomillado = true;
      continue;
    }
    if (c === separador) {
      fila.push(campo);
      campo = '';
      continue;
    }
    if (c === '\r') continue;
    if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
      continue;
    }
    campo += c;
  }

  fila.push(campo);
  if (fila.some((x) => x.trim() !== '')) filas.push(fila);

  return filas.filter((f) => f.some((x) => x.trim() !== ''));
}

/**
 * Elige el separador probando los tres y quedándose con el que da más filas de
 * un mismo ancho. Adivinarlo contando comas falla con los nombres que llevan
 * coma dentro, que en un catálogo de laboratorio son unos cuantos.
 */
export function parsear(texto: string): Tabla {
  const limpio = texto.replace(/^﻿/, '');
  let mejor: { filas: string[][]; columnas: number; puntos: number } = {
    filas: [],
    columnas: 0,
    puntos: -1,
  };

  for (const separador of [';', ',', '\t', SIN_SEPARADOR]) {
    const filas = trocear(limpio, separador);
    if (!filas.length) continue;

    const anchos = new Map<number, number>();
    for (const f of filas) anchos.set(f.length, (anchos.get(f.length) ?? 0) + 1);

    let columnas = 0;
    let repetidas = 0;
    for (const [ancho, veces] of anchos) {
      if (veces > repetidas || (veces === repetidas && ancho > columnas)) {
        repetidas = veces;
        columnas = ancho;
      }
    }

    // Una sola columna solo gana si ningún separador encontró más.
    const puntos = columnas > 1 ? repetidas * columnas : 0;
    if (puntos > mejor.puntos) mejor = { filas, columnas, puntos };
  }

  // Todas las filas con el mismo ancho, para poder leerlas por índice.
  const columnas = Math.max(1, mejor.columnas);
  return {
    columnas,
    filas: mejor.filas.map((f) => Array.from({ length: columnas }, (_, i) => (f[i] ?? '').trim())),
  };
}

/**
 * Convierte los bytes de un archivo en texto.
 *
 * Excel ofrece «CSV UTF-8» y «CSV» a secas, y el segundo guarda en la
 * codificación de Windows. Si se leyera todo como UTF-8, los 559 nombres
 * llegarían con la tilde rota y el panel los daría por exámenes nuevos.
 */
export function aTexto(bytes: ArrayBuffer): string {
  try {
    // `fatal` es lo que hace útil este intento: sin él, un byte imposible en
    // UTF-8 se sustituye por un rombo y nunca se sabría que la codificación era
    // otra.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Si el archivo no es texto, qué es.
 *
 * Hace falta porque el archivo que el laboratorio tiene a mano es justo el que
 * no sirve: `pruebas.xls`. Sin esta comprobación se descodificaba como texto de
 * Windows y la pantalla seguía adelante con 571 filas de basura, los bytes de
 * cabecera del formato como título de columna y el nombre del autor del
 * documento a la vista.
 */
export function formatoBinario(bytes: ArrayBuffer): string | null {
  const b = new Uint8Array(bytes.slice(0, 4));
  const empieza = (...esperados: number[]) => esperados.every((v, i) => b[i] === v);

  if (empieza(0xd0, 0xcf, 0x11, 0xe0)) {
    return 'Eso es un Excel antiguo (.xls), que no se puede leer aquí. Ábralo en Excel y use Archivo → Guardar como → CSV UTF-8; o copie las celdas y péguelas en el cuadro de abajo.';
  }
  if (empieza(0x50, 0x4b)) {
    return 'Eso es un Excel (.xlsx) u otro archivo comprimido. Ábralo en Excel y use Archivo → Guardar como → CSV UTF-8; o copie las celdas y péguelas en el cuadro de abajo.';
  }
  if (empieza(0x25, 0x50, 0x44, 0x46)) return 'Eso es un PDF, no una hoja de cálculo.';
  return null;
}

/**
 * `true` si el texto parece una hoja y no un binario mal descodificado.
 *
 * Se mira solo el principio: con que las primeras líneas estén limpias, basta.
 * Un byte cero no aparece en un CSV y sí en casi cualquier binario.
 */
export function pareceTexto(texto: string): boolean {
  const muestra = texto.slice(0, 4000);
  if (muestra.includes('\u0000')) return false;
  // Caracteres de control que no son tabulador, retorno ni salto de línea.
  const raros = muestra.replace(/[^\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, '').length;
  return raros <= muestra.length / 100;
}

/* ─── Qué columna es qué ─────────────────────────────────────────────────── */

export type Asignacion = {
  /** Columna con el nombre del examen. */
  nombre: number;
  /** Columnas de los demás campos, las que se hayan reconocido. */
  campos: Partial<Record<CampoHoja, number>>;
  /** Si la primera fila son títulos y no datos. */
  cabecera: boolean;
};

const PISTAS: Record<CampoHoja, RegExp> = {
  tiempoEntrega: /entrega|plazo|tiempo|resultado/,
  tipoMuestra: /muestra|espec[ií]men/,
  tecnica: /t[eé]cnica|m[eé]todo|metodologia/,
  especialidad: /especialidad|[áa]rea|secci[oó]n|departamento/,
};

/**
 * Lo que suele decir una fila de títulos. Incluye las pistas de los campos y
 * además las columnas que la hoja del laboratorio trae y aquí no se importan,
 * como `CODIGO`, que es justo el único título de su Excel.
 */
const TITULOS = new RegExp(
  [
    /c[oó]digo/.source,
    /prueba|examen|an[aá]lisis|nombre|descripci[oó]n|detalle/.source,
    ...Object.values(PISTAS).map((r) => r.source),
  ].join('|'),
);

/**
 * Adivina qué columna es cuál.
 *
 * La del nombre se busca por coincidencia con el catálogo que ya existe, no por
 * el título: es la única señal fiable cuando la hoja llega sin títulos o con
 * títulos distintos cada vez. Lo que se adivina se enseña y se puede corregir
 * antes de seguir.
 */
export function adivinar(tabla: Tabla, examenes: Examen[]): Asignacion {
  const conocidos = new Set(examenes.map((e) => clave(e.nombre)));

  let nombre = 0;
  let mejor = -1;
  for (let col = 0; col < tabla.columnas; col++) {
    const valores = tabla.filas.map((f) => f[col] ?? '').filter(Boolean);
    const aciertos = valores.filter((v) => conocidos.has(clave(v))).length;
    // Sin ningún acierto —primera carga, o cartera entera nueva— se queda la
    // columna con más valores distintos, que es la que parece una lista.
    const puntos = aciertos > 0 ? aciertos * 1000 : new Set(valores.map(clave)).size;
    if (puntos > mejor) {
      mejor = puntos;
      nombre = col;
    }
  }

  /*
    ¿La primera fila son títulos?

    Antes bastaba con que su nombre no coincidiera con un examen conocido, y eso
    se comía la primera fila de cualquier hoja sin títulos cuyo primer examen
    fuera nuevo: desaparecía sin salir ni en «entran».

    Ahora hacen falta señales de la fila misma: o la casilla del nombre está
    vacía —un examen siempre tiene nombre—, o alguna **otra** columna dice algo
    que parece un título de columna. Se exige que sea otra columna para que el
    propio nombre del examen no pueda disparar la sospecha. Aun así se enseña qué
    fila se va a descartar, porque ninguna regla de estas acierta siempre.
  */
  const primera = tabla.filas[0] ?? [];
  const celdaNombre = (primera[nombre] ?? '').trim();
  const otraParece = primera.some(
    (celda, col) => col !== nombre && TITULOS.test(normalizar(celda)),
  );
  const cabecera =
    primera.length > 0 &&
    !conocidos.has(clave(celdaNombre)) &&
    (celdaNombre === '' || otraParece);

  const campos: Partial<Record<CampoHoja, number>> = {};
  if (cabecera) {
    for (let col = 0; col < tabla.columnas; col++) {
      if (col === nombre) continue;
      const titulo = normalizar(primera[col] ?? '');
      for (const campo of Object.keys(PISTAS) as CampoHoja[]) {
        if (campos[campo] === undefined && PISTAS[campo].test(titulo)) {
          campos[campo] = col;
          break;
        }
      }
    }
  }

  return { nombre, campos, cabecera };
}

/* ─── La lista que trae la hoja ──────────────────────────────────────────── */

export type Lectura = {
  /** Nombres en el orden de la hoja, sin repetidos ni vacíos. */
  nombres: string[];
  /** Valores por nombre, solo de las columnas asignadas. */
  valores: Record<string, Partial<Record<CampoHoja, string>>>;
  /** Nombres que venían más de una vez. Se usa el primero. */
  repetidos: string[];
  /** Filas sin nombre, que se ignoran. */
  vacias: number;
  /**
   * La fila que se descartó por tomarse como títulos, si tenía algo escrito.
   * Se enseña: ninguna regla para adivinar una cabecera acierta siempre, y una
   * fila descartada por error es un examen que desaparece sin aviso.
   */
  descartada?: string;
};

export function leer(tabla: Tabla, asignacion: Asignacion): Lectura {
  const filas = asignacion.cabecera ? tabla.filas.slice(1) : tabla.filas;
  const descartada = asignacion.cabecera
    ? (tabla.filas[0] ?? []).filter(Boolean).join(' · ') || undefined
    : undefined;
  const nombres: string[] = [];
  const valores: Lectura['valores'] = {};
  const vistos = new Set<string>();
  const repetidos: string[] = [];
  let vacias = 0;

  for (const fila of filas) {
    const nombre = (fila[asignacion.nombre] ?? '').replace(/\s+/g, ' ').trim();
    if (!nombre) {
      vacias++;
      continue;
    }
    const k = clave(nombre);
    if (vistos.has(k)) {
      if (!repetidos.includes(nombre)) repetidos.push(nombre);
      continue;
    }
    vistos.add(k);
    nombres.push(nombre);

    const propios: Partial<Record<CampoHoja, string>> = {};
    for (const [campo, col] of Object.entries(asignacion.campos) as [CampoHoja, number][]) {
      const valor = (fila[col] ?? '').trim();
      // Una celda vacía no dice «Consultar»: dice que esa hoja no trae el dato.
      // Borrar con un hueco sería la forma más fácil de perder trabajo hecho.
      if (valor) propios[campo] = limpiar(valor);
    }
    if (Object.keys(propios).length) valores[nombre] = propios;
  }

  return { nombres, valores, repetidos, vacias, descartada };
}

/* ─── La comparación ─────────────────────────────────────────────────────── */

export type CambioCampo = {
  slug: string;
  nombre: string;
  campo: CampoHoja;
  etiqueta: string;
  antes: string;
  ahora: string;
};

/** Un nombre de la hoja y el examen publicado que le corresponde, si lo hay. */
export type Pareja = { nombre: string; actual?: Examen };

export type Comparacion = {
  entran: string[];
  salen: Examen[];
  renombran: { slug: string; antes: string; ahora: string }[];
  cambian: CambioCampo[];
  /** Exámenes que siguen igual. */
  intactos: number;
  repetidos: string[];
  vacias: number;
  descartada?: string;
  /**
   * El emparejamiento entre la hoja y lo publicado.
   *
   * Lo calcula `comparar` y lo reutiliza `aplicar`. Antes cada uno lo deducía
   * por su cuenta y podían no coincidir: la pantalla prometía una cosa y el
   * guardado hacía otra.
   */
  parejas: Pareja[];
};

/**
 * Empareja cada nombre de la hoja con un examen publicado.
 *
 * Va por colas y no por un índice de uno en uno porque dos exámenes publicados
 * pueden compararse igual —«UREA/BUN» y «UREA BUN» dan la misma clave—. Con un
 * índice simple, el segundo no se emparejaba con nada, no salía en las bajas y
 * desaparecía del catálogo sin que la pantalla lo mencionara.
 *
 * Lo que no se empareja con ningún nombre de la hoja es, por definición, lo que
 * deja de publicarse.
 */
function emparejar(
  examenes: Examen[],
  nombres: string[],
): { parejas: Pareja[]; sobran: Examen[] } {
  const colas = new Map<string, Examen[]>();
  for (const e of examenes) {
    const k = clave(e.nombre);
    const cola = colas.get(k);
    if (cola) cola.push(e);
    else colas.set(k, [e]);
  }

  const usados = new Set<Examen>();
  const parejas = nombres.map((nombre) => {
    const cola = colas.get(clave(nombre));
    if (!cola?.length) return { nombre };
    // Se prefiere el que se escribe igual: si la hoja trae «UREA/BUN» y el
    // catálogo tiene los dos, el que sigue es ese y el otro causa baja.
    const exacto = cola.findIndex((e) => e.nombre === nombre);
    const actual = cola.splice(exacto >= 0 ? exacto : 0, 1)[0]!;
    usados.add(actual);
    return { nombre, actual };
  });

  return { parejas, sobran: examenes.filter((e) => !usados.has(e)) };
}

/**
 * Qué pasaría si se publicara esta hoja. No escribe nada.
 *
 * Es la pieza que justifica toda la pantalla: sin ella, publicar una hoja es un
 * acto de fe.
 */
export function comparar(examenes: Examen[], lectura: Lectura): Comparacion {
  const { parejas, sobran } = emparejar(examenes, lectura.nombres);

  const entran: string[] = [];
  const renombran: Comparacion['renombran'] = [];
  const cambian: CambioCampo[] = [];
  let intactos = 0;

  for (const { nombre, actual } of parejas) {
    if (!actual) {
      entran.push(nombre);
      continue;
    }

    let tocado = false;
    if (actual.nombre !== nombre) {
      renombran.push({ slug: actual.slug, antes: actual.nombre, ahora: nombre });
      tocado = true;
    }

    for (const [campo, valor] of Object.entries(lectura.valores[nombre] ?? {}) as [
      CampoHoja,
      string,
    ][]) {
      if (actual[campo] === valor) continue;
      cambian.push({
        slug: actual.slug,
        nombre,
        campo,
        etiqueta: CAMPOS_HOJA[campo],
        antes: actual[campo],
        ahora: valor,
      });
      tocado = true;
    }

    if (!tocado) intactos++;
  }

  return {
    entran,
    salen: sobran,
    renombran,
    cambian,
    intactos,
    repetidos: lectura.repetidos,
    vacias: lectura.vacias,
    descartada: lectura.descartada,
    parejas,
  };
}

/* ─── Aplicar ────────────────────────────────────────────────────────────── */

/**
 * El catálogo que resultaría, y la copia buena al día.
 *
 * Los exámenes que siguen conservan su slug y **todos los campos que la hoja no
 * trae**. El valor publicado puede venir de la plantilla de asociados, que esto
 * no lee: reconstruir la ficha desde cero borraría el plazo de 64 exámenes sin
 * que nadie lo pidiera.
 *
 * Los que se van salen de `examenes.json` pero **no** de `catalogo-info.json`:
 * si la prueba vuelve a ofrecerse, su texto sigue ahí y nadie tiene que volver a
 * redactarlo.
 */
export function aplicar(
  examenes: Examen[],
  info: Info,
  lectura: Lectura,
  comparacion: Comparacion,
): { examenes: Examen[]; info: Info } {
  // Las direcciones que se liberan al dar de baja un examen no se reutilizan:
  // si una prueba distinta heredara su URL, los enlaces repartidos llevarían al
  // examen equivocado, que es peor que un 404.
  const ocupados = new Set(examenes.map((e) => e.slug));
  const nuevaInfo: Info = { ...info };

  /*
    El texto guardado también se busca por clave. Una prueba que se dio de baja y
    vuelve escrita de otra forma —«UREA/BUN» y «Urea / BUN»— es la misma prueba, y
    buscar solo por el nombre exacto haría que volviera en blanco justo después de
    prometer lo contrario.
  */
  const infoPorClave = new Map(Object.keys(info).map((n) => [clave(n), n]));
  const textoDe = (nombre: string): InfoExamen => {
    const propia = info[nombre];
    if (propia) return propia;
    const otra = infoPorClave.get(clave(nombre));
    if (otra && otra !== nombre) {
      delete nuevaInfo[otra];
      return info[otra] ?? {};
    }
    return {};
  };

  const nuevos = comparacion.parejas.map(({ nombre, actual }) => {
    const propios = lectura.valores[nombre] ?? {};

    if (actual) {
      const examen: Examen = { ...actual, nombre, ...propios };
      // Si cambió de nombre, su texto se muda a la clave nueva.
      if (actual.nombre !== nombre) {
        const guardado = nuevaInfo[actual.nombre];
        if (guardado) {
          delete nuevaInfo[actual.nombre];
          nuevaInfo[nombre] = guardado;
        }
      }
      if (Object.keys(propios).length || actual.nombre !== nombre) {
        nuevaInfo[nombre] = { ...(nuevaInfo[nombre] ?? {}), ...propios };
      }
      return examen;
    }

    // Examen nuevo. Si ya estuvo en el catálogo, su texto sigue guardado.
    const guardado = textoDe(nombre);
    const slug = slugLibre(nombre, ocupados);
    ocupados.add(slug);
    const examen: Examen = {
      codigo: '',
      slug,
      nombre,
      especialidad: propios.especialidad ?? guardado.especialidad ?? 'Pruebas especiales',
      utilidad: guardado.utilidad ?? '',
      condicionesClinicas: guardado.condicionesClinicas ?? '',
      tiempoEntrega: propios.tiempoEntrega ?? guardado.tiempoEntrega ?? SIN_DATO,
      tipoMuestra: propios.tipoMuestra ?? guardado.tipoMuestra ?? SIN_DATO,
      tecnica: propios.tecnica ?? guardado.tecnica ?? SIN_DATO,
      sinonimos: guardado.sinonimos ?? [],
      ficha: null,
    };
    nuevaInfo[nombre] = {
      especialidad: examen.especialidad,
      utilidad: examen.utilidad,
      condicionesClinicas: examen.condicionesClinicas,
      tiempoEntrega: examen.tiempoEntrega,
      tipoMuestra: examen.tipoMuestra,
      tecnica: examen.tecnica,
      sinonimos: examen.sinonimos ?? [],
    };
    return examen;
  });

  return { examenes: nuevos, info: nuevaInfo };
}

/** Resumen de una línea para el mensaje del commit. */
export function resumirCambio(c: Comparacion): string {
  const partes: string[] = [];
  if (c.entran.length) partes.push(`${c.entran.length} ${plural(c.entran.length, 'alta', 'altas')}`);
  if (c.salen.length) partes.push(`${c.salen.length} ${plural(c.salen.length, 'baja', 'bajas')}`);
  if (c.cambian.length) {
    partes.push(`${c.cambian.length} ${plural(c.cambian.length, 'corrección', 'correcciones')}`);
  }
  if (c.renombran.length) {
    partes.push(`${c.renombran.length} ${plural(c.renombran.length, 'renombrado', 'renombrados')}`);
  }
  return partes.length
    ? `Actualiza el catálogo: ${partes.join(', ')}`
    : 'Actualiza el catálogo público';
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
