/**
 * Las tres pantallas de la carga por hoja de la cartera de asociados.
 *
 * Mismo recorrido que la del catálogo público y por el mismo motivo: subir una
 * hoja sin ver antes qué cambia es un acto de fe, y lo que está en juego son
 * las 277 pruebas que otros laboratorios consultan.
 *
 *   1 · el archivo — o pegar las celdas
 *   2 · qué columna es cuál, con lo adivinado ya marcado
 *   3 · qué cambiaría exactamente, y solo entonces el botón de publicar
 */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import type { Tabla } from '../importar';
import { CAMPOS, type Asignacion, type Campo, type Comparacion } from '../importar-asociados';

/* ─── Paso 1 · el archivo ────────────────────────────────────────────────── */

export function paginaImportarAsociados(o: { sesion: Sesion; error?: string }) {
  return pagina(
    'Cargar asociados',
    `    <p class="pista" style="margin:0"><a href="/asociados">← Volver a la cartera</a></p>
    ${cabecera('Cargar la cartera de asociados', `Paso 1 de 3. Todavía no se publica nada: primero se revisa qué cambiaría.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/asociados-importar" enctype="multipart/form-data">
        <label for="archivo">La hoja</label>
        <input id="archivo" name="archivo" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain">
        <p class="pista">
          En <strong>CSV</strong>. Si lo que tiene es un Excel, ábralo y use
          <em>Archivo → Guardar como → CSV UTF-8</em>; o copie las celdas y
          péguelas aquí abajo, que suele ser más rápido.
        </p>

        <label for="pegado">…o pegue las celdas</label>
        <textarea id="pegado" name="pegado" rows="6"
                  placeholder="Copie el rango en Excel y péguelo aquí"></textarea>

        ${
          /*
            `type="reset"` vacía el formulario entero —el archivo elegido y el
            cuadro de pegado— sin una línea de JavaScript, que aquí no cabe: la
            cabecera de seguridad del panel no deja ejecutar guiones.
          */ ''
        }
        <div class="acciones" style="margin-top:1.5rem">
          <button type="submit" class="chico">Leer</button>
          <button type="reset" class="chico secundario">Quitar el archivo</button>
        </div>
      </form>
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}

/* ─── Paso 2 · las columnas ──────────────────────────────────────────────── */

export function paginaColumnasAsociados(o: {
  sesion: Sesion;
  id: string;
  tabla: Tabla;
  asignacion: Asignacion;
  error?: string;
}) {
  const { tabla, asignacion } = o;
  const columnas = Array.from({ length: tabla.columnas }, (_, i) => i);

  const titulo = (col: number) => {
    const t = asignacion.cabecera ? (tabla.filas[0]?.[col] ?? '') : '';
    return t ? esc(t) : `Columna ${col + 1}`;
  };

  const ejemplos = (col: number) =>
    (asignacion.cabecera ? tabla.filas.slice(1) : tabla.filas)
      .slice(0, 3)
      .map((f) => f[col] ?? '')
      .filter(Boolean)
      .join(' · ');

  const opciones = (col: number) => {
    const asignado = (Object.entries(asignacion.campos) as [Campo, number][]).find(
      ([, c]) => c === col,
    )?.[0];
    const esNombre = asignacion.nombre === col;
    return [
      `<option value="" ${!esNombre && !asignado ? 'selected' : ''}>No usar</option>`,
      `<option value="nombre" ${esNombre ? 'selected' : ''}>Nombre de la prueba</option>`,
      ...(Object.entries(CAMPOS) as [Campo, string][]).map(
        ([campo, etiqueta]) =>
          `<option value="${campo}" ${asignado === campo ? 'selected' : ''}>${esc(etiqueta)}</option>`,
      ),
    ].join('');
  };

  const descartada = (tabla.filas[0] ?? []).filter(Boolean).join(' · ');

  return pagina(
    'Cargar asociados',
    `    <p class="pista" style="margin:0"><a href="/asociados-importar">← Empezar de nuevo con otra hoja</a></p>
    ${cabecera('¿Qué es cada columna?', `Paso 2 de 3. Se leyeron ${tabla.filas.length} filas y ${tabla.columnas} columnas.
        Todavía no se publica nada.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/asociados-importar/columnas">
        <input type="hidden" name="id" value="${esc(o.id)}">

        <label style="display:flex;align-items:center;gap:.5rem">
          <input type="checkbox" name="cabecera" value="si" ${asignacion.cabecera ? 'checked' : ''}
                 style="width:auto;margin:0">
          La primera fila son títulos de columna, no una prueba
        </label>
        ${
          descartada
            ? `<p class="eco">Con la casilla marcada se descarta esta fila:
                 <strong>${esc(descartada)}</strong>. Si eso es una prueba y no unos
                 títulos, desmárquela.</p>`
            : ''
        }

        <table>
          <thead><tr><th>Columna</th><th>Qué es</th></tr></thead>
          <tbody>
            ${columnas
              .map(
                (col) => `<tr>
                  <td><strong>${titulo(col)}</strong>
                      <br><span class="pista">${esc(ejemplos(col))}</span></td>
                  <td style="width:14rem">
                    <select name="col${col}" style="margin:0">${opciones(col)}</select>
                  </td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>

        <p class="pista">
          Las columnas que deje en «No usar» se ignoran — el precio, por ejemplo,
          que ya no se lleva aquí. Una celda vacía nunca borra lo que está
          guardado: solo se cambia lo que la hoja trae escrito.
        </p>

        <button type="submit">Ver qué cambiaría</button>
      </form>
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}

/* ─── Paso 3 · qué cambiaría ─────────────────────────────────────────────── */

export function paginaResumenAsociados(o: {
  sesion: Sesion;
  id: string;
  comparacion: Comparacion;
  total: number;
  sinEspecialidad: string[];
  error?: string;
}) {
  const c = o.comparacion;
  const nada = !c.entran.length && !c.salen.length && !c.cambian.length;

  const bloque = (id: string, titulo: string, cuerpo: string, alerta = false) =>
    `<div class="panel" id="${id}" style="margin-top:1.5rem${alerta ? ';border-color:var(--alerta)' : ''}">
      <h2 style="margin:0${alerta ? ';color:var(--alerta)' : ''}">${titulo}</h2>
      ${cuerpo}
    </div>`;

  const lista = (nombres: string[]) =>
    `<ul class="pista" style="margin:.6rem 0 0;padding-left:1.2rem">${nombres
      .map((n) => `<li>${esc(n)}</li>`)
      .join('')}</ul>`;

  return pagina(
    'Cargar asociados',
    `    <p class="pista" style="margin:0"><a href="/asociados-importar">← Empezar de nuevo con otra hoja</a></p>
    ${cabecera('Esto es lo que cambiaría', `Paso 3 de 3. Nada se ha publicado todavía. La cartera pasaría de
        ${o.total} a ${o.total + c.entran.length - c.salen.length} pruebas.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <ul class="recuento">
        <li><a href="#altas"><b>${c.entran.length}</b> entran</a></li>
        <li><a href="#bajas"><b>${c.salen.length}</b> salen</a></li>
        <li><a href="#correcciones"><b>${c.cambian.length}</b> datos cambian</a></li>
        <li><a href="#"><b>${c.intactos}</b> igual</a></li>
      </ul>

      ${
        c.campos.length
          ? `<p class="pista">La hoja trae: ${c.campos.map((f) => esc(CAMPOS[f])).join(', ')}.</p>`
          : '<p class="pista">La hoja solo trae nombres: no se corrige ningún dato.</p>'
      }

      ${
        o.sinEspecialidad.length
          ? bloque(
              'sin-especialidad',
              `Sin especialidad: ${o.sinEspecialidad.length}`,
              `<p class="pista" style="margin-top:.4rem">
                 La especialidad es el único dato obligatorio: es lo que agrupa la
                 cartera. Añada una columna de especialidad a la hoja, o corrija
                 estas pruebas una a una después de publicar.
               </p>${lista(o.sinEspecialidad.slice(0, 25))}`,
              true,
            )
          : ''
      }

      ${
        c.entran.length
          ? bloque(
              'altas',
              `Entrarían: ${c.entran.length}`,
              `<p class="pista" style="margin-top:.4rem">Pruebas que hoy no están en la cartera.</p>${lista(c.entran.slice(0, 40))}`,
            )
          : ''
      }

      ${
        c.salen.length
          ? bloque(
              'bajas',
              `Dejarían de ofrecerse: ${c.salen.length}`,
              `<p class="pista" style="margin-top:.4rem">
                 Están publicadas y no vienen en la hoja, así que desaparecerían de
                 la cartera que ven los laboratorios.
               </p>${lista(c.salen.slice(0, 40).map((p) => p.nombre))}`,
              true,
            )
          : ''
      }

      ${
        c.cambian.length
          ? bloque(
              'correcciones',
              `Datos que cambiarían: ${c.cambian.length}`,
              `<table style="margin-top:.6rem">
                 <thead><tr><th>Prueba</th><th>Campo</th><th>Ahora</th><th>Quedaría</th></tr></thead>
                 <tbody>${c.cambian
                   .slice(0, 60)
                   .map(
                     (x) => `<tr>
                       <td>${esc(x.nombre)}</td>
                       <td>${esc(x.etiqueta)}</td>
                       <td><span class="pista">${esc(x.antes || '—')}</span></td>
                       <td>${esc(x.ahora)}</td>
                     </tr>`,
                   )
                   .join('')}</tbody>
               </table>`,
            )
          : ''
      }

      ${
        c.repetidos.length
          ? `<p class="eco">La hoja trae ${c.repetidos.length} ${c.repetidos.length === 1 ? 'nombre repetido' : 'nombres repetidos'}; se usa la primera aparición de cada uno.</p>`
          : ''
      }
      ${c.vacias ? `<p class="pista">Se ignoraron ${c.vacias} filas sin nombre.</p>` : ''}
      ${c.descartada ? `<p class="pista">Se descartó la primera fila por tomarla como títulos: «${esc(c.descartada)}».</p>` : ''}

      ${
        nada
          ? `<p class="eco" style="margin-top:2rem">La hoja dice exactamente lo mismo que la cartera. No hay nada que publicar.</p>
             <p style="margin-top:1rem"><a class="boton suave" href="/asociados">Volver a la cartera</a></p>`
          : `<form method="post" action="/asociados-importar/publicar" style="margin-top:2rem">
               <input type="hidden" name="id" value="${esc(o.id)}">
               ${
                 c.salen.length
                   ? `<label style="display:flex;align-items:flex-start;gap:.5rem">
                        <input type="checkbox" name="confirmaBajas" value="si" style="width:auto;margin:.25rem 0 0">
                        Entiendo que ${c.salen.length === 1 ? 'una prueba dejará' : `${c.salen.length} pruebas dejarán`} de ofrecerse a los laboratorios.
                      </label>`
                   : ''
               }
               <button type="submit">Publicar estos cambios</button>
             </form>`
      }
`,
    { sesion: o.sesion, activa: '/asociados' },
  );
}

/** El botón de la cartera que lleva al paso 1. */
export const botonCargarAsociados = `<a class="boton suave" href="/asociados-importar">${icono('hoja')}Cargar una hoja de cálculo</a>`;
