# ExamLab · Pendientes

Lo que falta para dar el sitio por terminado. Nada de esto bloquea la
publicación: el sitio funciona hoy y, donde falta un dato, lo dice en vez de
inventarlo.

Última revisión: 8 de octubre de 2026.

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

El panel está terminado —las seis fases y el rediseño— y entra entero en esa
subida: la carpeta `admin/`, `admin/DESIGN.md` y los scripts nuevos
(`completar-catalogo-info.mjs`, `comprobar-qr.mjs`, `generar-emblema.mjs`).

---

## 2. Datos que faltan del Dr. Silva

| Dato | Estado | Dónde afecta |
|---|---|---|
| Número de urgencias | Confirmó que existe una línea aparte —la suya— pero no la entregó | Sale en 5 páginas. Marcado como `PENDIENTE` en `src/lib/site.ts` |
| Fachada de Ficoa en mayor resolución | El original mide 1448 px de ancho | Es la foto de portada. En una pantalla grande se ve blanda y no tiene arreglo sin un original mayor |
| Año de constitución como S.A.S. | Dijo «me parece que desde el 2023» | `foundingDate` usa 2001, que es cuando abrió como Pasteur. El 2023 conviene contrastarlo antes de ponerlo en un texto visible |
| Veracidad de la noticia destacada | Sin confirmar | «Nuevos analizadores automatizados» la escribí como ejemplo y afirma que la matriz opera con equipos nuevos. Si no ocurrió, hay que quitarla |
| Logo en SVG con fondo transparente | Sin pedir a marca | Hoy es un PNG recortado en círculo (`TODO` en `src/components/Logo.astro`) |

---

## 2 bis. Feriados: confirmar con el laboratorio

El sitio ya respeta feriados y jornadas especiales
(`src/data/feriados.json`). Están cargados los **feriados nacionales de fecha
fija** de lo que queda de 2026 y de 2027, todos como día cerrado.

Que el laboratorio cierre en ellos se desprende de lo que el propio sitio
publica —«en feriados atendemos únicamente urgencias coordinadas por
teléfono»— pero **no lo ha confirmado nadie**.

- [ ] Confirmar con el laboratorio en qué feriados cierra de verdad
- [ ] Añadir **Carnaval** y **Viernes Santo**, que cambian de fecha cada año
- [ ] Preguntar si hay jornadas especiales propias (24 y 31 de diciembre,
      aniversario del laboratorio)

Si en algún feriado sí abren, basta con quitar esa línea del archivo, o cambiar
`"franja": null` por los tramos reales.

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

### El laboratorio — correos de los asociados

El catálogo de asociados es accesible para cualquiera que tenga la URL y está
enlazado desde el menú de las 583 páginas. No muestra precios, pero sí la
cartera de 277 pruebas con método, muestra y plazo.

- [ ] Pedir la lista de correos de los laboratorios con convenio
- [ ] Decidir cómo se cierra `/laboratorios-asociados/catalogo`. **Cloudflare
      Access ya no es opción**: su plan gratuito pide tarjeta y el doctor no puede
      ponerla. Queda resolverlo con el mismo mecanismo de contraseña del panel, o
      dejando el catálogo sin precios como está
- [ ] Solo entonces, valorar poner `MOSTRAR_PRECIOS = true`

### El bioquímico — datos de los exámenes

| Campo | Completos | Faltan |
|---|---|---|
| Utilidad | 559 | 0 |
| Tipo de muestra | 543 | **16** |
| Tiempo de entrega | 64 | **495** |
| Técnica | 64 | **495** |

Conviene pedirlo por especialidad y no examen por examen: hoy solo existen
cuatro plazos distintos.

**Ya no hace falta pasar por el programador.** Desde la fase 4 del panel esto se
rellena en `/catalogo`: el recuento de arriba lleva al filtro de los que faltan, y
cada examen se corrige y se guarda desde el móvil. Si el laboratorio prefiere
mandar una columna de Excel, también entra por `/catalogo-importar`, enseñando
antes qué cambia.

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
