/**
 * Pantallas del catálogo público.
 *
 * Dos trabajos muy distintos conviven aquí:
 *
 * - **Corregir un examen.** Es el que de verdad se va a usar: los 495 plazos de
 *   entrega que faltan no se van a rellenar nunca de golpe en un Excel, pero sí
 *   diez al día desde el móvil mientras alguien espera en recepción. Por eso el
 *   formulario enseña, debajo de cada campo, qué va a leer el paciente con lo que
 *   se acaba de escribir: el sitio interpreta el texto, no lo copia.
 * - **Cargar una hoja entera.** Tres pasos, y el del medio existe solo para que
 *   nadie publique una hoja sin ver antes qué se va a borrar.
 */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import {
  CAMPOS_HOJA,
  contarFaltas,
  FILTROS,
  type CampoHoja,
  type Examen,
  type Filtro,
} from '../catalogo';
import type { Asignacion, Comparacion, Tabla } from '../importar';
import { ayunoDeTexto, descripcionMeta, SIN_DATO, tieneDato } from '../../../src/lib/examenes-comun';

/** Cuántos resultados se enseñan. Las 559 fichas de golpe no se leen. */
export const TOPE = 60;

const SITIO = 'https://examlabsas.com';

/* ─── Listado ────────────────────────────────────────────────────────────── */

export function paginaCatalogo(o: {
  sesion: Sesion;
  examenes: Examen[];
  resultados: Examen[];
  texto: string;
  filtro?: Filtro;
  especialidad?: string;
  especialidades: string[];
  ok?: string;
}) {
  const faltas = contarFaltas(o.examenes);
  const mostrados = o.resultados.slice(0, TOPE);

  /*
    La búsqueda viaja en el enlace de cada examen para que al guardar se vuelva
    aquí mismo. Es el recorrido real: filtrar por «sin plazo de entrega» e ir
    bajando por la lista. Sin esto, cada guardado devolvería al catálogo entero y
    habría que volver a filtrar cuatrocientas noventa y cinco veces.
  */
  const contexto = new URLSearchParams(
    Object.entries({ q: o.texto, falta: o.filtro, especialidad: o.especialidad }).filter(
      ([, v]) => v,
    ) as [string, string][],
  ).toString();

  const fichas = mostrados
    .map(
      (e) => `<li>
        <a class="renglon" href="/catalogo/${esc(e.slug)}${contexto ? `?${contexto}` : ''}">
          <span>
            <strong>${esc(e.nombre)}</strong>
            ${(Object.keys(FILTROS) as Filtro[])
              .filter((f) => f !== o.filtro && FILTROS[f].falta(e))
              .map((f) => `<span class="marca">${esc(FILTROS[f].etiqueta)}</span>`)
              .join('')}
            <br><span class="pista">${esc(e.especialidad)}</span>
          </span>
          <span class="renglon-accion">Editar${icono('seguir')}</span>
        </a>
      </li>`,
    )
    .join('');

  const enlace = (filtro?: Filtro) => {
    const p = new URLSearchParams();
    if (o.texto) p.set('q', o.texto);
    if (filtro) p.set('falta', filtro);
    if (o.especialidad) p.set('especialidad', o.especialidad);
    const cadena = p.toString();
    return `/catalogo${cadena ? `?${cadena}` : ''}`;
  };

  return pagina(
    'Catálogo',
    `    ${cabecera('Catálogo de exámenes', `${o.examenes.length} exámenes publicados. Los cambios tardan uno o dos
        minutos en verse en el sitio.`)}
      ${o.ok ? `<p class="error bien">${esc(o.ok)}</p>` : ''}

      ${
        /*
          Las dos formas de meter exámenes, arriba y a la vista. Estaban al pie
          de la página, debajo de sesenta filas y escritas como enlaces de
          texto: para dar de alta uno había que recorrer toda la lista primero,
          y aun así no parecían algo que se pudiera pulsar.

          Añadir va en el botón lleno y cargar en el suave: el primero es el
          gesto de todos los días, el segundo el de cuando llega la lista
          entera del laboratorio.
        */ ''
      }
      <p class="acciones">
        <a class="boton" href="/catalogo/nuevo">${icono('mas')}Añadir un examen</a>
        <a class="boton suave" href="/catalogo-importar">${icono('hoja')}Cargar una hoja de cálculo</a>
      </p>

      <ul class="recuento">
        <li><a href="${enlace()}" ${!o.filtro ? 'aria-current="page"' : ''}>
          <b>${o.examenes.length}</b> en total</a></li>
        ${faltas
          .map(
            (f) => `<li><a href="${enlace(f.clave)}" ${o.filtro === f.clave ? 'aria-current="page"' : ''}>
              <b>${f.cuantos}</b> ${esc(f.etiqueta)}</a></li>`,
          )
          .join('')}
      </ul>

      <div class="panel">
      <form method="get" action="/catalogo" class="fila">
        <div style="flex:2 1 16rem">
          <label for="q">Buscar</label>
          <input id="q" name="q" type="search" value="${esc(o.texto)}"
                 placeholder="Nombre o sinónimo" style="margin:0">
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
            ? 'Ningún examen cumple eso.'
            : o.resultados.length > TOPE
              ? `${o.resultados.length} exámenes. Se muestran los primeros ${TOPE}: afine la búsqueda para ver el resto.`
              : `${o.resultados.length} ${o.resultados.length === 1 ? 'examen' : 'exámenes'}.`
        }
      </p>

      <ul class="lista con-filas">${fichas}</ul>
      </div>

`,
    { sesion: o.sesion, activa: '/catalogo' },
  );
}

/* ─── Un examen ──────────────────────────────────────────────────────────── */

export function paginaExamen(o: {
  sesion: Sesion;
  examen: Examen;
  especialidades: string[];
  /** Búsqueda y filtro desde los que se llegó, para volver a ellos al guardar. */
  desde: { q?: string; falta?: string; especialidad?: string };
  /** Lo que se escribió en «especialidad nueva», para no perderlo al reintentar. */
  nueva?: string;
  /**
   * Alta de un examen que todavía no existe. Cambia tres cosas: el nombre se
   * puede escribir, el formulario va a otra ruta, y no se ofrece «ver en el
   * sitio» de algo que aún no está publicado.
   */
  esNuevo?: boolean;
  error?: string;
}) {
  const e = o.examen;
  const nuevo = o.esNuevo === true;
  const ayuno = ayunoDeTexto(e.condicionesClinicas);

  /*
    Si la especialidad del examen no está entre las ofrecidas, se añade al
    principio de la lista en vez de dejar el desplegable sin nada marcado.

    Sin esto, al volver de un error de validación el navegador seleccionaba la
    primera opción por su cuenta y el siguiente guardado cambiaba la especialidad
    sin que nadie lo hubiera pedido.
  */
  const opcionesEspecialidad = (
    o.especialidades.includes(e.especialidad) ? o.especialidades : [e.especialidad, ...o.especialidades]
  ).map((n) =>
    // En un examen nuevo la especialidad viene vacía y encabeza la lista. Sin
    // texto, el desplegable se abre en una opción en blanco que no dice nada;
    // con él, se lee que falta elegir antes de que lo diga la validación.
    n === ''
      ? `<option value="" ${e.especialidad === '' ? 'selected' : ''}>— Elija una —</option>`
      : `<option value="${esc(n)}" ${e.especialidad === n ? 'selected' : ''}>${esc(n)}</option>`,
  ).join('');

  const eco = (texto: string) => `<p class="eco">${texto}</p>`;

  /*
    Se vuelve a la misma búsqueda de la que se venía. Importa más de lo que
    parece: el trabajo real es filtrar por «sin plazo de entrega» y recorrer la
    lista, y perder el filtro en cada guardado convertiría eso en empezar de
    cero cuatrocientas noventa y cinco veces.
  */
  const parametros = new URLSearchParams(
    Object.entries(o.desde).filter(([, v]) => v) as [string, string][],
  ).toString();
  const volver = `/catalogo${parametros ? `?${parametros}` : ''}`;
  const ocultos = Object.entries(o.desde)
    .filter(([, v]) => v)
    .map(([k, v]) => `<input type="hidden" name="desde_${k}" value="${esc(v)}">`)
    .join('');

  return pagina(
    nuevo ? 'Añadir examen' : e.nombre,
    `      <p class="pista" style="margin:0"><a href="${volver}">← Volver al catálogo</a></p>
    ${
      nuevo
        ? cabecera(
            'Añadir un examen',
            `Entra al catálogo del sitio en cuanto lo guarde. Si el laboratorio le
             manda una lista entera, es más rápido
             <a href="/catalogo-importar">cargarla por hoja de cálculo</a>.`,
          )
        : cabecera(
            `${esc(e.nombre)}`,
            `El nombre lo fija la lista del laboratorio y no se edita aquí: es lo que
        une esta ficha con el Excel. ·
        <a href="${SITIO}/catalogo/${esc(e.slug)}" target="_blank" rel="noreferrer">Ver en el sitio</a>`,
          )
    }
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="${nuevo ? '/catalogo/nuevo' : `/catalogo/${esc(e.slug)}`}">
        ${ocultos}
        ${
          nuevo
            ? `<label for="nombre">Nombre del examen</label>
               <input id="nombre" name="nombre" type="text" value="${esc(e.nombre)}" required autofocus>
               <p class="pista">
                 Tal como lo escribe el laboratorio, que es como vendrá en el
                 Excel: así la próxima carga reconoce este examen en vez de
                 darlo de alta otra vez. La dirección de la ficha se saca de
                 aquí y después ya no cambia.
               </p>`
            : ''
        }
        <label for="especialidad">Especialidad</label>
        <select id="especialidad" name="especialidad">${opcionesEspecialidad}</select>
        <label for="especialidadNueva" style="font-weight:400">…o escriba una especialidad nueva</label>
        <input id="especialidadNueva" name="especialidadNueva" type="text"
               value="${esc(o.nueva ?? '')}" placeholder="Déjelo vacío para usar la de arriba">
        <p class="pista">
          Una especialidad nueva aparece como un grupo más en el catálogo del
          sitio. Escrita de dos formas distintas —«Química clínica» y «Quimica
          Clinica»— se parte en dos grupos, así que conviene elegir de la lista.
        </p>

        <label for="utilidad">Para qué sirve</label>
        <textarea id="utilidad" name="utilidad" rows="4" required>${esc(e.utilidad)}</textarea>
        <p class="pista">
          En el listado solo se ve la primera oración, así que conviene que la
          primera diga lo esencial.
        </p>

        <label for="condicionesClinicas">Preparación del paciente</label>
        <textarea id="condicionesClinicas" name="condicionesClinicas" rows="3" required>${esc(e.condicionesClinicas)}</textarea>
        ${eco(
          `El sitio deduce el ayuno de este texto. Ahora entiende: <strong>${esc(ayuno.texto)}</strong>.` +
            (ayuno.requiere
              ? ' Con eso calcula a qué hora debe dejar de comer el paciente.'
              : ''),
        )}
        <p class="pista">
          Si necesita ayuno, dígalo con las horas: «Ayuno de 8 a 12 horas.». Si no,
          empiece por «No requiere ayuno.».
        </p>

        <div class="fila" style="margin-top:1.1rem">
          <div>
            <label for="tiempoEntrega">Plazo de entrega</label>
            <input id="tiempoEntrega" name="tiempoEntrega" type="text" value="${esc(e.tiempoEntrega)}" required style="margin:0">
          </div>
          <div>
            <label for="tipoMuestra">Tipo de muestra</label>
            <input id="tipoMuestra" name="tipoMuestra" type="text" value="${esc(e.tipoMuestra)}" required style="margin:0">
          </div>
        </div>
${
          /*
            El eco solo aparece por lo que de verdad falta. Explicar la
            sustitución de un campo que ya tiene dato no informa de nada y hace
            dudar de si el valor escrito se va a usar.
          */
          [
            !tieneDato(e.tiempoEntrega)
              ? `Mientras el plazo diga «${SIN_DATO}», el paciente lee <strong>«Se lo confirmamos al agendar»</strong>.`
              : '',
            !tieneDato(e.tipoMuestra)
              ? `Mientras la muestra diga «${SIN_DATO}», el paciente lee <strong>«Según lo que indique su médico»</strong>.`
              : '',
          ]
            .filter(Boolean)
            .map(eco)
            .join('')
        }
        <p class="pista">
          Tal como lo escribe el laboratorio: «El mismo día», «45 minutos»,
          «2 días 15:00». Si todavía no está confirmado, bórrelo: queda en
          «${SIN_DATO}» y el sitio lo dice con otras palabras.
        </p>

        <label for="tecnica">Técnica</label>
        <input id="tecnica" name="tecnica" type="text" value="${esc(e.tecnica)}" required>
        <p class="pista">
          Escriba «Remisión» si el examen se envía a un laboratorio de referencia:
          el sitio lo señala en la ficha.
        </p>

        <label for="sinonimos">Otros nombres</label>
        <textarea id="sinonimos" name="sinonimos" rows="3">${esc((e.sinonimos ?? []).join('\n'))}</textarea>
        <p class="pista">
          Uno por línea. Es con lo que el paciente encuentra el examen cuando su
          médico lo escribió de otra forma.
        </p>

        ${
          // En un examen que aún no existe el recuadro enseñaría la descripción
          // de un formulario vacío, que no se parece a nada.
          nuevo
            ? ''
            : `<div class="recuadro" style="margin-top:1.75rem">
                 <strong>Así sale en Google</strong>
                 <p class="pista" style="margin-top:.4rem">${esc(descripcionMeta(e))}</p>
               </div>`
        }

        <button type="submit">${nuevo ? 'Añadir al catálogo' : 'Guardar'}</button>
      </form>
`,
    { sesion: o.sesion, activa: '/catalogo' },
  );
}

/* ─── Carga: paso 1, el archivo ──────────────────────────────────────────── */

export function paginaImportar(o: { sesion: Sesion; error?: string }) {
  return pagina(
    'Cargar catálogo',
    `      <p class="pista" style="margin:0"><a href="/catalogo">← Volver al catálogo</a></p>
    ${cabecera('Cargar la lista del laboratorio', `Paso 1 de 3. Todavía no se publica nada: primero se revisa qué cambiaría.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/catalogo-importar" enctype="multipart/form-data">
        <label for="archivo">Archivo</label>
        <input id="archivo" name="archivo" type="file" accept=".csv,.txt,text/csv,text/plain">
        <p class="pista">
          En Excel: <strong>Archivo → Guardar como → CSV UTF-8</strong>. El .xls o
          .xlsx tal cual no sirve aquí.
        </p>

        <label for="pegado">…o pegue las columnas desde Excel</label>
        <textarea id="pegado" name="pegado" rows="8"
                  placeholder="Seleccione las celdas en Excel, copie y pegue aquí"></textarea>
        <p class="pista">
          Suele ser lo más rápido: no hace falta guardar nada. Puede pegar solo la
          columna de nombres, o varias columnas con sus títulos.
        </p>

        <button type="submit">Leer</button>
      </form>

      <div class="panel" style="margin-top:1.5rem">
        <strong>Qué va a pasar</strong>
        <ol class="pista" style="margin-top:.5rem;padding-left:1.2rem">
          <li>Se lee el archivo y se dice qué columna es cada cosa.</li>
          <li>Se enseña qué exámenes entran, cuáles salen y qué datos cambian.</li>
          <li>Solo si lo confirma, se publica.</li>
        </ol>
      </div>
`,
    { sesion: o.sesion, activa: '/catalogo' },
  );
}

/* ─── Carga: paso 2, las columnas ────────────────────────────────────────── */

export function paginaColumnas(o: {
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
    const asignado = (Object.entries(asignacion.campos) as [CampoHoja, number][]).find(
      ([, c]) => c === col,
    )?.[0];
    const esNombre = asignacion.nombre === col;
    return [
      `<option value="" ${!esNombre && !asignado ? 'selected' : ''}>No usar</option>`,
      `<option value="nombre" ${esNombre ? 'selected' : ''}>Nombre del examen</option>`,
      ...(Object.entries(CAMPOS_HOJA) as [CampoHoja, string][]).map(
        ([campo, etiqueta]) =>
          `<option value="${campo}" ${asignado === campo ? 'selected' : ''}>${esc(etiqueta)}</option>`,
      ),
    ].join('');
  };

  const filas = columnas
    .map(
      (col) => `<tr>
        <td><strong>${titulo(col)}</strong>
            <br><span class="pista">${esc(ejemplos(col)) || '<em>vacía</em>'}</span></td>
        <td style="width:14rem">
          <select name="col${col}" style="margin:0">${opciones(col)}</select>
        </td>
      </tr>`,
    )
    .join('');

  return pagina(
    'Cargar catálogo',
    `    ${cabecera('¿Qué es cada columna?', `Paso 2 de 3. Se leyeron ${tabla.filas.length} filas y ${tabla.columnas}
        ${tabla.columnas === 1 ? 'columna' : 'columnas'}. Todavía no se publica nada.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/catalogo-importar/columnas">
        <input type="hidden" name="id" value="${esc(o.id)}">

        <label style="display:flex;align-items:center;gap:.5rem">
          <input type="checkbox" name="cabecera" value="si" ${asignacion.cabecera ? 'checked' : ''}
                 style="width:auto;margin:0">
          La primera fila son títulos de columna, no un examen
        </label>
        ${
          asignacion.cabecera && (tabla.filas[0] ?? []).some(Boolean)
            ? `<p class="eco">Con la casilla marcada se descarta esta fila:
                 <strong>${esc((tabla.filas[0] ?? []).filter(Boolean).join(' · '))}</strong>.
                 Si eso es un examen y no unos títulos, desmárquela.</p>`
            : ''
        }

        <table>
          <thead><tr><th>Columna</th><th>Qué es</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <p class="pista">
          Las columnas que deje en «No usar» se ignoran. Una celda vacía nunca
          borra lo que ya está guardado: solo se cambia lo que la hoja trae
          escrito.
        </p>

        <button type="submit">Ver qué cambiaría</button>
      </form>
`,
    { sesion: o.sesion, activa: '/catalogo' },
  );
}

/* ─── Carga: paso 3, qué cambiaría ──────────────────────────────────────── */

export function paginaResumen(o: {
  sesion: Sesion;
  id: string;
  comparacion: Comparacion;
  asignacion: Asignacion;
  total: number;
  error?: string;
}) {
  const c = o.comparacion;
  const campos = Object.keys(o.asignacion.campos) as CampoHoja[];
  const nadaQueHacer =
    !c.entran.length && !c.salen.length && !c.cambian.length && !c.renombran.length;

  const bloque = (titulo: string, cuerpo: string, alerta = false) =>
    `<div class="panel" style="margin-top:1.5rem${alerta ? ';border-color:var(--alerta)' : ''}">
      <h2 style="font-size:1.05rem;margin:0${alerta ? ';color:var(--alerta)' : ''}">${titulo}</h2>
      ${cuerpo}
    </div>`;

  const listaNombres = (nombres: string[]) =>
    `<ul class="pista" style="margin:.6rem 0 0;padding-left:1.2rem">${nombres
      .map((n) => `<li>${esc(n)}</li>`)
      .join('')}</ul>`;

  const proporcionBajas = o.total ? Math.round((c.salen.length / o.total) * 100) : 0;

  return pagina(
    'Cargar catálogo',
    `    ${cabecera('Esto es lo que cambiaría', `Paso 3 de 3. Nada se ha publicado todavía. El catálogo pasaría de
        ${o.total} a ${o.total + c.entran.length - c.salen.length} exámenes.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <ul class="recuento">
        <li><a href="#altas"><b>${c.entran.length}</b> entran</a></li>
        <li><a href="#bajas"><b>${c.salen.length}</b> salen</a></li>
        <li><a href="#correcciones"><b>${c.cambian.length}</b> datos cambian</a></li>
        <li><a href="#renombrados"><b>${c.renombran.length}</b> renombrados</a></li>
        <li><a href="#"><b>${c.intactos}</b> igual</a></li>
      </ul>

      ${
        campos.length
          ? `<p class="pista">La hoja trae: ${campos.map((f) => esc(CAMPOS_HOJA[f])).join(', ')}.</p>`
          : `<p class="pista">La hoja trae solo nombres, así que no se cambia ningún dato de los exámenes que siguen.</p>`
      }

      ${
        c.salen.length
          ? bloque(
              `<span id="bajas">Dejarían de publicarse: ${c.salen.length}</span>`,
              `<p class="pista" style="margin-top:.4rem">
                 Sus fichas desaparecen del sitio. El texto redactado se guarda, así
                 que si la prueba vuelve no hay que escribirlo otra vez.
                 ${proporcionBajas >= 10 ? `<strong>Es el ${proporcionBajas}% del catálogo.</strong> Revise que la hoja esté completa antes de seguir.` : ''}
               </p>
               ${listaNombres(c.salen.map((e) => e.nombre))}`,
              true,
            )
          : ''
      }

      ${
        c.entran.length
          ? bloque(
              `<span id="altas">Se publicarían por primera vez: ${c.entran.length}</span>`,
              `<p class="pista" style="margin-top:.4rem">
                 Entran sin texto para el paciente, así que su ficha sale casi vacía
                 hasta que alguien la redacte. Van a aparecer en «sin texto para el
                 paciente» en el catálogo.
               </p>
               ${listaNombres(c.entran)}`,
            )
          : ''
      }

      ${
        c.cambian.length
          ? bloque(
              `<span id="correcciones">Datos que cambiarían: ${c.cambian.length}</span>`,
              `<table>
                 <thead><tr><th>Examen</th><th>Campo</th><th>Ahora</th><th>Quedaría</th></tr></thead>
                 <tbody>${c.cambian
                   .map(
                     (x) => `<tr>
                       <td>${esc(x.nombre)}</td>
                       <td class="pista">${esc(x.etiqueta)}</td>
                       <td class="pista">${esc(x.antes)}</td>
                       <td><strong>${esc(x.ahora)}</strong></td>
                     </tr>`,
                   )
                   .join('')}</tbody>
               </table>`,
            )
          : ''
      }

      ${
        c.renombran.length
          ? bloque(
              `<span id="renombrados">Cambiarían de nombre: ${c.renombran.length}</span>`,
              `<p class="pista" style="margin-top:.4rem">
                 Conservan la dirección de su ficha, así que los enlaces que ya
                 circulan siguen funcionando.
               </p>
               <table>
                 <thead><tr><th>Ahora</th><th>Quedaría</th></tr></thead>
                 <tbody>${c.renombran
                   .map(
                     (x) =>
                       `<tr><td class="pista">${esc(x.antes)}</td><td><strong>${esc(x.ahora)}</strong></td></tr>`,
                   )
                   .join('')}</tbody>
               </table>`,
            )
          : ''
      }

      ${
        c.repetidos.length
          ? bloque(
              `Nombres repetidos en la hoja: ${c.repetidos.length}`,
              `<p class="pista" style="margin-top:.4rem">
                 Se usa la primera vez que aparece cada uno y se ignoran las demás.
               </p>
               ${listaNombres(c.repetidos)}`,
            )
          : ''
      }

      ${
        c.descartada
          ? `<p class="pista">Se descartó la primera fila por tomarla como títulos: «${esc(c.descartada)}».</p>`
          : ''
      }

      ${
        c.vacias
          ? `<p class="pista">Se ignoraron ${c.vacias} ${c.vacias === 1 ? 'fila sin nombre' : 'filas sin nombre'}.</p>`
          : ''
      }

      ${
        nadaQueHacer
          ? `<p class="error bien" style="margin-top:1.5rem">
               La hoja dice exactamente lo mismo que el catálogo. No hay nada que publicar.
             </p>
             <p style="margin-top:1rem"><a href="/catalogo">Volver al catálogo</a></p>`
          : `<form method="post" action="/catalogo-importar/publicar" style="margin-top:2rem">
               <input type="hidden" name="id" value="${esc(o.id)}">
               ${
                 c.salen.length
                   ? `<label style="display:flex;align-items:flex-start;gap:.5rem;font-weight:400">
                        <input type="checkbox" name="confirmaBajas" value="si" style="width:auto;margin:.25rem 0 0">
                        <span>Entiendo que ${c.salen.length}
                        ${c.salen.length === 1 ? 'examen dejará' : 'exámenes dejarán'}
                        de verse en el sitio.</span>
                      </label>`
                   : ''
               }
               <button type="submit">Publicar estos cambios</button>
               <p class="pista" style="text-align:center">
                 <a href="/catalogo-importar">Empezar de nuevo con otra hoja</a>
               </p>
             </form>`
      }
`,
    { sesion: o.sesion, activa: '/catalogo' },
  );
}
