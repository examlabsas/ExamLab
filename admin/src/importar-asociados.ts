/**
 * Cargar la cartera de asociados desde una hoja de cálculo.
 *
 * Es el hermano del importador del catálogo público (`importar.ts`) y comparte
 * con él todo lo de leer la hoja —trocear, adivinar el separador, descartar
 * binarios—, que no tiene nada que ver con qué se está importando. Lo que
 * cambia es qué campos hay y dónde se guardan: aquí es un solo archivo, sin
 * copia de textos redactados, porque estas fichas no llevan prosa.
 *
 * Lo que **no** cambia, y es lo importante, es cómo se emparejan las filas de
 * la hoja con lo publicado: por colas y por consumo, no buscando cada vez. Con
 * un índice simple, dos pruebas que se comparan iguales hacían que la segunda
 * no se emparejara con nada, no saliera en las bajas y desapareciera del
 * catálogo sin que la pantalla lo dijera. Costó encontrarlo una vez; no se
 * vuelve a escribir de la otra forma.
 */
import { clave, type Tabla } from './importar';
import { claveDe, conSlug, notasDe, type Prueba } from './asociados';

/** Los campos que se pueden traer de una hoja, además del nombre. */
export const CAMPOS = {
  especialidad: 'Especialidad',
  metodo: 'Método',
  muestra: 'Tipo de muestra',
  entrega: 'Plazo de entrega',
  incluye: 'Qué incluye',
} as const;

export type Campo = keyof typeof CAMPOS;

export type Asignacion = {
  nombre: number;
  campos: Partial<Record<Campo, number>>;
  cabecera: boolean;
};

const PISTAS: Record<Campo, RegExp> = {
  especialidad: /especialidad|[áa]rea|secci[oó]n|departamento/,
  metodo: /m[eé]todo|t[eé]cnica|metodologia/,
  muestra: /muestra|espec[ií]men/,
  entrega: /entrega|plazo|tiempo|resultado/,
  incluye: /incluye|contiene|componentes|determinaciones|perfil/,
};

const TITULOS = new RegExp(
  [
    /c[oó]digo|precio|valor|costo|convenio|tarifa/.source,
    /prueba|examen|an[aá]lisis|nombre|descripci[oó]n|detalle/.source,
    ...Object.values(PISTAS).map((r) => r.source),
  ].join('|'),
);

const normal = (v: string) => v.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Adivina qué columna es cuál.
 *
 * La del nombre se busca por coincidencia con lo ya publicado y no por el
 * título, que es la única señal que aguanta una hoja sin cabecera o con
 * cabeceras distintas cada mes. Todo lo adivinado se enseña y se corrige antes
 * de comparar nada.
 */
export function adivinar(tabla: Tabla, pruebas: Prueba[]): Asignacion {
  const conocidos = new Set(pruebas.map((p) => clave(p.nombre)));

  let nombre = 0;
  let mejor = -1;
  for (let c = 0; c < tabla.columnas; c++) {
    const aciertos = tabla.filas.filter((f) => conocidos.has(clave(f[c] ?? ''))).length;
    if (aciertos > mejor) {
      mejor = aciertos;
      nombre = c;
    }
  }

  // Sin ningún acierto —una cartera nueva entera— la primera columna con texto
  // es la del nombre, que es como se escriben estas hojas.
  if (mejor === 0) {
    nombre = Math.max(
      0,
      tabla.filas[0]?.findIndex((v) => (v ?? '').trim().length > 2) ?? 0,
    );
  }

  const primera = tabla.filas[0] ?? [];
  const cabecera =
    !(primera[nombre] ?? '').trim() ||
    primera.some((v, c) => c !== nombre && TITULOS.test(normal(v ?? '')));

  const campos: Partial<Record<Campo, number>> = {};
  const titulos = cabecera ? primera : [];
  for (const [campo, pista] of Object.entries(PISTAS) as [Campo, RegExp][]) {
    const c = titulos.findIndex((v, i) => i !== nombre && pista.test(normal(v ?? '')));
    if (c >= 0 && !Object.values(campos).includes(c)) campos[campo] = c;
  }

  return { nombre, campos, cabecera };
}

/** Una fila de la hoja, ya leída. */
export type Fila = { nombre: string; especialidad?: string };

export type Lectura = {
  filas: Fila[];
  /** Valores por identidad de fila, solo de las columnas asignadas. */
  valores: Record<string, Partial<Record<Campo, string>>>;
  repetidos: string[];
  vacias: number;
  descartada?: string;
  /** La hoja trae especialidad, así que la identidad la incluye. */
  conEspecialidad: boolean;
};

/*
  La identidad de una prueba de asociados es **especialidad + nombre**, no el
  nombre solo.

  Lo descubrió una prueba: hay dos «NICKERSON», una en MICROBIOLOGIA y otra en
  BACTERIOLOGIA MANUAL. Emparejando por nombre, la hoja traía las dos, la
  segunda se descartaba como repetida y la pantalla anunciaba una baja que no
  existía. En el catálogo público no pasa porque allí los nombres son únicos;
  aquí no lo son, y es el laboratorio quien decide eso, no nosotros.

  Cuando la hoja no trae columna de especialidad se cae al nombre solo, que es
  lo único que hay — y entonces esas dos pruebas sí colisionan, pero la pantalla
  lo dice en «nombres repetidos» en vez de perder una en silencio.
*/
export const identidad = (
  fila: { nombre: string; especialidad?: string },
  conEspecialidad: boolean,
): string =>
  conEspecialidad ? `${clave(fila.especialidad ?? '')}|${clave(fila.nombre)}` : clave(fila.nombre);

export function leer(tabla: Tabla, asignacion: Asignacion): Lectura {
  const crudas = asignacion.cabecera ? tabla.filas.slice(1) : tabla.filas;
  const descartada = asignacion.cabecera
    ? (tabla.filas[0] ?? []).filter(Boolean).join(' · ') || undefined
    : undefined;

  const conEspecialidad = asignacion.campos.especialidad !== undefined;
  const filas: Fila[] = [];
  const valores: Lectura['valores'] = {};
  const repetidos: string[] = [];
  const vistos = new Set<string>();
  let vacias = 0;

  const limpiar = (v: string | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

  for (const cruda of crudas) {
    const nombre = limpiar(cruda[asignacion.nombre]);
    if (!nombre) {
      vacias++;
      continue;
    }

    const propios: Partial<Record<Campo, string>> = {};
    for (const [campo, c] of Object.entries(asignacion.campos) as [Campo, number][]) {
      const valor = limpiar(cruda[c]);
      // Una celda vacía nunca borra: solo entra lo que la hoja trae escrito.
      if (valor) propios[campo] = valor;
    }

    const fila: Fila = { nombre, especialidad: propios.especialidad };
    const id = identidad(fila, conEspecialidad);
    if (vistos.has(id)) {
      repetidos.push(nombre);
      continue;
    }
    vistos.add(id);
    filas.push(fila);
    valores[id] = propios;
  }

  return { filas, valores, repetidos, vacias, descartada, conEspecialidad };
}

export type CambioCampo = {
  nombre: string;
  campo: Campo;
  etiqueta: string;
  antes: string;
  ahora: string;
};

export type Comparacion = {
  entran: string[];
  salen: Prueba[];
  cambian: CambioCampo[];
  intactos: number;
  repetidos: string[];
  vacias: number;
  descartada?: string;
  campos: Campo[];
};

type Pareja = { fila: Fila; actual?: Prueba };

/**
 * Empareja cada fila de la hoja con la prueba publicada que le corresponde,
 * **consumiéndola**. Ver la nota de `identidad`: con dos que se comparan
 * iguales, buscar en vez de consumir pierde una sin avisar.
 */
function emparejar(
  pruebas: Prueba[],
  filas: Fila[],
  conEspecialidad: boolean,
): { parejas: Pareja[]; sobran: Prueba[] } {
  const colas = new Map<string, Prueba[]>();
  for (const p of pruebas) {
    const k = identidad(p, conEspecialidad);
    const cola = colas.get(k);
    if (cola) cola.push(p);
    else colas.set(k, [p]);
  }

  const usados = new Set<Prueba>();
  const parejas = filas.map((fila) => {
    const cola = colas.get(identidad(fila, conEspecialidad));
    if (!cola?.length) return { fila };
    // Con varias candidatas, la que se escribe igual; si ninguna, la primera.
    const exacta = cola.findIndex((p) => p.nombre === fila.nombre);
    const actual = cola.splice(exacta >= 0 ? exacta : 0, 1)[0]!;
    usados.add(actual);
    return { fila, actual };
  });

  return { parejas, sobran: pruebas.filter((p) => !usados.has(p)) };
}

const valorDe = (p: Prueba, campo: Campo): string =>
  campo === 'especialidad' ? p.especialidad : (p[campo] ?? '');

/** Qué pasaría si se publicara esta hoja. No escribe nada. */
export function comparar(pruebas: Prueba[], lectura: Lectura): Comparacion {
  const { parejas, sobran } = emparejar(pruebas, lectura.filas, lectura.conEspecialidad);

  const entran: string[] = [];
  const cambian: CambioCampo[] = [];
  let intactos = 0;

  const campos = [
    ...new Set(
      lectura.filas.flatMap(
        (f) => Object.keys(lectura.valores[identidad(f, lectura.conEspecialidad)] ?? {}) as Campo[],
      ),
    ),
  ];

  for (const { fila, actual } of parejas) {
    if (!actual) {
      entran.push(fila.nombre);
      continue;
    }
    const propios = lectura.valores[identidad(fila, lectura.conEspecialidad)] ?? {};
    const suyos: CambioCampo[] = [];
    for (const [campo, valor] of Object.entries(propios) as [Campo, string][]) {
      const antes = valorDe(actual, campo);
      if (antes !== valor) {
        suyos.push({ nombre: actual.nombre, campo, etiqueta: CAMPOS[campo], antes, ahora: valor });
      }
    }
    if (suyos.length) cambian.push(...suyos);
    else intactos++;
  }

  return {
    entran,
    salen: sobran,
    cambian,
    intactos,
    repetidos: lectura.repetidos,
    vacias: lectura.vacias,
    descartada: lectura.descartada,
    campos,
  };
}

/**
 * La cartera que quedaría. El orden es el de la hoja, que es el que trae el
 * laboratorio y el que espera ver quien la mandó.
 */
export function aplicar(pruebas: Prueba[], lectura: Lectura): Prueba[] {
  const { parejas } = emparejar(pruebas, lectura.filas, lectura.conEspecialidad);

  return parejas.map(({ fila, actual }) => {
    const propios = lectura.valores[identidad(fila, lectura.conEspecialidad)] ?? {};
    const base: Prueba = actual ?? {
      especialidad: '',
      nombre: fila.nombre,
      notas: [],
    };

    const prueba: Prueba = {
      ...base,
      nombre: fila.nombre,
      especialidad: propios.especialidad ?? base.especialidad,
      metodo: propios.metodo ?? base.metodo,
      muestra: propios.muestra ?? base.muestra,
      entrega: propios.entrega ?? base.entrega,
      incluye: propios.incluye ?? base.incluye,
      notas: [],
    };
    // Las notas se deducen del texto de la muestra, así que se recalculan
    // siempre: si la muestra cambia y las notas no, la ficha enlaza a una
    // condición que ya no es la suya.
    prueba.notas = notasDe(prueba.muestra);
    return prueba;
  });
}

/** Una línea con lo que va a pasar, para el botón y el aviso de bajas. */
export function resumirCambio(c: Comparacion): string {
  const partes: string[] = [];
  const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
  if (c.entran.length) partes.push(`${c.entran.length} ${plural(c.entran.length, 'alta', 'altas')}`);
  if (c.salen.length) partes.push(`${c.salen.length} ${plural(c.salen.length, 'baja', 'bajas')}`);
  if (c.cambian.length) {
    partes.push(`${c.cambian.length} ${plural(c.cambian.length, 'corrección', 'correcciones')}`);
  }
  return partes.length ? partes.join(', ') : 'sin cambios';
}

/** Las pruebas que se quedarían sin especialidad, que es el único dato obligatorio. */
export const sinEspecialidad = (pruebas: Prueba[]): string[] =>
  pruebas.filter((p) => !p.especialidad.trim()).map((p) => p.nombre);

/** Para la pantalla: el slug de una prueba, que no se guarda sino que se deduce. */
export const conSlugDe = conSlug;
export const claveDePrueba = claveDe;
