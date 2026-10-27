/** Pantallas de noticias, aviso temporal y estado del último cambio. */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import { FOTOS, atributosDeFoto, type Noticia } from '../noticias';
import type { Commit } from '../github';
import { diaDe, nombreDelDia, SECCIONES, seccionDe, type Seccion } from '../historial';

/* ─── Noticias ───────────────────────────────────────────────────────────── */

export function paginaNoticias(o: {
  sesion: Sesion;
  noticias: Noticia[];
  aviso?: string;
  guardado?: boolean;
}) {
  const filas = o.noticias
    .map(
      (n) => `<tr>
        <td>
          <a href="/noticias/${esc(n.slug)}"><strong>${esc(n.titulo)}</strong></a>
          <br><span class="pista">${esc(n.categoria)} · ${esc(n.fecha)}</span>
        </td>
        <td>${n.borrador ? 'Borrador' : 'Publicada'}${n.destacado ? '<br><span class="pista">Destacada</span>' : ''}</td>
        <td class="accion">
          <a class="boton suave chico" href="/noticias/${esc(n.slug)}">${icono('editar')}<span class="solo-ancho">Editar</span></a>
        </td>
      </tr>`,
    )
    .join('');

  return pagina(
    'Noticias',
    `    ${cabecera('Noticias', `Los cambios tardan uno o dos minutos en verse en el sitio.`)}
      ${o.aviso ? `<p class="error">${esc(o.aviso)}</p>` : ''}
      ${o.guardado ? `<p class="error bien">Guardado. En uno o dos minutos se ve en el sitio.</p>` : ''}

      <p class="acciones">
        <a class="boton" href="/noticias/nueva">${icono('mas')}Escribir una noticia</a>
      </p>

      <table>
        <thead><tr><th>Título</th><th>Estado</th><th></th></tr></thead>
        <tbody>${
          // Con un aviso de por medio no se sabe qué hay: la lista llegó vacía
          // porque falló la lectura, no porque no haya noticias. Decir «todavía
          // no hay ninguna» ahí es afirmar que se borraron.
          filas ||
          (o.aviso
            ? '<tr><td colspan="3">No se pudo leer la lista.</td></tr>'
            : '<tr><td colspan="3">Todavía no hay ninguna.</td></tr>')
        }</tbody>
      </table>
`,
    { sesion: o.sesion, activa: '/noticias' },
  );
}

export function paginaNoticia(o: {
  sesion: Sesion;
  noticia: Partial<Noticia>;
  esNueva: boolean;
  error?: string;
}) {
  const n = o.noticia;
  const opcionesFoto = ['<option value="">— sin foto —</option>']
    .concat(
      // Se ofrece la descripción de la foto y no su nombre de archivo:
      // «tecnologa con tubos» no dice qué se ve, y el texto alternativo sí.
      FOTOS.map(
        (f) =>
          `<option value="${f}"${n.foto === f ? ' selected' : ''}>${esc(atributosDeFoto(f).alt)}</option>`,
      ),
    )
    .join('');

  return pagina(
    o.esNueva ? 'Escribir una noticia' : 'Editar noticia',
    `    ${cabecera(`${o.esNueva ? 'Escribir una noticia' : esc(n.titulo ?? '')}`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/noticias/${o.esNueva ? 'nueva' : esc(n.slug ?? '')}">
        <input type="hidden" name="sha" value="${esc(n.sha ?? '')}">

        <label for="titulo">Título</label>
        <input id="titulo" name="titulo" type="text" required maxlength="120"
               value="${esc(n.titulo ?? '')}">

        <label for="descripcion">Descripción</label>
        <input id="descripcion" name="descripcion" type="text" required maxlength="200"
               value="${esc(n.descripcion ?? '')}">
        <p class="pista">Es lo que se lee en el listado y en Google. Una frase.</p>

        <label for="categoria">Categoría</label>
        <input id="categoria" name="categoria" type="text" required list="categorias"
               value="${esc(n.categoria ?? '')}">
        <datalist id="categorias">
          <option value="Laboratorio"><option value="Chequeos"><option value="Preparación">
        </datalist>

        <label for="fecha">Fecha</label>
        <input id="fecha" name="fecha" type="date" required value="${esc(n.fecha ?? '')}">

        <label for="autor">Autor</label>
        <input id="autor" name="autor" type="text" value="${esc(n.autor ?? 'Equipo ExamLab')}">

        <label for="foto">Foto</label>
        <select id="foto" name="foto">${opcionesFoto}</select>
        <p class="pista">
          Las nueve fotos reales del laboratorio. Subir una nueva exige tocar el
          código del sitio y queda para una fase posterior.
        </p>

        <label for="cuerpo">Artículo</label>
        <textarea id="cuerpo" name="cuerpo" rows="18" required
          style="font-family:ui-monospace,monospace;font-size:.84rem">${esc(n.cuerpo ?? '')}</textarea>
        <p class="pista">
          Markdown: <code>## Un subtítulo</code>, <code>**negrita**</code>,
          <code>- lista</code>.
        </p>

        <label style="display:flex;align-items:center;gap:.5rem;margin-top:1.2rem">
          <input type="checkbox" name="borrador" value="si" style="width:auto;margin:0"
                 ${n.borrador ? 'checked' : ''}>
          Guardar como borrador — no aparece en el sitio
        </label>

        <label style="display:flex;align-items:center;gap:.5rem;margin-top:.6rem">
          <input type="checkbox" name="destacado" value="si" style="width:auto;margin:0"
                 ${n.destacado ? 'checked' : ''}>
          Destacada en la portada de noticias
        </label>

        <button type="submit">${o.esNueva ? 'Publicar' : 'Guardar cambios'}</button>
      </form>
`,
    { sesion: o.sesion, activa: '/noticias' },
  );
}

/* ─── Aviso ──────────────────────────────────────────────────────────────── */

export function paginaAviso(o: {
  sesion: Sesion;
  aviso: { activo: boolean; texto: string; hasta: string };
  guardado?: boolean;
  error?: string;
}) {
  return pagina(
    'Aviso en el sitio',
    `    ${cabecera('Aviso en el sitio', `Una franja arriba de todas las páginas. Para cosas que duran poco y no
        justifican una noticia.`)}
      ${o.guardado ? `<p class="error bien">Guardado. En uno o dos minutos se ve en el sitio.</p>` : ''}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form method="post" action="/aviso" class="panel">
        <label style="display:flex;align-items:center;gap:.5rem">
          <input type="checkbox" name="activo" value="si" style="width:auto;margin:0"
                 ${o.aviso.activo ? 'checked' : ''}>
          Mostrar el aviso
        </label>

        <label for="texto">Texto</label>
        <input id="texto" name="texto" type="text" maxlength="200"
               value="${esc(o.aviso.texto)}"
               placeholder="El 24 de mayo atendemos solo en la matriz.">

        <label for="hasta">Dejar de mostrarlo el</label>
        <input id="hasta" name="hasta" type="date" value="${esc(o.aviso.hasta)}">
        <p class="pista">
          Opcional, pero conviene ponerlo: si se deja vacío, el aviso sigue ahí
          hasta que alguien se acuerde de quitarlo.
        </p>

        <button type="submit">Guardar</button>
      </form>
`,
    { sesion: o.sesion, activa: '/aviso' },
  );
}

/* ─── Estado ─────────────────────────────────────────────────────────────── */

const haceCuanto = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const minutos = Math.round(ms / 60000);
  if (minutos < 1) return 'hace menos de un minuto';
  if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export function paginaEstado(o: {
  sesion: Sesion;
  commits: Commit[];
  seccion?: Seccion;
  hoy: string;
  error?: string;
}) {
  const conSeccion = o.commits.map((c) => ({ ...c, seccion: seccionDe(c.mensaje) }));
  const ultimo = conSeccion[0];

  const cuantos = (s: Seccion) => conSeccion.filter((c) => c.seccion === s).length;
  const visibles = o.seccion ? conSeccion.filter((c) => c.seccion === o.seccion) : conSeccion;

  // Un día por bloque, en el orden en que llegan: GitHub ya los da del más
  // reciente al más antiguo.
  const dias: { dia: string; cambios: typeof visibles }[] = [];
  for (const c of visibles) {
    const dia = diaDe(c.fecha);
    const ultimoDia = dias[dias.length - 1];
    if (ultimoDia?.dia === dia) ultimoDia.cambios.push(c);
    else dias.push({ dia, cambios: [c] });
  }

  const enlace = (seccion?: Seccion) => `/estado${seccion ? `?seccion=${seccion}` : ''}`;

  return pagina(
    'Estado',
    `    ${cabecera('Estado e historial', `Qué se cambió, cuándo y quién. Sale del historial del propio repositorio.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      ${
        ultimo
          ? `<div class="panel">
               <strong>Último cambio ${esc(haceCuanto(ultimo.fecha))}</strong>
               <p style="margin:.4rem 0 0">${esc(ultimo.mensaje)}</p>
               <p class="pista">Por ${esc(ultimo.autor)}</p>
             </div>
             <p class="pista" style="margin-top:1.2rem">
               Entre guardar y ver el cambio publicado pasan uno o dos minutos: el
               sitio se vuelve a compilar entero. Si no lo ve enseguida, no vuelva
               a guardar — espere y recargue.
             </p>`
          : // Igual que en el listado de noticias: si hubo un error, el
            // historial vino vacío por eso y no porque no haya cambios.
            o.error
            ? ''
            : '<p>Todavía no hay cambios registrados.</p>'
      }

      ${
        conSeccion.length
          ? `<ul class="recuento" style="margin-top:2rem">
               <li><a href="${enlace()}" ${!o.seccion ? 'aria-current="page"' : ''}>
                 <b>${conSeccion.length}</b> en total</a></li>
               ${(Object.keys(SECCIONES) as Seccion[])
                 .filter((s) => cuantos(s) > 0)
                 .map(
                   (s) => `<li><a href="${enlace(s)}" ${o.seccion === s ? 'aria-current="page"' : ''}>
                     <b>${cuantos(s)}</b> ${esc(SECCIONES[s].etiqueta.toLowerCase())}</a></li>`,
                 )
                 .join('')}
             </ul>`
          : ''
      }

      ${dias
        .map(
          ({ dia, cambios }) => `
          <h2 style="font-size:15px;margin:1.75rem 0 0;color:var(--tinta-suave)">
            ${esc(nombreDelDia(dia, o.hoy))}
          </h2>
          <ul class="lista" style="margin-top:.4rem">
            ${cambios
              .map((c) => {
                const seccion = SECCIONES[c.seccion];
                // Un editor ve la etiqueta, pero no como enlace: la ruta le
                // respondería «No tiene permiso.» y se quedaría ahí.
                const alcanza = !seccion.soloAdmin || o.sesion.rol === 'administrador';
                const etiqueta = esc(seccion.etiqueta);
                return `<li>
                  ${esc(c.mensaje)}
                  ${
                    !seccion.ruta
                      ? '' // «Otros cambios» nunca llevó etiqueta: no hay dónde ir.
                      : alcanza
                        ? `<a href="${seccion.ruta}" class="marca" style="color:var(--accion);background:none;border-color:transparent;text-decoration:none">${etiqueta}</a>`
                        : `<span class="marca" style="background:none;border-color:transparent">${etiqueta}</span>`
                  }
                  <br><span class="pista">${esc(c.autor)} · ${esc(haceCuanto(c.fecha))}</span>
                </li>`;
              })
              .join('')}
          </ul>`,
        )
        .join('')}

      ${
        o.seccion && !visibles.length
          ? '<p class="pista">No hay cambios de esa sección entre los últimos registrados.</p>'
          : ''
      }
`,
    { sesion: o.sesion, activa: '/estado' },
  );
}
