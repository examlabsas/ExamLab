# Contexto de trabajo · ExamLab

Resumen para retomar el hilo sin perder lo aprendido. Escrito el 6 de octubre de
2026 y ampliado el mismo día al terminar la fase 4 del panel.

Los otros documentos siguen siendo la referencia:
[PENDIENTES.md](PENDIENTES.md) lo que falta, [PANEL.md](PANEL.md) el plan del
panel, [admin/DESIGN.md](admin/DESIGN.md) el sistema visual del panel,
[admin/README.md](admin/README.md) cómo ponerlo en marcha,
[DESPLIEGUE.md](DESPLIEGUE.md) el despliegue. Esto es lo que **no** cabía en
ninguno de ellos.

---

## 1. Qué es esto

Sitio del laboratorio clínico ExamLab (Dr. Edwin Roberto Silva Freire), en
Ambato y Pelileo, Ecuador. Astro 7 + Tailwind 4, **estático**, desplegado en
Cloudflare Workers. Cada `git push` a `main` compila y publica.

- **583 páginas**, de las cuales 559 son fichas de examen
- 4 sedes: Matriz Ficoa, Laboratorio 1 (Castillo), Laboratorio 2 (Av. Cevallos),
  Laboratorio 3 (Pelileo)
- El sistema de resultados es **Saluto** (`erp.salutoapps.com`), externo

### Reglas de trabajo

- **Nunca ejecutar `git commit`, `git push` ni operaciones de GitHub.** Los
  commits saldrían atribuidos a Anthropic y no al perfil de Juan. Él sube.
- El laboratorio trabaja en **Excel** y en **WhatsApp**. Lo que no encaje ahí no
  se usará.
- Los pacientes son a menudo personas mayores, con el teléfono, con datos
  móviles, a las seis de la mañana antes de ir en ayunas.

---

## 2. Estado ahora mismo

**El panel está en producción desde el 26 de octubre de 2026**, en
`https://admin.examlabsas.com`. Entra, escribe en el repositorio y el sitio se
reconstruye solo. Lo que falta está en `PENDIENTES.md`, sección 0.

Último commit local: `4ec52e7`. **En GitHub hay uno más**, `152d37b`, que lo
hizo el propio panel al guardar un aviso de prueba. Esto va a pasar siempre:
cada guardado desde el panel escribe directamente en GitHub, así que el clon
local queda por detrás y hay que traerlo antes de subir nada.

**Sin subir**: diez archivos. Seis son el arreglo del despliegue —la derivación
de contraseñas, las dos puertas del panel y las dos del sitio, el icono de
«Guardado»— y cuatro son estos documentos.

Antes de eso ya estaban hechas las seis fases, el panel rediseñado, **la
revisión del 13 al 16 de octubre cerrada** —once defectos, los once
corregidos— y los cambios que pidió el laboratorio: fuera los precios, fuera el
código de verificación, altas e importación en la cartera de asociados,
emblemas elegibles en los códigos QR y los ocho retoques de texto y maquetación
del Dr. Silva.

| | |
|---|---|
| `astro check` | 0 errores, 0 avisos, 0 sugerencias |
| `npm run build` | 583 páginas, 685 archivos en `dist/` |
| `npm run check:panel` | limpio |
| verificador de diseño | 8 en el sitio (las ocho declaraciones de Montserrat, tipografía aprobada por el cliente) y 25 en el panel (colores y tamaños literales de `ESTILOS` que `DESIGN.md` no enumera). Ninguno es un defecto; la cifra de «0 hallazgos» que figuraba aquí venía de otra invocación y era falsa |
| `npm audit --omit=dev` (sitio) | 0 vulnerabilidades (`audit fix` aplicado; queda `xlsx`, de desarrollo y sin parche) |
| `npm audit --omit=dev` (panel) | 0 vulnerabilidades |

Pendiente de subir, además:

```bash
git rm -r --cached examlab-sitio.zip design .claude/settings.local.json
```

---

## 3. El sitio: decisiones que no se deben deshacer

### Rendimiento, con los números que lo justifican

| Qué | Antes | Ahora |
|---|---|---|
| HTML de todo el sitio | 47,3 MB | 41,7 MB |
| Portada, `domComplete` | 1375 ms | 41 ms |
| Portada | 165 KB / 27,9 gzip | 152 / 21,8 |
| Ficha de examen | 84 KB / 18,5 gzip | 74 / 14,3 |
| `/soy-paciente` | 241 KB | 125 KB |
| Catálogo (559 tarjetas) | 1303 ms en dev | 111 ms compilado |

- **El mapa de Google costaba 1313 de los 1375 ms de la portada.** Ahora hay un
  marcador propio y el iframe entra al pulsar (`MapaSede.astro`). Resuelve a la
  vez el rendimiento y que un tercero supiera de la visita antes del banner de
  cookies.
- `assetsInlineLimit: 0` saca los scripts del HTML: se cachean una vez para todo
  el sitio. De paso los `<script>` en línea bajan de 14 a 2, lo que haría viable
  una CSP sin `unsafe-inline`.
- **El sitio es estático y eso es una característica, no una limitación.** No
  convertirlo en dinámico por comodidad del panel.
- `content-visibility: auto` + paginación por CSS en el catálogo. La regla
  depende de `.js`, así que **sin JavaScript se ven las 559 tarjetas**.
- Tipografías autoalojadas en `public/fuentes/` (solo latin y latin-ext). Cero
  orígenes externos en el HTML.

### Correcciones que costaron encontrar

- **Imprimir salía en blanco.** Las animaciones de revelado dejan los bloques en
  `opacity: 0` y no había `@media print`. En una ficha de examen salían en
  blanco 3 de 4 bloques, incluido todo el contenido clínico. Arreglado al final
  de `global.css`.
- **Google mostraba «Entrega en consultar»** en 495 fichas, porque la meta
  description interpolaba los campos crudos en vez de usar `etiquetaEntrega()`.
  Ahora hay `descripcionMeta()` en `src/lib/examenes.ts`.
- **Fugas al navegar.** El router de Astro sustituye el `<body>` entero, así que
  las guardas `dataset.iniciado` se resetean y los oyentes de `document`/`window`
  se acumulan. Medido: 5 navegaciones dejaban 18 registros. Ahora **21
  navegaciones dejan 4 y cero bucles vivos**. El patrón correcto está en
  `BotonLista.astro` y `Header.astro`: registrar a nivel de módulo y consultar el
  DOM vivo en el evento.
- **El «Ayuno de NaN horas»** podía llegar al WhatsApp del paciente:
  `leerLista()` no validaba `horas`.
- **Diecisiete nombres de examen tenían espacios dobles** («ANTI-LKM   (IFI)»),
  heredados del Excel. El HTML los junta al mostrarlos, así que no se veían, pero
  estaban en el título de la página, en el buscador y en el mensaje de WhatsApp que
  el paciente manda al laboratorio. Los encontró la comparación del propio panel al
  importar: los daba por renombrados. Corregido en el importador, con los slugs
  intactos.
- **Feriados.** El horario era un patrón semanal fijo mientras la página de sedes
  anunciaba que en feriados solo se atienden urgencias. El indicador habría dicho
  «Abierto» un día de cierre. Resuelto con `src/data/feriados.json` y
  `specialOpeningHoursSpecification` en Schema.org.

### El `InvalidStateError` de las transiciones · cerrado

Aparecía al navegar, una vez por cambio de página, y quedó explicado: el mensaje
completo dice **«Document hidden»**. La especificación salta la transición cuando
la pestaña no está visible, y entonces `ready` se rechaza mientras el cambio de
página se completa igual. Comprobado en Chrome 154 sobre el sitio publicado,
instrumentando `document.startViewTransition`: `ready` rechazada,
`updateCallbackDone` y `finished` cumplidas.

Solo sale cuando algo conduce el navegador en segundo plano. **No hay nada que
arreglar**, y si vuelve a verse, esto es la respuesta.

---

## 4. El panel de administración

### Por qué está montado así

- **Worker aparte, mismo repositorio** (`admin/`). Comparte repositorio para
  importar los tipos del sitio y no desincronizarse; se despliega por separado
  para que un fallo del panel no impida publicar el sitio.
- **Escribe en GitHub, no en una base de datos.** Cada cambio queda en el
  historial con quién y cuándo, y se revierte. El build de siempre lo publica.
- **Si el panel escribe algo inválido, el build falla y Cloudflare sigue
  sirviendo la última versión buena.** Un error no tumba el sitio.
- **Acceso con contraseña + código de aplicación.** Cloudflare Access quedó
  descartado porque su plan gratuito **pide tarjeta** aunque no cobre, y el
  doctor no puede ponerla. Entrar con Google también se descartó por decisión
  del cliente. No volver a proponerlos.

### Qué hay hecho

| Fase | Estado |
|---|---|
| 0 · Preparativos en Cloudflare | **pendiente, es de Juan** |
| 1 · La puerta: acceso, 2FA, usuarios y roles | hecha |
| 2 · Noticias, aviso temporal, estado del cambio | hecha |
| 3 · Contacto, sedes, horarios, feriados | hecha |
| 4 · Catálogo público | hecha |
| 5 · Catálogo de asociados | hecha |
| 6 · Historial y códigos QR | hecha |

**Añadido después, a petición de Juan**: alta de un examen suelto desde
`/catalogo/nuevo`. Hasta entonces los exámenes nuevos solo entraban por la hoja
de cálculo, y para dar de alta uno había que montar la lista completa —con el
riesgo de que faltara alguno y saliera como baja—. La ruta va declarada **antes**
de `/catalogo/:slug`: Hono resuelve por orden y, puesta después, el parámetro se
habría quedado con la palabra «nuevo».

Rechaza un nombre que ya exista comparándolo normalizado, porque el nombre es la
clave con la que la carga por hoja reconoce cada examen y dos iguales dejarían a
la hoja sin saber a cuál corresponde cada fila.

### Cuatro cambios que pidió el laboratorio, y qué significan

**Los precios salieron del sistema.** Vivían en el KV de Cloudflare, fuera del
repositorio, con dos comandos que los movían y una barrera que forzaba
`precio: null` al escribir. Nada de eso existe ya: ni el campo en el modelo, ni
el filtro «sin precio», ni el campo del formulario, ni la columna en la tabla
pública, ni el interruptor `MOSTRAR_PRECIOS`, ni los 277 `"precio": null` del
archivo versionado. El tarifario vuelve a estar solo donde siempre estuvo de
verdad, en el Excel del laboratorio. **Lo que no existe no se publica por
descuido**, que era el riesgo que toda aquella maquinaria intentaba contener.
Comprobado que la página pública no cambió: una etiqueta invisible menos, 198
bytes.

**El código de verificación se quitó.** Entrar es correo y contraseña. Dije lo
que eso significa antes de hacerlo —sin segundo factor, una contraseña robada
basta para entrar— y ofrecí la alternativa de alargar la sesión de 8 horas a 30
días, que quita la molestia sin quitar la protección. Quedó pendiente de su
respuesta. El secreto TOTP de cada usuario **se sigue guardando**, así que
volver a pedirlo es restaurar una comprobación y un campo del formulario, no
rehacer el sistema. `auth/totp.ts` se queda por eso.

**La cartera de asociados ya tiene alta e importación**, como el catálogo
público: `/asociados/nueva` y `/asociados-importar`, con los mismos tres pasos y
la misma casilla que obliga a confirmar las bajas.

**Los códigos QR llevan emblema elegible.** ExamLab, WhatsApp o ninguno, y se
propone solo el que corresponde al destino. El logotipo de WhatsApp no se dibujó
de memoria: estaba ya en el repositorio, dentro de un QR que el laboratorio
generó antes con el script antiguo. Para añadir Instagram o Facebook hace falta
su SVG oficial; `emblemas.ts` explica cómo se añade en una entrada.

### Los ocho retoques que pidió el Dr. Silva

Vinieron de verle usar el sitio, que es de donde salen los buenos:

1. «Uno de **los dos** laboratorios de la región» → «uno de **los pocos**».
2. **Provincia de Tungurahua** en lugar de «Ambato y Pelileo», empezando por el
   nav. En la descripción que lee Google se conservó «con sedes en Ambato y
   Pelileo» detrás: *Ambato* es por donde busca la gente y quitarlo cuesta
   visitas.
3. y 4. **Al sistema se entra con cédula y contraseña**, no con un «código de
   orden» que ya no existe. Desapareció de las diez páginas donde se nombraba.
5. **Número de urgencias**: 098 800 0799, distinto del general. Hasta entonces
   el sitio publicaba el general bajo la etiqueta «Urgencias» en las 583
   páginas, que es peor que no publicar ninguno.
6. **No nombrar la marca del proveedor del sistema**: es publicidad regalada.
   Ahora dice «nuestro sistema» o «nuestro sistema integrado». El `href` del
   botón sigue apuntando donde apunta, que no se puede evitar; comprobado que el
   nombre no aparece en texto, ni en `aria-label`, `title` o `alt`, ni en los
   datos estructurados.
7. **El cajón de preguntas que se expandía vacío.** Era de libro: los `<details>`
   viven en una rejilla de dos columnas y las celdas de una fila se estiran a la
   misma altura. Al abrir uno, el de al lado crecía en blanco. `items-start` lo
   arregla, y pasaba en dos páginas, no en una.
8. Las **cifras de la portada** dejaron de escribirse a mano: decía «400+
   análisis» con 559 en el catálogo y «5 especialidades» —que era el número de
   tarjetas de esa misma página— con 10 reales. Ahora se cuentan, como ya se
   contaban las de las tarjetas.

### Estructura

```
admin/
├── DESIGN.md             el sistema visual del panel (solo del panel)
├── README.md             puesta en marcha y qué está probado
├── src/
│   ├── index.ts          todas las rutas
│   ├── github.ts         leer y escribir el repositorio
│   ├── noticias.ts       Markdown + cabecera YAML + validación
│   ├── sitio.ts          sitio.json, sedes.json, feriados.json
│   ├── catalogo.ts       los 559 exámenes; derivado contra copia buena
│   ├── importar.ts       leer una hoja de cálculo y compararla
│   ├── asociados.ts      las 277 pruebas de asociados, sin precios
│   ├── historial.ts      de qué sección es cada cambio del repositorio
│   ├── qr.ts             códigos QR en SVG, sin procesar imágenes
│   ├── emblema.ts        el logotipo recortado, lo genera un script
│   ├── usuarios.ts       altas por invitación, roles, baja
│   ├── auth/password.ts  PBKDF2 100 000 iteraciones, comparación constante
│   ├── auth/totp.ts      RFC 6238, HMAC-SHA1, ventana de ±1 paso
│   ├── auth/sesion.ts    cookies, sesiones en KV, límite de intentos
│   ├── estatico.ts       fuentes, emblema y guion: rutas y caché de un año
│   ├── fotos.ts          subir una foto: comprobar y escribir en un commit
│   └── paginas/
│       ├── plantilla.ts  el armazón, los iconos y TODA la hoja de estilos
│       ├── guion.ts      el único JavaScript, y es opcional
│       └── …             una pantalla por sección, solo su contenido
├── scripts/
│   └── crear-admin.mjs   el primer administrador
└── pruebas/              solo para local: GitHub simulado, usuario, códigos,
                          y una hoja de ejemplo para la carga
```

### Detalles que no son evidentes

- **No hay ruta web de alta inicial**, a propósito: dejaba una ventana en la que
  quien la encontrara antes se quedaba con el panel. Se usa
  `npm run admin:crear`, que exige acceso a la cuenta de Cloudflare.
- **El mensaje de error del acceso es siempre el mismo.** Si dijera «ese correo
  no existe», regalaría la lista de quién tiene acceso.
- **El límite de intentos cuenta por correo y por IP a la vez.** Solo por correo
  alguien bloquea a una persona a propósito; solo por IP un ataque repartido no
  se frena.
- **El commit lleva la persona en el mensaje.** Todo llega con el mismo token, así
  que sin eso el historial diría siempre «el panel»:
  `Publica la noticia «…»\n\nDesde el panel · maria@examlabsas.com`
- **El `sha` del archivo viaja en cada guardado.** Si dos personas editan lo
  mismo, GitHub devuelve 409 y el panel dice «Alguien más guardó este archivo
  mientras usted lo editaba» en vez de pisar el cambio.
- **`GITHUB_API` es una variable solo para pruebas.** En producción va vacía.
- **El catálogo no pasa por base64, y esa es la diferencia entre funcionar y no.**
  El plan gratuito de Workers corta a los **10 ms de CPU por petición**.
  Descodificar los 288 KB de `examenes.json` que devuelve la API de contenidos
  cuesta **29 ms**. Se lee con `Accept: application/vnd.github.raw` (0,01 ms) y se
  escribe con `encoding: utf-8` en los blobs (1 ms en vez de 11). La pantalla pasó
  de 54 ms a 8 ms. Si alguien vuelve a meter el catálogo por `leerArchivo`, el
  panel empieza a dar el error 1102 de Cloudflare.
- **`examenes.json` es derivado; `catalogo-info.json` es la copia buena.** Lo
  reescribe entero el importador, así que **lo que no esté en el segundo se pierde
  en la próxima importación del Excel**. El panel escribe en los dos, en un solo
  commit. Los plazos de entrega y las técnicas no estaban en el segundo: se
  pasaron con `scripts/completar-catalogo-info.mjs`.
- **El panel no toca un campo que nadie pidió cambiar.** El valor publicado puede
  venir de la plantilla de asociados, que el panel no lee; reconstruir una ficha
  «desde cero» desde `catalogo-info.json` borraría el plazo de 64 exámenes.
- **Los nombres se comparan sin acentos, mayúsculas ni puntuación.** Es lo que
  convierte «corregir una tilde en el Excel» en un renombrado —misma dirección,
  mismo texto— en vez de una baja y un alta que mata la URL.
- **En la cartera de asociados no hay precios, y no es un olvido.** Lo pidió el
  laboratorio y está explicado arriba, en §4. Antes existió todo un sistema para
  guardarlos fuera del repositorio —el KV, dos comandos y una barrera que forzaba
  `precio: null` al escribir— porque un importe que entra en git se queda en el
  historial aunque luego se borre. Ya no existe nada de eso. Si alguien vuelve a
  pedir precios en el panel, el problema que había que resolver era ese.
- **`auth/totp.ts` sigue ahí y no se usa.** El laboratorio quitó el código de
  seis cifras del acceso, pero el secreto se sigue guardando en cada usuario.
  Está a propósito: restaurar la comprobación es volver a llamar a `verificar`
  y reponer el campo del formulario, no rehacer el sistema.

### El rediseño, y por qué cada decisión

El panel pasó de páginas sueltas con navegación arriba a un **armazón de
aplicación**. El sistema visual está escrito en [admin/DESIGN.md](admin/DESIGN.md);
aquí van los porqués, que es lo que no se deduce del código.

- **Raíl en escritorio, barra de iconos abajo en el móvil.** Lo eligió el
  usuario entre tres opciones. El raíl son once secciones y en la barra caben
  cuatro, así que **Inicio es el índice completo** y desde él se llega al resto.
  Un cajón que se abre y se cierra costaba un toque más en cada navegación, y
  esto se usa de pie entre pacientes.
- **Tipografía del sistema.** Las de la marca —Chakra Petch y Montserrat— habría
  que servirlas desde el Worker porque la cabecera de seguridad no deja traerlas
  de fuera: unos 60 KB en cada respuesta a cambio de nada que el trabajo
  necesite.
- **Se rehízo la hoja entera en vez de adaptar la anterior.** La que había venía
  de otra IA y estaba pensada para páginas sueltas; arrastrarla a una estructura
  distinta deja restos que no encajan.
- **Las secciones de administrador no están en la navegación**, sino en la
  portada bajo la comprobación de rol, como ya estaba `/usuarios`. Un enlace que
  a la mitad de la gente le responde «no tiene permiso» hace que el panel parezca
  roto. Pasarle el rol a la navegación habría exigido tocar 44 llamadas.
- **Las marcas de «falta un dato» son grises, no rojas.** Las llevan 495 de 559
  fichas: en rojo la lista entera gritaba y dejaba de señalar nada. El rojo se
  reserva a lo que va mal. Y la marca que repite el filtro activo no se dibuja.
- **El contenido va siempre sobre una superficie**, y nunca un panel dentro de
  otro. Flotando sobre el gris, una pantalla sigue pareciendo una página suelta.
- **Iconos dibujados a mano**, once, misma retícula y mismo trazo. No hay
  librería —la cabecera no deja traer nada— y un carácter Unicode al lado de un
  juego dibujado se ve como lo que es.
- **`DESIGN.md` vive en `admin/`, no en la raíz.** Puesto arriba, el verificador
  mide también el sitio público contra el sistema del panel y marca como desvíos
  decisiones que el cliente aprobó y que PRODUCT.md declara intocables.

### Lo que parecía imposible y cómo salió

**Subir fotos desde el panel.** Aquí decía «queda decidido que no se hace», y el
motivo era bueno: de cada original, `scripts/optimizar-imagenes.mjs` saca tres
WebP y un JPG con `sharp`, que no corre en un Worker **ni al compilar**. Parecía
que subir desde el panel exigía meter los originales en el repositorio y mover
esa generación al build.

Se hizo el 28 de octubre de 2026, y la pared se rodeó por el otro lado: **las
variantes las genera el navegador de quien sube la foto**, con un lienzo, antes
de enviarlas. El Worker no redimensiona nada —solo comprueba y escribe—, los
originales no entran en git y el build no cambia. De regalo, pasar por un lienzo
borra los datos EXIF del teléfono, la ubicación incluida.

Es la única pantalla del panel que no funciona sin JavaScript, y lo dice ella
misma antes de que nadie rellene nada.

---

## 5. Errores que cometí, para no repetirlos

| Qué pasó | Cómo se detectó | Lección |
|---|---|---|
| Una ruta `/primer-acceso` abierta creaba el primer administrador | Releyendo lo que acababa de escribir | Una ruta de alta inicial es un agujero mientras nadie la use |
| La cookie salía `Secure` en local | El acceso funcionaba pero la comprobación miraba `localhost` y wrangler sirve en `127.0.0.1` | Mirar el **protocolo**, no el nombre del host |
| Un comentario JSX entre atributos de un elemento | `astro check` con `ts(1005)` | Los `{/* */}` van fuera de la etiqueta, nunca entre atributos |
| Una expresión regular se comió el tipo `Examen` al borrar exports muertos | `astro check` con 5 errores en cadena | Recuperar el bloque del último commit y rehacerlo a mano |
| `inert` en el panel plegado no se aplicaba al arrancar | Midiendo: `inert: false` con `abierto: "false"` | Lo que nace cerrado nace con el atributo en el HTML, no esperando al script |
| La regla CSS de pausar animaciones no aplicaba | Los elementos seguían `running` | El atajo `animation:` reinicia `animation-play-state`; hizo falta `!important` |
| Dije que los precios de asociados estaban publicados | Un agente lo contradijo y lo comprobé | `MOSTRAR_PRECIOS = false`; **el riesgo real era que `catalogo-asociados.json` no estaba ni versionado ni ignorado** |
| Dije que faltaban 21 de 35 preguntas del doctor | Abriendo los .docx del Escritorio | Eran **14 preguntas y respondió 13**. La única sin responder la contestó luego con una imagen |
| Afirmé que «la matriz ya no es Ficoa» no era el caso | El usuario preguntó | Verificar antes de responder, incluso lo que parece obvio |
| «Optimicé» el base64 por trozos sin medir: salió un 6 % **peor** | Midiendo las operaciones sueltas en Node | El coste estaba en el otro sentido —descodificar al leer, 29 ms— y en un camino que ni miré |
| Ejecuté el importador antes de renombrar las claves de `catalogo-info.json` y 17 exámenes perdieron su texto | El propio informe del script: «con especialidad 516» cuando eran 533 | Cuando dos archivos se emparejan por nombre, el renombrado va **antes** de la importación |
| Un examen dado de baja volvía en blanco | Reproduciendo el ciclo completo: renombrar → baja → alta | Probar el ciclo de vida entero, no cada operación por separado |
| Dejé una validación imposible de alcanzar: el campo vacío ya era «Consultar» antes de llegar a ella | Guardando un plazo en blanco y viendo que pasaba | Un mensaje de error que no puede salir es peor que no tenerlo: confunde a quien lea el código después |
| Monté toda la fase 4 sobre `catalogo-info.json` sin ver que estaba en `.gitignore`: en producción no habría existido | Mirando `git status` al final y notando que el archivo modificado no aparecía | Una regla de `.gitignore` tiene un motivo escrito y los motivos caducan. Antes de construir sobre un archivo, comprobar que está en el repositorio: `git check-ignore -v <archivo>` |
| `comparar` y `aplicar` deducían cada uno por su cuenta qué examen de la hoja era cuál. Con dos nombres que se comparan igual, uno desaparecía del catálogo y la pantalla decía «0 salen» | Revisando el código a propósito y construyendo el caso: 560 exámenes, hoja de 559, la pantalla prometió «560 a 560» | **Dos funciones que deducen lo mismo por separado acaban discrepando.** Se calcula una vez y se pasa |
| El formulario perdía la especialidad escrita al volver de un error de validación, y el desplegable elegía otra en silencio | Enviando el formulario con un campo inválido y leyendo el HTML que volvía | Un `<select>` sin ninguna opción marcada no se queda vacío: el navegador elige la primera. Y todo campo que se reenvía tiene que volver con su `value` |
| Diez rutas de lectura no capturaban nada: un token caducado daba «Internal Server Error» en blanco | Me equivoqué de puerto en una prueba y lo vi | Las rutas que escriben se protegen una a una porque ahí hay que devolver el formulario; para las que leen vale una sola red, `app.onError` |
| Escribí un acento invertido dentro de un comentario del CSS del panel, que vive en una plantilla de cadena: cerró la cadena y **el Worker dejó de arrancar entero** | Arrancándolo. `npm run check` había pasado: lo que quedaba se leía como una plantilla etiquetada, válida para tsc | **Que tsc pase no significa que el Worker arranque.** Tras tocar `ESTILOS` o cualquier plantilla larga, levantarlo y pedir una página. Y nada de acentos invertidos en esos comentarios |
| El código QR del segundo factor se le pedía a `api.qrserver.com` pasándole el `otpauth://` en la URL — **con el secreto TOTP dentro** | La revisión de cierre del rediseño | Un servicio externo que «solo dibuja una imagen» recibe entero lo que se le pasa. Ahora se genera en el Worker y la cabecera de seguridad ya no necesita la excepción |
| Perseguí una hora una diferencia de hash en las 583 páginas de `dist/` | Al final, `git diff --numstat`: solo 13 archivos tenían cambio real | **`dist/` está en `.gitignore` y lo recompila Cloudflare: no se despliega.** Antes de investigar una diferencia, preguntar si ese artefacto viaja a alguna parte |
| Durante esa búsqueda hice `git stash` y convertí los finales de línea de 80 archivos del sitio | `git status` pasó a listar setenta archivos modificados | `git status` marca por fecha y tamaño; **`git diff --numstat` dice si el contenido cambió de verdad**. Con `core.autocrlf=true` los finales de línea son ruido que git ignora al comparar |
| Al limpiar ese ruido reverté `src/pages/sedes/[slug].astro`, que sí tenía un cambio real | Comprobando que los feriados seguían en los datos de Google | `grep -x "$f"` trata los corchetes del nombre como un patrón. Con nombres de archivo, `grep -Fx` |
| Escribí `DESIGN.md` en la raíz del repositorio | El verificador empezó a marcar once cosas del **sitio público** | Un sistema de diseño gobierna el árbol donde vive. El del panel va en `admin/`; el del sitio lo fija PRODUCT.md y es intocable |
| Escribí el importador de la cartera de asociados emparejando por nombre, como el del catálogo público. Hay **dos pruebas llamadas «NICKERSON»** en especialidades distintas: la hoja traía las dos, la segunda se descartaba como repetida y la pantalla anunciaba una baja que no existía | Probándolo con una hoja generada de la propia cartera, que debía dar 0 bajas y dio 1 | **La identidad de un registro la decide el dato, no la costumbre.** En el catálogo público los nombres son únicos y basta el nombre; en la cartera de asociados la clave es especialidad + nombre, y eso ya estaba escrito en `claveDe`. Copiar la forma del hermano sin mirar su clave es como se heredan los errores |
| Puse `img-src 'self'` en la CSP del panel sin caer en que **`'self'` no incluye `data:`**. Quedaron bloqueadas las dos únicas imágenes que el panel tiene: la flecha de todos los desplegables y el emblema del centro de los QR | La revisión del 13 de octubre, leyendo la consola del navegador en `/usuarios` | Una política de seguridad se comprueba **pidiendo la página y mirando la consola**, no leyendo la cabecera. El campo «Rol» llevaba meses pareciendo un campo de texto |
| El SVG del QR se incrustaba en la pantalla con su `width="2048"` de imprenta. La pantalla del segundo factor —la primera que ve quien acepta una invitación— se iba a 2433 px de ancho | Midiendo `document.documentElement.scrollWidth` en una ventana de 1024 | **Un mismo artefacto para pantalla y para imprenta necesita dos tamaños.** El archivo descargado manda sus dimensiones; en pantalla manda el contenedor |
| Verifiqué los QR rasterizando el **archivo descargado** y di por hecho que la pantalla enseñaba lo mismo. No lo enseñaba: sin emblema, por la CSP | El mismo repaso | Verificar el artefacto que de verdad se usa. La pantalla pide «escanéelo ahora» y lo que se escaneaba no era lo que se descargaba |
| `/noticias` y `/estado` respondían «No se pudo **guardar**» a un fallo de **lectura**, y debajo pintaban su estado vacío: «Todavía no hay ninguna noticia» | Apagando el GitHub simulado y pidiendo las ocho pantallas | Una lista vacía por error no es una lista vacía. **El estado vacío solo se enseña cuando se sabe que está vacío** |
| Los recuentos de la portada (`especialidades.json`) estaban escritos a mano y se quedaron viejos: «Hematología · 128 exámenes» cuando hay 48, y las cuatro mal | Un agente los contó contra `examenes.json`; lo comprobé en `dist/index.html` | Una cifra escrita a mano al lado de un enlace que lleva a la cifra de verdad **se va a contradecir sola**. Se quitó el campo y se cuenta del catálogo |
| Los datos estructurados publicaban `usesDevice: "Consultar"` en 495 fichas y un `codeValue: ""` en las 559 | `grep` sobre `dist/` | Es el mismo fallo de «Entrega en consultar» que ya se había corregido **en la página visible pero no en el JSON-LD**. Al arreglar un relleno, buscarlo en todas las salidas, no solo en la que se ve |
| `DESIGN.md` del panel decía que no podía llevar emblema porque «el PNG pesa 1,7 MB» | Midiéndolo: `favicon-96.webp` son **7 622 bytes** con fondo transparente, y `logo.png` 15 005 | Ese número no salió de ninguna medición y bloqueó una decisión durante semanas. **Un dato inventado dentro de un documento de diseño se obedece igual que uno medido** |
| El mismo documento justificaba la tipografía del sistema diciendo que una fuente propia costaría «60 KB **en cada respuesta**» | Sirviéndola desde el Worker con `immutable`: 113 868 bytes **una vez al año** | Un archivo cacheado no viaja en cada respuesta. La hoja de estilos sí, y nadie la había mirado: son 9 403 bytes comprimidos en **cada** página |
| La CSP del panel se leyó durante meses como «aquí no cabe JavaScript» | Releyéndola: `default-src 'self'` sin `script-src` propio **permite** scripts del mismo origen; lo que bloquea es el `<script>` en línea | Una restricción mal recordada se vuelve una regla que nadie vuelve a comprobar. El ojo de ver la contraseña cabía desde el principio, en un archivo aparte |
| La tabla de horarios de una sede pedía 697 px dentro de 375: las dos horas de la tarde quedaban **fuera de la pantalla** | Midiendo `getBoundingClientRect().right` contra el ancho del lienzo | Es el mismo fallo que ya se había arreglado en Usuarios y en Feriados. **Al corregir un desbordamiento, medir todas las tablas**, no solo la que se vio |
| Di por bueno que `::details-content` + `interpolate-size` animaba los desplegables, y en una página el acordeón **dejó de abrirse**: contenido invisible | Midiendo el alto real en las dos páginas: 74→143 px donde el padre es una rejilla, 0 px fijos donde es un contenedor flex | Una animación que a veces esconde el contenido no se publica. Lo hace JavaScript —veinte líneas que miden y animan— con red de seguridad: pasado el tiempo, suelta el alto pase lo que pase |
| Antes de eso saqué tres conclusiones falsas de medir animaciones en el panel de vista previa, que no pinta | `animation.currentTime` se quedaba en **0** con `document.visibilityState` diciendo «visible» | **El reloj de las animaciones no avanza en una ventana que no se pinta.** Para comprobar una curva ahí: pausar la animación, mover `currentTime` a mano y leer el alto en cada paso |
| Dije que el botón del ojo «llega oculto y lo enseña el guion». Con el JavaScript bloqueado **se veía igual, y muerto** | Poniéndole `hidden` y leyendo el `display` calculado: `grid`, no `none` | `[hidden]` es la regla de menor especificidad que existe y cualquier `display` de clase la gana. Si un botón nace oculto, hace falta `.clase[hidden] { display: none }` escrito a mano — y comprobarlo, no suponerlo |
| Escribí acentos invertidos dentro de un comentario de `ESTILOS` tres veces. La tercera, **`tsc` pasó limpio y el Worker no arrancó**: lo que quedaba tras cerrarse la cadena era TypeScript válido | `wrangler dev` falló al empaquetar, con `npm run check` en verde | Ya estaba apuntado dos veces y volvió a pasar, así que dejó de ser una lección y pasó a ser una comprobación: `npm run check` ahora corre también `wrangler deploy --dry-run`, que es el mismo empaquetado del despliegue. **Una regla que ya fallaste dos veces no se recuerda mejor: se automatiza** |
| El GitHub simulado guardaba cada archivo como cadena. Al subir la primera foto, el WebP llegó al repositorio con cada byte no-UTF-8 convertido en `�` | Comprobando las imágenes subidas byte a byte: dos de cuatro tenían cabecera buena y el cuerpo destrozado | **Lo peor no fue que rompiera: fue que dos de cuatro parecían bien.** La cabecera `RIFF` sobrevive y el archivo pasa por imagen. Un banco de pruebas que no puede representar lo que hace el sistema de verdad esconde fallos en vez de enseñarlos; ahora guarda `Buffer` |
| La lista de fotos la importaba el panel desde `src/lib/fotos.ts`, así que viajaba **dentro del Worker** | Pensando qué pasa el día después de subir una: la foto estaría en el repositorio y el desplegable de Noticias no la ofrecería hasta el siguiente despliegue del panel | Un dato que el panel escribe no puede leerlo de su propio paquete. Las pantallas de noticias leen ahora `fotos.json` del repositorio en cada visita, como hacen con todo lo demás |
| Pedí a Juan cargar un secreto `FIRMA_SESION` que **ningún archivo del código lee** | Buscándolo: `grep -rn FIRMA_SESION admin/src/` → vacío | Un paso de instalación que no hace nada enseña algo falso sobre cómo funciona el sistema. Las variables que el panel usa son `PANEL`, `REPO`, `RAMA`, `GITHUB_TOKEN` y `GITHUB_API` |

---

## 6. Limitaciones del entorno de pruebas

Esto costó tiempo descubrirlo y es lo primero que se olvida.

- **`wrangler dev` no aplica los límites de producción.** El panel entero
  funcionó en local durante semanas con 310 000 iteraciones de PBKDF2, y al
  desplegarlo nadie podía entrar: `crypto.subtle` de Cloudflare rechaza por
  encima de 100 000. Las pruebas tampoco lo vieron, porque `pruebas/usuario.mjs`
  creaba el usuario con el mismo número y corría en Node, donde no hay tope.
  Lección: **una prueba que fabrica su propio dato con la misma constante que
  el código no prueba la constante.** Y el primer despliegue de cualquier cosa
  que use `crypto.subtle` hay que ejercitarlo contra el Worker real, no contra
  `wrangler dev`.
- **El mensaje de error del panel no dice dónde falló.** `app.onError` usa
  `AL_LEER` —«No se pudo leer el repositorio»— como respaldo para *cualquier*
  excepción no capturada, no solo las de GitHub. Ese mensaje mandó a investigar
  el token durante un rato mientras el fallo estaba en la derivación de la
  contraseña. Lo que lo resolvió fue `npx wrangler tail examlab-panel`, que
  imprime la excepción de verdad. Es lo primero que hay que mirar cuando el
  panel desplegado falla, antes de tocar nada.
- **El panel del navegador no ejecuta fotogramas de animación.** Por eso no
  funcionan ahí `IntersectionObserver`, `ResizeObserver` ni los eventos
  `resize`. Las capturas salen a medio animar. Para ver colores reales hay que
  inyectar `*{animation:none!important;opacity:1!important}`.
- Por lo mismo, **cualquier arreglo que dependa de esas APIs no se puede
  verificar ahí**. Conviene resolver con CSS o con una pasada síncrona inicial
  (`getBoundingClientRect`), que además suele ser mejor código.
- **Para cerrar `wrangler dev` en Windows hay que matar al padre, no a `workerd`.**
  `taskkill` sobre `workerd.exe` dice SUCCESS y el puerto sigue ocupado, porque el
  `node` de wrangler lo vuelve a levantar. Lo que funciona: encontrar el PID del
  puerto, subir al padre y matar el árbol desde ahí.

  ```bash
  pid=$(netstat -ano | grep "127.0.0.1:8798 .*LISTENING" | head -1 | awk '{print $5}')
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId=$pid' | Select ParentProcessId,CommandLine"
  taskkill //PID <el padre> //T //F
  ```

  Mientras se está probando, de todos modos sale más barato **levantar en un puerto
  nuevo** que ir cerrando.
- `astro preview` a veces escucha solo en IPv6: probar con `http://[::1]:PUERTO`.
- El clasificador de seguridad de las herramientas falla a ratos. No es un
  rechazo: se reintenta más tarde.
- **`wrangler dev` no mide la CPU.** El endpoint de observabilidad local devuelve
  `cpu_time_ms: 0`, y sus tiempos de respuesta llevan unos 15 ms de sobrecarga del
  propio dev: por ahí el catálogo parecía gastar 45 ms cuando eran 2. Para saber
  qué cuesta de verdad, **medir las operaciones sueltas en Node**, que es el mismo
  V8:

  ```js
  const t = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) JSON.parse(texto);
  console.log(Number(process.hrtime.bigint() - t) / 1e6 / 20, 'ms');
  ```

  Así salió que `JSON.parse` de 288 KB cuesta 0,55 ms y descodificar base64 de lo
  mismo cuesta 29.
- **Git Bash estropea los acentos en la línea de órdenes.** Un
  `--data-urlencode "x=azúcar"` llegaba como `az�car` y parecía un fallo del
  panel. Para probar texto con tildes, escribirlo a un archivo con bytes
  conocidos (`printf 'azÃºcar' > x.txt`) y mandarlo con `--data-urlencode
  "x@x.txt"`.

### Cómo probar el panel sin un token de GitHub

Hay un **GitHub simulado** en el scratchpad (`github-falso.mjs`) que carga los
datos reales del sitio e implementa lo que el panel usa de las dos APIs:

- **contenidos**: leer, listar, escribir con control de `sha`, borrar, y el tipo
  `raw` para devolver el archivo sin codificar;
- **base de datos de git**: refs, commits, árboles y blobs, con árboles de verdad
  para que `?ref=<commit>` devuelva lo que había en ese commit. Sin eso no se puede
  probar el caso que importa: dos personas guardando a la vez. El `PATCH` de la ref
  rechaza lo que no sea un avance, igual que GitHub, y con `FALSO_CONFLICTO=1`
  rechaza siempre, para ver el mensaje de conflicto sin montar una carrera.

Se levanta con `node github-falso.mjs <puerto>` y el panel apunta ahí con
`admin/.dev.vars`:

```
GITHUB_TOKEN = "token-de-mentira"
GITHUB_API = "http://127.0.0.1:8804"
```

En el scratchpad están también `prueba-usuario.mjs` (usuario con secreto TOTP
fijo, se carga con `wrangler kv key put ... --local`), `codigo.mjs` (imprime el
código del momento), `probar.sh` (abre sesión y deja la cookie) y `replay.sh`
(reproduce renombrar → baja → alta y comprueba que el texto sobrevive). Los CSV de
prueba se sacan del `pruebas.xls` del laboratorio con `XLSX.utils.sheet_to_csv`.

### Lo que hay que mirar antes de investigar

Tres preguntas que habrían ahorrado una hora hoy:

1. **¿Este artefacto se despliega?** `dist/` no: está ignorado y lo recompila
   Cloudflare desde la fuente.
2. **¿Git ve un cambio de contenido o solo de fecha?** `git status` dice lo
   segundo; `git diff --numstat` dice lo primero.
3. **¿La herramienta está midiendo contra la vara correcta?** Once hallazgos de
   diseño en el sitio público resultaron ser un `DESIGN.md` mal colocado.

### Revisar en busca de errores: lo que funcionó

Pasar el revisor por el propio trabajo encontró ocho fallos, cinco de ellos
confirmados reproduciéndolos. Lo que los sacó a la luz no fue leer el código con
atención, sino tres hábitos concretos:

- **Construir el caso en los datos.** Añadir a mano un examen que colisionara y
  volver a importar. La pantalla prometió «560 a 560» y publicó 559: eso no se
  ve leyendo.
- **Enviar el formulario mal a propósito** y leer el HTML que vuelve, campo por
  campo. Así salió la especialidad que se cambiaba sola.
- **Subir el archivo equivocado**, que es el que el laboratorio tiene a mano.

### La verificación que más vale

Para cualquier refactor de datos: **guardar el hash de las 583 páginas antes,
refactorizar, recompilar y comparar.** Así se verificó el paso de `site.ts` a
JSON: idénticas byte a byte.

```bash
find dist -name '*.html' | sort | xargs sha1sum > antes.sha
# …cambios…
find dist -name '*.html' | sort | xargs sha1sum > despues.sha
diff antes.sha despues.sha
```

---

## 7. Lo siguiente

**Por parte del programador no queda nada.** Las seis fases, el rediseño, la
revisión y los cambios que pidió el Dr. Silva están hechos y comprobados. Lo que
falta es desplegar (de Juan) y rellenar datos (del laboratorio), y está en la
sección 8.

Un hueco que se rellena solo cuando llegue el material:

- **El logotipo en SVG.** El raíl del panel no lleva emblema: el PNG pesa 1,7 MB
  y no cabe en una hoja que viaja en cada respuesta, y un monograma de dos letras
  repetía la palabra de al lado sin llegar al contraste mínimo. Cuando llegue el
  SVG, ahí va — y también como opción en los emblemas de los códigos QR.

### Descartado, con su motivo

**Cerrar el catálogo de asociados.** Era el pendiente más antiguo y dejó de
tener sentido al sacar los precios del sistema. Lo que esa página publica ahora
es especialidad, nombre, método, muestra y plazo: el catálogo comercial del
laboratorio, no algo reservado. Cerrarlo costaría pedir los correos de los
asociados, decidir un mecanismo —Cloudflare Access sigue descartado por la
tarjeta— y montarlo, para proteger lo que no hace falta proteger; y le cerraría
la puerta a un laboratorio nuevo que quiera ver qué se ofrece antes de pedir
convenio. **Si algún día vuelven los precios a la web, vuelve este pendiente.**

**La sesión de 30 días.** Se ofreció al quitar el código de verificación, para
que entrar no se pidiera cada día. El Dr. Silva dijo que no: complica las cosas.
La sesión se queda en 8 horas.

**La foto de la fachada de Ficoa en más resolución** y **Carnaval y Viernes
Santo** en los feriados: descartados por el laboratorio.

---

### La lección de los códigos QR

Se habían descartado por la misma pared que las fotos y lo de Instagram:
necesitan `sharp`, que no corre en un Worker. Y era falso — lo que no corría era
**el método del script**, no el resultado.

Generando **SVG** no hay imagen que procesar: pegar el emblema sobre el código es
escribir un círculo y una imagen recortada con `clipPath`. Hizo falta recortar el
emblema una vez con `sharp` (`npm run emblema`, 31 KB de texto en `emblema.ts`,
porque `logo.png` pesa 1,7 MB) y entrar al paquete `qrcode` por su archivo
interno, que no arrastra `pngjs` ni `yargs`.

La verificación, que era la objeción seria, se cubre por tres lados: el emblema
tapa el 7,4 % del área y el nivel H tolera el 30 %; la pantalla pide escanearlo
con el móvil antes de descargar; y `npm run qr:comprobar` lo rasteriza a cuatro
tamaños y comprueba que los cuatro se leen.

**Lo que vale para la próxima vez**: cuando algo choque con «no se puede procesar
imágenes en el Worker», preguntar si hace falta el mapa de bits o si el formato
vectorial resuelve el caso.

---

## 8. Esperando a terceros

Detalle completo en [PENDIENTES.md](PENDIENTES.md). En corto:

- **Doctor**: confirmar 2023 como año de constitución, y el logo en SVG. El
  número de urgencias ya lo entregó (098 800 0799, distinto del general) y
  confirmó que la noticia de los «nuevos analizadores» es cierta.
- **Netlife**: habilitar DKIM. No existe; comprobado por DNS con 8 selectores.
- **Luis**: acceso al perfil de Google Business. Arregla el botón de reseña y que
  Google siga mostrando Castillo como dirección principal en vez de Ficoa.
- **Laboratorio**: los 495 tiempos de entrega, los 495 de técnica y los 16 tipos
  de muestra. **Se encargan ellos desde el panel**, uno a uno en `/catalogo` o
  por hoja de cálculo en `/catalogo-importar`. Ya no pasa por el programador.

---

## 9. Comandos

```bash
# Sitio
npm run build                 # 583 páginas
npm run check                 # astro check
npm run imagenes              # regenera las fotos (800/1400/2000 + OG)
npm run emblema               # recorta el logo para los QR del panel
npm run qr:comprobar <svg>    # comprueba que un QR se lee antes de imprimirlo
npx astro preview --port 4321

# Catálogo — el orden importa
node scripts/completar-catalogo-info.mjs          # 1 · guarda lo editado
node scripts/importar-catalogo-publico.mjs <xls>  # 2 · reimporta la cartera

# Panel
cd admin
npm run dev                   # wrangler dev, en el 8787
npm run check                 # tsc --noEmit
npm run admin:crear           # primer administrador
npm run deploy                # sube el panel a producción

# Panel desplegado, cuando algo falla
npx wrangler tail examlab-panel --format pretty   # la excepción de verdad
npx wrangler kv key list --binding=PANEL --remote # qué hay en el almacén

# Panel, para probarlo en local
npm run pruebas:github        # GitHub simulado con los datos reales
npm run pruebas:usuario       # usuario de prueba en el KV local
npm run pruebas:codigo        # su código de seis cifras
npm run pruebas:hoja          # hoja de ejemplo para la carga del catálogo
```
