/**
 * Búsqueda tolerante para los catálogos.
 *
 * La gente escribe «glucosas», «glucoza» o «biometria ematica», y un
 * `includes` exacto devolvía cero resultados por una letra. Aquí cada
 * palabra de la consulta se acepta si:
 *
 *   1. aparece tal cual en el índice de la tarjeta;
 *   2. aparece sin el plural («glucosas» → «glucosa»);
 *   3. se parece a alguna palabra del índice: una letra de diferencia
 *      (cambiada, sobrante o faltante) a partir de 4 letras, dos a partir
 *      de 8. También vale si se parece al comienzo de una palabra, para
 *      que la tolerancia funcione mientras se escribe.
 *
 * Las palabras van en cualquier orden: «lipídico perfil» encuentra el
 * perfil lipídico. Se devuelve además si el resultado fue aproximado, para
 * avisarlo, y una puntuación para ordenar: primero los exámenes cuyo
 * nombre empieza por lo escrito, después los que lo contienen, y al final
 * las coincidencias en la descripción o las aproximadas.
 *
 * Este módulo no importa datos: lo cargan los scripts del navegador y no
 * debe arrastrar el catálogo completo consigo.
 */

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Quita un plural sencillo. Solo se aplica a lo que escribe la persona. */
function singular(palabra: string): string {
  if (palabra.length > 4 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length > 3 && palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

/**
 * Distancia de Levenshtein con tope: en cuanto una fila supera `maximo`
 * deja de calcular, que es lo habitual (casi ninguna palabra se parece).
 */
function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let minimoFila = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(previa[j]! + 1, actual[j - 1]! + 1, previa[j - 1]! + costo);
      actual.push(valor);
      if (valor < minimoFila) minimoFila = valor;
    }
    if (minimoFila > maximo) return maximo + 1;
    previa = actual;
  }
  return previa[b.length]!;
}

const tolerancia = (palabra: string) => (palabra.length >= 8 ? 2 : palabra.length >= 4 ? 1 : 0);

/** Las palabras del índice, calculadas una sola vez por tarjeta. */
const cacheTokens = new WeakMap<object, string[]>();
function tokens(clave: object, indice: string): string[] {
  let lista = cacheTokens.get(clave);
  if (!lista) {
    lista = [...new Set(indice.split(/[^a-z0-9]+/).filter((t) => t.length >= 3))];
    cacheTokens.set(clave, lista);
  }
  return lista;
}

export type Coincidencia = {
  ok: boolean;
  /** `true` si alguna palabra solo coincidió por parecido. */
  aproximada: boolean;
  /** Menor es mejor. Solo tiene sentido cuando `ok` es `true`. */
  puntuacion: number;
};

const NO: Coincidencia = { ok: false, aproximada: false, puntuacion: 99 };

/**
 * @param clave   objeto estable (la tarjeta) para cachear sus palabras
 * @param indice  texto normalizado con todo lo buscable de la tarjeta
 * @param nombre  nombre normalizado del examen, para ordenar
 * @param consulta lo que escribió la persona, sin normalizar
 */
export function coincide(clave: object, indice: string, nombre: string, consulta: string): Coincidencia {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return { ok: true, aproximada: false, puntuacion: 0 };

  const consultaNormalizada = palabras.join(' ');
  // Con los plurales quitados, para que «glucosas» ponga primero a GLUCOSA.
  const consultaBase = palabras.map(singular).join(' ');
  let aproximada = false;
  let todasEnNombre = true;

  const seParece = (lista: string[], palabra: string, maximo: number) =>
    lista.some(
      (token) =>
        distancia(token, palabra, maximo) <= maximo ||
        (token.length > palabra.length &&
          distancia(token.slice(0, palabra.length), palabra, maximo) <= maximo),
    );

  for (const palabra of palabras) {
    const base = singular(palabra);
    let enNombre = nombre.includes(palabra) || nombre.includes(base);

    if (!(indice.includes(palabra) || indice.includes(base))) {
      const maximo = tolerancia(palabra);
      if (maximo === 0) return NO;

      // Primero se mira el nombre: una errata en el nombre del examen vale
      // más que una coincidencia aproximada en su descripción.
      const parecidaEnNombre = seParece(nombre.split(/[^a-z0-9]+/), palabra, maximo);
      if (!parecidaEnNombre && !seParece(tokens(clave, indice), palabra, maximo)) return NO;
      aproximada = true;
      if (parecidaEnNombre) enNombre = true;
    }

    if (!enNombre) todasEnNombre = false;
  }

  let puntuacion: number;
  if (nombre.startsWith(consultaNormalizada) || nombre.startsWith(consultaBase)) puntuacion = 0;
  else if (nombre.includes(consultaNormalizada) || nombre.includes(consultaBase)) puntuacion = 1;
  else if (todasEnNombre) puntuacion = 2;
  else if (!aproximada) puntuacion = 3;
  else puntuacion = 4;

  return { ok: true, aproximada, puntuacion };
}
