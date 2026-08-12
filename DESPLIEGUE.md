# Despliegue y dominio · ExamLab

Documento de trabajo. Todo lo necesario para publicar el sitio, conectar el
dominio y traspasar la administración al laboratorio.

---

## 1. Datos del dominio

| | |
|---|---|
| Dominio | `examlabsas.com` |
| Registrador | Netlife — renovación a su cargo |
| Registrado | 11 feb 2026 · vence 11 feb 2027 |
| Panel | `admin.tuconstructorweb.com` (CW = Constructor Web) |
| Nameservers | `matteo.ns.cloudflare.com` · `virginia.ns.cloudflare.com` |

La zona DNS vive en una cuenta de Cloudflare **de Netlife**, no nuestra.

### Zona DNS completa

Verificado por consulta DNS pública el 11 de agosto de 2026. No existen
registros DKIM (probados 8 selectores) ni `_dmarc`.

| Tipo | Nombre | Contenido | Proxy | Prio |
|---|---|---|---|---|
| A | examlabsas.com | `18.159.234.214` | Proxied | — |
| CNAME | www | `examlabsas.com` | Proxied | — |
| MX | examlabsas.com | `mail.korreoweb.com` | DNS only | 10 |
| TXT | examlabsas.com | `v=spf1 a mx ip4:52.58.173.206 ~all` | DNS only | — |
| TXT | examlabsas.com | `google-site-verification=nNWnRd-8feHrOk7gexEHTKwy04u5Q8ToAC3xik4KIIo` | DNS only | — |

> **El registro A es el único que se cambia.** El MX y los dos TXT sostienen el
> correo del laboratorio y la verificación de Google: no se tocan nunca.

### Correo

Cinco buzones de 1 GB, administrados por Netlife en korreoweb. Se crean y
eliminan desde CW → Mail → Add user.

```
administracion@examlabsas.com
examlab.ficoa@examlabsas.com
examlab.castillo@examlabsas.com
examlab.cevallos@examlabsas.com
examlab.pelileo@examlabsas.com
```

Configuración para clientes de correo:

```
Entrante   mail.korreoweb.com   IMAP 143 TLS  (o 993 SSL)
                                POP3 110 TLS  (o 995 SSL)
Saliente   mail.korreoweb.com   SMTP 587 TLS
```

---

## 2. Publicar el sitio

```bash
npm run build
```

Genera `dist/`. En el panel de Cloudflare, arrastrar **la carpeta `dist`** (no
la del proyecto) a *Ship something new*. Nombre del proyecto: `examlabsas`.

`examlab` no sirve: ese subdominio de `pages.dev` pertenece a un tercero.

---

## 3. Conectar el dominio

1. Verificar que el sitio funciona en `examlabsas.pages.dev`
2. Pages → **Custom domains** → agregar `examlabsas.com` y `www.examlabsas.com`
3. En CW, cambiar **solo el registro A** por lo que indique Cloudflare
4. Esperar la propagación
5. **Enviar un correo de prueba a `administracion@examlabsas.com` y confirmar
   que llega.** Este paso no se omite.

Si el dominio sin `www` no valida: la zona está en una cuenta de Cloudflare
distinta a la del sitio, y esa combinación a veces falla. Plan B en la sección 5.

---

## 4. Traspaso a la cuenta del laboratorio

El sitio se publica primero en la cuenta personal del desarrollador. El traspaso
posterior cuesta ~10 minutos **siempre que la zona DNS siga en Netlife**.

1. Crear el buzón `sistemas@examlabsas.com` en CW → Mail → Add user
2. Abrir una cuenta de Cloudflare con ese correo
3. Crear ahí el proyecto de Pages y subir `dist`
4. Comprobar que responde en su dirección `pages.dev`
5. Quitar el dominio propio del proyecto viejo y agregarlo al nuevo
6. Ajustar el registro A en CW si Cloudflare indica otro valor
7. Verificar el sitio y **repetir la prueba de correo**
8. Recién entonces, borrar el proyecto viejo

El paso 5 implica unos minutos de caída: dos proyectos no pueden reclamar el
mismo dominio a la vez. Hacerlo fuera del horario de atención.

---

## 5. Plan B: mover los nameservers

Solo si el paso 3 no valida. Deja toda la administración en un único panel, pero
**la zona pasa a la cuenta de Cloudflare que la agregue**, y moverla después
entre cuentas es engorroso. Hacerlo directamente en la cuenta del laboratorio.

1. Agregar `examlabsas.com` en la cuenta de Cloudflare del laboratorio
2. Cloudflare escanea la zona: **comparar registro por registro** contra la
   tabla de la sección 1
3. Anotar el par de nameservers que asigne Cloudflare
4. CW → Domains → Manage → **Update nameservers**
5. Verificar sitio y correo

---

## 6. Códigos QR

Generados por `scripts/generar-qr.mjs`, sin depender de ningún servicio externo
que pudiera desaparecer.

```bash
npm run qr                                          # definitivo
npm run qr https://examlabsas.pages.dev/preparacion # pruebas
```

| Archivo | Destino | Uso |
|---|---|---|
| `public/descargas/qr-preparacion.*` | `examlabsas.com/preparacion` | **Imprenta** |
| `public/descargas/qr-preparacion-pruebas.*` | dirección `pages.dev` | Revisión |

Cualquier dirección distinta a la definitiva genera archivos marcados como
pruebas, para que un QR provisional no acabe impreso por confusión.

> **No enviar a imprenta hasta haber completado el paso 5 de la sección 3.**
> Un QR impreso no se corrige.

---

## 7. Pendientes

**Antes de publicar**

- [ ] Borrar la página `/prueba-framer`
- [ ] `REPETIR = false` en `BaseLayout.astro` y en `Cifras.astro`
- [ ] Validar los códigos LOINC de `examenes-laboratorios.json`
- [ ] Revisión legal de `/privacidad`, `/terminos` y `/cookies`
- [ ] Respaldo del código fuera del equipo de desarrollo

**Del laboratorio**

- [ ] Cartera completa de exámenes y códigos definitivos
- [ ] Sedes de Pelileo, Castillo y Cevallos: dirección, horario, teléfono
- [ ] Confirmar el WhatsApp oficial (0963820177 vs 0983360974)
- [ ] Imagen de la recolección de heces → `public/images/preparacion-heces.jpg`
- [ ] Manual de Servicios en PDF → `public/descargas/`
- [ ] Logo definitivo y fotografías
- [ ] URLs reales de Avalab y activar `avalabDisponible`
- [ ] Nombres reales de convenios y seguros
- [ ] Acceso a Google Search Console (el dominio ya está verificado)

**Mejoras sugeridas a Netlife**

- [ ] Habilitar **DKIM** — hoy no existe, y sin él los correos del laboratorio
      tienen más probabilidad de caer en spam
- [ ] Consultar el límite de buzones del plan y el costo de cuentas adicionales
