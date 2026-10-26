---
name: Panel ExamLab
description: Herramienta interna del laboratorio — raíl de secciones permanente, superficies claras, un solo acento.
colors:
  rail: "#00456b"
  rail-hondo: "#003654"
  marca-viva: "#00A3C4"
  accion: "#00697f"
  accion-viva: "#00839e"
  tinta: "#16202a"
  tinta-suave: "#51616e"
  linea: "#dbe3ea"
  linea-fina: "#eaeff3"
  fondo: "#f4f7f9"
  superficie: "#ffffff"
  alerta: "#a4160e"
  alerta-fondo: "#fdefed"
  bien: "#00657a"
  bien-fondo: "#e8f6f9"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.018em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.012em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  overline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  control: "7px"
  panel: "10px"
  caja: "14px"
  pildora: "999px"
spacing:
  campo: "1.15rem"
  panel: "1.25rem"
  seccion: "2.25rem"
  lienzo-movil: "1.1rem"
  lienzo-escritorio: "2.25rem"
components:
  button-primary:
    backgroundColor: "{colors.accion}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accion-viva}"
    textColor: "{colors.superficie}"
  button-secundario:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.accion}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0.62rem 0.7rem"
  panel:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  chip-recuento:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.pildora}"
    padding: "0.45rem 0.8rem"
  chip-recuento-activo:
    backgroundColor: "{colors.accion}"
    textColor: "{colors.superficie}"
  seccion-rail-activa:
    backgroundColor: "{colors.rail-hondo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
---

# Diseño del panel de administración

Este archivo describe **el panel interno**, y por eso vive dentro de `admin/` y
no en la raíz: el sitio público tiene su propio marco aprobado por el cliente
—Chakra Petch, Montserrat y la paleta de `PRODUCT.md`— que no se gobierna desde
aquí. Puesto arriba, este sistema se aplicaría también al sitio y marcaría como
desvíos decisiones que el cliente aprobó.

Todo lo que sigue está extraído del código construido, no de lo que se planeó.
La hoja entera vive en la constante `ESTILOS` de
[`src/paginas/plantilla.ts`](src/paginas/plantilla.ts).

## Overview

**La idea: una herramienta, no una página.** Un raíl de secciones siempre
presente que dice dónde estás y qué más hay. Rechaza la columna centrada de
tarjetas sueltas, que es lo que el panel era antes y lo que el cliente describió
como «esquelético».

La escena manda sobre el gusto: lo usan entre dos y cinco personas del
laboratorio, **de pie en el mostrador y casi siempre desde el móvil**, a primera
hora. De ahí salen el fondo claro, los blancos de contacto generosos y la barra
de iconos al alcance del pulgar. La tarea más repetida con diferencia es filtrar
«exámenes sin plazo de entrega» —495 de 559— e ir rellenándolos de diez en diez.

## Colors

**Estrategia: contenida.** Neutros y un solo acento. El color se concentra en un
campo —el raíl— y no se esparce en adornos.

| Rol | Token | Uso |
|---|---|---|
| Raíl | `--rail` `#00456b` | El único campo de color de la interfaz. Es el azul de marca `#005A8C` oscurecido, para que el texto blanco encima pase de 12:1 |
| Raíl, sección activa | `--rail-hondo` `#003654` | Relleno de la sección en la que se está |
| Marca viva | `--marca-viva` `#00A3C4` | El azul claro de la marca. Solo en el icono de la sección activa |
| Acción | `--accion` `#00697f` | **Lo que se puede pulsar o está activo.** Enlaces, botón primario, filtro activo, sección activa de la barra móvil |
| Acción, encima | `--accion-viva` `#00839e` | Hover y anillo de foco |
| Tinta | `--tinta` `#16202a` | Texto |
| Tinta suave | `--tinta-suave` `#51616e` | Texto secundario, cabeceras de tabla, iconos de la barra inactivos |
| Línea | `--linea` `#dbe3ea` | Bordes de superficie y de control |
| Línea fina | `--linea-fina` `#eaeff3` | Separadores dentro de una lista o tabla |
| Fondo | `--fondo` `#f4f7f9` | El lienzo |
| Superficie | `--superficie` `#ffffff` | Paneles |
| Alerta | `--alerta` `#a4160e` sobre `--alerta-fondo` `#fdefed` | **Solo lo que va mal.** Un dato que falta no es una alerta |
| Bien | `--bien` `#00657a` sobre `--bien-fondo` `#e8f6f9` | Confirmación de guardado |

Claro y no oscuro porque se usa con luz de laboratorio a las siete de la mañana,
no de noche.

**Todos los pares medidos pasan de 4,5:1.** El más bajo es el texto de
sugerencia de los campos, 4,94:1.

### Tonos derivados

Doce valores de la hoja de estilos no son tokens sino tintes de un solo uso: la
escala de grises azulados que vive **sobre el raíl**, y los tonos de estado que
hacen de borde. No se promovieron a token porque cada uno aparece una vez, pero
estaban sin escribir aquí, y un tono sin documentar es un tono que la próxima
persona reinventa con otro valor parecido.

| Tono | Dónde | Por qué ese |
|---|---|---|
| `#dbe9f2` | Texto general del raíl | Blanco azulado, no blanco puro: baja el deslumbre del campo oscuro |
| `#c3dcec` | Etiquetas de sección del raíl | Un paso por debajo del texto general |
| `#9cc4dd` | Rótulo «PANEL» bajo la marca | Dos pasos por debajo: es una etiqueta, no contenido |
| `#a9c9de` | Correo del pie del raíl | Mismo peso que las etiquetas |
| `#8fd6e8` | «Cerrar sesión», en el pie | Tira al `--marca-viva`: es lo único pulsable del pie |
| `#aebecb` | Borde de un campo —y de un botón perfilado— con el puntero encima | `--linea` oscurecida lo justo para notarse sin parecer foco |
| `#93a9b9` | Borde de un filtro con el puntero encima | Igual, sobre el fondo del lienzo |
| `#65727c` | Texto de sugerencia dentro de los campos | `--tinta-suave` oscurecida hasta llegar a 4,94:1, el par más bajo de todo el panel |
| `#005b6e` | Botón primario pulsado, sea `button` o enlace-botón | `--accion` oscurecida: el botón se hunde al tocarlo |
| `#24323d` | Texto de la barra móvil activa sobre fondo claro | `--tinta` con un punto más de contraste |
| `#f1c9c4` | Borde de los mensajes de error y de la marca «mal» | `--alerta-fondo` con borde propio, para que el aviso tenga contorno |
| `#b6dfe7` | Borde del mensaje de guardado | Lo mismo, del lado de `--bien` |

## Typography

Tipografía del sistema, sin excepciones. Es una herramienta que se abre veinte
veces al día desde un móvil con datos: una fuente propia costaría unos 60 KB en
cada respuesta a cambio de nada que el trabajo necesite.

| Rol | Tamaño | Peso | Dónde |
|---|---|---|---|
| Display | 1,7rem (1,45 en móvil) | 700 | El `h1` de cada pantalla |
| Title | 1,05rem | 700 | Subtítulos dentro de una pantalla |
| Body | 15px / 1,55 | 400 | Todo el cuerpo |
| Label | 0,84rem | 600 | Etiquetas de campo |
| Overline | 0,72rem, +0,05em, versalita | 700 | Cabeceras de tabla y la palabra «PANEL» del raíl |

Los textos de ayuda y los párrafos se cortan a **62ch** para que la línea no se
alargue en escritorio.

## Layout

**Armazón de aplicación con raíl permanente.** Un único punto de ruptura:
`60rem`.

- **Escritorio** — rejilla de dos columnas: raíl fijo de `15.5rem` pegado al
  alto de la ventana, y el lienzo con `2.25rem` de aire y un ancho máximo de
  `64rem`.
- **Móvil** — una columna. El raíl desaparece y en su lugar hay una barra fija
  abajo con **cuatro** secciones (Inicio, Catálogo, Noticias, Estado) más
  `env(safe-area-inset-bottom)`. El lienzo reserva `5.5rem` al pie para que la
  barra no tape el final del contenido.

El raíl lleva once secciones; la barra solo cabe cuatro, así que **Inicio es el
índice completo** y desde él se llega a las otras siete. Las secciones que exigen
ser administrador —Asociados y Usuarios— solo aparecen para quien lo es, en vez
de enseñar un enlace que responde «no tiene permiso».

Ritmo: más aire encima de un título que debajo (`2.25rem` / `0.75rem`).

## Elevation & Depth

Un solo nivel, y apenas se nota:
`0 1px 2px rgba(22,32,42,.05), 0 6px 16px -10px rgba(22,32,42,.22)`. Lleva
desplazamiento y desenfoque; no es un halo de color.

La profundidad real la hacen el fondo gris y las líneas de 1px, no las sombras.
**Nunca un panel dentro de otro panel**: una región dentro de un panel se separa
con una regla (`.recuadro`), no con otra superficie.

## Shapes

| Radio | Valor | Dónde |
|---|---|---|
| Control | 7px | Campos, botones, elementos del raíl |
| Panel | 10px | Superficies |
| Caja | 14px | La tarjeta centrada del acceso |
| Píldora | 999px | Los contadores-filtro |

Bordes de 1px siempre. **Ningún borde de color a un solo lado**: es el tic que
delata una interfaz generada, y el panel lo tuvo hasta que se quitó.

## Components

**Raíl.** Marca arriba, secciones en medio, persona y «Cerrar sesión» abajo
(`margin-top:auto`). La sección activa se rellena con `--rail-hondo` y su icono
se pinta de `--marca-viva`; nunca se marca con un filete lateral.

**Iconos.** Dieciocho, dibujados a mano en `ICONOS`, todos sobre retícula de 24 con
trazo 1,75 y extremos redondeados. No hay librería —la cabecera de seguridad no
deja cargar nada de fuera— y tampoco caracteres Unicode haciendo de icono: los
mensajes y el desplegable usan el mismo trazo, incrustado como SVG.

**Contadores-filtro (`.recuento`).** Píldoras con el número en 1rem y cifras
tabulares. **Son el filtro, no un adorno**: cada uno lleva a su propia lista y el
activo va relleno de `--accion` con `aria-current`. En móvil se arrastran en una
sola fila; apilados ocupaban cinco antes de llegar al primer examen.

**Marcas (`.marca`).** Grises, no rojas. Señalan que falta un dato, y faltan en
495 de 559 fichas: en rojo la lista entera gritaba y dejaba de señalar nada. La
marca que repite el filtro activo no se dibuja.

**Mensajes.** `.error` y `.error.bien` comparten forma; cambian color e icono.
El icono entra por CSS con una máscara SVG del mismo juego.

**Eco (`.eco`).** El recuadro que muestra **lo que el sitio entendió** de lo que
se acaba de escribir: «Ahora entiende: Ayuno de 8 horas». Es la pieza más útil de
la interfaz. Su énfasis va en el peso, no en color — el acento solo marca lo que
se puede pulsar.

**Acciones (`.boton`, `.acciones`).** Un enlace que *hace* algo —«Añadir un
examen», «Escribir una noticia»— se dibuja como botón, porque se decide igual
que un «Guardar» aunque técnicamente lleve a otra pantalla. Van en una fila
justo debajo del título, **nunca al pie**: ahí estaban antes, debajo de sesenta
registros, y no las encontraba nadie.

Dos pesos y solo dos: **lleno** para la acción de todos los días (añadir uno
suelto) y **`.suave`**, perfilado, para la ocasional (cargar la lista entera).
Si todo fuera lleno, no habría jerarquía; si todo fuera suave, no habría
entrada. Altura mínima **44 px**, que es lo que pide un dedo.

**Fila que se abre (`.lista .renglon`).** En las listas largas la fila entera es
el enlace, con el nombre a la izquierda y **«Editar ›» a la derecha**. Antes solo
el nombre era pulsable y nada decía que detrás hubiera una ficha: en una tabla,
un nombre parece una etiqueta. El área de toque pasó de las letras del nombre a
los 323×95 px de la fila.

**Acción de tabla (`.boton.chico`).** Donde hay tabla en vez de lista, la acción
es un botón perfilado en su propia celda a la derecha. Debajo de 34rem se queda
solo el lápiz —44×44 y con su nombre accesible intacto— porque la palabra le
robaba el ancho al contenido: «FROTIS DE SANGRE PERIFERICA (BH + FROTIS)» se
partía en tres líneas.

**Columnas que sobran (`.solo-amplio` / `.solo-estrecho`).** Una tabla de cuatro
columnas no cabe en un teléfono y lo que se cae por el borde es la última, que
es justo donde está el botón. En Usuarios, el rol baja a marca bajo el correo y
el estado lo dice el propio botón —«Desactivar» solo aparece sobre alguien
activo—, así que en móvil quedan dos columnas y los siete botones se alcanzan.
La regla general: **antes de dejar que una tabla se corte, quitarle columnas.**

**Formularios.** Siempre sobre un panel. Etiqueta encima, ayuda debajo. El foco
es un borde de `--accion-viva` más un anillo de 3px.

## Do's and Don'ts

**Hacer**

- Poner el contenido sobre un panel. Flotando sobre el gris, la pantalla vuelve
  a parecer una página suelta.
- Reservar el acento para lo que se puede pulsar o está activo.
- Reservar el rojo para lo que va mal. Un dato que falta no va en rojo.
- Dibujar cualquier icono nuevo sobre la retícula de 24 con trazo 1,75.
- Medir el contraste, no estimarlo. El suelo es 4,5:1 también para el texto
  pequeño, que es donde viven los avisos que importan.
- Comprobar el móvil primero: es donde se usa.

**No hacer**

- Un panel dentro de otro panel.
- Un borde de color a un lado de una tarjeta o un aviso.
- Easings con rebote. La transición es `cubic-bezier(.16,1,.3,1)`: las cosas
  frenan y se paran.
- Caracteres Unicode o emoji haciendo de icono.
- Traer una tipografía, un icono o una imagen de fuera: la cabecera de seguridad
  lo bloquea, y con razón.
- Animaciones de entrada. Esto se abre veinte veces al día; el movimiento se
  reserva a los estados de lo que se toca, y se apaga entero con
  `prefers-reduced-motion`.
- Escribir un acento invertido dentro de `ESTILOS`: cierra la plantilla de
  cadena y el Worker deja de arrancar, a veces sin que `tsc` lo avise.

---

**No canonizado.** El panel no tiene emblema gráfico. El logotipo en SVG sigue
pendiente de entrega (`PRODUCT.md`) y el PNG pesa 1,7 MB, imposible de incrustar
en una hoja que viaja en cada respuesta; el monograma de dos letras que lo
sustituía repetía la palabra que tenía al lado y no alcanzaba el contraste
mínimo sobre el cian de marca, así que se quitó. **Esto es un hueco a rellenar
cuando llegue el SVG, no una regla de diseño.**
