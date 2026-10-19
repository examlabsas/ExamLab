/** Pantallas de acceso: entrar, aceptar una invitación y la portada del panel. */
import { pagina, cabecera, esc, seccionesDe, type Sesion } from './plantilla';
import { HORAS_DE_INVITACION } from '../usuarios';
import { generar } from '../qr';

export function paginaAcceso(opciones: { error?: string; correo?: string } = {}) {
  return pagina(
    'Acceso',
    `<form class="caja" method="post" action="/entrar" autocomplete="on">
      <h1>Panel ExamLab</h1>
      <p class="sub">Noticias, catálogos y datos del sitio.</p>

      <label for="correo">Correo</label>
      <input id="correo" name="correo" type="email" required autocomplete="username"
             value="${esc(opciones.correo ?? '')}" autofocus>

      <label for="contrasena">Contraseña</label>
      <input id="contrasena" name="contrasena" type="password" required
             autocomplete="current-password">

      <label for="codigo">Código de su aplicación</label>
      <input id="codigo" name="codigo" type="text" inputmode="numeric" pattern="[0-9]*"
             maxlength="6" required autocomplete="one-time-code" placeholder="6 dígitos">

      ${opciones.error ? `<p class="error">${esc(opciones.error)}</p>` : ''}

      <button type="submit">Entrar</button>
    </form>`,
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
      <h1>Hola, ${esc(opciones.nombre)}</h1>
      <p class="sub">
        Elija su contraseña para <strong>${esc(opciones.correo)}</strong>.
        Nadie más la verá, ni siquiera quien le invitó.
      </p>

      <label for="contrasena">Contraseña</label>
      <input id="contrasena" name="contrasena" type="password" required
             autocomplete="new-password" minlength="12" autofocus>

      <label for="repetir">Repítala</label>
      <input id="repetir" name="repetir" type="password" required autocomplete="new-password">

      <p class="pista">
        Al menos 12 caracteres. Una frase que recuerde resiste más que ocho
        caracteres con símbolos — y no acaba escrita en un papel.
      </p>

      ${opciones.error ? `<p class="error">${esc(opciones.error)}</p>` : ''}

      <button type="submit">Continuar</button>
      <p class="pista">Este enlace caduca a las ${HORAS_DE_INVITACION} horas y sirve una sola vez.</p>
    </form>`,
  );
}

/**
 * Se muestra una única vez, justo tras crear la contraseña. El secreto no se
 * vuelve a enseñar: si se pierde el teléfono, un administrador reinicia el
 * acceso.
 */
export function paginaCodigoQr(opciones: { uri: string; secreto: string }) {
  /*
    El código se dibuja aquí dentro.

    Antes se le pedía a un servicio de fuera pasándole la dirección `otpauth://`
    en la URL — y esa dirección **lleva el secreto del segundo factor**. Es
    decir: la clave que protege el panel viajaba entera a un tercero, y quedaba
    en sus registros. El Worker ya sabe generar códigos QR, así que no hay nada
    que pedir afuera.
  */
  const codigo = generar(opciones.uri);

  return pagina(
    'Su código',
    `<div class="caja">
      <h1>Un paso más</h1>
      <p class="sub">
        Escanee este código con Google Authenticator, Authy o la aplicación de
        autenticación que use. Le dará un número de 6 dígitos que cambia cada
        30 segundos, y es lo que le pediremos al entrar.
      </p>

      <div class="vista-qr" style="max-width:15rem;margin:1.25rem auto 0" role="img"
           aria-label="Código para la aplicación de autenticación">${codigo.svg}</div>

      <p class="pista">
        ¿No puede escanearlo? Escriba esta clave a mano en la aplicación:<br>
        <code>${esc(opciones.secreto)}</code>
      </p>

      <p class="error">
        Esta pantalla no se vuelve a mostrar. Compruebe que la aplicación ya le
        da un código antes de continuar.
      </p>

      <form method="get" action="/"><button type="submit">Ya lo escaneé, entrar</button></form>
    </div>`,
  );
}

/**
 * La portada.
 *
 * En el móvil solo caben cuatro secciones en la barra de abajo, así que esta
 * pantalla es la que da acceso a las otras siete. Cada una con una línea de qué
 * hace: una lista de once enlaces sin explicar nada obliga a entrar en todas
 * para encontrar la que se buscaba.
 */
export function paginaPanel(opciones: { sesion: Sesion; nombre: string }) {
  const secciones = seccionesDe(opciones.sesion.rol).filter((s) => s.ruta !== '/');

  return pagina(
    'Panel',
    `${cabecera(
      `Hola, ${esc(opciones.nombre)}`,
      `Entró como <strong>${esc(opciones.sesion.rol)}</strong>. Todo lo que guarde aquí
       tarda uno o dos minutos en verse en el sitio, y queda anotado con su nombre
       y la fecha.`,
    )}

    <div class="panel">
      <ul class="lista">
        ${secciones
          .map(
            (s) => `<li>
              <a href="${s.ruta}">${esc(s.etiqueta)}</a>
              <br><span class="pista">${esc(s.de)}</span>
            </li>`,
          )
          .join('')}
      </ul>
    </div>`,
    { sesion: opciones.sesion, activa: '/' },
  );
}
