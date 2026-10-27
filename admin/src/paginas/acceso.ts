/**
 * Pantallas de acceso: entrar, aceptar una invitación y la portada del panel.
 *
 * Hubo una tercera pantalla, la del código QR del segundo factor, que salía
 * una sola vez al aceptar una invitación. Desapareció con el código de
 * verificación: sin segundo factor no hay nada que escanear.
 */
import { pagina, cabecera, esc, icono, seccionesDe, type Sesion } from './plantilla';
import { HORAS_DE_INVITACION } from '../usuarios';
import type { Falta } from '../catalogo';

/** La cabecera de marca de la caja: hace el papel del raíl, que aquí no está. */
const marca = `<div class="caja-marca">
      <img src="/emblema.webp" width="40" height="40" alt="">
      <span><b>ExamLab</b><em>Panel</em></span>
    </div>`;

/**
 * Un campo de contraseña con el ojo de verla.
 *
 * El botón sale dibujado y oculto: lo enseña el guion. Quien tenga el
 * JavaScript bloqueado ve exactamente el campo de antes, sin un botón muerto
 * al lado.
 *
 * Escribir una contraseña larga a ciegas en el teclado de un móvil es la razón
 * de que la gente acabe eligiendo contraseñas cortas. Poder mirar lo que se
 * escribió protege más que esconderlo.
 */
const campoClave = (opciones: {
  id: string;
  nombre: string;
  completar: 'current-password' | 'new-password';
  minimo?: number;
  foco?: boolean;
}) => `<div class="campo-clave">
      <input id="${opciones.id}" name="${opciones.nombre}" type="password" required
             autocomplete="${opciones.completar}"${opciones.minimo ? ` minlength="${opciones.minimo}"` : ''}${opciones.foco ? ' autofocus' : ''}>
      <button type="button" class="ojo" hidden aria-pressed="false"
              aria-label="Ver la contraseña" title="Ver la contraseña">
        <span class="ojo-ver">${icono('ojo')}</span>
        <span class="ojo-ocultar">${icono('ojo-tachado')}</span>
      </button>
    </div>`;

export function paginaAcceso(opciones: { error?: string; correo?: string } = {}) {
  return pagina(
    'Acceso',
    `<form class="caja" method="post" action="/entrar" autocomplete="on">
      ${marca}
      <div class="caja-cuerpo">
        <h1>Entre a su cuenta</h1>
        <p class="sub">Noticias, catálogos y datos del sitio.</p>

        <label for="correo">Correo</label>
        <input id="correo" name="correo" type="email" required autocomplete="username"
               inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false"
               value="${esc(opciones.correo ?? '')}" autofocus>

        <label for="contrasena">Contraseña</label>
        ${campoClave({ id: 'contrasena', nombre: 'contrasena', completar: 'current-password' })}
        <p class="pista mayusculas" hidden>Está activado el bloqueo de mayúsculas.</p>

        ${opciones.error ? `<p class="error">${esc(opciones.error)}</p>` : ''}

        <button type="submit">Entrar</button>
      </div>
    </form>
    <p class="pie-acceso">
      Acceso solo para el personal del laboratorio.
      <a href="https://examlabsas.com">Ir al sitio</a>
    </p>`,
  );
}

export function paginaInvitacion(opciones: {
  testigo: string;
  correo: string;
  nombre: string;
  error?: string;
}) {
  return pagina(
    'Crear su acceso',
    `<form class="caja" method="post" action="/invitacion/${esc(opciones.testigo)}">
      ${marca}
      <div class="caja-cuerpo">
        <h1>Hola, ${esc(opciones.nombre)}</h1>
        <p class="sub">
          Elija su contraseña para <strong>${esc(opciones.correo)}</strong>.
          Nadie más la verá, ni siquiera quien le invitó.
        </p>

        <label for="contrasena">Contraseña</label>
        ${campoClave({
          id: 'contrasena',
          nombre: 'contrasena',
          completar: 'new-password',
          minimo: 12,
          foco: true,
        })}

        <label for="repetir">Repítala</label>
        ${campoClave({ id: 'repetir', nombre: 'repetir', completar: 'new-password' })}
        <p class="pista mayusculas" hidden>Está activado el bloqueo de mayúsculas.</p>

        <p class="pista">
          Al menos 12 caracteres. Una frase que recuerde resiste más que ocho
          caracteres con símbolos — y no acaba escrita en un papel.
        </p>

        ${opciones.error ? `<p class="error">${esc(opciones.error)}</p>` : ''}

        <button type="submit">Continuar</button>
        <p class="pista">Este enlace caduca a las ${HORAS_DE_INVITACION} horas y sirve una sola vez.</p>
      </div>
    </form>`,
  );
}


/** Lo que el inicio sabe del sitio. Vacío si GitHub no contestó. */
export type ResumenInicio = {
  examenes?: number;
  faltas?: Falta[];
  aviso?: { activo: boolean; texto: string; hasta?: string };
};

/**
 * La portada.
 *
 * Era una lista de once enlaces. Servía para navegar y para nada más: había que
 * entrar al catálogo para enterarse de que faltan 495 plazos de entrega, y al
 * aviso para saber si el sitio está enseñando una franja que alguien dejó
 * puesta la semana pasada. Las dos cosas se saben antes de pulsar nada.
 *
 * El orden es el del trabajo, no el del menú: **qué está pasando ahora**, luego
 * **qué falta por hacer** —con el número, que es lo que baja cada mañana— y al
 * final a dónde ir.
 *
 * Los accesos van en rejilla con su icono. Una rejilla de destinos es la forma
 * honesta de un lanzador; lo que no vale es usar tarjetas iguales para fingir
 * que una página tiene estructura, y aquí no son la página: son su último
 * tercio, bajo un título que dice lo que son.
 */
export function paginaPanel(opciones: {
  sesion: Sesion;
  nombre: string;
  resumen?: ResumenInicio;
}) {
  const secciones = seccionesDe(opciones.sesion.rol).filter((s) => s.ruta !== '/');
  const { examenes, faltas, aviso } = opciones.resumen ?? {};

  // Solo lo que de verdad falta, y lo más gordo primero. Un «0 sin especialidad
  // propia» ocupa el mismo sitio que un 495 y no pide nada.
  const pendientes = (faltas ?? []).filter((f) => f.cuantos > 0).sort((a, b) => b.cuantos - a.cuantos);

  const bloqueAviso = aviso
    ? `<div class="panel ahora${aviso.activo ? ' puesto' : ''}">
        ${icono('aviso')}
        <div class="ahora-texto">
          <b>${aviso.activo ? 'El sitio está mostrando un aviso' : 'No hay ningún aviso puesto'}</b>
          ${
            aviso.activo
              ? `<p class="pista">«${esc(aviso.texto)}»${aviso.hasta ? ` · hasta el ${esc(aviso.hasta)}` : ''}</p>`
              : `<p class="pista">La franja de arriba de todas las páginas está apagada.</p>`
          }
        </div>
        <a class="boton suave" href="/aviso">${aviso.activo ? 'Cambiarlo' : 'Poner uno'}</a>
      </div>`
    : '';

  const bloqueFaltas = pendientes.length
    ? `<h2>Lo que falta por completar</h2>
      <p class="pista">
        De los ${examenes} exámenes del catálogo. Cada número lleva a su lista;
        se corrigen de diez en diez desde el móvil.
      </p>
      <ul class="recuento">
        ${pendientes
          .map(
            (f) => `<li><a href="/catalogo?falta=${esc(f.clave)}">
              <b>${f.cuantos}</b> ${esc(f.etiqueta)}</a></li>`,
          )
          .join('')}
      </ul>`
    : '';

  return pagina(
    'Panel',
    `${cabecera(
      `Hola, ${esc(opciones.nombre)}`,
      `Entró como <strong>${esc(opciones.sesion.rol)}</strong>. Lo que guarde aquí tarda
       uno o dos minutos en verse en el sitio y queda anotado con su nombre.`,
    )}

    ${bloqueAviso}
    ${bloqueFaltas}

    <h2>Accesos rápidos</h2>
    <ul class="accesos">
      ${secciones
        .map(
          (s) => `<li><a href="${s.ruta}">
            ${icono(s.icono)}
            <span><b>${esc(s.etiqueta)}</b><em>${esc(s.de)}</em></span>
          </a></li>`,
        )
        .join('')}
    </ul>`,
    { sesion: opciones.sesion, activa: '/' },
  );
}
