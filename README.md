# ExamLab · Sitio web

Sitio corporativo del laboratorio clínico **ExamLab** (Ambato, Ecuador), construido con
**Astro + Tailwind CSS v4**, mobile-first y generación estática.

El diseño aprobado original queda archivado en [`design/`](design/) como referencia.

---

## Requisitos

- Node.js **22.12** o superior
- npm 9 o superior

## Comandos

```bash
npm install
```

```bash
npm run dev
```

| Comando           | Qué hace                                              |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo en `http://localhost:4321`     |
| `npm run build`   | Genera el sitio estático en `dist/` y `.vercel/output`|
| `npm run preview` | Previsualiza el build de producción                   |
| `npm run check`   | Verificación de tipos de Astro/TypeScript             |

---

## Estructura

```
src/
├── components/        Header, Footer, tarjetas, botón flotante de WhatsApp…
├── content/noticias/  Artículos del blog en Markdown
├── data/examenes.json Catálogo de exámenes (fuente de /catalogo)
├── layouts/           BaseLayout (SEO + Schema.org) y LegalLayout
├── lib/               site.ts, whatsapp.ts, examenes.ts, schema.ts, fechas.ts, iconos.ts
├── pages/             Rutas del sitio
└── styles/global.css  Paleta, tipografías y tokens de Tailwind
```

### Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Home (diseño aprobado) |
| `/servicios` | Manual de Servicios, catálogo y servicios del laboratorio |
| `/catalogo` | Buscador por código, nombre y especialidad (filtro en cliente) |
| `/catalogo/[slug]` | Ficha de cada examen, generada desde `examenes.json` |
| `/soy-paciente` | Hub + guía (`#guia`) y preguntas frecuentes (`#preguntas-frecuentes`) |
| `/soy-paciente/pedir-cita` | Agendamiento por WhatsApp |
| `/soy-paciente/resultados` | Guía de acceso al sistema Avalab |
| `/soy-paciente/califica-tu-experiencia` | Reseñas de Google y canal de reclamos |
| `/soy-profesional` | Médicos referentes, convenios (`#convenios-medicos`) y contacto |
| `/noticias`, `/noticias/[slug]` | Blog en Markdown |
| `/sedes` | Listado de puntos de atención |
| `/sedes/[slug]` | Página por sede con mapa embebido, horarios y servicios |
| `/privacidad`, `/terminos`, `/cookies` | Textos legales |
| `/404` | Página de error |

---

## Marca

### Paleta

Configurada en `src/styles/global.css` mediante el bloque `@theme` de Tailwind v4.

| Token          | Color     | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `brand`        | `#005A8C` | Azul institucional: títulos, footer, hero |
| `accent`       | `#00A3C4` | Cian de acción: botones, iconos, enlaces |
| `neutral`      | `#6D6E71` | Texto secundario                          |
| `alert`        | `#E1251B` | Urgencias y énfasis                       |

Derivados disponibles: `brand-dark`, `brand-soft`, `accent-dark`, `accent-light`,
`accent-soft`, `alert-dark`, `alert-light`, `alert-soft`, `surface`, `line`, `line-strong`.

Se usan como cualquier utilidad de Tailwind: `bg-brand`, `text-accent`, `border-line`.

### Tipografías

Cargadas desde Google Fonts en `BaseLayout.astro`:

- **Chakra Petch** → títulos (`font-display`, aplicada por defecto a `h1`–`h4`)
- **Montserrat** → cuerpo (`font-body`, aplicada al `body`)

### Escala fluida

`text-h1`, `text-h2`, `text-h3` y `text-lead` reproducen los `clamp()` del diseño aprobado.
`py-section` aplica el ritmo vertical estándar entre secciones.

### Punto de quiebre propio

`menu:` (1120 px) marca el paso del menú hamburguesa a la navegación completa de escritorio.

---

## Contenido editable

### Datos del negocio

`src/lib/site.ts` centraliza teléfonos, correo, horarios, redes sociales, sedes y menús.
Cambiar un dato ahí lo actualiza en header, footer, páginas y datos estructurados.

### Catálogo de exámenes

`src/data/examenes.json` contiene 5 registros de ejemplo. Cada ficha genera su página en
`/catalogo/[slug]`. Campos por registro:

```jsonc
{
  "slug": "biometria-hematica",     // define la URL
  "codigo": "HEM-001",              // se indexa en el buscador
  "nombre": "Biometría hemática completa",
  "sinonimos": ["Hemograma", "BHC", "CBC"], // se indexan en el buscador
  "especialidad": "Hematología",            // alimenta los filtros
  "resumen": "…",                            // texto de la tarjeta
  "descripcion": "…",                        // texto largo de la ficha
  "utilidad": ["…"],                         // cuándo se solicita
  "incluye": ["…"],                          // parámetros del perfil
  "muestra": "Sangre venosa",
  "contenedor": "Tubo tapa lila (EDTA)",
  "metodo": "Citometría de flujo automatizada",
  "tiempoEntrega": "El mismo día, en 4 a 6 horas",
  "condicionesEstudio": ["…"],               // manejo de la muestra (profesionales)
  "condicionesPaciente": ["…"],              // preparación previa (pacientes)
  "ayuno": false,
  "ayunoHoras": 12,                          // solo si ayuno = true
  "domicilio": true,
  "destacado": true,
  "ficha": null                              // ruta al PDF, o null
}
```

> El catálogo **no muestra precios**: la proforma no los contempla y el valor se
> consulta por WhatsApp. Si el laboratorio decide publicarlos, se agrega el campo
> y se muestra en `ExamCard` y en la ficha.

Otros archivos de datos: `especialidades.json` (tarjetas de la home),
`perfiles.json` (perfiles temáticos) y `convenios.json` (aseguradoras).

Al agregar un registro nuevo, su página, su tarjeta y su filtro de categoría se generan solos.

### Artículos del blog

Un archivo `.md` por artículo en `src/content/noticias/`. El nombre del archivo define la URL.
Frontmatter validado en `src/content.config.ts`:

```yaml
---
titulo: Título del artículo
descripcion: Bajada de una o dos líneas
categoria: Prevención
fecha: 2026-07-12
autor: Equipo ExamLab      # opcional
imagen: /images/foto.png   # opcional, ruta desde /public
imagenAlt: Texto alternativo
destacado: false           # opcional
borrador: false            # true lo excluye del build
---
```

### Mensajes de WhatsApp

`src/lib/whatsapp.ts` define el número y un mensaje distinto por sección. El botón flotante
recibe la sección desde cada página (`<BaseLayout whatsapp="catalogo">`), y hay helpers para
mensajes dinámicos: `whatsappExamen()`, `whatsappSede()` y `whatsappNoticia()`.

> Actualizar `WHATSAPP_NUMERO` con el número real antes de publicar.

---

## SEO y datos estructurados

`BaseLayout.astro` genera en cada página: `<title>`, meta description, canonical, Open Graph,
Twitter Card y dos bloques JSON-LD (`MedicalBusiness`/`MedicalClinic` y `WebSite`). Las sedes se
declaran como `department`.

Bloques adicionales por tipo de página:

- `/catalogo/[slug]` → `MedicalTest` + `Offer` + `BreadcrumbList`
- `/noticias/[slug]` → `Article` + `BreadcrumbList`
- `/soy-paciente` → `FAQPage`
- `/catalogo` → `ItemList`

El sitemap se genera con `@astrojs/sitemap` en `/sitemap-index.xml` y está declarado en
`public/robots.txt`.

---

## Despliegue en Vercel

El proyecto usa el adaptador `@astrojs/vercel` con `output: 'static'`; el build escribe la
Build Output API en `.vercel/output`.

1. Subir el repositorio a GitHub/GitLab.
2. En Vercel: **Add New → Project** e importar el repositorio.
3. Vercel detecta Astro automáticamente (`vercel.json` ya fija framework y comandos).
4. Deploy.

También se puede desplegar desde la terminal:

```bash
npx vercel --prod
```

### Pendientes de fases siguientes

**Fase 2 — contenido real:** listado completo de exámenes desde el Excel del laboratorio,
sedes y datos de contacto reales, logotipo definitivo, fotografías, Manual de Servicios en
`public/descargas/`, fichas de examen en PDF.

**Fase 3 — SEO y medición:** Google Business Profile por sede (y su `placeid` para el
módulo de reseñas), Google Analytics y píxel de Facebook — ambos deben cargarse solo si
`localStorage.examlab-cookies === "aceptadas"`, ver `CookieBanner.astro`.

**Fase 4 — publicación:** dominio, hosting, correos corporativos y revisión legal.

### Antes de publicar

- [ ] Cambiar `site` en `astro.config.mjs` por el dominio real (afecta canonical, sitemap y Schema.org).
- [ ] Actualizar la URL del sitemap en `public/robots.txt`.
- [ ] Poner el número real en `WHATSAPP_NUMERO` (`src/lib/whatsapp.ts`).
- [ ] Confirmar direcciones, teléfonos, horarios y coordenadas en `src/lib/site.ts`.
- [ ] Reemplazar `public/images/logo.png` por el logotipo definitivo con fondo transparente
      (el actual es un render con fondo que se recorta en `Logo.astro`).
- [ ] Revisar con asesoría legal los textos de `/privacidad`, `/terminos` y `/cookies`.
- [ ] Sustituir las URLs de `portalResultados` y `portalProfesional` por las del LIS.
