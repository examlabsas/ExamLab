/**
 * Pantallas del catálogo de laboratorios asociados.
 *
 * Son casi las del catálogo público. La diferencia está en quién entra: esta
 * sección es solo de administradores, porque es la cartera de convenio y no
 * algo que recepción necesite.
 *
 * Aquí se vieron precios y ya no: el laboratorio pidió sacarlos del panel, y
 * con ellos se fue el tarifario del KV y toda su maquinaria.
 */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import {
  contarFaltas,
  FILTROS,
  type Filtro,
  type Prueba,
} from '../asociados';

/** Cuántas pruebas se enseñan. Las 277 de golpe no se leen. */
export const TOPE = 60;

type ConSlug = Prueba & { slug: string };

const AVISO_SECCION = `
  <p class="eco">
    <strong>Es la cartera que ExamLab ofrece a otros laboratorios.</strong> Solo
    la ven los administradores. Los precios no se llevan aquí: van en el Excel
    del laboratorio.
  </p>`;

/* ─── Listado ────────────────────────────────────────────────────────────── */

export function paginaAsociados(o: {
  sesion: Sesion;
  pruebas: ConSlug[];
  resultados: ConSlug[];
  texto: string;
  filtro?: Filtro;
  especialidad?: string;
  especialidades: string[];
  ok?: string;
  aviso?: string;
}) {
  const faltas = contarFaltas(o.pruebas);
  const mostradas = o.resultados.slice(0, TOPE);

  const contexto = new URLSearchParams(
    Object.entries({ q: o.texto, falta: o.filtro, especialidad: o.especialidad }).filter(
      ([, v]) => v,
    ) as [string, string][],
  ).toString();

  const filas = mostradas
    .map(
      (p) => `<tr>
        <td>
          <a href="/asociados/${esc(p.slug)}${contexto ? `?${contexto}` : ''}">${esc(p.nombre)}</a>
          ${(Object.keys(FILTROS) as Filtro[])
            .filter((f) => f !== o.filtro && FILTROS[f].falta(p))
            .map((f) => `<span class="marca">${esc(FILTROS[f].etiqueta)}</span>`)
            .join('')}
          <br><span class="pista">${esc(p.especialidad)}</span>
        </td>
        <td class="accion">
          <a class="boton suave chico" href="/asociados/${esc(p.slug)}${contexto ? `?${contexto}` : ''}">${icono('editar')}<span class="solo-ancho">Editar</span></a>
        </td>
      </tr>`,
    )
    .join('');

  const enlace = (filtro?: Filtro) => {
    const p = new URLSearchParams();
    if (o.texto) p.set('q', o.texto);
    if (filtro) p.set('falta', filtro);
    if (o.especialidad) p.set('especialidad', o.especialidad);
    const cadena = p.toString();
    return `/asociados${cadena ? `?${cadena}` : ''}`;
  };

  return pagina(
    'Laboratorios asociados',
    `    ${cabecera('Catálogo de asociados', `${o.pruebas.length} pruebas que ExamLab ofrece a otros laboratorios.`)}
      ${AVISO_SECCION}
      ${o.ok ? `<p class="error bien">${esc(o.ok)}</p>` : ''}
      ${o.aviso ? `<p class="error">${esc(o.aviso)}</p>` : ''}

      <p class="acciones">
        <a class="boton" href="/asociados/nueva">${icono('mas')}Añadir una prueba</a>
        <a class="boton suave" href="/asociados-importar">${icono('hoja')}Cargar una hoja de cálculo</a>
      </p>

      <ul class="recuento">
        <li><a href="${enlace()}" ${!o.filtro ? 'aria-current="page"' : ''}>
          <b>${o.pruebas.length}</b> en total</a></li>
        ${faltas
          .map(
            (f) => `<li><a href="${enlace(f.clave)}" ${o.filtro === f.clave ? 'aria-current="page"' : ''}>
              <b>${f.cuantos}</b> ${esc(f.etiqueta)}</a></li>`,
          )
          .join('')}
      </ul>

      <div class="panel">
      <form method="get" action="/asociados" class="fila">
        <div style="flex:2 1 16rem">
          <label for="q">Buscar</label>
          <input id="q" name="q" type="search" value="${esc(o.texto)}"
                 placeholder="Nombre, método o muestra" style="margin:0">
        </div>
        <div>
          <label for="especialidad">Especialidad</label>
          <select id="especialidad" name="especialidad" style="margin:0">
            <option value="">Todas</option>
            ${o.especialidades
              .map(
                (n) =>
                  `<option value="${esc(n)}" ${o.especialidad === n ? 'selected' : ''}>${esc(n)}</option>`,
              )
              .join('')}
          </select>
        </div>
        ${o.filtro ? `<input type="hidden" name="falta" value="${esc(o.filtro)}">` : ''}
        <div style="flex:0 0 auto"><button type="submit" class="chico">Buscar</button></div>
      </form>

      <p class="pista">
        ${
          o.resultados.length === 0
            ? 'Ninguna prueba cumple eso.'
            : o.resultados.length > TOPE
              ? `${o.resultados.length} pruebas. Se muestran las primeras ${TOPE}: afine la búsqueda para ver el resto.`
              : `${o.resultados.length} ${o.resultados.length === 1 ? 'prueba' : 'pruebas'}.`
        }
      </p>

      <table>
        <thead><tr><th>Prueba</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      </div>
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}

/* ─── Una prueba ─────────────────────────────────────────────────────────── */

export function paginaPrueba(o: {
  sesion: Sesion;
  prueba: ConSlug;
  especialidades: string[];
  desde: { q?: string; falta?: string; especialidad?: string };
  /** Alta de una prueba que todavía no existe: el nombre se puede escribir. */
  esNueva?: boolean;
  /** Lo escrito en «especialidad nueva», para no perderlo al reintentar. */
  nueva?: string;
  error?: string;
}) {
  const p = o.prueba;
  const nueva = o.esNueva === true;

  const parametros = new URLSearchParams(
    Object.entries(o.desde).filter(([, v]) => v) as [string, string][],
  ).toString();
  const volver = `/asociados${parametros ? `?${parametros}` : ''}`;
  const ocultos = Object.entries(o.desde)
    .filter(([, v]) => v)
    .map(([k, v]) => `<input type="hidden" name="desde_${k}" value="${esc(v)}">`)
    .join('');

  const opciones = (
    o.especialidades.includes(p.especialidad)
      ? o.especialidades
      : [p.especialidad, ...o.especialidades]
  )
    .map((n) =>
      // En un alta la especialidad viene vacía y encabeza la lista; sin texto,
      // el desplegable se abre en blanco y no dice que falta elegir.
      n === ''
        ? `<option value="" ${p.especialidad === '' ? 'selected' : ''}>— Elija una —</option>`
        : `<option value="${esc(n)}" ${p.especialidad === n ? 'selected' : ''}>${esc(n)}</option>`,
    )
    .join('');

  return pagina(
    nueva ? 'Añadir una prueba' : p.nombre,
    `      <p class="pista" style="margin:0"><a href="${volver}">← Volver al catálogo de asociados</a></p>
    ${
      nueva
        ? cabecera(
            'Añadir una prueba',
            `Entra en la cartera que ven los laboratorios asociados. Si el
             laboratorio le manda la lista entera, es más rápido
             <a href="/asociados-importar">cargarla por hoja de cálculo</a>.`,
          )
        : cabecera(`${esc(p.nombre)}`, `${esc(p.especialidad)}`)
    }
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="${nueva ? '/asociados/nueva' : `/asociados/${esc(p.slug)}`}">
        ${ocultos}

        <label for="nombre">Nombre</label>
        <input id="nombre" name="nombre" type="text" value="${esc(p.nombre)}" required ${nueva ? 'autofocus' : ''}>
        ${
          nueva
            ? `<p class="pista">
                 Tal como lo escribe el laboratorio, que es como vendrá en la
                 hoja: así la próxima carga reconoce esta prueba en vez de darla
                 de alta otra vez.
               </p>`
            : ''
        }

        <label for="especialidad">Especialidad</label>
        <select id="especialidad" name="especialidad">${opciones}</select>
        <label for="especialidadNueva" style="font-weight:400">…o escriba una especialidad nueva</label>
        <input id="especialidadNueva" name="especialidadNueva" type="text"
               value="${esc(o.nueva ?? '')}" placeholder="Déjelo vacío para usar la de arriba">
        <p class="pista">
          Agrupa la prueba en la tabla que ven los laboratorios asociados.
          Escrita de dos formas distintas se parte en dos grupos, así que
          conviene elegir de la lista.
        </p>

        <div class="fila" style="margin-top:1.1rem">
          <div>
            <label for="metodo">Método</label>
            <input id="metodo" name="metodo" type="text" value="${esc(p.metodo ?? '')}" style="margin:0">
          </div>
          <div>
            <label for="entrega">Plazo de entrega</label>
            <input id="entrega" name="entrega" type="text" value="${esc(p.entrega ?? '')}" style="margin:0">
          </div>
        </div>
        <p class="pista">
          El plazo se cuenta desde que la muestra llega al laboratorio matriz, no
          desde que la toma el asociado. Así lo dice el aviso del catálogo.
        </p>

        <label for="muestra">Tipo de muestra</label>
        <input id="muestra" name="muestra" type="text" value="${esc(p.muestra ?? '')}">
        <p class="pista">
          Con el volumen, como lo entrega el laboratorio: «Sangre Total + EDTA 2ml».
          Si menciona «nota 3», el catálogo enlaza esa nota solo.
        </p>

        <label for="incluye">Qué incluye</label>
        <textarea id="incluye" name="incluye" rows="3">${esc(p.incluye ?? '')}</textarea>
        <p class="pista">
          Solo para los paneles: las determinaciones que trae, separadas por « · ».
          Déjelo vacío si la prueba es una sola determinación.
        </p>

        <button type="submit">${nueva ? 'Añadir a la cartera' : 'Guardar'}</button>
      </form>
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}
