/**
 * Pantalla de códigos QR.
 *
 * El código se enseña en grande a propósito. Dentro del Worker no se puede
 * decodificar para comprobarlo —eso necesita leer una imagen— así que la
 * verificación la hace quien lo está creando: lo escanea con el móvil ahí mismo,
 * antes de descargarlo. Es menos automático que la comprobación del script, y
 * a la vez más fiel: lo que importa no es que una librería lo lea, sino que lo
 * lea un teléfono.
 */
import { pagina, cabecera, esc, type Sesion } from './plantilla';
import { DOMINIO, type Qr } from '../qr';

const EJEMPLOS = [
  ['https://examlabsas.com/', 'la portada'],
  ['https://examlabsas.com/preparacion', 'el manual de preparación'],
  ['https://examlabsas.com/catalogo', 'el catálogo de exámenes'],
  ['https://examlabsas.com/sedes', 'las sedes'],
];

export function paginaQr(o: {
  sesion: Sesion;
  direccion: string;
  nombre: string;
  qr?: Qr;
  error?: string;
}) {
  return pagina(
    'Códigos QR',
    `    ${cabecera('Códigos QR', `Para frascos, afiches y recetarios. Salen en SVG, que la imprenta amplía
        al tamaño que haga falta sin que se pixele.`)}
      ${o.error ? `<p class="error">${esc(o.error)}</p>` : ''}

      <form class="panel" method="post" action="/qr">
        <label for="direccion">¿Qué debe abrir el código?</label>
        <input id="direccion" name="direccion" type="url" value="${esc(o.direccion)}"
               placeholder="https://${DOMINIO}/preparacion" required>
        <p class="pista">
          La dirección completa, empezando por <code>https://</code>. Por ejemplo
          ${EJEMPLOS.map(([u, q]) => `<code>${esc(u)}</code> para ${esc(q)}`).join(', ')}.
        </p>

        <label for="nombre">Nombre del archivo</label>
        <input id="nombre" name="nombre" type="text" value="${esc(o.nombre)}"
               placeholder="Se saca de la dirección si lo deja vacío">

        <button type="submit">Generar</button>
      </form>

      ${
        o.qr
          ? `
        ${
          o.qr.esDefinitiva
            ? ''
            : `<p class="error" style="margin-top:2rem">
                 Esa dirección no es de ${esc(DOMINIO)} ni de WhatsApp. El archivo sale
                 marcado como «pruebas» para que un código provisional no acabe en la
                 imprenta por una confusión de nombres.
               </p>`
        }

        <div class="panel" style="margin-top:2rem;text-align:center">
          <div class="vista-qr" style="max-width:17rem;margin:0 auto">${o.qr.svg}</div>
          <p class="eco" style="text-align:left;margin-top:1.25rem">
            <strong>Escanéelo ahora con el móvil</strong>, antes de descargarlo.
            Debe abrir <code>${esc(o.direccion)}</code>. Es la única comprobación que
            vale: lo que tiene que leerlo es un teléfono, no un programa.
          </p>
        </div>

        <form method="post" action="/qr/descargar">
          <input type="hidden" name="direccion" value="${esc(o.direccion)}">
          <input type="hidden" name="nombre" value="${esc(o.nombre)}">
          <button type="submit">Descargar ${esc(o.qr.archivo)}.svg</button>
        </form>

        <p class="pista">
          ${o.qr.modulos}×${o.qr.modulos} módulos, con corrección de errores alta: se
          sigue leyendo con hasta un 30 % del código tapado o dañado, que es lo
          que permite el emblema del centro y lo que aguanta un adhesivo mojado o
          pegado sobre un frasco.
        </p>`
          : ''
      }
`,
    { sesion: o.sesion, activa: '/qr' },
  );
}
