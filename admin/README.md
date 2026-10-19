# Panel de administración · Puesta en marcha

Worker aparte del sitio. Comparten repositorio para que el panel pueda importar
los tipos de `src/lib` y no se desincronicen, pero se despliegan por separado:
**si el panel se rompe, el sitio sigue publicándose.**

Estado: **fases 1, 2 y 3 terminadas**. El panel deja entrar, gestiona usuarios,
publica noticias y el aviso, y edita contacto, sedes, horarios y feriados.

---

## Lo que hay que rellenar

Dos huecos. Todo lo demás está hecho.

| Dónde | Qué |
|---|---|
| `wrangler.jsonc` → `kv_namespaces[0].id` | El identificador del espacio de KV |
| Secreto `GITHUB_TOKEN` | Token de permisos mínimos: **solo contenido, solo este repositorio** |

---

## Pasos

### 1. Crear el espacio de KV

```bash
cd admin
npx wrangler kv namespace create PANEL
```

Devuelve un `id`. Pégalo en `wrangler.jsonc`, donde dice
`PEGAR_AQUI_EL_ID_DEL_ESPACIO_KV`.

### 2. Cargar el token de GitHub

```bash
npx wrangler secret put GITHUB_TOKEN
```

Pide el valor por teclado y no queda en el historial del terminal. El token se
crea en GitHub → *Settings* → *Developer settings* → *Fine-grained tokens*, con
**solo este repositorio** y **solo el permiso Contents, lectura y escritura**.
Nada más: con eso le alcanza para los nueve endpoints que usa.

> Antes aquí se pedía también un secreto `FIRMA_SESION`. **No existe**: ningún
> archivo del código lo lee. La sesión no es un token firmado sino un testigo
> opaco guardado en KV, y lo que protege la cookie es `HttpOnly`,
> `SameSite=Strict`, `Secure` y que el testigo se pueda borrar del almacén. Si
> ya lo cargó en una instalación anterior, puede quitarlo con
> `npx wrangler secret delete FIRMA_SESION`.

### 3. Desplegar

```bash
npx wrangler deploy
```

### 4. Crear el primer administrador

**No hay ninguna ruta web de alta inicial, a propósito**: dejaría una ventana
entre el despliegue y el primer uso en la que quien la encontrara antes se
quedaría con el panel. Se hace desde aquí, que solo puede ejecutar quien ya
tiene acceso a la cuenta de Cloudflare.

```bash
npm run admin:crear
```

Pide nombre, correo y contraseña, y luego imprime:

- el comando `wrangler kv key put` que guarda el usuario,
- la clave para la aplicación de autenticación.

Escanéala en Google Authenticator, Authy o la que uses **antes de cerrar esa
pantalla**: el secreto no se vuelve a mostrar.

### 5. Conectar el subdominio

En Cloudflare, añadir `admin.examlabsas.com` apuntando a este Worker.

### 6. Dar de alta al doctor

Entrar al panel → **Usuarios** → invitar. Sale un enlace que caduca en 24 horas
y sirve una sola vez. Él elige su contraseña: nadie más la ve.

> Que haya **siempre dos administradores**. Con uno solo, un olvido de
> contraseña deja el panel cerrado y hay que rehacer el paso 4.

---

## Probarlo antes, en local

Se puede ver el panel entero funcionando sin cuenta de Cloudflare, sin token de
GitHub y sin tocar el repositorio: habla con un GitHub simulado que guarda todo
en memoria y carga los datos reales del sitio, los 559 exámenes incluidos.

**Una vez:**

```bash
cd admin
npm install
cp .dev.vars.ejemplo .dev.vars
npm run pruebas:usuario
```

**Cada vez, en dos terminales:**

```bash
npm run pruebas:github     # el GitHub simulado, en el 8799
```

```bash
npm run dev                # el panel, en http://127.0.0.1:8787
```

Para entrar: `prueba@examlabsas.com`, contraseña `laboratorio-2026`, y el código
de seis cifras que imprime `npm run pruebas:codigo` — o el que dé su aplicación
de autenticación, si escanea la clave que enseñó `pruebas:usuario`.

Para probar la carga del catálogo, `npm run pruebas:hoja` escribe una hoja con
los 559 exámenes y veinte plazos de entrega puestos. Se genera del catálogo de
ahora en vez de guardarse fija, que se quedaría vieja y enseñaría bajas que no
son. Al subirla debe decir **0 entran, 0 salen, 20 datos cambian**.

Nada de lo que se haga ahí sale de la máquina: el simulado se olvida de todo al
cerrarlo, y el usuario de prueba vive solo en el KV local de `wrangler dev`.

Dos cosas que ahorran tiempo: los procesos de `wrangler dev` no mueren
limpiamente en Windows —`taskkill` sobre `workerd.exe` dice SUCCESS y el puerto
sigue ocupado, porque el `node` de wrangler lo vuelve a levantar—, así que hay
que matar al padre o, mientras se prueba, usar un puerto nuevo; y después de
tocar la hoja de estilos conviene **arrancar el panel y pedir una página**,
porque `npm run check` no ve que el Worker no arranque.

---

## Cómo está montado

```
admin/
├── src/
│   ├── index.ts              rutas
│   ├── github.ts             leer y escribir el repositorio
│   ├── noticias.ts           Markdown con cabecera YAML
│   ├── sitio.ts              contacto, sedes, horarios, feriados
│   ├── catalogo.ts           los 559 exámenes
│   ├── importar.ts           leer una hoja de cálculo y compararla
│   ├── asociados.ts          las 277 pruebas de asociados y su tarifario
│   ├── historial.ts          de qué sección es cada cambio
│   ├── qr.ts                 códigos QR en SVG
│   ├── emblema.ts            el logotipo recortado (lo genera un script)
│   ├── usuarios.ts           alta, invitaciones, roles
│   ├── auth/
│   │   ├── password.ts       PBKDF2 y reglas de la contraseña
│   │   ├── totp.ts           códigos de la aplicación
│   │   └── sesion.ts         cookies, sesiones y límite de intentos
│   └── paginas/
│       └── plantilla.ts      el armazón, los iconos y toda la hoja de estilos
├── scripts/crear-admin.mjs   primer administrador
└── pruebas/                  solo para local: GitHub simulado, usuario de
                              prueba, generador de códigos y hoja de ejemplo
```

### Decisiones que conviene conocer

**Las contraseñas no se guardan.** Se guarda la sal y el resultado de derivarlas
con PBKDF2-SHA256 y 310 000 iteraciones. Si alguien se llevara el almacén, no
saca las contraseñas de ahí. La comparación es en tiempo constante: una normal
se detiene en el primer byte distinto y ese tiempo de más es medible.

**La sesión es un testigo opaco en KV**, no un token que se valide solo. Así,
cerrar la sesión de alguien es borrar una clave y queda fuera en el acto.

**El mensaje de error es siempre el mismo.** Si dijera «ese correo no existe»,
estaría regalando la lista de quién tiene acceso.

**El límite de intentos cuenta por correo y por IP a la vez.** Solo por correo,
alguien bloquea a una persona a propósito; solo por IP, un ataque repartido no
se frena.

**El código de la aplicación admite el paso anterior y el siguiente.** El reloj
del teléfono casi nunca va exacto, y sin ese margen la gente teclea un código
correcto y el panel lo rechaza.

**Un cambio es un commit.** Cuando hay que tocar dos archivos a la vez —el
catálogo se guarda en dos— se usa la API de git en vez de la de contenidos: se
arma un solo commit con los dos. Así no existe el momento en que uno está
cambiado y el otro no, el historial dice «un cambio» en una línea, y el sitio se
compila una vez en lugar de dos.

**El catálogo no pasa por base64.** La API de contenidos devuelve los archivos
codificados, y descodificar sus 288 KB cuesta 29 ms de CPU: el plan gratuito de
Workers corta a los 10 ms. Se lee pidiendo el tipo `raw` y se escribe con
`encoding: utf-8`. Con eso la pantalla del catálogo responde en 8 ms en vez de
54. Las noticias y los datos del sitio siguen por la API de contenidos, que es
más cómoda y necesita el `sha` por archivo, porque sus archivos son de
kilobytes.

**Los archivos que edita tienen que estar en el repositorio.** Son
`src/data/examenes.json`, `catalogo-info.json`, `sitio.json`, `sedes.json`,
`feriados.json`, `aviso.json` y la carpeta `src/content/noticias`. Parece obvio y
no lo es: `catalogo-info.json` estuvo ignorado por `.gitignore` mientras era solo
salida intermedia del importador, y así la fase 4 habría fallado nada más
desplegarla. Se comprueba con `git check-ignore -v <archivo>`.

**El emparejamiento hoja ↔ catálogo se calcula una vez.** `comparar` lo deja en
la comparación y `aplicar` lo reutiliza. Cuando cada uno lo deducía por su
cuenta podían no coincidir, y entonces la pantalla prometía una cosa y el
guardado hacía otra. Además se empareja por colas: dos exámenes publicados
pueden compararse igual —«UREA/BUN» y «UREA BUN» dan la misma clave— y lo que no
se empareja con nada es, por definición, una baja.

**Lo que no es texto se rechaza por su contenido, no por su extensión.** El
archivo que el laboratorio tiene a mano es justo el que no sirve, `pruebas.xls`,
y antes se descodificaba como texto de Windows y seguía adelante con filas de
basura. Ahora se reconocen las firmas del .xls, del .xlsx y del PDF, y el mensaje
dice qué archivo es y qué hacer con él.

**Hay una red para los fallos que nadie capturó.** Las rutas que escriben tratan
el error donde pasa, porque ahí pueden devolver el formulario con lo que la
persona había escrito. Las que solo leen no tenían nada, y un token caducado
dejaba un «Internal Server Error» en blanco en la pantalla principal. Un
`app.onError` cubre todas y explica qué pasó.

**El panel no carga nada de fuera, ni una imagen.** El código QR del segundo
factor se le pedía a un servicio externo pasándole la dirección `otpauth://` en
la URL — y esa dirección lleva el secreto del segundo factor, así que la clave
que protege el panel viajaba entera a un tercero. Ahora se dibuja en el Worker y
la cabecera de seguridad quedó sin excepciones: `default-src 'self'`.

**El diseño vive en un solo sitio**, la constante `ESTILOS` de
`src/paginas/plantilla.ts`, y está descrito en [DESIGN.md](DESIGN.md). Las
pantallas solo escriben su contenido: el armazón —raíl en escritorio, barra de
iconos en móvil— lo pone `pagina()`.

**Los códigos QR salen en SVG y no en PNG.** No es una preferencia: en SVG no
hay imagen que procesar, así que el emblema se monta escribiendo texto y el
Worker puede hacerlo sin `sharp`. De paso es mejor para lo que se usa, porque la
imprenta lo amplía sin que se pixele. El emblema se recorta una sola vez con
`npm run emblema`. Dentro del Worker no se puede decodificar el código para
verificarlo: la pantalla pide escanearlo con el móvil, y `npm run qr:comprobar`
es la red mecánica antes de imprenta.

**La sección de cada cambio del historial se deduce del mensaje del commit**,
porque lo escribe el propio panel con una fórmula fija. Preguntarle a GitHub qué
archivos tocó cada commit serían treinta peticiones para una pantalla.

**El tarifario de asociados no pasa por el repositorio.** El despliegue va por
repositorio, así que lo que se versiona queda al alcance de quien tenga acceso a
él — y en el historial de git aunque luego se borre. Los precios viven en el KV
de Cloudflare; al guardar la cartera se fuerza `precio: null` en todo lo que se
escribe, como última barrera. `npm run tarifario:cargar` y `tarifario:guardar`
mueven el tarifario entre el KV y el archivo privado que queda fuera de git, para
que reimportar el Excel no pierda lo corregido desde el panel. Los dos trabajan
contra el KV local salvo que se les pase `--remoto`.

**Nadie publica la hoja de otra persona.** Entre un paso y otro de la carga, la
hoja espera media hora en el KV con el correo de quien la subió. Sin eso, un
identificador adivinado sería una forma de borrar el catálogo entero.

---

## Lo que ya está probado

Verificado en local, no solo escrito:

| | |
|---|---|
| Entrar con los tres datos correctos | abre sesión |
| Contraseña mal, código mal, sin código, correo inexistente | 401, y el mismo mensaje en todos |
| Seis intentos seguidos | 429, y sigue bloqueado aunque los datos sean correctos |
| `/usuarios` sin sesión | redirige al acceso |
| `/usuarios` siendo editor | 403 |
| Invitar, crear contraseña y entrar | funciona de punta a punta |
| Reusar el enlace de invitación | 410 |
| Desactivar a alguien | su sesión muere en el acto |
| Desactivarse a uno mismo | no deja |
| Listar, abrir y editar noticias | funciona |
| Crear una noticia | escribe el Markdown que el esquema de Astro espera |
| **El sitio compila con lo que el panel escribió** | 584 páginas, 0 errores |
| Título vacío, sin descripción, fecha mal, foto inexistente, cuerpo vacío | cada uno con su mensaje |
| Dos personas editando el mismo archivo | avisa en vez de pisar el cambio |
| Guardar el aviso | se escribe y sale en el sitio |
| Aviso con fecha pasada | no se muestra |
| Estado | muestra el último cambio y quién lo hizo |
| Leer contacto, sedes y feriados | con los datos reales del sitio |
| Horario con cierre antes de abrir | «07:00 no puede ser antes que 18:00» |
| Dos tramos solapados | «los dos tramos se solapan» |
| Teléfono con letras | «el teléfono tiene caracteres raros» |
| Guardar el horario de una sede | el sitio lo muestra: sábado 08:00 – 12:00 |
| Feriado cerrado y feriado con horario especial | los dos, y ordenados por fecha |
| Fecha repetida y feriado sin motivo | cada uno con su mensaje |
| Quitar un feriado | desaparece del archivo |

### Catálogo (fase 4)

Probado contra un GitHub simulado cargado con los datos reales del sitio y con el
`pruebas.xls` del laboratorio convertido a CSV.

| | |
|---|---|
| **Importar el Excel real del laboratorio** | 0 entran, 0 salen, 0 cambian, 559 igual — y no ofrece publicar |
| Reconocer la columna del nombre **sin título** | la encuentra cruzando con el catálogo, no por la cabecera |
| Reconocer «TIEMPO DE ENTREGA» y «METODO» | por el título de la columna |
| Un CSV en la codificación de Windows | los 17 nombres con tilde se reconocen igual |
| Campos entrecomillados con punto y coma dentro | el nombre conserva el punto y coma |
| Pegar una sola columna sin títulos | la toma como nombres |
| Pegar con tabuladores | dos columnas, bien separadas |
| Columna mapeada pero vacía | no borra nada: las técnicas siguen en 495 |
| 20 plazos nuevos | se escriben en los dos archivos, en un commit |
| Un examen nuevo | entra con su dirección, y aparece en «sin texto para el paciente» |
| Cambiar la ortografía de un nombre | se reconoce como el mismo: conserva dirección y texto |
| Una hoja con 210 exámenes de menos | avisa «es el 38 % del catálogo» |
| Publicar esas bajas sin marcar la casilla | 400, y no escribe |
| Publicarlas marcándola | 350 publicados, 560 textos guardados |
| Volver a importar la lista completa | los 209 vuelven con su texto y su dirección |
| El repositorio cambia entre revisar y publicar | no escribe: vuelve a enseñar la comparación |
| Publicar la carga de otra persona | 410, y no escribe |
| Corregir un examen | un commit con los dos archivos y el nombre de quien fue |
| Guardar con la rama movida | «el repositorio cambió», y el formulario conserva lo escrito |
| Buscar por sinónimo y sin tildes | «azucar» encuentra GLUCOSA |
| Filtrar y volver del examen al filtro | se mantiene la búsqueda |
| Sin «para qué sirve», sin preparación, sin especialidad | cada uno con su mensaje |
| Plazo o técnica en blanco | quedan en «Consultar», sin error |
| Una especialidad nueva | se usa, y aparece en el desplegable y en el recuento |
| El eco del ayuno | «Ayuno de 8 a 12 horas.» → «Ayuno de 8 a 12 horas» |
| La descripción para Google | ya no dice «Entrega en consultar» |

### Lo que encontró la revisión posterior, y cómo quedó

| | |
|---|---|
| Dos exámenes publicados con la misma clave | antes: uno desaparecía y la pantalla decía «0 salen» · ahora: sale como baja, con su casilla de confirmación, y el recuento cuadra |
| Error de validación con una especialidad nueva escrita | antes: el campo volvía vacío y el desplegable elegía otra por su cuenta · ahora: vuelve escrita y marcada |
| GitHub caído, en las pantallas de lectura | antes: «Internal Server Error» en blanco · ahora: «Algo falló al hablar con el repositorio», con lo que conviene revisar |
| Subir `pruebas.xls` por error | antes: «571 filas y 7 columnas» de basura · ahora: se rechaza diciendo que es un Excel antiguo y cómo guardarlo |
| Subir un `.xlsx` de verdad | se rechaza con su propio mensaje |
| Hoja sin títulos cuyo primer examen es nuevo | antes: esa fila se descartaba como cabecera y el examen no entraba · ahora: se conserva, y cuando sí hay cabecera se enseña qué fila se descarta |
| Pegar 1,2 MB de texto | antes: se recorría cuatro veces y se comía el presupuesto de CPU · ahora: se rechaza con una explicación |
| Un examen al que le falta `utilidad` en el JSON | antes: la pantalla del catálogo no abría · ahora: abre y lo cuenta en «sin texto para el paciente» |
| `/catalogo?ok=constructor` | antes: pintaba el código de `Object` en el recuadro de confirmación · ahora: no muestra recuadro |
| Buscar «suero» en el panel | antes: no encontraba nada · ahora: 327, lo mismo que el buscador del sitio |

### Asociados (fase 5)

| | |
|---|---|
| Abrir la sección sin tarifario cargado | 277 pruebas, todas «sin precio», y explica cómo cargarlo |
| `npm run tarifario:cargar` | 276 precios al KV; la que falta es la que ya venía sin precio |
| Guardar una prueba con precio nuevo | el método va al repositorio y el precio al KV |
| **El importe en el repositorio** | `precio: null` en las 277, y el número no aparece ni en el texto del archivo |
| Precio escrito con coma | «4,25» se guarda como 4.25 |
| «gratis», «-5», «12.345» | cada uno rechazado, y el formulario conserva lo escrito |
| Renombrar una prueba | su precio la sigue: la clave vieja desaparece y no se duplica |
| `npm run tarifario:guardar` | escribe el archivo privado y avisa de los precios que quedaron sin pareja |
| Un editor en `/asociados`, en una prueba y al guardar | 403 en los tres |
| La portada de un editor | no le enseña el enlace: no hay forma de llegar y chocar |

### Historial y QR (fase 6)

| | |
|---|---|
| Cambios de seis secciones distintas | cada uno clasificado donde toca, y los que no vienen del panel en «otros» |
| Agrupado por día | «Hoy», en hora de Ecuador y no la del servidor |
| Filtrar por sección | trae solo esos y marca cuál está activa |
| QR de la portada, de una ficha larga y del WhatsApp | los tres se leen a 2048, 600, 300 y 160 px |
| Una dirección que no es del laboratorio ni de WhatsApp | el archivo sale marcado como «pruebas» |
| Vacío, sin `https://`, con `ftp://` | cada uno con su mensaje |
| `npm run qr:comprobar` con otra dirección esperada | avisa de que no coincide y sale con error |

---

## Dependencias

Solo **hono** llega al Worker, y `npm audit --omit=dev` da **0
vulnerabilidades**. Las que aparecen en el audit completo son de `wrangler`, la
herramienta de despliegue, que no se publica.
