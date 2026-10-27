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
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.018em"
  display-movil:
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.018em"
  title:
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.012em"
  body:
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  overline:
    fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  menudo: "4px"
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
| `#e4eff6` | Tinte superior del lienzo del acceso | `--fondo` tirando al azul de marca. Solo en la pantalla sin raíl, que es la única que no tiene ningún otro color |

## Typography

**Montserrat, la del sitio, servida por el propio Worker.** Tres pesos del
subconjunto latino —400, 600 y 700— desde `/fuentes`, declarados en `ESTILOS` y
despachados por `src/estatico.ts`.

Aquí hubo tipografía del sistema, y el argumento escrito era que una fuente
propia costaría «unos 60 KB en cada respuesta». Eso era falso de dos maneras: no
viaja en cada respuesta sino una vez al año —`Cache-Control: immutable`— y lo que
costaba de verdad era lo otro, que el panel pareciera de otra casa que la web que
administra. Lo usan las mismas personas el mismo día.

Medido: **113 868 bytes** las tres fuentes, una sola vez. El HTML del acceso son
9 403 bytes comprimidos, y de eso la hoja de estilos es casi todo, porque viaja
dentro de cada respuesta.

El español entero cabe en el subconjunto `latin` —ñ, tildes, ¿ y ¡ están por
debajo de U+00FF—, así que no se trae `latin-ext`, que pesa el doble.

| Rol | Tamaño | Peso | Dónde |
|---|---|---|---|
| Display | 1,7rem (1,45 en móvil) | 700 | El `h1` de cada pantalla |
| Title | 1,05rem | 700 | Subtítulos, el nombre de la marca y la cifra de un contador-filtro |
| Body | 15px / 1,55 | 400 | Todo el cuerpo, los campos, los botones y las tablas |
| Label | 0,84rem | 600 | Etiquetas de campo, pistas y el pie del acceso |
| Overline | 0,72rem, +0,05em, versalita | 700 | Cabeceras de tabla, la barra del móvil y la palabra «PANEL» |

**Cinco pasos y ni uno más.** La hoja había acumulado nueve tamaños entre 0,68 y
1,15rem —`.88`, `.95`, `.92`, `.85`, `.83`, `.78`, `.68`, `1`, `1.1`, `1.15`—,
casi todos a menos de un píxel de un paso que ya existía. Eso no es una escala,
es una lista de decisiones que nadie tomó. Están todos ajustados al paso más
cercano; el único cambio que se nota es el de los mensajes de error, que suben a
cuerpo de texto porque son lo que hay que poder leer.

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
| Menudo | 4px | Lo que mide dos letras: un fragmento de código dentro de un párrafo y el anillo de foco |
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

**El inicio.** Era una lista de once enlaces: servía para navegar y para nada
más. Había que entrar al catálogo para enterarse de que faltan 495 plazos de
entrega, y al aviso para saber si el sitio está enseñando una franja que alguien
dejó puesta la semana pasada.

Ahora el orden es el del trabajo, no el del menú:

1. **Qué está pasando** (`.ahora`) — si hay aviso puesto, con su texto y su
   fecha de caducidad, y el botón para cambiarlo. El icono va en `--accion`
   cuando está activo y en `--tinta-suave` cuando no: el acento marca lo que
   está activo, que es literalmente el caso. Sin franja de color al lado.
2. **Qué falta** — los mismos contadores-filtro del catálogo, solo los que no
   son cero y el más gordo primero, cada uno con enlace a su lista.
3. **A dónde ir** (`.accesos`) — rejilla de destinos con icono, nombre y la
   línea de qué hace.

Una rejilla de destinos es la forma honesta de un lanzador. Lo que no vale es
usar tarjetas iguales para fingir que una página tiene estructura, y aquí no son
la página: son su último tercio, bajo un título que dice lo que son.

**Los dos primeros bloques desaparecen si GitHub no contesta**, y el inicio se
dibuja igual. No es un adorno de robustez: `paginaFallo` manda aquí, así que
esta es la única pantalla que no puede caerse. Comprobado apagando el servidor:
200, con saludo y accesos, sin bloque de faltas y sin página de error.

**Contadores-filtro (`.recuento`).** Píldoras con el número en 1,05rem y cifras
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

**La puerta (`.caja`).** El acceso y la invitación son las dos únicas pantallas
sin raíl, así que la cabecera de la caja hace su papel: emblema y marca sobre
`--rail`, con el mismo bloque `<b>ExamLab</b><em>Panel</em>` que lleva el raíl
arriba. El panel sigue teniendo **un solo campo de color**; aquí está en otro
sitio porque el raíl todavía no existe.

Antes era una caja blanca con un título, dos campos y nada que dijera de quién
es el panel que se está abriendo. Debajo, una firma: para quién es esto y un
enlace de vuelta al sitio.

El lienzo lleva un tinte del azul de marca que cae a `--fondo` antes de la mitad
de la pantalla. Es el único degradado del panel y existe porque la puerta no es
una pantalla de trabajo: conviene que se note que es otra cosa.

**El ojo (`.ojo`).** Dentro del campo, a la derecha, 2,6rem de área de toque.
Llega dibujado desde el servidor y **oculto**; lo enseña el guion. Al revés
—dibujarlo con JavaScript o dejarlo visible— quien tenga el script bloqueado se
quedaría con un botón que no hace nada.

El icono dice la acción, no el estado: ojo abierto cuando la contraseña está
oculta («ver»), ojo tachado cuando está a la vista («ocultar»). `aria-pressed` y
el nombre accesible cambian con él.

Escribir doce caracteres a ciegas en el teclado de un teléfono es la razón de
que la gente acabe eligiendo contraseñas cortas. **Poder mirar lo que se escribió
protege más que esconderlo.**

**Copiar el enlace de alta (`.copiar`).** El enlace de invitación mide 76
caracteres y hay que pasárselo a la persona por WhatsApp o en mano. Marcarlo a
dedo en un teléfono, sin pasarse ni quedarse corto, es de las cosas que se hacen
tres veces hasta que salen.

Un botón al lado, y debajo en cuanto la pantalla se estrecha. Al pulsarlo pasa a
`--bien` con el icono de listo y dice **«Copiado»** durante 2,2 segundos: es la
misma confirmación que el mensaje de guardado, no un color nuevo. El ancho es
fijo para que no encoja al cambiar de palabra.

Si el navegador niega el portapapeles —sin permiso, o servido sin cifrar—
selecciona el enlace entero y dice «Seleccionado»: copiar deja de ser un toque
pero sigue siendo un Ctrl+C. **Nunca se queda en nada.**

**JavaScript.** El panel se construyó sin nada de JavaScript y sigue siendo así:
las once pantallas funcionan con el guion bloqueado. Lo único que hay son tres
ayudas —el ojo de la contraseña, el aviso de bloqueo de mayúsculas y el botón de
copiar—, en un archivo aparte porque la cabecera no permite scripts en línea.
**Si algo del panel deja de funcionar sin el guion, se rompió una regla.**

Los dos botones que añade el guion llegan con `hidden` y **necesitan
`.ojo[hidden], .copiar[hidden] { display: none }` escrito a mano**. `[hidden]`
es una regla del navegador con la especificidad más baja que existe, así que el
`display` de la propia clase la gana: sin esa línea el botón se ve, no hace nada
y el guion ya no tiene nada que enseñar. Pasó con el ojo y estuvo así un día.

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
- Caracteres Unicode o emoji haciendo de icono. Los mensajes llevaban un `!` y
  un `✓` de texto hasta que se cambiaron por la máscara SVG que esta misma hoja
  decía que usaban.
- Traer una tipografía, un icono o una imagen **de fuera**. Lo de fuera, no lo
  propio: la cabecera es `default-src 'self'`, así que lo que sirve el Worker
  —las fuentes, el emblema, el guion del ojo— entra sin tocarla, y eso es
  exactamente lo que la hace valiosa. Lo que no entra es una dirección ajena.
- Animaciones de entrada. Esto se abre veinte veces al día; el movimiento se
  reserva a los estados de lo que se toca, y se apaga entero con
  `prefers-reduced-motion`.
- Escribir un acento invertido dentro de `ESTILOS`: cierra la plantilla de
  cadena y el Worker deja de arrancar, a veces sin que `tsc` lo avise.

---

**El emblema, resuelto.** Este apartado decía que el panel no podía tener
emblema porque el logotipo en SVG seguía pendiente y «el PNG pesa 1,7 MB». Lo
segundo era falso y bastó con medirlo: el icono que el sitio ya usa,
`favicon-96.webp`, son **7 622 bytes** con fondo transparente, y el PNG de 192
que lo acompaña, 15 005. Ninguno de los dos se acerca al megabyte y medio que
esta misma hoja daba por hecho.

El emblema está hoy en tres sitios: la cabecera del raíl, la cabecera de la caja
del acceso y la pestaña del navegador. El Worker lo sirve desde `/emblema.webp`,
igual que las fuentes.

**Lo que sigue pendiente** es el SVG con fondo transparente (`PRODUCT.md`), que
es lo que haría falta para los códigos QR impresos —ahí el mapa de bits no da la
resolución— y para que el emblema escale sin pesar. Para la pantalla, el WebP
basta.
