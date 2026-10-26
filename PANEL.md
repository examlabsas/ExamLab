# Panel de administración · Plan por fases

Panel para que el laboratorio publique noticias, actualice los dos catálogos y
corrija los datos del sitio sin pasar por un programador.

**Costo recurrente: $0.** Todo cabe en los planes gratuitos de Cloudflare
Workers, Workers KV y GitHub. Sin tarjeta y sin suscripciones.

---

## Decisiones ya tomadas

| Decisión | Por qué |
|---|---|
| **Worker aparte, mismo repositorio** | El panel importa los tipos del sitio (`Examen`, `Sede`), así que no se desincronizan. Pero se despliega por separado: si el panel se rompe, el sitio sigue publicándose |
| **El sitio sigue siendo estático** | Es lo que lo hace rápido y gratis de servir. El panel escribe archivos; el build de siempre los publica |
| **Acceso con contraseña + código de app** | Cloudflare Access necesita tarjeta aunque sea gratis, y se descartó. Entrar con Google también se descartó |
| **Escribe en GitHub, no en una base de datos** | Cada cambio queda en el historial con quién y cuándo, y se puede revertir |

### Una propiedad que conviene conocer

Si el panel escribiera un archivo inválido, **el build falla y Cloudflare sigue
sirviendo la última versión buena**. Un error no tumba el sitio: deja las cosas
como estaban. Aun así, el panel valida antes de escribir — el build es la red,
no el control.

---

## Antes de empezar · Feriados y fechas especiales

**Esto no es una función del panel: es un fallo que el sitio arrastra hoy.**

El horario es un patrón semanal fijo. No existe la palabra «feriado» en ninguna
parte del código. Pero la página de sedes dice, textualmente:

> «En feriados atendemos únicamente urgencias coordinadas por teléfono.»

O sea: el sitio anuncia que los feriados son distintos y el indicador de
«Abierto / Cerrado» no se entera. El 24 de mayo el distintivo dirá «Abierto ·
cierra 20:00» con el laboratorio cerrado, y un paciente en ayunas desde la noche
anterior se planta en la puerta.

- Añadir excepciones por fecha al horario: cerrado, u horario distinto
- Que el indicador y los datos que lee Google las respeten
- Cargar los feriados nacionales de Ecuador del año en curso

Va primero por dos razones: puede dar una hora falsa hoy mismo, y deja creada la
estructura que el panel editará en la fase 3. Es cosa de un día y no toca nada
del panel.

---

## Fase 0 · Preparativos

Nada de código. Lo haces tú una vez.

- [ ] Crear el proyecto `examlab-panel` en Cloudflare, apuntando a este mismo
      repositorio con carpeta raíz `admin/`
- [ ] Añadir el subdominio `admin.examlabsas.com`
- [ ] Crear un token de GitHub **de permisos mínimos**: solo contenido, solo
      este repositorio. Guardarlo como secreto del Worker
- [ ] Crear el espacio de KV para usuarios y sesiones

> El token lo generas tú en tu cuenta y lo pegas directo en Cloudflare. No
> circula por ningún otro sitio.

---

## Fase 1 · La puerta ✅ hecha

El panel todavía no hace nada útil: solo deja entrar. Va primero porque todo lo
demás se apoya aquí y porque es la parte donde un error sale caro.

- Formulario de acceso: correo y contraseña
- Contraseñas derivadas con PBKDF2, sal por usuario, nunca en claro
- Código de 6 dígitos de app de autenticación como segundo paso
- Sesión en cookie `HttpOnly` y `Secure`, caducada a las 8 horas, revocable
- Contador de intentos fallidos con bloqueo temporal, por correo y por IP
- Regla de Cloudflare delante del subdominio para frenar bots
- `noindex` y `robots.txt` cerrado: el panel no se indexa

**Gestión de usuarios**, dentro de esta misma fase:

- Alta por invitación: el administrador escribe un correo, el panel genera un
  enlace de un solo uso de 24 horas, y la persona **elige su propia contraseña**
  y escanea su QR. Nadie dicta contraseñas a nadie
- Dos niveles: **administrador** (todo, incluidos usuarios) y **editor**
  (noticias y datos del sitio, **no** el catálogo de asociados ni sus precios)
- Baja por desactivación, no por borrado: la sesión muere en el acto y el
  nombre sigue teniendo sentido en el historial

**Al terminar:** dos administradores dados de alta — el doctor y tú. Con uno
solo, un olvido de contraseña deja el panel cerrado.

---

## Fase 2 · Noticias y avisos ✅ hecha

La primera función de verdad. Va antes que los catálogos porque es la de menos
riesgo —hoy son tres artículos, sin dato clínico— y porque ejercita de punta a
punta la cadena completa: escribir, confirmar, publicar y ver el resultado.

**Noticias**

> La subida de fotos quedó fuera: el esquema de Astro solo acepta los nueve
> nombres de `src/lib/fotos.ts`, y añadir uno exige tocar ese archivo y pasar la
> imagen por `sharp`, que no corre en un Worker. El panel ofrece esas nueve.
> Se resuelve cuando `fotos.ts` pase a JSON, en la misma línea que la fase 3.

- Listado con borradores y publicadas
- Formulario: título, descripción, categoría, fecha, foto y cuerpo en Markdown
- Subida de imagen con redimensionado **en el navegador** antes de enviarla
  (`sharp` no corre en un Worker)
- Vista previa antes de publicar
- Despublicar sin borrar

**Aviso temporal en el sitio**

Una franja que el laboratorio enciende y apaga: *«El 24 de mayo atendemos solo
en la matriz»*, *«Esta semana Pelileo cierra a las 13:00»*. Hoy, para avisar de
algo así, tienen que llamar a alguien. Va aquí porque es la misma mecánica que
una noticia, pero más corta.

**Estado del último cambio**

«Publicado hace 3 minutos» o «el último intento falló». Parece menor y no lo es:
publicar tarda uno o dos minutos, y sin esto el doctor guardará, no verá el
cambio y volverá a guardar tres veces.

Cada publicación es un commit con la persona en el mensaje:

```
Publica la noticia «Nuevos horarios en Pelileo»
Desde el panel · maria@examlabsas.com
```

**Al terminar esta fase el panel ya sirve.** El laboratorio puede publicar sin
pedírselo a nadie, aunque el resto no esté hecho.

---

## Fase 3 · Datos del sitio ✅ hecha

Sedes, horarios, teléfonos, correos y redes.

Riesgo más alto de lo que parece: un horario mal puesto cambia el «Abierto /
Cerrado» de todo el sitio y los datos que lee Google.

- **Hecho:** la parte editable de `src/lib/site.ts` vive ahora en
  `src/data/sitio.json` y `src/data/sedes.json`. El refactor se verificó
  comparando las 583 páginas compiladas antes y después: **idénticas byte a
  byte**. De paso desaparecieron los seis campos `…E164`, que se derivan del
  número que se muestra y podían discrepar de él
- Formularios por sede con los dos tramos de horario
- **Fechas especiales**: marcar un feriado o un horario distinto para un día
  concreto, sobre la estructura creada antes de la fase 0
- Validación estricta: horas reales, tramos que no se solapen, teléfonos con
  formato
- Vista previa del «Abierto / Cerrado» resultante antes de guardar

---

## Fase 4 · Catálogo público ✅ hecha

559 exámenes. El laboratorio trabaja en Excel y seguirá trabajando en Excel: el
panel no pide teclear 559 filas, pide el archivo.

**Lo que quedó**

- `/catalogo` · buscador, filtros y el recuento de lo que falta. Cada número del
  recuento **es** el filtro: pulsarlo deja en la lista exactamente esos exámenes.
- `/catalogo/<examen>` · corregir uno. Debajo de cada campo se ve qué va a leer
  el paciente, porque el sitio **interpreta** lo que se escribe: del texto de
  preparación deduce las horas de ayuno, y de los campos sin confirmar saca
  frases como «Se lo confirmamos al agendar». También se enseña la descripción
  que verá Google, que era el único sitio donde un error no se notaba.
- `/catalogo-importar` · tres pasos: leer el archivo, decir qué es cada columna,
  y ver qué cambiaría antes de publicar.

**Decisiones que conviene conocer**

- **Se lee CSV y pegado, no .xls.** El archivo del laboratorio es un .xls binario
  de Excel 97; leerlo aquí pediría meter un analizador de formato binario dentro
  de la puerta de administración, y el lector que usan los scripts tiene
  vulnerabilidades sin parche. Excel guarda como CSV en un clic, y copiar y pegar
  no necesita ni eso. Se reconocen el punto y coma, la coma y el tabulador, los
  campos entrecomillados, y las dos codificaciones que ofrece Excel.
- **Los nombres se comparan sin acentos, mayúsculas ni puntuación.** Así,
  corregir una tilde en el Excel se entiende como lo que es —el mismo examen,
  escrito mejor— y no como un examen que se va y otro que llega. La ficha
  conserva su dirección y su texto.
- **Una celda vacía no borra nada.** Solo se cambia lo que la hoja trae escrito.
- **Lo que se da de baja desaparece del sitio pero no del repositorio.** El texto
  redactado se queda en `catalogo-info.json`; si la prueba vuelve, vuelve escrita.
- **`examenes.json` es derivado y `catalogo-info.json` es la copia buena.** El
  panel escribe en los dos, en un solo commit. Sin el segundo, la próxima
  importación del Excel borraría el trabajo de rellenar los 495 plazos.
- **Dar de baja exige marcar una casilla aparte**, y si se va más del 10 % del
  catálogo se dice el porcentaje. Es lo único de aquí que no se nota hasta que un
  paciente no encuentra su examen.
- **Si el repositorio cambia entre la previsualización y el botón de publicar**,
  no se escribe: se vuelve a enseñar la comparación con lo que hay ahora.

**El límite que casi se lleva la fase por delante**

El plan gratuito de Workers corta a los **10 ms de CPU por petición**. Medido, la
pantalla del catálogo gastaba unos 45 ms, y casi todo en un sitio inesperado:
**descodificar base64**. La API de contenidos de GitHub devuelve el archivo
codificado, y descodificar los 288 KB del catálogo cuesta 29 ms. Arreglado
pidiendo el tipo `raw` al leer (0,01 ms) y mandando los blobs con
`encoding: utf-8` al escribir. La pantalla pasó de 54 ms a 8 ms de respuesta —
menos que la de noticias, que sigue por el camino antiguo porque sus archivos son
de kilobytes.

## Fase 5 · Catálogo de asociados ✅ hecha

Las 277 pruebas que ExamLab ofrece a otros laboratorios, con su método, su
muestra, su plazo — y su precio.

**Lo que quedó**

- `/asociados` · buscador, filtro por especialidad y el recuento de lo que falta,
  con el precio en la propia tabla.
- `/asociados/<prueba>` · corregir una: precio, nombre, especialidad, método,
  muestra, plazo y qué incluye.
- `npm run tarifario:cargar` y `npm run tarifario:guardar`, el puente entre el
  archivo privado y Cloudflare.

**Dónde viven los precios, que era la decisión pendiente**

El plan decía «los precios van al archivo privado que queda fuera de git». No se
puede: **el panel solo habla con GitHub, y ese archivo no está en GitHub.**

Así que los precios viven en el **KV de Cloudflare**. No los expone más —los
protege la misma cuenta que ya protege el panel entero— y los deja fuera del
repositorio, que es lo que importa: el despliegue va por repositorio, y lo que
entra ahí queda en el historial de git aunque luego se borre.

El reparto queda así:

| | dónde | quién lo escribe |
|---|---|---|
| Cartera: nombre, método, muestra, plazo | `catalogo-asociados.json`, versionado | el panel y el importador |
| Precios | KV de Cloudflare | el panel |
| Copia local con precios | `catalogo-asociados.privado.json`, fuera de git | `tarifario:guardar` |

Los dos comandos cierran el círculo: `cargar` sube el tarifario la primera vez, y
`guardar` lo baja antes de reimportar el Excel, para que el trabajo hecho desde
el panel no se pierda. Si alguna prueba cambió de nombre y el checkout está
atrasado, `guardar` avisa de cuántos precios quedaron sin pareja en vez de
tirarlos.

**Detalles que conviene conocer**

- **La sección entera exige administrador**, no solo el campo del precio.
  Separar «ver la cartera sí, ver el importe no» obligaría a dos vistas de la
  misma tabla y a confiar en que nadie se deja un campo suelto.
- **El enlace no está en la navegación**, está en la portada bajo la
  comprobación de rol, igual que `/usuarios`. Un enlace que a la mitad de la
  gente le responde «no tiene permiso» hace que el panel parezca roto.
- **Al guardar se fuerza `precio: null` en todo lo que va al repositorio**, pase
  lo que pase. Es la última barrera antes de que un importe acabe en el
  historial de git.
- **Primero el repositorio, después el KV.** Lo que puede fallar —conflictos,
  token, red— va primero; al revés, un fallo de GitHub dejaría un precio
  guardado para una prueba que no llegó a cambiar.
- **La dirección de cada prueba se calcula del contenido**, no se guarda: el
  importador reescribe el archivo entero y un campo guardado ahí no sobreviviría.
  Y no hace falta — son direcciones internas del panel, no del sitio.
- **Un precio sigue a su prueba si se la renombra**: la clave vieja se borra y la
  nueva se escribe en el mismo guardado.

**Lo que esta fase NO resuelve**

Cerrar `/laboratorios-asociados/catalogo` para que solo lo vean los laboratorios
con convenio. Hacen falta sus correos, que el laboratorio no ha entregado, y
Cloudflare Access quedó descartado. Sigue en [PENDIENTES.md](PENDIENTES.md).

También queda fuera la carga por hoja de cálculo para esta cartera: la del
catálogo público lee CSV, y el Excel de asociados tiene una estructura con
secciones y filas de continuación que ese lector no entiende. Se sigue
importando con `scripts/importar-catalogo-asociados.mjs`.

---

## Fase 6 · Historial y códigos QR ✅ hecha

**Historial.** `/estado` pasó de ocho commits en una tabla plana a treinta
agrupados por día, con el recuento por sección arriba haciendo de filtro — el
mismo patrón que el catálogo.

La sección de cada cambio **se deduce del mensaje del commit**, no se le pregunta
a GitHub. Preguntarlo costaría una petición por commit, treinta en total, y el
plan gratuito corta a los 10 ms de CPU. El mensaje sirve porque lo escribe el
propio panel con una fórmula fija: «Corrige el examen «X»», «Actualiza la sede
«Y»». Lo que no reconoce cae en «otros cambios», que es lo correcto — ahí van los
commits que no vinieron del panel.

**Códigos QR.** Se dieron por imposibles y resultó que no: lo imposible era
repetir el método del script, no hacer el código.

El script `generar-qr.mjs` monta un PNG con `sharp` y lo verifica con `jsQR`, y
ninguna de las dos corre en un Worker. Pero generando **SVG** el problema
desaparece: pegar el emblema sobre el código deja de ser procesar imágenes y pasa
a ser escribir texto —un círculo blanco y una imagen recortada con `clipPath`—.
Y de paso sale mejor para lo que se usa: un SVG es vectorial, así que la imprenta
lo amplía a cualquier tamaño sin que se pixele.

Las dos piezas que lo hacen posible:

- **El emblema se recorta una sola vez.** `npm run emblema` lo saca de
  `logo.png` —1,7 MB, imposible de incrustar— y deja 31 KB de texto en
  `admin/src/emblema.ts`. Necesita `sharp`, pero solo hace falta cuando cambie el
  logotipo, o sea nunca.
- **Del paquete `qrcode` se entra por el archivo interno** que solo calcula la
  matriz. La puerta principal arrastra `pngjs` y `yargs`, que en un Worker no
  sirven de nada.

**Cómo se verifica, que era la objeción de verdad.** En el Worker no se puede
decodificar el código. Se cubre por tres lados:

1. El emblema ocupa la misma proporción que ya está probada en imprenta: tapa el
   7,4 % del área, y el nivel de corrección alto tolera hasta un 30 %.
2. La pantalla enseña el código en grande y pide escanearlo con el móvil antes de
   descargarlo. Es menos automático que `jsQR` y más fiel: lo que tiene que leerlo
   es un teléfono.
3. `npm run qr:comprobar <archivo.svg> [dirección]` es la red mecánica antes de
   imprenta: rasteriza a 2048, 600, 300 y 160 px y comprueba que los cuatro se
   leen y dicen lo mismo. El de 160 px no es un tamaño real: está para cazar un
   código que solo funciona en condiciones ideales.

Comprobado con el que genera el panel: se lee en los cuatro tamaños, con la
portada, con una ficha de examen de dirección larga y con el enlace de WhatsApp.

---

## El rediseño · hecho

El panel nació como páginas sueltas con la navegación arriba. El cliente lo
describió como «esquelético» y pidió un menú lateral; se rehízo entero como
**armazón de aplicación**.

El sistema visual completo está en [admin/DESIGN.md](admin/DESIGN.md). Lo que
conviene saber aquí es por qué:

- **Raíl en escritorio, barra de iconos abajo en el móvil.** Elegido entre tres
  opciones. Caben cuatro secciones en la barra y hay once, así que Inicio es el
  índice. Un cajón plegable costaba un toque más en cada navegación, y esto se
  usa de pie entre pacientes.
- **Tipografía del sistema.** Las de la marca habría que servirlas desde el
  Worker —la cabecera de seguridad no deja traerlas de fuera— y son unos 60 KB
  en cada respuesta.
- **Hoja rehecha desde cero**, no adaptada: la anterior venía de otra IA y estaba
  pensada para páginas sueltas.
- **Las secciones de administrador no van en la navegación**, sino en la portada
  bajo la comprobación de rol. Un enlace que responde «no tiene permiso» hace que
  el panel parezca roto.
- **Sin emblema en el raíl.** El logotipo en SVG sigue pendiente y el PNG pesa
  1,7 MB. Un monograma de dos letras repetía la palabra de al lado y no llegaba
  al contraste mínimo.

La revisión de cierre encontró, además de ocho puntos de oficio, **una fuga real**:
el código QR del segundo factor se le pedía a un servicio externo pasándole la
dirección `otpauth://` en la URL — con el secreto TOTP dentro. Ahora se genera en
el Worker y la cabecera de seguridad quedó sin excepciones.

---

## Lo que pidió el laboratorio después · hecho

Todo comprobado contra el panel arrancado, no solo con `tsc`.

**Los precios salieron del sistema.** Vivían en el KV de Cloudflare, con dos
comandos que los movían y una barrera que forzaba `precio: null` al escribir.
Ya no existe nada de eso: ni el campo, ni el filtro «sin precio», ni el campo
del formulario, ni la columna de la tabla pública, ni el interruptor
`MOSTRAR_PRECIOS`, ni los 277 `"precio": null` del archivo versionado. **Lo que
no existe no se publica por descuido.** La página pública quedó idéntica: una
etiqueta invisible menos, 198 bytes.

**El código de verificación se quitó.** Entrar es correo y contraseña. Queda
protegiendo la puerta la contraseña con PBKDF2 y 310 000 iteraciones, el límite
de cinco intentos por correo y por IP, y que la sesión sea un testigo revocable
en el KV. El secreto TOTP de cada usuario se sigue guardando, así que volver a
pedirlo es restaurar una comprobación y un campo. Se ofreció alargar la sesión a
30 días para compensar la molestia y el Dr. Silva dijo que no: complica las
cosas. **Se queda en 8 horas.**

**La cartera de asociados ya tiene alta e importación**, igual que el catálogo
público: `/asociados/nueva` y `/asociados-importar`, con los tres pasos y la
casilla que obliga a confirmar las bajas.

> Al probarlo apareció un fallo que no se ve leyendo: hay **dos pruebas
> llamadas «NICKERSON»** en especialidades distintas. El importador emparejaba
> por nombre —como el del catálogo público, donde los nombres sí son únicos— y
> descartaba la segunda como repetida, anunciando una baja que no existía. La
> identidad aquí es **especialidad + nombre**, y ya estaba escrito en `claveDe`.
> Copiar la forma del hermano sin mirar su clave es como se heredan los errores.

**Los códigos QR llevan emblema elegible**: ExamLab, WhatsApp o ninguno, y se
propone solo el que corresponde al destino. El logotipo de WhatsApp no se dibujó
de memoria — estaba ya en el repositorio, dentro de un QR que el laboratorio
generó antes. Los tres se leen a 2048, 600, 300 y 160 px.

**Botones y organización.** Las acciones principales subieron del pie al
encabezado, cada fila dice «Editar», y los botones miden 44 px. De paso se
arregló que **en el móvil no se podía desactivar a un usuario**: la tabla medía
511 px dentro de 375 y el botón quedaba fuera de pantalla, sin forma de llegar.

---

## Lo que el panel **no** va a hacer

Conviene decirlo ahora para que nadie lo espere:

- No edita el diseño ni los textos fijos de las páginas — es la vía rápida a que
  el sitio se descuadre
- No gestiona resultados de pacientes — eso es Saluto
- No manda correos ni mensajes
- No da estadísticas de visitas — eso ya lo da Cloudflare y mantenerlo aquí
  sería duplicar
- No lleva biblioteca de imágenes — con nueve fotos no hace falta
- **No sube fotos ni trae publicaciones de Instagram.** Las dos necesitan
  procesar imágenes con `sharp`, que no corre en un Worker, y bajar la calidad
  para que quepan sería mal cambio en un sitio donde el peso de cada imagen se
  peleó una por una. Siguen siendo comandos: `npm run imagenes` y
  `npm run instagram`.

  Los códigos QR estaban en esta lista por lo mismo y salieron de ella: en SVG no
  hay imagen que procesar. Cuando algo choque con esta pared, conviene preguntarse
  si hace falta el mapa de bits o si el formato vectorial resuelve el caso.

---

## Riesgos y cómo se cubren

| Riesgo | Cobertura |
|---|---|
| Se filtra el token de GitHub | Token de permiso mínimo y un solo repositorio. Se rota y listo |
| El panel escribe algo inválido | Se valida contra el mismo esquema del sitio antes de escribir. Y si pasara, el build falla y queda publicada la última versión buena |
| Alguien publica algo por error | Todo está en git: se revierte |
| Se olvida la contraseña | Dos administradores desde el primer día |
| Un Excel mal pegado | La comparación obligatoria antes de publicar |

---

## Orden y por qué

Primero el arreglo de los feriados, que no depende del panel y hoy puede dar una
hora falsa. Después la puerta. Luego lo que no tiene dato clínico. Al final los
catálogos y los precios.

Las fases 1 y 2 juntas dejan un panel **que ya se usa**. A partir de ahí, cada
fase añade sin romper lo anterior, y se puede parar en cualquier punto sin dejar
nada a medias.

Lo que decide el orden no es la dificultad, es el riesgo.
