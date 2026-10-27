/** Pantalla de gestión de usuarios. Solo para administradores. */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import type { UsuarioPublico } from '../usuarios';

/*
  El enlace de alta se enseña como `code`, el tratamiento que el panel ya usa
  para el texto que se copia tal cual. Antes era un campo de texto con
  `onclick="this.select()"` que no se ejecutaba nunca: la CSP no declara
  `script-src`, así que cae a `default-src 'self'` y el navegador rechaza los
  manejadores en línea. Prometía seleccionar de un toque y no hacía nada,
  precisamente en la pantalla donde peor sienta copiar mal.

  Sin JavaScript no se puede seleccionar por la persona, pero `user-select: all`
  —que es CSS— hace lo mismo: un toque marca el enlace entero. Y al ir envuelto
  en vez de dentro de un campo de una línea, se ve si falta un trozo.
*/
export function paginaUsuarios(opciones: {
  sesion: Sesion;
  usuarios: UsuarioPublico[];
  enlaceNuevo?: string;
  error?: string;
}) {
  const filas = opciones.usuarios
    .map(
      (u) => `<tr>
        <td>
          ${esc(u.nombre)}<br><span class="pista">${esc(u.correo)}</span>
          ${
            /*
              En el móvil el rol baja aquí y el estado solo se dice cuando es
              noticia: «Activo» es lo normal y lo repite el propio botón, que
              dice «Desactivar» justo cuando alguien lo está.
            */ ''
          }
          <span class="solo-estrecho"><br><span class="marca">${esc(u.rol)}</span>${
            u.activo ? '' : '<span class="marca mal">Desactivado</span>'
          }</span>
        </td>
        <td class="solo-amplio">${esc(u.rol)}</td>
        <td class="solo-amplio">${u.activo ? 'Activo' : 'Desactivado'}</td>
        <td class="accion">${
          u.correo === opciones.sesion.correo
            ? '<span class="pista">Es usted</span>'
            : `<form method="post" action="/usuarios/estado" style="margin:0">
                 <input type="hidden" name="correo" value="${esc(u.correo)}">
                 <input type="hidden" name="activo" value="${u.activo ? 'no' : 'si'}">
                 <button type="submit" class="chico ${u.activo ? 'secundario' : ''}">
                   ${u.activo ? 'Desactivar' : 'Reactivar'}
                 </button>
               </form>`
        }</td>
      </tr>`,
    )
    .join('');

  return pagina(
    'Usuarios',
    `    ${cabecera('Usuarios', `Quien entra aquí puede publicar en el sitio del laboratorio.
        Conviene que haya siempre <strong>dos administradores</strong>: con uno
        solo, un olvido de contraseña deja el panel cerrado.`)}
      ${opciones.error ? `<p class="error">${esc(opciones.error)}</p>` : ''}

      ${
        opciones.enlaceNuevo
          ? `<div class="panel" style="margin:1.5rem 0;max-width:none">
               <strong>Enlace de alta creado</strong>
               <p class="pista">
                 Páseselo a esa persona por un medio directo. Caduca en 24 horas
                 y sirve una sola vez. Ella elige su contraseña: usted no la verá.
               </p>
               <p style="margin:0"><code class="enlace-alta">${esc(opciones.enlaceNuevo)}</code></p>
             </div>`
          : ''
      }

      <p class="acciones">
        <a class="boton" href="#invitar">${icono('mas')}Invitar a alguien</a>
      </p>

      <table>
        <thead><tr><th>Persona</th><th class="solo-amplio">Rol</th><th class="solo-amplio">Estado</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>

      <div class="panel" id="invitar" style="margin-top:2rem;max-width:none">
        <h2 style="margin:0 0 1rem">Invitar a alguien</h2>
        <form method="post" action="/usuarios/invitar">
          <label for="nombre">Nombre</label>
          <input id="nombre" name="nombre" type="text" required>

          <label for="correo">Correo</label>
          <input id="correo" name="correo" type="email" required>

          <label for="rol">Rol</label>
          <select id="rol" name="rol">
            <option value="editor">Editor — noticias y datos del sitio</option>
            <option value="administrador">Administrador — todo, incluidos usuarios</option>
          </select>

          <p class="pista">
            Un editor no ve el catálogo de laboratorios asociados: ahí está el
            cartera de convenio.
          </p>

          <button type="submit">Crear enlace de alta</button>
        </form>
      </div>
`,
    { sesion: opciones.sesion, activa: '/usuarios' },
  );
}
