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

/*
  Preparar una foto antes de subirla.

  Es lo único del panel que no funciona sin esto, y la pantalla lo avisa: de la
  foto salen tres o cuatro archivos —WebP de 800, 1400 y, si el original da,
  2000, más un JPG de 1200x630 para WhatsApp— y quien los genera es este
  navegador. Un Worker de Cloudflare no puede correr sharp.

  Todo se recorta a 4:3 desde el centro, igual que hace el script de la
  maquina. Pasar por un lienzo tiene un efecto que viene de regalo: los datos
  EXIF del telefono —modelo, fecha y, si lo hubiera, el GPS— no sobreviven al
  dibujado. Lo que se sube son pixeles y nada mas.
*/
for (const formulario of document.querySelectorAll('.subir-foto')) {
  const entrada = formulario.querySelector('input[type="file"]');
  const nombre = formulario.querySelector('#nombre');
  const boton = formulario.querySelector('button[type="submit"]');
  const vista = formulario.querySelector('.vista-foto');
  /*
    El nombre del archivo elegido. Lo pone este guion porque el campo de verdad
    va oculto para que el botón salga en español, y con él se fue el «No file
    chosen» que al menos decía si había algo elegido.
  */
  const elegido = formulario.querySelector('.archivo-nombre');
  if (!entrada || !nombre || !boton) continue;

  // Si esto corre, el aviso de «hace falta JavaScript» sobra.
  for (const aviso of document.querySelectorAll('.sin-guion')) aviso.remove();
  formulario.hidden = false;

  const ANCHOS = [800, 1400, 2000];
  const OG = { ancho: 1200, alto: 630, tope: 300000 };

  /* Recorte «cover» desde el centro: se escala al mayor de los dos lados y lo
     que sobra se va por los bordes, sin deformar nada. */
  const dibujar = (imagen, ancho, alto) => {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const pincel = lienzo.getContext('2d');
    const escala = Math.max(ancho / imagen.width, alto / imagen.height);
    const w = imagen.width * escala;
    const h = imagen.height * escala;
    pincel.drawImage(imagen, (ancho - w) / 2, (alto - h) / 2, w, h);
    return lienzo;
  };

  const aBlob = (lienzo, tipo, calidad) =>
    new Promise((listo) => lienzo.toBlob(listo, tipo, calidad));

  /* En trozos: pasarle cien mil argumentos a fromCharCode desborda la pila. */
  const aBase64 = async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let texto = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      texto += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(texto);
  };

  const ocultos = [];
  /* Lo ultimo que escribio este guion en el campo del nombre. Sirve para saber
     si lo que hay puesto es suyo o lo escribio la persona a mano. */
  let suyo = '';
  const decir = (texto, mal) => {
    if (!vista) return;
    vista.hidden = false;
    vista.textContent = texto;
    vista.classList.toggle('mal', !!mal);
  };

  entrada.addEventListener('change', async () => {
    for (const campo of ocultos) campo.remove();
    ocultos.length = 0;
    boton.disabled = true;

    const archivo = entrada.files && entrada.files[0];
    if (elegido) {
      elegido.textContent = archivo ? archivo.name : 'Ninguna elegida todavía';
      elegido.classList.toggle('hay', !!archivo);
    }
    if (!archivo) { if (vista) vista.hidden = true; return; }

    decir('Preparando la foto…');

    try {
      /* La opcion from-image aplica el giro que trae el EXIF antes de que se
         pierda: las fotos de telefono vienen tumbadas mas de lo que parece. */
      const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });

      const partes = [];
      for (const ancho of ANCHOS) {
        if (ancho > 1400 && imagen.width < ancho) continue;
        const blob = await aBlob(dibujar(imagen, ancho, Math.round((ancho * 3) / 4)), 'image/webp', 0.8);
        partes.push({ campo: 'v' + ancho, blob });
      }

      /* La vista previa baja de calidad hasta caber: WhatsApp no ensena una
         imagen de mas de 300 KB, y ahi es donde mas se ve una noticia. */
      const lienzoOg = dibujar(imagen, OG.ancho, OG.alto);
      let og = await aBlob(lienzoOg, 'image/jpeg', 0.82);
      for (const calidad of [0.7, 0.6, 0.5]) {
        if (og.size <= OG.tope) break;
        og = await aBlob(lienzoOg, 'image/jpeg', calidad);
      }
      partes.push({ campo: 'og', blob: og });

      for (const parte of partes) {
        const campo = document.createElement('input');
        campo.type = 'hidden';
        campo.name = parte.campo;
        campo.value = await aBase64(parte.blob);
        formulario.appendChild(campo);
        ocultos.push(campo);
      }

      /* Se pisa lo que puso este guion, nunca lo que escribio la persona a
         mano: cambiar de archivo tiene que cambiar el nombre, y a la vez no
         borrar el que alguien acabe de teclear. */
      if (!nombre.value || nombre.value === suyo) {
        suyo = archivo.name
          .replace(/\\.[^.]+$/, '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48);
        nombre.value = suyo;
      }

      const kb = (b) => Math.round(b / 1000) + ' KB';
      decir(
        'Listo: ' +
          partes.map((p) => (p.campo === 'og' ? 'vista previa ' : p.campo.slice(1) + ' px ')
            .concat(kb(p.blob.size))).join(' · ') +
          '. Original de ' + imagen.width + '×' + imagen.height + '.',
      );
      boton.disabled = false;
      imagen.close();
    } catch (e) {
      decir('No se pudo leer esa imagen. Pruebe con un JPG o un PNG.', true);
    }
  });
}

/*
  El interruptor de «cerrado todo el día».

  La hoja de estilos ya apaga las horas con :has, así que esto no las esconde:
  las deshabilita, que es lo que el CSS no puede hacer. Sin ello el tabulador
  entra igual en cuatro campos que no sirven de nada en ese momento.
*/
for (const caja of document.querySelectorAll('.dia-especial')) {
  const interruptor = caja.querySelector('input[name="cerrado"]');
  const horas = caja.querySelectorAll('.tramos input');
  if (!interruptor || horas.length === 0) continue;

  const aplicar = () => {
    for (const hora of horas) hora.disabled = interruptor.checked;
  };
  interruptor.addEventListener('change', aplicar);
  aplicar();
}

/*
  Copiar el enlace de alta.

  El enlace mide 76 caracteres y hay que pasárselo a la persona invitada por
  WhatsApp o en mano. Seleccionarlo a dedo en un teléfono, sin pasarse de largo
  ni quedarse corto, es la clase de cosa que se hace tres veces hasta que sale.

  Sin este guion el enlace sigue ahí y el user-select: all de la hoja hace que
  un toque lo seleccione entero; el botón ni aparece.
*/
for (const boton of document.querySelectorAll('.copiar')) {
  const destino = document.getElementById(boton.dataset.enlace);
  const rotulo = boton.querySelector('.copiar-texto');
  if (!destino || !rotulo) continue;

  boton.hidden = false;
  let reloj = 0;

  boton.addEventListener('click', async () => {
    let copiado = true;
    try {
      await navigator.clipboard.writeText(destino.textContent.trim());
    } catch (e) {
      /*
        El portapapeles puede negarse —sin permiso, o servido sin cifrar—. En
        ese caso se selecciona el enlace entero: copiar deja de ser un toque
        pero sigue siendo un Ctrl+C, y nunca se queda en nada.
      */
      copiado = false;
      const rango = document.createRange();
      rango.selectNodeContents(destino);
      const seleccion = window.getSelection();
      seleccion.removeAllRanges();
      seleccion.addRange(rango);
    }

    boton.dataset.hecho = copiado ? 'si' : 'no';
    rotulo.textContent = copiado ? 'Copiado' : 'Seleccionado';

    clearTimeout(reloj);
    reloj = setTimeout(() => {
      delete boton.dataset.hecho;
      rotulo.textContent = 'Copiar';
    }, 2200);
  });
}
`;
