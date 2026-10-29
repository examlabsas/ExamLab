# ExamLab · Pendientes

Lo que falta para dar el sitio por terminado. Nada de esto bloquea la
publicación: el sitio funciona hoy y, donde falta un dato, lo dice en vez de
inventarlo.

Última revisión: 29 de octubre de 2026.

---

## 0. El panel ya está en producción

Desde el 26 de octubre de 2026 el panel vive en **https://admin.examlabsas.com**.
Comprobado ese día: el acceso funciona, las rutas protegidas redirigen, las
cabeceras de seguridad están puestas, y el panel escribe de verdad en el
repositorio — commit `152d37b`, hecho desde la pantalla de Aviso.

**El 27 de octubre el panel dejó de parecer de otra casa.** Lleva la Montserrat
del sitio —servida por el propio Worker, sin pedirle nada a nadie de fuera—, el
emblema de ExamLab en el raíl, en la pestaña del navegador y en la pantalla de
acceso, y esa pantalla tiene ahora el ojo de ver la contraseña y el aviso de
bloqueo de mayúsculas. De paso se arreglaron tres tablas que se salían de la
pantalla del teléfono. Está contado en [admin/DESIGN.md](admin/DESIGN.md).

El despliegue destapó un fallo que no se veía en local: `password.ts` pedía
310 000 iteraciones de PBKDF2 y Cloudflare rechaza por encima de 100 000, así
que entrar fallaba con cualquier contraseña. `wrangler dev` no aplica ese tope.
Está arreglado y explicado en `admin/README.md`.

Falta:

- [ ] **Subir los cambios.** El arreglo de PBKDF2 está desplegado pero no en el
      repositorio: `wrangler.jsonc`, `admin/wrangler.jsonc`,
      `admin/src/auth/password.ts`, `admin/scripts/crear-admin.mjs`,
      `admin/pruebas/usuario.mjs` y `admin/src/paginas/contenido.ts`. Quien
      clone y despliegue hoy se encuentra otra vez el fallo de entrar.
- [ ] **Desplegar el panel otra vez.** Lo del 27 de octubre —tipografía,
      emblema, acceso nuevo— está en el código y probado en local, pero el panel
      que corre en `admin.examlabsas.com` sigue siendo el anterior. `npm run
      deploy` desde `admin/`.
- [ ] **Un segundo administrador.** Hay uno solo. Si pierde la contraseña hay
      que repetir `npm run admin:crear` y el `kv key put`, que requiere acceso a
      Cloudflare. Se invita desde Usuarios.
- [ ] **El token de GitHub.** Uno quedó expuesto en el historial de la terminal
      durante la puesta en marcha. Confirmar que se borró y se regeneró.

**El 28 de octubre el panel aprendió tres cosas más:** cambiar la propia
contraseña y restablecer la de otro sin borrarlo, editar los feriados por rango
de días con horario en vez de solo «cerrado», y **subir fotos nuevas**. Las
variantes de cada foto las genera el navegador de quien la sube, porque `sharp`
no corre en un Worker; la lista dejó de estar escrita a mano en TypeScript y
vive en `src/data/fotos.json`.

**El 29 se repasó todo eso antes de subirlo.** El botón de elegir archivo salía
en inglés —lo pinta el navegador, no la página— y ahora es una etiqueta propia;
la pareja de horas de la tarde de un feriado se plegó detrás de «se cierra al
mediodía»; y apareció un fallo que no se veía en local: la subida de fotos
descodificaba el base64 entero, **21,6 ms de CPU en el peor caso que el
formulario admite, con el tope en 10**. Ahora mira doce bytes de cada archivo y
calcula el resto. `wrangler dev` no mide la CPU: esto habría salido en
producción, como el PBKDF2.

Las direcciones `.workers.dev` del panel y del sitio están cerradas con
`workers_dev` y `preview_urls` en `false`. La del panel ya responde 404; la del
sitio se cierra en el próximo despliegue del repositorio.

---

## 1. Limpieza del repositorio

El `.gitignore` no saca lo que ya estaba versionado. Catorce archivos siguen
dentro: el ZIP de un build antiguo (5,6 MB), la carpeta `design/` con PNG
originales y JS de terceros de Framer (5,2 MB), y la configuración local de
Claude Code.

```bash
git rm -r --cached examlab-sitio.zip design .claude/settings.local.json
```

- [ ] Ejecutarlo y subir

El panel ya se subió en el commit `b4bb74b`. Lo que falta son los cambios
posteriores: precios fuera, código de verificación fuera, altas e importación en
la cartera de asociados, emblemas de los códigos QR y los retoques del Dr.
Silva.

---

## 2. Datos que faltan del Dr. Silva

Quedan dos. Los demás los resolvió él mismo.

| Dato | Estado | Dónde afecta |
|---|---|---|
| Año de constitución como S.A.S. | Dijo «me parece que desde el 2023» | `foundingDate` usa 2001, que es cuando abrió como Pasteur. El 2023 conviene contrastarlo antes de ponerlo en un texto visible |
| Logo en SVG con fondo transparente | Sin pedir a marca | Hoy es un PNG recortado en círculo (`TODO` en `src/components/Logo.astro`). Con el SVG, el raíl del panel tendría emblema y se podría ofrecer en los códigos QR |

**Resueltos:** el **número de urgencias** (098 800 0799, distinto del general;
hasta entonces el sitio publicaba el general bajo esa etiqueta en las 583
páginas), la **veracidad de la noticia destacada** —confirmó que es cierta— y
la **foto de la fachada en más resolución**, que descartó.

---

## 2 bis. Feriados · cerrado, y ahora se editan

Están cargados los feriados nacionales de fecha fija de lo que queda de 2026 y
de 2027, todos como día cerrado (`src/data/feriados.json`).

**Carnaval y Viernes Santo quedaron descartados** por el laboratorio. Son los
dos de fecha móvil, así que esos días el indicador dirá «Abierto». Si cambian de
idea, se añaden desde el panel en `/feriados`, sin tocar código.

Desde el 28 de octubre esa pantalla también **edita** una fecha ya puesta, pone
la misma regla en un **rango de días** y admite **dos tramos** —mañana y tarde—
para los días de jornada partida. El interruptor de «cerrado todo el día» apaga
las horas a la vista, que antes seguían encendidas sin servir para nada.

---

## 3. Gestiones con terceros

### Netlife — habilitar DKIM

Comprobado por consulta DNS pública: **no existe ningún registro DKIM**
(probados 8 selectores) ni `_dmarc`. Sí existe SPF. Sin DKIM, los correos del
laboratorio tienen bastante más probabilidad de caer en spam.

La zona DNS vive en una cuenta de Cloudflare **de Netlife**, así que no se puede
hacer desde aquí.

- [ ] Pedir que habiliten DKIM y entreguen el registro TXT
- [ ] Preguntar el límite de buzones del plan y el costo de cuentas adicionales

### Luis — acceso al perfil de Google Business

Resuelve dos cosas a la vez:

1. El botón «Dejar mi reseña en Google» lleva hoy a una búsqueda de Maps, no al
   formulario. Con acceso se obtiene el enlace corto `g.page/r/…/review`.
2. Google sigue mostrando **Castillo y Rocafuerte** como dirección principal,
   cuando la matriz es Ficoa. Eso no se corrige desde la página.

- [ ] Pedir acceso como administrador o gerente
- [ ] Copiar el enlace de reseña a `src/lib/site.ts`
- [ ] Revisar que las cuatro sedes estén dadas de alta con sus horarios

### El catálogo de asociados · cerrado, se queda abierto

Este apartado pedía los correos de los laboratorios con convenio para cerrar
`/laboratorios-asociados/catalogo`.

**Ya no hace falta.** El motivo de cerrarlo era el tarifario mayorista, y los
precios salieron del sistema entero: ni en el panel, ni en el dato versionado,
ni en el componente del sitio. Lo que esa página publica ahora es especialidad,
nombre, método, muestra y plazo — el catálogo comercial, no algo reservado. Y la
propia tabla dice al pie que el tarifario se solicita al laboratorio.

Cerrarlo costaría pedir los correos, decidir un mecanismo —Cloudflare Access
sigue descartado por pedir tarjeta— y montarlo, para proteger lo que no hace
falta proteger; y le cerraría la puerta a un laboratorio nuevo que quiera ver la
cartera antes de pedir convenio.

**Si algún día vuelven los precios a la web, vuelve este pendiente.**

---

### El bioquímico — datos de los exámenes

| Campo | Completos | Faltan |
|---|---|---|
| Utilidad | 559 | 0 |
| Tipo de muestra | 543 | **16** |
| Tiempo de entrega | 64 | **495** |
| Técnica | 64 | **495** |

Conviene pedirlo por especialidad y no examen por examen: hoy solo existen
cuatro plazos distintos.

**Lo hace el laboratorio, no el programador.** Así lo decidieron. Desde la fase
4 del panel esto se rellena en `/catalogo`: el recuento de arriba lleva al filtro
de los que faltan, y cada examen se corrige y se guarda desde el móvil. Si
prefieren mandar una columna de Excel, entra por `/catalogo-importar`, que
enseña qué cambiaría antes de publicar nada.

Un apunte práctico: **cada guardado suelto recompila el sitio entero**. Para
tandas grandes conviene la hoja de cálculo, que mete los 495 en una sola
compilación.

No es urgente: donde no hay dato, la página dice «Se lo confirmamos al agendar»
y la descripción que ve Google tampoco menciona el plazo.

---

## 3 bis. Tres avisos de seguridad nuevos en las dependencias

Aparecieron hoy mismo: esta mañana el proyecto daba cero. Los tres son de
herramientas que solo corren **al compilar**, nunca en el navegador del paciente,
y los tres tienen arreglo compatible.

| Paquete | Qué es | Dónde se usa |
|---|---|---|
| `sharp` 0.35.4 | fallo en librsvg (CVE-2026-96889) | genera las fotos del sitio |
| `source-map-js` | denegación de servicio con un source map preparado | Tailwind, PostCSS y SVGO |
| `http-cache-semantics` | puede devolver respuestas cacheadas de otro | caché de la cadena de compilación |

**Ya aplicado** con `npm audit fix`. Cambió solo el `package-lock.json` —
`package.json` no se tocó— y son 29 paquetes, todos de versión de parche:
`sharp` 0.35.4 → 0.35.5 con sus binarios, `source-map-js` 1.2.1 → 1.2.2 y
`http-cache-semantics` 4.2.0 → 4.3.0. La auditoría de producción vuelve a dar
**0 vulnerabilidades**.

Comprobado que no cambia nada de lo que se publica: compilación desde cero y
comparación de los **685 archivos** de `dist`, no solo del HTML. Idénticos los 683;
los dos que difieren son los sitemaps, y solo en el `<lastmod>`, que lleva la hora
de cada compilación.

Queda el aviso de `xlsx`, que **no tiene parche** y es de desarrollo: lo usan los
scripts de importación, que corren en tu máquina. No entra en el sitio ni en el
panel — la carga por hoja de cálculo del panel lee CSV con un lector propio,
precisamente por esto.

- [ ] Subir el `package-lock.json` con el resto

---

## 4. El `InvalidStateError` de las transiciones · resuelto

Al navegar aparecía en consola un `InvalidStateError: Transition was aborted
because of invalid state`, una vez por cambio de página.

**No era nada.** Comprobado en Chrome 154 sobre el sitio publicado,
instrumentando `document.startViewTransition` para ver qué promesa fallaba. El
mensaje completo lo dice:

```
InvalidStateError: Transition was aborted because of invalid state. Document hidden
```

«Document hidden»: la pestaña no estaba visible. La especificación de la View
Transition API lo manda así —*«If document's visibility state is hidden, then skip
transition with an InvalidStateError DOMException»*— porque no hay nada que animar
en una pestaña que no se ve.

Medido en esa misma navegación:

| Promesa | Resultado | Qué significa |
|---|---|---|
| `ready` | rechazada | la animación no arrancó |
| `updateCallbackDone` | cumplida | el cambio de página sí ocurrió |
| `finished` | cumplida | la transición terminó, sin animar |

Es decir: aparece solo cuando algo conduce el navegador en segundo plano —una
herramienta de automatización, o el panel de pruebas—, y en una pestaña normal la
animación corre. No hay nada que arreglar.

---

## 5. Decisiones abiertas

- **`convenios.json`** no lo importa ningún archivo del sitio. No se borró porque
  son datos reales del laboratorio. **`catalogo-info.json` sí se usa ahora**: es la
  copia buena de lo que una persona escribió, y lo que impide que reimportar el
  Excel borre el trabajo hecho desde el panel.
- **Paginar el catálogo de asociados** quedó sin hacer a propósito: es una tabla
  y `content-visibility` sobre `<tr>` se comporta mal. Con 3 111 nodos y 34 KB
  comprimidos no compensa el riesgo; el catálogo público tenía 14 051 y ahí sí
  valía la pena.
- **`includeSubDomains` en el HSTS**: hay que comprobar antes que ningún
  subdominio de correo sirva HTTP, y eso depende de Netlife.
