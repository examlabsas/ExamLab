/**
 * El armazón del panel y su hoja de estilos.
 *
 * Todas las pantallas se dibujan dentro de `pagina()`, que pone el raíl de
 * secciones a la izquierda en el escritorio y una barra de iconos abajo en el
 * móvil. Las pantallas solo escriben su contenido: ninguna vuelve a pintar la
 * navegación, que antes estaba repetida y se desincronizaba.
 *
 * El HTML se escribe a mano, sin framework de interfaz. Son once pantallas de
 * formularios y tablas; un framework sumaría peso y una dependencia que
 * mantener a cambio de nada.
 *
 * OJO al editar `ESTILOS`: va dentro de una plantilla de cadena, así que un
 * acento invertido la cierra y el Worker deja de arrancar — y a veces sin que
 * `tsc` lo avise, porque lo que queda puede leerse como plantilla etiquetada.
 */

/** Escapa para interpolar dentro del HTML sin abrir un agujero. */
export const esc = (texto: unknown): string =>
  String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/* ─── Iconos ─────────────────────────────────────────────────────────────── */

/**
 * Dibujados aquí y no traídos de una librería: la cabecera de seguridad no deja
 * cargar nada de fuera, y once iconos no justifican servir un paquete entero.
 *
 * Todos sobre la misma retícula de 24, trazo de 1,75 y extremos redondeados, que
 * es lo que hace que un conjunto dibujado a mano parezca un conjunto.
 */
const ICONOS: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  catalogo: 'M4 5.5h16M4 12h16M4 18.5h10',
  noticias:
    'M4 5h12v14H5.5A1.5 1.5 0 0 1 4 17.5zM16 9h4v8.5a1.5 1.5 0 0 1-3 0V9M7 8.5h6M7 12h6M7 15.5h4',
  aviso: 'M4 9.5h4l7-4v13l-7-4H4zM19 9.5a4 4 0 0 1 0 5',
  asociados:
    'M9.5 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5M3.5 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3M16 14.5l2 2 4-4.5',
  qr: 'M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15.5h2M20 15.5v2M15 20h5',
  contacto:
    'M5 4.5h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V18a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 4.5 6.1 1.5 1.5 0 0 1 5 4.5z',
  sedes:
    'M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21zM12 12.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z',
  feriados: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4M8.5 14.5h3',
  estado: 'M12 7v5.5l3.5 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  usuarios:
    'M12 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5M5 20v-1.75A4.25 4.25 0 0 1 9.25 14h5.5A4.25 4.25 0 0 1 19 18.25V20',
  alerta: 'M12 8.5v4.5M12 16.2v.3M12 4.5 2.8 20h18.4z',
  listo: 'M4.5 12.5l5 5 10-11',
  bajar: 'M6.5 9.5 12 15l5.5-5.5',
};

const icono = (nombre: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONOS[nombre] ?? ICONOS.inicio}"/></svg>`;

/* ─── Secciones ──────────────────────────────────────────────────────────── */

type Seccion = {
  ruta: string;
  etiqueta: string;
  icono: string;
  /** Qué es, para la portada. */
  de: string;
  soloAdmin?: boolean;
  /** Si entra en la barra de abajo del móvil, donde caben cuatro. */
  enMovil?: boolean;
};

export const SECCIONES: Seccion[] = [
  { ruta: '/', etiqueta: 'Inicio', icono: 'inicio', de: 'Todas las secciones.', enMovil: true },
  {
    ruta: '/catalogo',
    etiqueta: 'Catálogo',
    icono: 'catalogo',
    de: 'Los exámenes que ve el paciente: plazos, muestras y textos.',
    enMovil: true,
  },
  {
    ruta: '/noticias',
    etiqueta: 'Noticias',
    icono: 'noticias',
    de: 'Escribir, editar y despublicar artículos.',
    enMovil: true,
  },
  {
    ruta: '/aviso',
    etiqueta: 'Aviso',
    icono: 'aviso',
    de: 'La franja que sale arriba de todas las páginas del sitio.',
  },
  {
    ruta: '/asociados',
    etiqueta: 'Asociados',
    icono: 'asociados',
    de: 'La cartera para otros laboratorios, con su tarifario.',
    soloAdmin: true,
  },
  { ruta: '/qr', etiqueta: 'Códigos QR', icono: 'qr', de: 'Para frascos, afiches y recetarios.' },
  { ruta: '/contacto', etiqueta: 'Contacto', icono: 'contacto', de: 'Teléfonos, correos y redes.' },
  {
    ruta: '/sedes',
    etiqueta: 'Sedes',
    icono: 'sedes',
    de: 'Direcciones y horarios de atención de las cuatro sedes.',
  },
  {
    ruta: '/feriados',
    etiqueta: 'Feriados',
    icono: 'feriados',
    de: 'Los días de cierre, para que el sitio no diga «Abierto».',
  },
  {
    ruta: '/estado',
    etiqueta: 'Estado',
    icono: 'estado',
    de: 'Qué se cambió, cuándo y quién.',
    enMovil: true,
  },
  {
    ruta: '/usuarios',
    etiqueta: 'Usuarios',
    icono: 'usuarios',
    de: 'Quién puede entrar aquí.',
    soloAdmin: true,
  },
];

export const seccionesDe = (rol: string): Seccion[] =>
  SECCIONES.filter((s) => !s.soloAdmin || rol === 'administrador');

/** Una sección está activa también desde sus pantallas hijas. */
const estaActiva = (ruta: string, aqui: string) =>
  ruta === '/' ? aqui === '/' : aqui === ruta || aqui.startsWith(`${ruta}/`);

/* ─── Estilos ────────────────────────────────────────────────────────────── */

const ESTILOS = `
  :root {
    /* Azul de la marca. El raíl lo lleva en bloque; el resto es casi todo neutro. */
    --rail: #00456b;
    --rail-hondo: #003654;
    --marca-viva: #00A3C4;
    --accion: #00697f;
    --accion-viva: #00839e;
    --tinta: #16202a;
    --tinta-suave: #51616e;
    --linea: #dbe3ea;
    --linea-fina: #eaeff3;
    --fondo: #f4f7f9;
    --superficie: #ffffff;
    --alerta: #a4160e;
    --alerta-fondo: #fdefed;
    --bien: #00657a;
    --bien-fondo: #e8f6f9;
    --radio: 10px;
    --radio-chico: 7px;
    --sombra: 0 1px 2px rgba(22,32,42,.05), 0 6px 16px -10px rgba(22,32,42,.22);
    /* Desaceleración exponencial: las cosas frenan y se paran, no rebotan. */
    --salida: cubic-bezier(.16,1,.3,1);
    --rail-ancho: 15.5rem;
  }

  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    color: var(--tinta);
    background: var(--fondo);
    -webkit-font-smoothing: antialiased;
  }

  a { color: var(--accion); text-underline-offset: .18em; }
  a:hover { color: var(--accion-viva); }
  :focus-visible { outline: 2.5px solid var(--accion-viva); outline-offset: 2px; border-radius: 3px; }

  /* ── Armazón ───────────────────────────────────────────────────────────── */

  .armazon { min-height: 100vh; }

  .saltar {
    position: absolute;
    left: -999px;
    top: .5rem;
    z-index: 10;
    padding: .6rem .9rem;
    background: var(--superficie);
    border-radius: var(--radio-chico);
    box-shadow: var(--sombra);
  }
  .saltar:focus { left: .5rem; }

  /* ── Raíl de secciones ─────────────────────────────────────────────────── */

  .rail { display: none; background: var(--rail); color: #dbe9f2; }

  /*
    El nombre hace de marca. No hay emblema: el logotipo en SVG todavía no
    existe —PRODUCT.md lo da por pendiente— y el PNG pesa 1,7 MB, que no cabe en
    una hoja que viaja en cada respuesta. Un monograma de dos letras al lado de
    la palabra entera solo repetía, y en el cian de marca no llegaba al contraste
    mínimo.
  */
  .rail-marca {
    display: flex;
    align-items: center;
    gap: .65rem;
    padding: 1.25rem 1.1rem 1.1rem;
    color: #fff;
    text-decoration: none;
  }
  .rail-marca b { font-size: 1.15rem; letter-spacing: -.015em; }
  .rail-marca em {
    display: block;
    font-size: .7rem;
    font-style: normal;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #9cc4dd;
  }

  .rail nav { padding: .25rem .75rem; }
  .rail ul { margin: 0; padding: 0; list-style: none; }
  .rail li + li { margin-top: 1px; }

  .seccion {
    display: flex;
    align-items: center;
    gap: .7rem;
    padding: .58rem .7rem;
    font-size: .92rem;
    color: #c3dcec;
    text-decoration: none;
    border-radius: var(--radio-chico);
    transition: background .18s var(--salida), color .18s var(--salida);
  }
  .seccion svg { width: 19px; height: 19px; flex: 0 0 auto; opacity: .8; }
  .seccion:hover { background: rgba(255,255,255,.09); color: #fff; }
  .seccion[aria-current] { background: var(--rail-hondo); color: #fff; font-weight: 600; }
  .seccion[aria-current] svg { opacity: 1; color: var(--marca-viva); }

  .rail-pie {
    margin-top: auto;
    padding: 1rem 1.1rem 1.25rem;
    border-top: 1px solid rgba(255,255,255,.14);
    font-size: .82rem;
  }
  .rail-pie p { margin: 0; color: #a9c9de; overflow-wrap: anywhere; }
  .rail-pie a { color: #8fd6e8; }
  .rail-pie a:hover { color: #fff; }

  /* ── Contenido ─────────────────────────────────────────────────────────── */

  .lienzo { padding: 1.25rem 1.1rem 5.5rem; max-width: 64rem; }

  .cabecera-pagina { margin: 0 0 1.5rem; }
  .cabecera-pagina h1 { margin: 0; font-size: 1.45rem; line-height: 1.25; letter-spacing: -.018em; }
  .sub { margin: .45rem 0 0; max-width: 62ch; font-size: .92rem; color: var(--tinta-suave); }
  .volver { display: inline-block; margin: 0 0 .8rem; font-size: .88rem; }

  h2 { margin: 2.25rem 0 .75rem; font-size: 1.05rem; letter-spacing: -.012em; }

  /* ── Superficies ───────────────────────────────────────────────────────── */

  .panel {
    padding: 1.25rem;
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--radio);
    box-shadow: var(--sombra);
  }
  .panel + .panel { margin-top: 1rem; }
  .panel > :first-child { margin-top: 0; }
  .panel > :last-child { margin-bottom: 0; }

  /* La caja centrada del acceso, que no vive dentro del armazón. */
  .caja {
    max-width: 23rem;
    margin: 8vh auto 2rem;
    padding: 1.9rem;
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: 14px;
    box-shadow: var(--sombra);
  }
  .caja h1 { margin: 0 0 .3rem; font-size: 1.3rem; letter-spacing: -.018em; }

  /* ── Formularios ───────────────────────────────────────────────────────── */

  label { display: block; margin-top: 1.15rem; font-size: .84rem; font-weight: 600; }

  input, select, textarea {
    width: 100%;
    margin-top: .35rem;
    padding: .62rem .7rem;
    font: inherit;
    font-size: .95rem;
    color: var(--tinta);
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: var(--radio-chico);
    transition: border-color .15s var(--salida), box-shadow .15s var(--salida);
  }
  textarea { resize: vertical; line-height: 1.55; }
  input:hover, select:hover, textarea:hover { border-color: #aebecb; }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--accion-viva);
    box-shadow: 0 0 0 3px rgba(0,131,158,.18);
  }
  input::placeholder, textarea::placeholder { color: #65727c; }
  input[type="checkbox"] { width: auto; margin: 0; accent-color: var(--accion); }
  select {
    appearance: none;
    padding-right: 2.2rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2351616e' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6.5 9.5 12 15l5.5-5.5'/%3E%3C/svg%3E");
    background-position: calc(100% - .6rem) 50%;
    background-size: 17px 17px;
    background-repeat: no-repeat;
  }

  button {
    width: 100%;
    margin-top: 1.5rem;
    padding: .7rem 1rem;
    font: inherit;
    font-size: .95rem;
    font-weight: 600;
    color: #fff;
    background: var(--accion);
    border: 1px solid transparent;
    border-radius: var(--radio-chico);
    cursor: pointer;
    transition: background .18s var(--salida);
  }
  button:hover { background: var(--accion-viva); }
  button:active { background: #005b6e; }
  button.secundario { color: var(--accion); background: var(--superficie); border-color: var(--linea); }
  button.secundario:hover { background: var(--fondo); }
  button.chico { width: auto; margin: 0; padding: .42rem .8rem; font-size: .84rem; }
  button[disabled] { opacity: .55; cursor: not-allowed; }

  .fila { display: flex; gap: .85rem; flex-wrap: wrap; align-items: flex-end; }
  .fila > * { flex: 1 1 11rem; }

  .pista { margin: .4rem 0 0; max-width: 62ch; font-size: .83rem; color: var(--tinta-suave); }

  code { padding: .1rem .3rem; font-size: .88em; background: var(--linea-fina); border-radius: 4px; }

  /* Un enlace largo que hay que copiar entero: se parte en vez de salirse, y
     un toque lo selecciona todo, que es lo que hace quien va a pegarlo. */
  code.enlace-alta {
    display: block;
    padding: .7rem .85rem;
    border-radius: var(--radio-chico);
    word-break: break-all;
    user-select: all;
  }

  /* ── Mensajes ──────────────────────────────────────────────────────────── */

  .error {
    display: flex;
    gap: .55rem;
    margin: 1rem 0 0;
    padding: .7rem .85rem;
    font-size: .88rem;
    color: var(--alerta);
    background: var(--alerta-fondo);
    border: 1px solid #f1c9c4;
    border-radius: var(--radio-chico);
  }
  .error::before {
    content: "!";
    flex: 0 0 auto;
    width: 1.15rem;
    height: 1.15rem;
    margin-top: .12rem;
    font-size: .78rem;
    font-weight: 700;
    line-height: 1.15rem;
    text-align: center;
    color: #fff;
    background: var(--alerta);
    border-radius: 50%;
  }
  .bien { color: var(--bien); background: var(--bien-fondo); border-color: #b6dfe7; }
  .bien::before { content: "\\2713"; background: var(--bien); }

  /* Lo que el sitio entiende de lo que se acaba de escribir. */
  .eco {
    margin: .45rem 0 0;
    padding: .6rem .75rem;
    max-width: 62ch;
    font-size: .85rem;
    color: #24323d;
    background: var(--linea-fina);
    border: 1px solid var(--linea);
    border-radius: var(--radio-chico);
  }
  /* Sin color: el acento solo marca lo que se puede pulsar o está activo. El
     énfasis aquí lo lleva el peso. */
  .eco strong { color: inherit; font-weight: 700; }

  /* ── Recuento, que además filtra ───────────────────────────────────────── */

  .recuento {
    display: flex;
    gap: .5rem;
    margin: 0 0 1.25rem;
    padding: 0 1.1rem .15rem;
    margin-inline: -1.1rem;
    list-style: none;
    /* En una sola fila que se arrastra: apilados ocupaban cinco filas antes de
       llegar al primer examen. */
    overflow-x: auto;
    scrollbar-width: none;
  }
  .recuento::-webkit-scrollbar { display: none; }
  .recuento li { flex: 0 0 auto; }
  .recuento a {
    display: flex;
    align-items: baseline;
    gap: .4rem;
    padding: .45rem .8rem;
    font-size: .84rem;
    color: var(--tinta-suave);
    text-decoration: none;
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: 999px;
    transition: border-color .18s var(--salida), color .18s var(--salida);
  }
  .recuento a:hover { border-color: #93a9b9; color: var(--tinta); }
  .recuento a[aria-current] { color: #fff; background: var(--accion); border-color: var(--accion); }
  .recuento b { font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--tinta); }
  .recuento a[aria-current] b { color: #fff; }

  /* ── Listas y tablas ───────────────────────────────────────────────────── */

  .lista { margin: 0; padding: 0; list-style: none; }
  .lista li { padding: .8rem 0; border-top: 1px solid var(--linea-fina); }
  .lista li:first-child { border-top: 0; }
  /* La cuenta de resultados va pegada a la lista si no se separa, y entonces la
     lista no tiene principio. */
  .pista + .lista, .pista + table { margin-top: 1.1rem; }
  .lista a { font-weight: 600; text-decoration: none; }
  .lista a:hover { text-decoration: underline; }

  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: .9rem; }
  th, td { padding: .62rem .55rem; text-align: left; border-bottom: 1px solid var(--linea-fina); vertical-align: top; }
  th {
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--tinta-suave);
    border-bottom-color: var(--linea);
  }
  tbody tr:last-child td { border-bottom: 0; }
  td a { font-weight: 600; text-decoration: none; }
  td a:hover { text-decoration: underline; }

  /*
    Falta un dato, no hay una alarma: 495 de 559 fichas no tienen plazo todavía.
    En rojo, la lista entera gritaba y dejaba de señalar nada.
  */
  .marca {
    display: inline-block;
    margin-left: .35rem;
    padding: .1rem .45rem;
    font-size: .7rem;
    font-weight: 600;
    color: var(--tinta-suave);
    background: var(--linea-fina);
    border: 1px solid var(--linea);
    border-radius: 999px;
    vertical-align: .08em;
    white-space: nowrap;
  }
  .marca.mal { color: var(--alerta); background: var(--alerta-fondo); border-color: #f1c9c4; }

  /* Una región dentro de un panel: se separa con una regla, no con otra
     superficie. Un panel dentro de otro panel es siempre un error. */
  .recuadro { padding-top: 1.25rem; border-top: 1px solid var(--linea); }
  .recuadro > :first-child { margin-top: 0; }

  .vacio { padding: 2rem 1rem; text-align: center; color: var(--tinta-suave); }

  /* ── Barra de abajo, en el móvil ───────────────────────────────────────── */

  .barra-movil {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 5;
    display: flex;
    padding: .3rem .25rem calc(.3rem + env(safe-area-inset-bottom));
    background: var(--superficie);
    border-top: 1px solid var(--linea);
  }
  .barra-movil a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .15rem;
    padding: .45rem .25rem .35rem;
    font-size: .68rem;
    color: var(--tinta-suave);
    text-decoration: none;
    border-radius: var(--radio-chico);
  }
  .barra-movil svg { width: 21px; height: 21px; }
  .barra-movil a[aria-current] { color: var(--accion); font-weight: 600; }

  /* ── Códigos QR ────────────────────────────────────────────────────────── */

  /*
    El SVG del código viaja con width y height de 2048 px: ese archivo se
    descarga y va a imprenta, donde un tamaño grande y explícito es lo que se
    quiere. En pantalla esos atributos lo sacaban de la página —el documento se
    iba a 2433 px dentro de una ventana de 1024—, y en un móvil el código no
    cabía entero, que es justo cuando hay que escanearlo. Aquí manda el
    contenedor; el archivo descargado no se toca.
  */
  .vista-qr svg { display: block; width: 100%; height: auto; }

  /* ── Escritorio ────────────────────────────────────────────────────────── */

  @media (min-width: 60rem) {
    /* Solo cuando hay raíl: el acceso no tiene y no debe reservarle sitio. */
    .armazon.con-rail { display: grid; grid-template-columns: var(--rail-ancho) 1fr; }
    .rail { display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
    .lienzo { padding: 2rem 2.25rem 3rem; }
    .recuento { flex-wrap: wrap; overflow: visible; padding: 0; margin-inline: 0; margin-bottom: 1.5rem; }
    .cabecera-pagina h1 { font-size: 1.7rem; }
    .barra-movil { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }

  @media print {
    .rail, .barra-movil, .saltar { display: none; }
    .lienzo { padding: 0; max-width: none; }
    .panel { box-shadow: none; }
  }
`;

/* ─── La página ──────────────────────────────────────────────────────────── */

export type Sesion = { correo: string; rol: string };

/**
 * El contrato de este rediseño, para poder auditarlo contra lo construido. Va en
 * el HTML servido a propósito: un comentario en el código fuente no sobrevive a
 * lo que de verdad llega al navegador.
 */
const CONTRATO = `<!--
THESIS: una herramienta, no una página. Un raíl de secciones siempre presente que
dice dónde estás y qué más hay; rechaza la columna centrada de tarjetas sueltas.
OWN-WORLD: taller claro (#f4f7f9) sobre superficies blancas de linea fina,
enmarcado por un rail en el azul de marca oscurecido (#00456b, de #005A8C para
que el texto blanco encima pase de 12:1). Un solo acento, el verde azulado
#00697f, para lo pulsable y lo activo. Rojo reservado a lo que va mal. Iconos de
trazo 1,75 dibujados a mano. Tipografia del sistema: es una herramienta diaria.
STORY: la bioquimica abre el panel en el movil, ve donde esta y que falta, entra
al catalogo, corrige un plazo y ve bajar el contador.
FIRST VIEWPORT: escritorio, rail de 15,5rem con la marca arriba, las secciones y
la persona abajo; a la derecha el titulo de la pantalla y su contenido en paneles
blancos. Movil, contenido a todo el ancho y cuatro iconos fijos abajo.
FORM: armazon de aplicacion con rail permanente. Sin tirada de concepto y sin
clave de semilla: la forma la fijo el usuario al pedir un menu lateral, y la guia
dice que una peticion asi se moldea directamente.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
-->`;

export function pagina(
  titulo: string,
  cuerpo: string,
  opciones: { sesion?: Sesion; activa?: string } = {},
): string {
  const { sesion, activa: aqui = '' } = opciones;
  const secciones = sesion ? seccionesDe(sesion.rol) : [];

  const rail = sesion
    ? `<div class="rail">
      <a class="rail-marca" href="/">
        <span><b>ExamLab</b><em>Panel</em></span>
      </a>
      <nav aria-label="Secciones">
        <ul>${secciones
          .map(
            (s) =>
              `<li><a class="seccion" href="${s.ruta}"${estaActiva(s.ruta, aqui) ? ' aria-current="page"' : ''}>${icono(s.icono)}<span>${esc(s.etiqueta)}</span></a></li>`,
          )
          .join('')}</ul>
      </nav>
      <div class="rail-pie">
        <p>${esc(sesion.correo)}</p>
        <p style="margin-top:.3rem"><a href="/salir">Cerrar sesión</a></p>
      </div>
    </div>`
    : '';

  const barraMovil = sesion
    ? `<nav class="barra-movil" aria-label="Secciones">${secciones
        .filter((s) => s.enMovil)
        .map(
          (s) =>
            `<a href="${s.ruta}"${estaActiva(s.ruta, aqui) ? ' aria-current="page"' : ''}>${icono(s.icono)}<span>${esc(s.etiqueta)}</span></a>`,
        )
        .join('')}</nav>`
    : '';

  return `<!doctype html>
<html lang="es-EC">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light">
<title>${esc(titulo)} · Panel ExamLab</title>
<style>${ESTILOS}</style>
</head>
<body>
${CONTRATO}
${sesion ? '<a class="saltar" href="#principal">Ir al contenido</a>' : ''}
<div class="armazon${sesion ? ' con-rail' : ''}">
${rail}
<main id="principal"${sesion ? ' class="lienzo"' : ''}>
${cuerpo}
</main>
</div>
${barraMovil}
</body>
</html>`;
}

/**
 * Cabecera de una pantalla.
 *
 * Se pasa por aquí en vez de escribirla en cada sitio para que el espacio sobre
 * y bajo el título sea el mismo en las once pantallas.
 */
export const cabecera = (titulo: string, sub?: string): string =>
  `<div class="cabecera-pagina"><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;

/**
 * Pantalla para un fallo que nadie capturó en su sitio.
 *
 * Existe porque la alternativa es el «Internal Server Error» en blanco del
 * servidor, que no dice nada: con el token de GitHub caducado, quien entra al
 * panel vería una página vacía y no tendría forma de saber que el problema es el
 * token y no su conexión.
 */
export function paginaFallo(opciones: { mensaje: string; sesion?: Sesion }): string {
  return pagina(
    'Algo falló',
    `${cabecera('Algo falló al hablar con el repositorio')}
    <p class="error">${esc(opciones.mensaje)}</p>
    <p class="pista">
      El sitio sigue publicado con la última versión buena: esto solo afecta al
      panel. Si vuelve a pasar, lo más probable es que el token de GitHub haya
      caducado y haya que cargarlo otra vez.
    </p>
    <p style="margin-top:1.5rem"><a href="/">Volver al inicio</a></p>`,
    { sesion: opciones.sesion },
  );
}
