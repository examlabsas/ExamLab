/**
 * Lo que el sitio y el panel de administración tienen que entender igual.
 *
 * Vive aparte de `examenes.ts` porque dos programas distintos dependen de ello:
 * el sitio para mostrarlo en la ficha, y el panel para enseñarle al laboratorio
 * cómo va a interpretarse lo que acaba de escribir. Duplicado, el panel
 * prometería una cosa y el sitio diría otra — y el que se equivoca aquí es el
 * paciente que viene en ayunas sin necesidad, o que no viene y tenía que venir.
 *
 * `examenes.ts` lo reexporta, así que el resto del sitio sigue importando de
 * allí y no hace falta tocar nada más.
 *
 * No importa datos ni nada del navegador: tiene que poder cargarse dentro de un
 * Worker de Cloudflare.
 */

/** Valor que deja el importador cuando el laboratorio aún no entregó el dato. */
export const SIN_DATO = 'Consultar';

export const tieneDato = (valor?: string): valor is string => !!valor && valor !== SIN_DATO;

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export type Ayuno = { requiere: boolean; horas: number; texto: string };

/**
 * Deduce el ayuno a partir del texto de CONDICIONES CLÍNICAS.
 *
 * El laboratorio lo escribe en prosa ("AYUNO 8-12 horas."), así que se
 * interpreta en vez de pedir un campo aparte: con 400 exámenes, mantener dos
 * fuentes sincronizadas a mano sería un problema.
 *
 * Ante un rango se toma el valor mayor: indicar más ayuno del necesario es
 * inocuo, indicar menos obliga a repetir la toma.
 */
export function ayunoDeTexto(condiciones: string): Ayuno {
  const normalizado = normalizar(condiciones ?? '');

  const mencionaAyuno = /\bayuno\b/.test(normalizado);
  const niega = /no requiere ayuno|sin ayuno|no necesita ayuno/.test(normalizado);

  if (!mencionaAyuno || niega) {
    return { requiere: false, horas: 0, texto: 'No requiere ayuno' };
  }

  // Toma los números que aparecen junto a la palabra "ayuno".
  const cerca = normalizado.slice(normalizado.indexOf('ayuno'), normalizado.indexOf('ayuno') + 40);
  const numeros = [...cerca.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n > 0 && n <= 24);

  if (numeros.length === 0) return { requiere: true, horas: 8, texto: 'Requiere ayuno' };

  const horas = Math.max(...numeros);
  const texto =
    numeros.length > 1
      ? `Ayuno de ${Math.min(...numeros)} a ${horas} horas`
      : `Ayuno de ${horas} horas`;

  return { requiere: true, horas, texto };
}

/**
 * Campos de los que dependen los textos de abajo. Se escriben así, y no como
 * `Examen`, para que el panel pueda pedirlos con lo que tiene en el formulario
 * sin montar un examen entero. Un `Examen` los cumple igual.
 */
export type CamposTexto = {
  utilidad: string;
  especialidad: string;
  tipoMuestra: string;
  tiempoEntrega: string;
};

/** Primera oración de UTILIDAD, para las tarjetas del listado. */
export function resumenCorto(examen: { utilidad: string }, maximo = 160): string {
  const primera = (examen.utilidad ?? '').split(/(?<=\.)\s/)[0] ?? '';
  if (primera.length <= maximo) return primera;
  return `${primera.slice(0, maximo).trimEnd()}…`;
}

/**
 * Descripción de la ficha para buscadores y redes.
 *
 * Solo menciona los datos que existen. La plantilla anterior interpolaba los
 * campos en crudo, así que los 495 exámenes sin plazo confirmado publicaban
 * «Entrega en consultar.» y otros 17 «muestra: Consultar.» — el texto que el
 * doctor pidió suavizar, corregido en la página visible pero no en lo que sale
 * en Google, que es justo donde más se lee.
 *
 * El panel la enseña tal cual al editar un examen: era el único sitio donde el
 * error no se veía, precisamente porque no está en la página.
 *
 * Se recorta a 160 caracteres porque por encima de ahí Google trunca.
 */
export function descripcionMeta(examen: CamposTexto, maximo = 160): string {
  const frases = [resumenCorto(examen), `Especialidad ${examen.especialidad.toLowerCase()}.`];
  // La muestra conserva sus mayúsculas: hay siglas («Sangre total con EDTA»)
  // que en minúscula dejan de leerse como lo que son. Y cinco exámenes ya
  // traen la palabra dentro del valor («Muestra cervicovaginal»), así que
  // añadir la etiqueta daría «Muestra: Muestra cervicovaginal».
  if (tieneDato(examen.tipoMuestra)) {
    const muestra = examen.tipoMuestra;
    frases.push(/^muestra/i.test(muestra) ? `${muestra}.` : `Muestra: ${muestra}.`);
  }
  if (tieneDato(examen.tiempoEntrega)) {
    frases.push(`Entrega en ${examen.tiempoEntrega.toLowerCase()}.`);
  }

  const texto = frases.join(' ').replace(/\s+/g, ' ').trim();
  if (texto.length <= maximo) return texto;
  // Se corta por la última palabra entera para no dejar sílabas sueltas.
  const recorte = texto.slice(0, maximo - 1);
  return `${recorte.slice(0, recorte.lastIndexOf(' ')).trimEnd()}…`;
}
