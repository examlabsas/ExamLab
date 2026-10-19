/**
 * Pantallas del catálogo de laboratorios asociados.
 *
 * Se parecen a las del catálogo público, con una diferencia que conviene que se
 * note nada más entrar: **aquí se ven precios**. El aviso de arriba no es
 * decoración; es lo que recuerda a quien tiene el panel abierto en el mostrador
 * que esa pantalla no es para enseñársela a un paciente.
 */
import { pagina, cabecera, esc, type Sesion } from './plantilla';
import {
  comoPrecio,
  contarFaltas,
  FILTROS,
  type Filtro,
  type Prueba,
} from '../asociados';

/** Cuántas pruebas se enseñan. Las 277 de golpe no se leen. */
export const TOPE = 60;

type ConSlug = Prueba & { slug: string };

const AVISO_PRECIOS = `
  <p class="eco">
    <strong>Esta sección lleva el tarifario mayorista.</strong> Los precios se
    guardan en Cloudflare, nunca en el repositorio, y el sitio no los publica.
    Solo la ven los administradores.
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
            .filter((f) => f !== 'sin-precio' && f !== o.filtro && FILTROS[f].falta(p))
            .map((f) => `<span class="marca">${esc(FILTROS[f].etiqueta)}</span>`)
            .join('')}
          <br><span class="pista">${esc(p.especialidad)}</span>
        </td>
        <td style="text-align:right;white-space:nowrap">
          ${
            p.precio === null
              ? '<span class="marca">sin precio</span>'
              : `<strong>${esc(comoPrecio(p.precio))}</strong>`
          }
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
      ${AVISO_PRECIOS}
      ${o.ok ? `<p class="error bien">${esc(o.ok)}</p>` : ''}
      ${o.aviso ? `<p class="error">${esc(o.aviso)}</p>` : ''}

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
        <thead><tr><th>Prueba</th><th style="text-align:right">Precio</th></tr></thead>
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
  precio: number | null;
  especialidades: string[];
  desde: { q?: string; falta?: string; especialidad?: string };
  error?: string;
}) {
  const p = o.prueba;

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
    .map(
      (n) => `<option value="${esc(n)}" ${p.especialidad === n ? 'selected' : ''}>${esc(n)}</option>`,
    )
    .join('');

  return pagina(
    p.nombre,
    `      <p class="pista" style="margin:0"><a href="${volver}">← Volver al catálogo de asociados</a></p>
    ${cabecera(`${esc(p.nombre)}`, `${esc(p.especialidad)}`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/asociados/${esc(p.slug)}">
        ${ocultos}

        <label for="precio">Precio para laboratorios</label>
        <input id="precio" name="precio" type="text" inputmode="decimal"
               value="${esc(comoPrecio(o.precio))}" placeholder="0.00">
        ${
          o.precio === null
            ? `<p class="eco">Esta prueba todavía no tiene precio en el tarifario.</p>`
            : ''
        }
        <p class="pista">
          En dólares, con dos decimales. Se puede escribir con coma o con punto.
          Déjelo vacío para quitarlo del tarifario. <strong>No se versiona</strong>:
          se guarda en Cloudflare y no llega al repositorio ni al sitio.
        </p>

        <label for="nombre">Nombre</label>
        <input id="nombre" name="nombre" type="text" value="${esc(p.nombre)}" required>

        <label for="especialidad">Especialidad</label>
        <select id="especialidad" name="especialidad">${opciones}</select>
        <p class="pista">
          Agrupa la prueba en la tabla que ven los laboratorios asociados.
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

        <button type="submit">Guardar</button>
      </form>
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}
