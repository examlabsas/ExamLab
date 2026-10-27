/** Pantallas de datos del sitio: contacto, sedes y fechas especiales. */
import { pagina, cabecera, esc, icono, type Sesion } from './plantilla';
import { DIAS, resumenSemana, type DatosSitio, type Sede, type FechaEspecial } from '../sitio';

const guardado = (si?: boolean) =>
  si ? `<p class="error bien">Guardado. En uno o dos minutos se ve en el sitio.</p>` : '';

/* ─── Contacto ───────────────────────────────────────────────────────────── */

export function paginaContacto(o: {
  sesion: Sesion;
  datos: DatosSitio;
  ok?: boolean;
  error?: string;
}) {
  const d = o.datos;
  const campo = (id: string, etiqueta: string, valor: string, tipo = 'text', pista = '') => `
    <label for="${id}">${esc(etiqueta)}</label>
    <input id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" required>
    ${pista ? `<p class="pista">${pista}</p>` : ''}`;

  return pagina(
    'Contacto',
    `    ${cabecera('Contacto y redes', `Estos datos salen en todas las páginas del sitio.`)}
      ${guardado(o.ok)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form method="post" action="/contacto" class="panel">
        ${campo('telefono', 'Teléfono y WhatsApp general', d.telefono, 'text', 'El formato internacional se calcula solo a partir de este número.')}
        ${campo('emergencias', 'Línea de urgencias', d.emergencias, 'text', 'Hoy es el mismo que el general. El laboratorio confirmó que existe uno aparte pero no lo ha entregado.')}
        ${campo('email', 'Correo de contacto general', d.email, 'email')}
        ${campo('laboratorio', 'Correo de laboratorio', d.emails.laboratorio, 'email', 'Pacientes, médicos y laboratorios asociados.')}
        ${campo('administracion', 'Correo de administración', d.emails.administracion, 'email', 'Asuntos legales y de datos personales.')}
        ${campo('facturacion', 'Correo de facturación', d.emails.facturacion, 'email')}
        ${campo('facebook', 'Facebook', d.redes.facebook, 'url')}
        ${campo('instagram', 'Instagram', d.redes.instagram, 'url')}
        ${campo('tiktok', 'TikTok', d.redes.tiktok, 'url')}
        ${campo('sistemaUrl', 'Dirección del sistema de resultados', d.sistema.url, 'url', `Hoy es ${esc(d.sistema.nombre)}. A aquí llega el botón «Resultados» de la cabecera.`)}
        ${campo('fundacion', 'Año de fundación', d.fundacion, 'text', 'Sale en los datos que lee Google.')}
        <button type="submit">Guardar</button>
      </form>
`,
    { sesion: o.sesion, activa: '/contacto' },
  );
}

/* ─── Sedes ──────────────────────────────────────────────────────────────── */

export function paginaSedes(o: { sesion: Sesion; sedes: Sede[]; ok?: boolean }) {
  const filas = o.sedes
    .map(
      (s) => `<tr>
        <td><a href="/sedes/${esc(s.slug)}"><strong>${esc(s.nombre)}</strong></a>
            <br><span class="pista">${esc(s.direccion)}</span></td>
        <td>${esc(s.telefono)}<br><span class="pista">${esc(s.celular)}</span></td>
        <td class="accion">
          <a class="boton suave chico" href="/sedes/${esc(s.slug)}">${icono('editar')}<span class="solo-ancho">Editar</span></a>
        </td>
      </tr>`,
    )
    .join('');

  return pagina(
    'Sedes',
    `    ${cabecera('Sedes', `Direcciones, teléfonos y horarios de atención.`)}
      ${guardado(o.ok)}
      <table><thead><tr><th>Sede</th><th>Teléfonos</th><th></th></tr></thead><tbody>${filas}</tbody></table>
`,
    { sesion: o.sesion, activa: '/sedes' },
  );
}

export function paginaSede(o: { sesion: Sesion; sede: Sede; error?: string }) {
  const s = o.sede;

  const dia = (i: number) => {
    const franja = s.horarioSemanal[i] ?? null;
    const t1 = franja?.[0];
    const t2 = franja?.[1];
    return `
      <tr>
        <td style="white-space:nowrap">
          <label style="display:flex;align-items:center;gap:.4rem;margin:0;font-weight:600">
            <input type="checkbox" name="abre${i}" value="si" style="width:auto;margin:0"
                   ${franja ? 'checked' : ''}>
            ${DIAS[i]}
          </label>
        </td>
        <td data-rotulo="Abre"><input name="d${i}a1" type="time" value="${esc(t1?.abre ?? '')}" style="margin:0"></td>
        <td data-rotulo="Cierra"><input name="d${i}c1" type="time" value="${esc(t1?.cierra ?? '')}" style="margin:0"></td>
        <td data-rotulo="Abre (tarde)"><input name="d${i}a2" type="time" value="${esc(t2?.abre ?? '')}" style="margin:0"></td>
        <td data-rotulo="Cierra (tarde)"><input name="d${i}c2" type="time" value="${esc(t2?.cierra ?? '')}" style="margin:0"></td>
      </tr>`;
  };

  return pagina(
    s.nombre,
    `    ${cabecera(`${esc(s.nombre)}`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/sedes/${esc(s.slug)}">
        <label for="nombre">Nombre</label>
        <input id="nombre" name="nombre" type="text" value="${esc(s.nombre)}" required>

        <label for="direccion">Dirección</label>
        <input id="direccion" name="direccion" type="text" value="${esc(s.direccion)}" required>

        <label for="referencia">Referencia</label>
        <input id="referencia" name="referencia" type="text" value="${esc(s.referencia ?? '')}">
        <p class="pista">Cómo encontrarla: «Junto al C.C. Teófilo López».</p>

        <label for="telefono">Teléfono fijo</label>
        <input id="telefono" name="telefono" type="text" value="${esc(s.telefono)}" required>

        <label for="celular">Celular</label>
        <input id="celular" name="celular" type="text" value="${esc(s.celular)}" required>

        <h2 style="margin-top:2rem">Horario</h2>
        <p class="pista">
          Desmarque el día para cerrarlo. La segunda pareja de horas es para las
          sedes que cierran al mediodía; déjela vacía si no aplica.
        </p>
        <table class="horario">
          <thead><tr><th>Día</th><th>Abre</th><th>Cierra</th><th>Abre (tarde)</th><th>Cierra</th></tr></thead>
          <tbody>${[1, 2, 3, 4, 5, 6, 0].map(dia).join('')}</tbody>
        </table>

        <div class="recuadro" style="margin-top:1.5rem">
          <strong>Así queda hoy</strong>
          <p class="pista" style="white-space:pre-line;margin-top:.4rem">${esc(resumenSemana(s.horarioSemanal).join('\n'))}</p>
        </div>

        <button type="submit">Guardar</button>
      </form>
`,
    { sesion: o.sesion, activa: '/sedes' },
  );
}

/* ─── Feriados ───────────────────────────────────────────────────────────── */

export function paginaFeriados(o: {
  sesion: Sesion;
  fechas: FechaEspecial[];
  ok?: boolean;
  error?: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const filas = o.fechas
    .map(
      (f) => {
        const atencion = f.franja
          ? esc(f.franja.map((t) => `${t.abre}–${t.cierra}`).join(' y '))
          : 'Cerrado';
        return `<tr style="${f.fecha < hoy ? 'opacity:.5' : ''}">
        <td>${esc(f.fecha)}</td>
        <td>${esc(f.motivo)}${
          /*
            Cuatro columnas no caben en un teléfono y la que se cae por el borde
            es la del botón, que es justo la que hace algo. Como en Usuarios: la
            atención baja a marca bajo el motivo y su columna desaparece.
          */ ''
        }<span class="solo-estrecho"><br><span class="marca">${atencion}</span></span></td>
        <td class="solo-amplio">${atencion}</td>
        <td class="accion">
          <form method="post" action="/feriados/quitar" style="margin:0">
            <input type="hidden" name="fecha" value="${esc(f.fecha)}">
            <button type="submit" class="chico">Quitar</button>
          </form>
        </td>
      </tr>`;
      },
    )
    .join('');

  return pagina(
    'Feriados',
    `    ${cabecera('Feriados y días especiales', `El indicador de «Abierto / Cerrado» los respeta, y también los datos que
        lee Google. Sin esto, el sitio diría «Abierto» un día de cierre.`)}
      ${guardado(o.ok)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <table>
        <thead><tr><th>Fecha</th><th>Motivo</th><th class="solo-amplio">Atención</th><th></th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4">Ninguno.</td></tr>'}</tbody>
      </table>
      <p class="pista">Las fechas ya pasadas se ven atenuadas. No estorban: se pueden dejar.</p>

      <div class="panel" style="margin-top:2rem">
        <h2 style="margin:0">Añadir una fecha</h2>
        <form method="post" action="/feriados">
          <label for="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" required>

          <label for="motivo">Motivo</label>
          <input id="motivo" name="motivo" type="text" required
                 placeholder="Independencia de Guayaquil">
          <p class="pista">Se le muestra al paciente: «Cerrado por Independencia de Guayaquil».</p>

          <label style="display:flex;align-items:center;gap:.5rem;margin-top:1.1rem">
            <input type="checkbox" name="cerrado" value="si" checked style="width:auto;margin:0">
            Cerrado todo el día
          </label>

          <label for="abre">Si abre, desde</label>
          <input id="abre" name="abre" type="time">
          <label for="cierra">hasta</label>
          <input id="cierra" name="cierra" type="time">

          <button type="submit">Añadir</button>
        </form>
      </div>
`,
    { sesion: o.sesion, activa: '/feriados' },
  );
}
