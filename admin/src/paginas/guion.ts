/**
 * Las dos únicas cosas del panel que el navegador no puede hacer sin ayuda.
 *
 * El panel se construyó sin JavaScript a propósito, y sigue siendo así: todas
 * las pantallas funcionan con este archivo bloqueado. Lo que hay aquí es
 * mejora progresiva sobre los campos de contraseña, nada más.
 *
 * Va en un archivo aparte y no dentro del HTML porque la cabecera de seguridad
 * no permite scripts en línea —`style-src` lleva `'unsafe-inline'`, `script-src`
 * no—, pero sí del propio origen, que es lo que cubre `default-src 'self'`.
 *
 * El botón del ojo llega dibujado desde el servidor y oculto. Si este archivo
 * no se ejecuta, nunca se muestra: así no queda un botón muerto en la pantalla,
 * que es lo que pasaría al revés.
 */
export const GUION = `
for (const campo of document.querySelectorAll('.campo-clave input')) {
  const boton = campo.parentElement.querySelector('.ojo');
  if (!boton) continue;

  boton.hidden = false;
  boton.addEventListener('click', () => {
    const oculta = campo.type === 'password';
    campo.type = oculta ? 'text' : 'password';
    boton.setAttribute('aria-pressed', String(oculta));
    const rotulo = oculta ? 'Ocultar la contraseña' : 'Ver la contraseña';
    boton.setAttribute('aria-label', rotulo);
    boton.title = rotulo;
    /*
      Devolver el cursor al final en vez de dejarlo donde estaba: cambiar el
      tipo del campo lo manda al principio en Chrome, y quien pulsa el ojo
      casi siempre está a mitad de escribir.
    */
    const hasta = campo.value.length;
    campo.focus();
    try { campo.setSelectionRange(hasta, hasta); } catch (e) {}
  });

  /*
    El aviso de mayúsculas. Es la causa más común de «mi contraseña no entra»
    y el campo, por estar oculto, no deja verla.

    Se mira en cada tecla y no solo al entrar al campo porque el bloqueo puede
    activarse escribiendo. En el móvil no existe esa tecla y el aviso no
    aparece nunca.
  */
  const aviso = campo.parentElement.parentElement.querySelector('.mayusculas');
  if (!aviso) continue;
  const mirar = (e) => {
    if (typeof e.getModifierState !== 'function') return;
    aviso.hidden = !e.getModifierState('CapsLock');
  };
  campo.addEventListener('keyup', mirar);
  campo.addEventListener('keydown', mirar);
  campo.addEventListener('blur', () => { aviso.hidden = true; });
}
`;
