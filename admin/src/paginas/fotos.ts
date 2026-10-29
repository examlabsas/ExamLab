/**
 * Las fotos del laboratorio.
 *
 * Es la única pantalla del panel que **no funciona sin JavaScript**, y lo dice
 * ella misma. El resto se construyó para funcionar con el guion bloqueado;
 * aquí no se puede: las tres variantes y la vista previa las genera el
 * navegador de quien sube la foto, porque un Worker de Cloudflare no puede
 * correr `sharp` y encargárselo a Cloudflare costaría dinero.
 */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import type { Foto } from '../fotos';

export function paginaFotos(o: {
  sesion: Sesion;
  fotos: Foto[];
  guardada?: string;
  error?: string;
}) {
  const tarjetas = o.fotos
    .map(
      (f) => `<li>
        <img src="/vista/${esc(f.nombre)}" width="160" height="120" alt="" loading="lazy">
        <div>
          <b>${esc(f.nombre)}</b>
          <em>${esc(f.alt)}</em>
          <span class="marca">${f.anchos.join(' · ')} px</span>
        </div>
      </li>`,
    )
    .join('');

  return pagina(
    'Fotos',
    `${cabecera(
      'Fotos del laboratorio',
      `Las que se pueden elegir al escribir una noticia. De cada una se guardan dos o
       tres tamaños y una vista previa para WhatsApp; los genera su propio navegador
       antes de subirlos.`,
    )}

    ${o.guardada ? `<p class="error bien">Subida «${esc(o.guardada)}». En uno o dos minutos se puede elegir al escribir una noticia.</p>` : ''}
    ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

    <div class="panel" id="subir" style="max-width:40rem">
      <h2 style="margin:0 0 1rem">Subir una foto</h2>

      ${
        /*
          Sin guion no hay nada que hacer, así que se dice antes de que la
          persona rellene el formulario. El aviso lo esconde el propio guion:
          si corre, nunca se ve.
        */ ''
      }
      <p class="error sin-guion">
        Esta pantalla necesita JavaScript para preparar la foto. Actívelo o pida
        que la suban desde otro navegador.
      </p>

      <form method="post" action="/fotos" class="subir-foto" hidden>
        <label for="archivo">La foto</label>
        <div class="campo-archivo">
          <input id="archivo" name="archivo" type="file" accept="image/jpeg,image/png,image/webp" required>
          <label for="archivo" class="boton suave">${icono('fotos')}Elegir una foto</label>
          <span class="archivo-nombre">Ninguna elegida todavía</span>
        </div>
        <p class="pista">
          Cuanto más grande, mejor: de un original de 2000 px o más sale una
          variante extra para pantallas grandes. Se recorta a 4:3 desde el
          centro, y se le quitan los datos del teléfono y la ubicación.
        </p>

        <div class="eco vista-foto" hidden></div>

        <label for="alt">¿Qué se ve?</label>
        <input id="alt" name="alt" type="text" required maxlength="300"
               placeholder="Tecnóloga de ExamLab preparando una muestra">
        <p class="pista">
          Es lo que oye quien usa un lector de pantalla y lo que lee Google. Sin
          «foto de»: eso ya lo anuncia el lector.
        </p>

        <label for="nombre">Nombre corto</label>
        <input id="nombre" name="nombre" type="text" required
               pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="pipeteo-de-muestra">
        <p class="pista">Sale del nombre del archivo. Es el nombre con el que se guarda.</p>

        <button type="submit" disabled>Subir la foto</button>
      </form>
    </div>

    <h2>Las que ya están</h2>
    <ul class="galeria">${tarjetas}</ul>`,
    { sesion: o.sesion, activa: '/fotos' },
  );
}
